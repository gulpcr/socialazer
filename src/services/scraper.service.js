// src/services/scraper.service.js
// Hybrid Scraper: Puppeteer for rendering + OpenAI Vision for analysis

const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CSV_PATH = path.join(__dirname, '..', 'scraped.csv');

const CONFIG = {
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  minImageSize: 15000,        // 15KB minimum
  minImageWidth: 300,         // Lowered for more results
  minImageHeight: 200,        // Lowered for more results
  maxImages: 20,
  scrollSteps: 10,
  scrollDelay: 300,
  imageTimeout: 12000,
};

exports.scrapeWebsite = async (url) => {
  const startTime = Date.now();
  
  try {
    console.log(`\n🔍 HYBRID SCRAPER: ${url}`);
    console.log('━'.repeat(65));

    // Step 1: Scrape with Puppeteer
    console.log('   🚀 Launching browser...');
    const { imageUrls, pageData } = await scrapeWithPuppeteer(url);
    console.log(`   ✅ Found ${imageUrls.length} image URLs`);

    if (imageUrls.length === 0) {
      throw new Error('No images found on the page');
    }

    // Step 2: Download and validate images
    console.log('   📥 Downloading images...');
    const validImages = await downloadImages(imageUrls);
    console.log(`   ✅ ${validImages.length} valid images downloaded`);

    if (validImages.length === 0) {
      throw new Error('No valid images could be downloaded');
    }

    // Step 3: Analyze with OpenAI Vision
    console.log('   🤖 Analyzing with OpenAI Vision...');
    const analysis = await analyzeWithOpenAI(validImages, pageData, url);

    // Step 4: Create result
    const result = createFinalResult(url, analysis, validImages);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n   📊 RESULTS:');
    console.log(`      • Brand: ${result.branding.brandName}`);
    console.log(`      • Images: ${result.media.images.length}`);
    console.log(`      • Time: ${totalTime}s`);
    console.log('━'.repeat(65));

    return result;

  } catch (error) {
    console.error(`\n❌ Scraping failed: ${error.message}`);
    throw error;
  }
};

/**
 * PUPPETEER SCRAPING - Captures JS-rendered images
 */
