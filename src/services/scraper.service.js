// src/services/scraper.service.js
const puppeteer = require('puppeteer');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Helper: Auto-scrolls the page to trigger lazy loading of images
 */
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

/**
 * Main function called by the controller
 * @param {string} url 
 */
async function scrapeWebsite(url) {
    let browser = null;
    try {
        console.log(`[Scraper] Starting scrape for: ${url}`);

        // 1. Launch Puppeteer
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Set viewport to large desktop to get highest res assets
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Go to URL
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // CRITICAL: Scroll down to trigger lazy loading
        console.log('[Scraper] Scrolling to trigger lazy loading...');
        await autoScroll(page);
        
        // Wait a moment for animations/lazy loads to finish
        await new Promise(r => setTimeout(r, 2000));

        // 2. Extract Raw Data (DOM, Text, Images, Backgrounds)
        const rawData = await page.evaluate(() => {
            // Helper to get meta tags
            const getMeta = (name) => {
                const element = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                return element ? element.content : null;
            };

            // Helper to parse srcset and get largest image
            const getLargestSrcFromSrcset = (srcset) => {
                if (!srcset) return null;
                const sources = srcset.split(',').map(src => {
                    const parts = src.trim().split(' ');
                    return {
                        url: parts[0],
                        width: parts[1] ? parseInt(parts[1]) : 0
                    };
                });
                // Sort by width descending and take the first
                sources.sort((a, b) => b.width - a.width);
                return sources[0]?.url;
            };

            // --- STRATEGY 1: Standard <img> tags ---
            const imgElements = Array.from(document.querySelectorAll('img'));
            const standardImages = imgElements.map(img => {
                // Try to find the best URL available
                let bestUrl = getLargestSrcFromSrcset(img.srcset) || img.dataset.src || img.src;
                
                return {
                    src: bestUrl,
                    alt: img.alt || '',
                    width: img.naturalWidth || img.width, // Fallback if natural not loaded
                    height: img.naturalHeight || img.height,
                    type: 'img'
                };
            });

            // --- STRATEGY 2: CSS Background Images (divs, sections, headers) ---
            const bgNodes = Array.from(document.querySelectorAll('div, section, article, header, main, span, a'));
            const backgroundImages = bgNodes.map(node => {
                const style = window.getComputedStyle(node);
                const bgImage = style.backgroundImage;
                
                if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
                    // Extract URL from "url("http://...")"
                    let url = bgImage.slice(4, -1).replace(/["']/g, "");
                    
                    // Filter out small gradients or svg patterns often used in CSS
                    if (url.includes('data:image/svg') || url.length > 500) return null;

                    const rect = node.getBoundingClientRect();
                    return {
                        src: url,
                        alt: 'Background visual',
                        width: rect.width,
                        height: rect.height,
                        type: 'bg'
                    };
                }
                return null;
            }).filter(Boolean);

            // Combine all candidates
            const allCandidates = [...standardImages, ...backgroundImages];

            // --- FILTERING ---
            const uniqueUrls = new Set();
            const qualityImages = allCandidates.filter(img => {
                if (!img.src) return false;

                // 1. Exclude duplicates
                if (uniqueUrls.has(img.src)) return false;
                uniqueUrls.add(img.src);

                // 2. Exclude GIFs and SVGs (User request)
                const lowerSrc = img.src.toLowerCase();
                if (lowerSrc.endsWith('.gif') || lowerSrc.includes('.svg')) return false;
                if (lowerSrc.includes('logo') || lowerSrc.includes('icon')) return false;

                // 3. Size Filter: Keep only high-quality images (min 200x200)
                // This effectively filters out icons, small avatars, and UI elements
                if (img.width < 200 || img.height < 200) return false;

                // 4. Aspect Ratio: Avoid extreme banners (super thin)
                const ratio = img.width / img.height;
                if (ratio > 4 || ratio < 0.25) return false;

                return true;
            });

            // Specific scraping for potential logo (separate from content images)
            const logoImg = document.querySelector('header img, .logo img, img[src*="logo"]');
            const logoUrl = logoImg ? logoImg.src : null;

            // Computed Colors
            const getComputedColor = (el) => window.getComputedStyle(el).backgroundColor;
            const buttons = Array.from(document.querySelectorAll('button, .btn, a.button'));
            const colors = buttons.map(b => getComputedColor(b)).filter(c => c !== 'rgba(0, 0, 0, 0)' && c !== 'rgb(255, 255, 255)');

            return {
                title: document.title,
                description: getMeta('description') || getMeta('og:description'),
                bodyText: document.body.innerText.substring(0, 15000),
                logoUrl: logoUrl,
                // Sort by size (largest first) to prioritize hero images
                images: qualityImages.sort((a, b) => (b.width * b.height) - (a.width * a.height)).slice(0, 40), // Capture top 40 best images
                detectedColors: [...new Set(colors)].slice(0, 5)
            };
        });

        await browser.close();
        browser = null;

        console.log(`[Scraper] Found ${rawData.images.length} high-quality candidates.`);

        // 3. Analyze with OpenAI to structure data
        console.log('[Scraper] Analyzing content with OpenAI...');
        const structuredData = await analyzeWithAI(url, rawData);

        // 4. Save to CSV in the format script.service.js expects
        await saveToCSV(structuredData);

        return structuredData;

    } catch (error) {
        if (browser) await browser.close();
        console.error('[Scraper Service Error]:', error);
        throw new Error(`Scraping failed: ${error.message}`);
    }
}

/**
 * Uses OpenAI to structure the raw scraped data into the target JSON format
 * Updated to include detailed image analysis fields required by script.service.js
 */
async function analyzeWithAI(url, rawData) {
    const prompt = `
    You are an expert website and visual content analyzer. 
    Analyze the raw data extracted from a website and format it into a specific JSON structure.
    
    Target URL: ${url}
    
    Raw Data:
    - Page Title: ${rawData.title}
    - Meta Description: ${rawData.description}
    - Detected Logo Candidate: ${rawData.logoUrl}
    - Detected Colors (CSS): ${JSON.stringify(rawData.detectedColors)}
    - Available Images: ${JSON.stringify(rawData.images)}
    - Main Content Text: 
    ${rawData.bodyText}

    Task:
    Return a valid JSON object strictly adhering to the schema below. 
    
    CRITICAL IMAGE ANALYSIS INSTRUCTIONS:
    For the 'media.images' array, you must analyze the context of the images based on the text and their attributes.
    You must populate these specific fields for the script generator to work:
    - "productType": What specific item is shown? (e.g. "Wireless Headphones", "Skin Cream").
    - "productCategory": High level category (e.g. "Electronics", "Beauty").
    - "visualContent": Description of what is visually happening in the image.
    - "bestUsedFor": Categorize strictly as one of: 'hook', 'feature', 'detail', 'lifestyle', 'cta'.
    - "mood": The emotional vibe (e.g. "energetic", "calm", "premium").
    - "suggestedNarration": A sentence describing this specific image for a voiceover.
    
    Output JSON Schema:
    {
      "id": "analysis_${uuidv4().substring(0, 8)}",
      "url": "${url}",
      "status": "completed",
      "extractedContent": {
        "title": "Page Title",
        "description": "Summary",
        "pageType": "string",
        "headlines": [{ "text": "Headline text", "included": true }],
        "valueProposition": "string",
        "targetAudience": "string",
        "keyPoints": ["string"]
      },
      "media": {
        "images": [
          {
            "url": "full_image_url",
            "alt": "alt text",
            "productType": "Specific Product Name",
            "productCategory": "General Category",
            "visualContent": "Description of visual elements",
            "keyFeatures": ["feature1", "feature2"],
            "mood": "emotional tone",
            "suggestedNarration": "Short script sentence matching this image",
            "bestUsedFor": "hook|feature|detail|lifestyle|cta",
            "selected": boolean
          }
        ],
        "videos": []
      },
      "branding": {
        "brandName": "string",
        "colors": ["hex_code"],
        "logoUrl": "url"
      }
    }
    `;

    const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo", // Required for complex schema adherence
        messages: [
            { role: "system", content: "You are a data extraction assistant. Output only valid JSON." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content);
}

/**
 * Saves the structured JSON data into src/scraped.csv
 */
async function saveToCSV(data) {
    const filePath = path.join(__dirname, '..', 'scraped.csv');
    
    // 1. Stringify the huge JSON object
    const jsonString = JSON.stringify(data);

    // 2. Escape double quotes for CSV format (replace " with "")
    const escapedJson = jsonString.replace(/"/g, '""');

    // 3. Create CSV content: Header row + Data row
    // We wrap the escaped JSON in quotes to treat it as a single CSV cell
    const csvContent = `id,data,timestamp\n${data.id},"${escapedJson}","${new Date().toISOString()}"`;

    try {
        await fs.promises.writeFile(filePath, csvContent, 'utf8');
        console.log(`[Scraper] Data saved to ${filePath} in CSV format compatible with script.service`);
    } catch (err) {
        console.error('Failed to write file:', err);
    }
}

module.exports = {
    scrapeWebsite
};