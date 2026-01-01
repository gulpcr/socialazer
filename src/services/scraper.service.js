// src/services/scraper.service.js
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CSV_PATH = path.join(__dirname, '..', 'scraped.csv');

/**
 * Validate and convert image URL to base64 if needed
 */
async function validateAndConvertImage(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      maxContentLength: 10 * 1024 * 1024 // 10MB max
    });

    const contentType = response.headers['content-type'] || '';
    const buffer = Buffer.from(response.data);

    // Check if it's a supported format
    const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!supportedFormats.some(format => contentType.includes(format))) {
      return null;
    }

    // Convert to base64 for GPT-4o Vision
    const base64 = buffer.toString('base64');
    
    // Determine the correct mime type
    let mimeType = contentType;
    if (contentType.includes('webp')) mimeType = 'image/webp';
    else if (contentType.includes('png')) mimeType = 'image/png';
    else if (contentType.includes('gif')) mimeType = 'image/gif';
    else mimeType = 'image/jpeg'; // Default to jpeg

    return {
      url: imageUrl,
      base64: `data:${mimeType};base64,${base64}`,
      mimeType,
      size: buffer.length
    };
  } catch (error) {
    console.error(`Failed to load image ${imageUrl}:`, error.message);
    return null;
  }
}

/**
 * Deterministic scraping with enhanced image collection
 */
async function scrapeWebpage(url) {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 15000
  });

  const $ = cheerio.load(response.data);
  $('script, style, noscript, iframe').remove();

  // Title
  const title =
    $('title').text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    '';

  // Description
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';

  // Enhanced brand name extraction
  const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
  const brandName =
    $('meta[property="og:site_name"]').attr('content') ||
    $('.logo img').attr('alt') ||
    $('.logo').text().trim() ||
    $('[class*="brand"]').first().text().trim() ||
    $('[class*="company"]').first().text().trim() ||
    domain.charAt(0).toUpperCase() + domain.slice(1) ||
    '';

  // Headlines (h1 + h2)
  const headlines = [];
  $('h1, h2').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 3) headlines.push(text);
  });

  // Enhanced image collection with context and lazy loading support
  const images = [];
  const seenUrls = new Set();

  // OG image first (usually high quality)
  const ogImg = $('meta[property="og:image"]').attr('content');
  if (ogImg) {
    try {
      const fullUrl = new URL(ogImg, url).href;
      if (!seenUrls.has(fullUrl)) {
        images.push({ 
          url: fullUrl,
          alt: 'og-image',
          context: 'hero',
          selector: 'og:image',
          priority: 10
        });
        seenUrls.add(fullUrl);
      }
    } catch {}
  }

  // Collect all images with enhanced context
  $('img').each((_, el) => {
    // Support multiple image loading patterns
    const src = $(el).attr('src') || 
                $(el).attr('data-src') || 
                $(el).attr('data-lazy-src') ||
                $(el).attr('data-original');
                
    const srcset = $(el).attr('srcset');
    const alt = $(el).attr('alt') || '';
    const width = parseInt($(el).attr('width') || '0', 10);
    const height = parseInt($(el).attr('height') || '0', 10);
    const className = $(el).attr('class') || '';
    const parentClass = $(el).parent().attr('class') || '';
    const loading = $(el).attr('loading') || '';

    let imageSrc = src;

    // Parse srcset for highest quality image
    if (srcset && !src) {
      const srcsetParts = srcset.split(',').map(s => s.trim());
      const highestRes = srcsetParts[srcsetParts.length - 1];
      imageSrc = highestRes.split(' ')[0];
    }

    if (!imageSrc) return;

    // Skip data URIs and SVGs (for now)
    if (imageSrc.startsWith('data:') || imageSrc.endsWith('.svg')) return;

    // Determine image context and priority for ad relevance
    let context = 'content';
    let priority = 1;
    const combinedContext = `${className} ${parentClass} ${alt}`.toLowerCase();
    
    if (combinedContext.match(/hero|banner|main|featured|primary|jumbotron|masthead/)) {
      context = 'hero';
      priority = 9;
    } else if (combinedContext.match(/logo|brand/)) {
      context = 'logo';
      priority = 8;
    } else if (combinedContext.match(/product|item|service|showcase/)) {
      context = 'product';
      priority = 7;
    } else if (combinedContext.match(/portfolio|work|project/)) {
      context = 'portfolio';
      priority = 6;
    } else if (combinedContext.match(/team|about|person|staff/)) {
      context = 'team';
      priority = 5;
    } else if (combinedContext.match(/testimonial|review|client/)) {
      context = 'testimonial';
      priority = 4;
    } else if (combinedContext.match(/background|bg/)) {
      context = 'background';
      priority = 3;
    }

    // Boost priority for larger images
    if (width > 800 || height > 600) priority += 2;
    if (loading === 'eager') priority += 1;

    // Skip very small images unless they're logos
    if ((width && width < 60) || (height && height < 60)) {
      if (context !== 'logo') return;
    }

    try {
      const fullUrl = new URL(imageSrc, url).href;
      
      // Skip duplicates
      if (seenUrls.has(fullUrl)) return;
      
      images.push({ 
        url: fullUrl,
        alt,
        context,
        selector: className || 'img',
        priority
      });
      seenUrls.add(fullUrl);
    } catch {}
  });

  // Sort by priority (highest first)
  images.sort((a, b) => b.priority - a.priority);

  // Brand colors from inline style & style tags
  const htmlText = $('*').map((_, el) => $(el).attr('style')).get().join(' ');
  const styleText = $('style').text();
  const colorRegex = /#([A-Fa-f0-9]{6})\b/g;
  const brandColors = [
    ...new Set(
      [...(htmlText.match(colorRegex) || []), ...(styleText.match(colorRegex) || [])]
    )
  ].slice(0, 10);

  // Page type based on URL
  let pageType = 'generic';
  if (url.match(/\/(product|shop|store)/)) pageType = 'product';
  else if (url.match(/\/pricing/)) pageType = 'pricing';
  else if (url.match(/\/blog/)) pageType = 'blog';
  else if (url.match(/\/about/)) pageType = 'about';
  else if (url === new URL(url).origin || url === new URL(url).origin + '/') pageType = 'homepage';

  // Extract key phrases for ad copy (CTAs, value props)
  const ctaTexts = [];
  $('a, button').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 2 && text.length < 50) {
      ctaTexts.push(text);
    }
  });

  return { 
    url,
    title, 
    description, 
    brandName, 
    headlines, 
    images, 
    brandColors, 
    pageType,
    ctaTexts: ctaTexts.slice(0, 15),
    domain
  };
}