async function scrapeWithPuppeteer(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport);
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Collect images from network requests (MOST RELIABLE)
  const networkImages = new Set();
  
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';
      
      // Check if it's an image response
      if (status === 200) {
        const isImage = contentType.includes('image/') || 
                        url.match(/\.(jpg|jpeg|png|webp|avif)(\?|$|#)/i);
        
        if (isImage && isValidImageUrl(url)) {
          networkImages.add(url);
        }
      }
    } catch {}
  });

  // Also listen to requests to catch image URLs even if blocked
  page.on('request', (request) => {
    const url = request.url();
    const resourceType = request.resourceType();
    
    if (resourceType === 'image' && isValidImageUrl(url)) {
      networkImages.add(url);
    }
  });

  try {
    // Navigate to page
    console.log('   📡 Loading page...');
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.timeout 
    });
    
    // Wait for initial content (FIXED)
    await new Promise(r => setTimeout(r, 2000));

    // Trigger lazy loading by scrolling
    console.log('   📜 Scrolling to load images...');
    await autoScroll(page);
    
    // Wait for lazy-loaded images (FIXED)
    await new Promise(r => setTimeout(r, 2000));

    // Click gallery/carousel buttons
    await expandGalleries(page);

    // Extract images from DOM
    console.log('   🔍 Extracting from DOM...');
    const domImages = await page.evaluate(() => {
      const images = new Set();
      
      // All img elements
      document.querySelectorAll('img').forEach(img => {
        // Try multiple source attributes
        const sources = [
          img.src,
          img.currentSrc,
          img.dataset.src,
          img.dataset.lazySrc,
          img.dataset.original,
          img.dataset.srcset,
          img.getAttribute('data-src'),
          img.getAttribute('data-lazy-src'),
          img.getAttribute('data-original'),
        ];
        
        sources.forEach(src => {
          if (src && src.startsWith('http')) {
            images.add(src);
          }
        });

        // Parse srcset
        const srcset = img.srcset || img.dataset.srcset;
        if (srcset) {
          srcset.split(',').forEach(part => {
            const [imgUrl] = part.trim().split(/\s+/);
            if (imgUrl && imgUrl.startsWith('http')) {
              images.add(imgUrl);
            }
          });
        }
      });

      // Picture sources
      document.querySelectorAll('picture source').forEach(source => {
        const srcset = source.srcset;
        if (srcset) {
          srcset.split(',').forEach(part => {
            const [imgUrl] = part.trim().split(/\s+/);
            if (imgUrl && imgUrl.startsWith('http')) {
              images.add(imgUrl);
            }
          });
        }
      });

      // Background images
      document.querySelectorAll('*').forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          const match = bg.match(/url\(['"]?([^'"()]+)['"]?\)/);
          if (match?.[1] && match[1].startsWith('http')) {
            images.add(match[1]);
          }
        }
      });

      // Meta images
      document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]').forEach(el => {
        const content = el.getAttribute('content');
        if (content && content.startsWith('http')) {
          images.add(content);
        }
      });

      return Array.from(images);
    });

    // Get page metadata
    const pageData = await page.evaluate(() => ({
      title: document.title || '',
      description: document.querySelector('meta[name="description"]')?.content || 
                   document.querySelector('meta[property="og:description"]')?.content || '',
      ogSiteName: document.querySelector('meta[property="og:site_name"]')?.content || '',
      headlines: Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => h.textContent?.trim())
        .filter(t => t && t.length > 3 && t.length < 150)
        .slice(0, 15),
      bodyText: document.body?.innerText?.replace(/\s+/g, ' ').substring(0, 3000) || ''
    }));

    await browser.close();

    // Combine network and DOM images
    const allImages = new Set([...networkImages, ...domImages]);
    
    // Filter and prioritize
    const imageUrls = Array.from(allImages)
      .filter(isValidImageUrl)
      .map(url => ({ url, priority: scoreImageUrl(url) }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 60)
      .map(i => i.url);

    console.log(`   📊 Network: ${networkImages.size} | DOM: ${domImages.length} | Total: ${imageUrls.length}`);

    return { imageUrls, pageData };

  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function autoScroll(page) {
  await page.evaluate(async (config) => {
    await new Promise((resolve) => {
      let scrolled = 0;
      const maxScroll = Math.min(document.body.scrollHeight, 10000);
      const step = maxScroll / config.scrollSteps;
      
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        scrolled += step;
        
        // Trigger scroll events for lazy loaders
        window.dispatchEvent(new Event('scroll'));
        
        if (scrolled >= maxScroll) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, config.scrollDelay);
    });
  }, CONFIG);
}

async function expandGalleries(page) {
  const selectors = [
    '.swiper-button-next',
    '.slick-next', 
    '[class*="carousel"] [class*="next"]',
    '[class*="slider"] [class*="next"]',
    '[aria-label*="next" i]',
    '[data-direction="next"]'
  ];

  for (const sel of selectors) {
    try {
      const buttons = await page.$$(sel);
      for (const btn of buttons.slice(0, 5)) {
        await btn.click().catch(() => {});
        // Wait for animation (FIXED)
        await new Promise(r => setTimeout(r, 300));
      }
    } catch {}
  }
}

/**
 * URL VALIDATION
 */
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http')) return false;
  
  const lower = url.toLowerCase();
  
  // Invalid patterns
  const invalidPatterns = [
    'data:', 'blob:', 'javascript:',
    '.svg', '.gif', '.ico',
    'pixel', 'spacer', 'blank', 'transparent',
    'tracking', 'analytics', 'beacon',
    'googletagmanager', 'facebook.net', 'doubleclick',
    'advertisement', 'ad-delivery',
    '1x1', '2x2',
    'undefined', 'null',
    'base64'
  ];
  
  for (const pattern of invalidPatterns) {
    if (lower.includes(pattern)) return false;
  }
  
  // Should look like an image URL
  const hasImageExt = /\.(jpg|jpeg|png|webp|avif)(\?|#|$)/i.test(url);
  const hasImagePath = /(image|img|photo|picture|media|asset|cdn|static)/i.test(url);
  
  return hasImageExt || hasImagePath;
}

