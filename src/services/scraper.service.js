// src/services/scraper.service.js
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CSV_PATH = path.join(__dirname, '..', 'scraped.csv');

async function validateAndConvertImage(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      maxContentLength: 15 * 1024 * 1024 
    });

    const buffer = Buffer.from(response.data);
    if (buffer.length < 15000) return null; 

    const contentType = response.headers['content-type'] || '';
    const supported = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supported.some(s => contentType.includes(s))) return null;

    const base64 = buffer.toString('base64');
    let mimeType = contentType.includes('webp') ? 'image/webp' : 
                   contentType.includes('png') ? 'image/png' : 'image/jpeg';

    return {
      url: imageUrl,
      base64: `data:${mimeType};base64,${base64}`,
      size: buffer.length
    };
  } catch (error) {
    return null;
  }
}

async function scrapeWebpage(url) {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    timeout: 15000
  });

  const $ = cheerio.load(response.data);
  $('script, style, noscript, iframe, svg').remove();

  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content') || '';
  const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
  const brandName = $('meta[property="og:site_name"]').attr('content') || domain.charAt(0).toUpperCase() + domain.slice(1);

  // Extract raw text for context
  const rawText = $('body').text().replace(/\s+/g, ' ').substring(0, 3000);

  const images = [];
  const seenUrls = new Set();

  // Helper to prioritize product images based on keywords in URL/Alt
  const isProductUrl = (str) => {
    const s = str.toLowerCase();
    return s.includes('iphone') || s.includes('ipad') || s.includes('mac') || s.includes('watch') || s.includes('product');
  };

  const ogImg = $('meta[property="og:image"]').attr('content');
  if (ogImg) {
    try {
      const full = new URL(ogImg, url).href;
      images.push({ url: full, context: 'hero', priority: 100 });
      seenUrls.add(full);
    } catch {}
  }

  $('img').each((_, el) => {
    let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
    
    // Handle srcset
    const srcset = $(el).attr('srcset');
    if (srcset) {
      const parts = srcset.split(',').map(p => p.trim().split(' '));
      if (parts.length > 0) src = parts[parts.length - 1][0];
    }

    if (!src || src.startsWith('data:')) return;

    const alt = $(el).attr('alt') || '';
    const w = parseInt($(el).attr('width') || '0');
    // Filter out small images
    if (w > 0 && w < 400) return;

    try {
      const full = new URL(src, url).href;
      if (seenUrls.has(full)) return;

      // Boost priority if URL looks like a product
      let prio = 10;
      if (isProductUrl(full) || isProductUrl(alt)) prio = 50;

      images.push({ url: full, context: 'content', priority: prio });
      seenUrls.add(full);
    } catch {}
  });

  images.sort((a, b) => b.priority - a.priority);
  
  const htmlText = $('body').html();
  const colorRegex = /#([A-Fa-f0-9]{6})\b/g;
  const brandColors = [...new Set(htmlText.match(colorRegex) || [])].slice(0, 5);

  return { url, title, description, brandName, images, brandColors, rawText };
}

async function analyzeImagesForAds(images, brandName) {
  if (!images || images.length === 0) return [];

  // Analyze top 12 images to find the best ones
  const candidates = images.slice(0, 12);
  console.log(`Analyzing ${candidates.length} images for relevance...`);

  const validated = await Promise.all(candidates.map(img => validateAndConvertImage(img.url)));
  const validImages = validated.filter(img => img !== null);

  if (validImages.length === 0) return [];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an AI filtering images for a PRODUCT COMMERCIAL.
          
          Analyze each image and return JSON array:
          - visualContent: Description (e.g. "Silver laptop on desk", "Movie poster for F1").
          - category: "product" (hardware/physical item), "ui" (app screenshot), "entertainment" (movie/music poster), "abstract" (backgrounds), "logo".
          - quality: "high" or "low".
          
          CRITICAL: 
          1. Identify "entertainment" (movie posters/album covers) correctly.
          2. Identify "product" (phones, cars, clothes) correctly.`
        },
        {
          role: 'user',
          content: validImages.map(img => ({ type: 'image_url', image_url: { url: img.base64, detail: 'low' } }))
        }
      ],
      max_tokens: 1000
    });

    const content = completion.choices[0].message.content.replace(/```(?:json)?/g, '').trim();
    const analysis = JSON.parse(content);

    return analysis.map((a, i) => ({
      ...a,
      url: validImages[i].url
    }));

  } catch (e) {
    console.error('Analysis failed', e.message);
    return validImages.map(img => ({ url: img.url, quality: 'high', category: 'unknown', visualContent: 'Image' }));
  }
}

async function enrichWithOpenAI(scraped) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract HARD FACTS.
        Return JSON fields:
        - brandName: Company name.
        - keyMessages: Array of 5 specific product features found in text.
        - description: Summary.
        
        Do NOT invent features.`
      },
      {
        role: 'user',
        content: `Title: ${scraped.title}\nRaw Text: ${scraped.rawText}`
      }
    ],
    temperature: 0.3
  });

  const text = completion.choices[0].message.content.replace(/```(?:json)?/g, '').trim();
  return JSON.parse(text);
}

exports.scrapeWebsite = async url => {
  console.log(`\n🔍 Scraping ${url}...`);
  const scraped = await scrapeWebpage(url);
  
  console.log('🤖 Extracting Product Data...');
  const enrichment = await enrichWithOpenAI(scraped);

  console.log('🤖 Analyzing & Categorizing images...');
  const analysis = await analyzeImagesForAds(scraped.images, enrichment.brandName);

  // SMART FILTER:
  // 1. Remove Logos and Low Quality
  // 2. If we have "product" images, PRIORITIZE them and remove "entertainment" (unless the brand IS entertainment)
  
  let validImages = analysis.filter(img => img.category !== 'logo' && img.quality !== 'low');
  
  const productImages = validImages.filter(img => img.category === 'product');
  const entertainmentImages = validImages.filter(img => img.category === 'entertainment');

  // If we found actual products (hardware), ignore the movie posters
  if (productImages.length >= 3) {
    console.log('   ✨ Detected Hardware products. Ignoring entertainment/movie posters.');
    validImages = productImages;
  } else {
    // Fallback: mix of whatever we found
    validImages = validImages.filter(img => img.category !== 'logo');
  }

  const result = {
    id: uuidv4(),
    url,
    brandName: enrichment.brandName,
    description: enrichment.description,
    keyMessages: enrichment.keyMessages,
    brandColors: scraped.brandColors,
    adReadyImages: validImages,
    imageCount: validImages.length
  };

  const csv = 'data\n' + `"${JSON.stringify(result).replace(/"/g, '""')}"`;
  fs.writeFileSync(CSV_PATH, csv, 'utf8');

  console.log(`✅ Scraped. Found ${validImages.length} relevant images.`);
  return result;
};