/**
 * Analyze image quality using GPT-4o Vision with proper base64 encoding
 */
async function analyzeImagesForAds(images, brandName, description) {
  if (!images || images.length === 0) return [];

  console.log(`Validating and converting ${images.length} images...`);
  
  // Validate and convert images to base64
  const validatedImages = await Promise.all(
    images.slice(0, 15).map(img => validateAndConvertImage(img.url))
  );

  // Filter out failed images
  const validImages = validatedImages.filter(img => img !== null);

  if (validImages.length === 0) {
    console.log('⚠️  No valid images found for analysis');
    return [];
  }

  console.log(`✓ ${validImages.length} images validated, analyzing...`);

  try {
    // Batch analysis - analyze up to 10 images at once
    const batchSize = 10;
    const allAnalysis = [];

    for (let i = 0; i < validImages.length; i += batchSize) {
      const batch = validImages.slice(i, i + batchSize);
      const batchImages = images.slice(i, i + batchSize);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert in visual marketing and ad creative analysis. Analyze images for their advertising potential.

For each image, evaluate:
1. Visual Quality: Resolution, composition, professional appearance
2. Ad Suitability: Would this work in a promotional reel, social media ad, or marketing material?
3. Emotional Impact: Does it evoke positive emotions or showcase the brand well?
4. Relevance: How relevant is it to the brand's value proposition?

Return ONLY valid JSON array with objects containing:
- index: the image index (0, 1, 2, etc.)
- adScore: 0-100 score for advertising potential
- quality: "high", "medium", or "low"
- recommended: true/false (recommend for ads)
- reasoning: brief explanation (max 50 words)
- bestUseCase: "hero", "social", "banner", "product-showcase", "background", or "skip"

CRITICAL: Return a JSON array with ${batch.length} objects, one for each image.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Brand: ${brandName}\nDescription: ${description}\n\nAnalyze these ${batch.length} images for advertising potential.`
              },
              ...batch.map((img, idx) => ({
                type: 'image_url',
                image_url: { 
                  url: img.base64,
                  detail: 'low'
                }
              }))
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      let text = completion.choices[0].message.content.trim();
      text = text.replace(/```(?:json)?/g, '').trim();
      
      const first = text.indexOf('[');
      const last = text.lastIndexOf(']');
      
      if (first !== -1 && last !== -1) {
        text = text.substring(first, last + 1);
        const batchAnalysis = JSON.parse(text);
        
        // Map analysis back to original URLs
        batchAnalysis.forEach((analysis, idx) => {
          if (batchImages[idx]) {
            allAnalysis.push({
              ...analysis,
              url: batchImages[idx].url,
              originalContext: batchImages[idx].context
            });
          }
        });
      }
    }

    return allAnalysis;
  } catch (error) {
    console.error('Image analysis error:', error.message);
    return [];
  }
}

/**
 * Enhanced LLM enrichment with better brand name inference
 */
async function enrichWithOpenAI(scraped) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a professional web content analyst specializing in advertising and brand analysis.

Your task is to enrich scraped webpage data for advertising purposes. Return ONLY valid JSON with these fields:

- brandName: REQUIRED - Infer from title, headlines, domain, or repeated keywords. Never leave empty. Extract the company/product name.
- title: The page title
- description: Enhanced description suitable for ad copy
- pageType: Infer from URL or content (product, pricing, blog, about, homepage, generic)
- headlines: Array of {text, included, adWorthy} - adWorthy=true if it's a strong marketing message
- valueProposition: ONE compelling sentence about the main value/benefit (max 120 chars)
- targetAudience: Describe the intended audience in 1-2 sentences
- keyMessages: Array of 3-5 key marketing messages from the page
- emotionalTone: The emotional appeal (professional, exciting, trustworthy, innovative, etc.)
- ctaRecommendations: Best call-to-action phrases found on the page