function scoreImageUrl(url) {
  const lower = url.toLowerCase();
  let score = 10;
  
  // Boost
  if (lower.includes('hero')) score += 50;
  if (lower.includes('product')) score += 45;
  if (lower.includes('banner')) score += 40;
  if (lower.includes('feature')) score += 35;
  if (lower.includes('large') || lower.includes('full') || lower.includes('original')) score += 30;
  if (lower.includes('2x') || lower.includes('@2x') || lower.includes('retina')) score += 25;
  if (lower.includes('gallery')) score += 20;
  if (lower.includes('cdn') || lower.includes('cloudinary') || lower.includes('imgix')) score += 15;
  
  // Penalize
  if (lower.includes('thumb')) score -= 30;
  if (lower.includes('small') || lower.includes('tiny')) score -= 40;
  if (lower.includes('icon')) score -= 50;
  if (lower.includes('logo')) score -= 45;
  if (lower.includes('avatar')) score -= 40;
  
  return score;
}

/**
 * DOWNLOAD IMAGES
 */
async function downloadImages(urls) {
  const validImages = [];
  const batchSize = 10;
  
  for (let i = 0; i < urls.length && validImages.length < CONFIG.maxImages; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(url => downloadSingleImage(url))
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        const img = result.value;
        if (img.width >= CONFIG.minImageWidth && img.height >= CONFIG.minImageHeight) {
          validImages.push(img);
          console.log(`      ✅ ${img.width}x${img.height} (${(img.size / 1024).toFixed(0)}KB)`);
        }
      }
      if (validImages.length >= CONFIG.maxImages) break;
    }
  }
  
  return validImages;
}

async function downloadSingleImage(url) {
  try {
    // Try to get highest resolution version
    const hiResUrl = upgradeToHighRes(url);
    
    const response = await axios.get(hiResUrl, {
      responseType: 'arraybuffer',
      timeout: CONFIG.imageTimeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': new URL(url).origin
      },
      maxContentLength: 25 * 1024 * 1024,
      validateStatus: status => status >= 200 && status < 400
    });

    const buffer = Buffer.from(response.data);
    if (buffer.length < CONFIG.minImageSize) return null;

    const ct = response.headers['content-type'] || '';
    if (!ct.includes('image/')) return null;

    const dims = getImageDimensions(buffer);
    if (dims.width === 0 || dims.height === 0) return null;
    
    const mime = ct.includes('webp') ? 'image/webp' : 
                 ct.includes('png') ? 'image/png' : 'image/jpeg';

    return {
      url: hiResUrl,
      originalUrl: url,
      base64: `data:${mime};base64,${buffer.toString('base64')}`,
      size: buffer.length,
      width: dims.width,
      height: dims.height
    };
  } catch {
    // If high-res failed, try original
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: CONFIG.imageTimeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*'
        },
        maxContentLength: 25 * 1024 * 1024
      });

      const buffer = Buffer.from(response.data);
      if (buffer.length < CONFIG.minImageSize) return null;

      const ct = response.headers['content-type'] || '';
      if (!ct.includes('image/')) return null;

      const dims = getImageDimensions(buffer);
      const mime = ct.includes('webp') ? 'image/webp' : 
                   ct.includes('png') ? 'image/png' : 'image/jpeg';

      return {
        url,
        base64: `data:${mime};base64,${buffer.toString('base64')}`,
        size: buffer.length,
        width: dims.width,
        height: dims.height
      };
    } catch {
      return null;
    }
  }
}

function upgradeToHighRes(url) {
  let result = url;
  
  try {
    // Samsung CDN
    if (url.includes('samsung.com') || url.includes('samsungcdn')) {
      result = url
        .replace(/\/\d+_\d+_/, '/960_960_')
        .replace(/\/s\d+\//, '/s960/')
        .replace(/\?.*$/, '');
    }
    // Nike CDN
    else if (url.includes('nike.com') || url.includes('nike.net')) {
      result = url
        .replace(/\/t_[^/]+\//, '/t_default/')
        .replace(/\/w_\d+/, '/w_1200')
        .replace(/\?.*$/, '');
    }
    // Shopify
    else if (url.includes('cdn.shopify.com')) {
      result = url.replace(/_\d+x\d*\./, '_2048x.');
    }
    // Cloudinary
    else if (url.includes('cloudinary.com')) {
      result = url.replace(/\/w_\d+/, '/w_1600').replace(/\/q_\d+/, '/q_90');
    }
    // Generic patterns
    else {
      result = url
        .replace(/_thumb\./, '_large.')
        .replace(/_small\./, '_large.')
        .replace(/_medium\./, '_large.')
        .replace(/-\d+x\d+\./, '.');
    }
  } catch {}
  
  return result;
}

function getImageDimensions(buffer) {
  try {
    // JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length - 10) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          return { 
            height: buffer.readUInt16BE(offset + 5), 
            width: buffer.readUInt16BE(offset + 7) 
          };
        }
        offset += buffer.readUInt16BE(offset + 2) + 2;
      }
    }
    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return { 
        width: buffer.readUInt32BE(16), 
        height: buffer.readUInt32BE(20) 
      };
    }
    // WebP
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      const type = buffer.toString('ascii', 12, 16);
      if (type === 'VP8 ') {
        return { 
          width: buffer.readUInt16LE(26) & 0x3FFF, 
          height: buffer.readUInt16LE(28) & 0x3FFF 
        };
      }
      if (type === 'VP8L') {
        const bits = buffer.readUInt32LE(21);
        return { 
          width: (bits & 0x3FFF) + 1, 
          height: ((bits >> 14) & 0x3FFF) + 1 
        };
      }
      if (type === 'VP8X') {
        return {
          width: ((buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) & 0xFFFFFF) + 1,
          height: ((buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) & 0xFFFFFF) + 1
        };
      }
    }
  } catch {}
  return { width: 0, height: 0 };
}

/**
 * OPENAI VISION ANALYSIS
 */