CRITICAL RULES:
1. brandName is MANDATORY - Use title, domain, or most frequent capitalized words
2. Focus on marketing-relevant content
3. Return ONLY valid JSON, no markdown or explanations
4. All fields must be populated with meaningful data`
      },
      {
        role: 'user',
        content: JSON.stringify({
          url: scraped.url,
          domain: scraped.domain,
          title: scraped.title,
          description: scraped.description,
          brandName: scraped.brandName,
          headlines: scraped.headlines,
          ctaTexts: scraped.ctaTexts
        })
      }
    ],
    temperature: 0.3,
    max_tokens: 1200
  });

  let text = completion.choices[0].message.content.trim();
  text = text.replace(/```(?:json)?/g, '').trim();

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('LLM did not return valid JSON');
  text = text.substring(first, last + 1);

  const parsed = JSON.parse(text);
  
  // Fallback brand name extraction if LLM still fails
  if (!parsed.brandName || parsed.brandName === '') {
    parsed.brandName = scraped.brandName || 
                       scraped.title.split(/[-–|]/)[0].trim() ||
                       scraped.domain.charAt(0).toUpperCase() + scraped.domain.slice(1);
  }

  return parsed;
}

/**
 * Public API - Enhanced for ad content selection
 */
exports.scrapeWebsite = async url => {
  console.log(`\n🔍 Scraping ${url}...`);
  const scraped = await scrapeWebpage(url);
  console.log(`✓ Found ${scraped.images.length} images on page`);
  
  console.log('🤖 Enriching with AI...');
  const enrichment = await enrichWithOpenAI(scraped);

  console.log('🎨 Analyzing images for ad quality...');
  const imageAnalysis = await analyzeImagesForAds(
    scraped.images, 
    enrichment.brandName, 
    enrichment.description
  );

  // Merge and filter images - keep only high-quality, ad-worthy images
  const images = scraped.images
    .map((img) => {
      const analysis = imageAnalysis.find(a => a.url === img.url) || {};
      return {
        url: img.url,
        context: img.context,
        alt: img.alt,
        adScore: analysis.adScore || 0,
        quality: analysis.quality || 'unknown',
        recommended: analysis.recommended || false,
        reasoning: analysis.reasoning || 'Not analyzed',
        bestUseCase: analysis.bestUseCase || 'skip'
      };
    })
    .filter(img => img.recommended || img.adScore > 50) // Keep recommended or high-scoring
    .sort((a, b) => b.adScore - a.adScore)
    .slice(0, 10); // Keep top 10 images

  // If no images passed the filter, keep top 3 by original priority as fallback
  if (images.length === 0 && scraped.images.length > 0) {
    console.log('⚠️  No images met quality threshold, keeping top 3 as fallback');
    images.push(...scraped.images.slice(0, 3).map(img => ({
      url: img.url,
      context: img.context,
      alt: img.alt,
      adScore: 60,
      quality: 'medium',
      recommended: true,
      reasoning: 'Fallback selection - high priority from page',
      bestUseCase: img.context
    })));
  }

  // Merge headlines with ad-worthiness
  const headlines = (enrichment.headlines || scraped.headlines || []).map(h => {
    const text = h?.text || h || '';
    return { 
      text, 
      included: text.length > 15,
      adWorthy: h?.adWorthy || false
    };
  }).filter(h => h.included);

  const result = {
    id: uuidv4(),
    url,
    scrapedAt: new Date().toISOString(),
    
    // Brand Identity
    brandName: enrichment.brandName,
    title: scraped.title,
    description: enrichment.description || scraped.description,
    brandColors: scraped.brandColors.slice(0, 5),
    
    // Content Analysis
    pageType: enrichment.pageType || scraped.pageType || 'generic',
    valueProposition: enrichment.valueProposition || '',
    targetAudience: enrichment.targetAudience || '',
    emotionalTone: enrichment.emotionalTone || '',
    
    // Marketing Content
    headlines: headlines.slice(0, 5),
    keyMessages: enrichment.keyMessages || [],
    ctaRecommendations: enrichment.ctaRecommendations || [],
    
    // Ad-Ready Assets
    adReadyImages: images,
    imageCount: images.length,
    
    // Metadata
    totalImagesAnalyzed: scraped.images.length,
    qualityScore: images.length > 0 ? Math.round(images.reduce((sum, img) => sum + img.adScore, 0) / images.length) : 0
  };

  // Save enhanced CSV
  const csv = 'data\n' + `"${JSON.stringify(result).replace(/"/g, '""')}"`;
  fs.writeFileSync(CSV_PATH, csv, 'utf8');

  console.log(`✅ Scraped ${result.brandName}`);
  console.log(`   📊 ${images.length} ad-ready images (from ${scraped.images.length} total)`);
  console.log(`   ⭐ Average quality score: ${result.qualityScore}/100\n`);
  
  return result;
};