async function analyzeWithOpenAI(images, pageData, url) {
  const domain = new URL(url).hostname.replace('www.', '');
  
  const systemPrompt = `You are an expert marketing analyst creating content for promotional videos/reels.

WEBPAGE INFO:
- URL: ${url}
- Domain: ${domain}
- Title: ${pageData.title}
- Description: ${pageData.description}
- Headlines: ${pageData.headlines.slice(0, 8).join(' | ')}

TASK: Analyze these ${images.length} images to extract information for a promotional video.

Return JSON:
{
  "brand": {
    "name": "Brand name",
    "description": "2-3 sentence brand description",
    "industry": "tech|fashion|sports|beauty|food|automotive|other",
    "tone": "premium|professional|casual|playful|luxury|energetic",
    "valueProposition": "Main selling point",
    "targetAudience": "Target customer description"
  },
  "products": ["Product 1", "Product 2", "Product 3"],
  "keyMessages": ["Message 1", "Message 2", "Message 3"],
  "images": [
    {
      "index": 0,
      "productName": "Specific product name (e.g., 'Galaxy S24 Ultra', 'Air Jordan 1')",
      "productCategory": "smartphone|laptop|tv|watch|earbuds|shoes|clothing|appliance|other",
      "description": "Detailed description of what's shown in the image",
      "keyFeatures": ["feature1", "feature2"],
      "visualStyle": "studio|lifestyle|closeup|hero|environmental|action",
      "mood": "premium|energetic|calm|professional|playful|sophisticated",
      "suggestedNarration": "15-20 word voiceover script for this image",
      "bestUsedFor": "hook|feature|detail|lifestyle|cta",
      "marketingScore": 0-100
    }
  ]
}

IMPORTANT:
- Be SPECIFIC about product names (e.g., "Galaxy S24 Ultra" not "phone")
- suggestedNarration should be compelling ad copy that matches the image
- marketingScore: 90+ for hero shots, 70-89 for good product shots, below 70 for others`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `Analyze these ${images.length} images from ${domain} for a promotional video. Be specific about products shown.` 
            },
            ...images.map(img => ({
              type: 'image_url',
              image_url: { url: img.base64, detail: 'high' }
            }))
          ]
        }
      ],
      max_tokens: 5000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    console.log(`   📦 Brand: ${result.brand?.name}`);
    console.log(`   🏷️ Products: ${result.products?.slice(0, 3).join(', ')}`);
    
    return result;

  } catch (error) {
    console.error('   ⚠️ OpenAI analysis error:', error.message);
    
    // Fallback
    return {
      brand: {
        name: pageData.ogSiteName || domain.split('.')[0],
        description: pageData.description,
        industry: 'other',
        tone: 'professional',
        valueProposition: '',
        targetAudience: ''
      },
      products: [],
      keyMessages: pageData.headlines.slice(0, 3),
      images: images.map((_, i) => ({
        index: i,
        productName: 'Product',
        productCategory: 'other',
        description: 'Product image',
        keyFeatures: [],
        visualStyle: 'studio',
        mood: 'professional',
        suggestedNarration: '',
        bestUsedFor: 'feature',
        marketingScore: 60
      }))
    };
  }
}

/**
 * CREATE FINAL RESULT
 */
function createFinalResult(url, analysis, validImages) {
  const finalImages = (analysis.images || []).map((imgAnalysis, i) => {
    const source = validImages[imgAnalysis.index ?? i];
    if (!source) return null;

    return {
      url: source.url,
      width: source.width,
      height: source.height,
      productName: imgAnalysis.productName || 'Product',
      productCategory: imgAnalysis.productCategory || 'other',
      alt: imgAnalysis.description || 'Product image',
      visualContent: imgAnalysis.description || 'Product image',
      keyFeatures: imgAnalysis.keyFeatures || [],
      visualStyle: imgAnalysis.visualStyle || 'studio',
      mood: imgAnalysis.mood || 'professional',
      suggestedNarration: imgAnalysis.suggestedNarration || '',
      bestUsedFor: imgAnalysis.bestUsedFor || 'feature',
      category: imgAnalysis.visualStyle === 'lifestyle' ? 'lifestyle' : 'product',
      quality: imgAnalysis.marketingScore >= 80 ? 'excellent' : 'good',
      marketingScore: imgAnalysis.marketingScore || 60,
      relevance: imgAnalysis.marketingScore >= 80 ? 'high' : 'medium',
      selected: i < 8
    };
  }).filter(Boolean).sort((a, b) => b.marketingScore - a.marketingScore);

  const result = {
    id: uuidv4(),
    url,
    status: 'completed',
    extractedContent: {
      title: analysis.brand?.name || '',
      description: analysis.brand?.description || '',
      pageType: 'product',
      headlines: (analysis.keyMessages || []).map(text => ({ text, included: true })),
      valueProposition: analysis.brand?.valueProposition || '',
      targetAudience: analysis.brand?.targetAudience || '',
      keyPoints: analysis.products || [],
      tone: analysis.brand?.tone || 'professional',
      industry: analysis.brand?.industry || 'other'
    },
    media: { images: finalImages, videos: [] },
    branding: {
      brandName: analysis.brand?.name || '',
      colors: [],
      logoUrl: ''
    }
  };

  fs.writeFileSync(CSV_PATH, 'data\n"' + JSON.stringify(result).replace(/"/g, '""') + '"', 'utf8');
  return result;
}