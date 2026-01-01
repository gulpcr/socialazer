const fs = require('fs');
const path = require('path');
// import OpenAI from 'openai';
const OpenAI = require("openai");

/* ----------------------------- Configuration ----------------------------- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SCRAPED_CSV_PATH = path.resolve(process.cwd(), 'src', 'scraped.csv');
const OUTPUT_VIDEO_PATH = path.resolve(process.cwd(), 'reel.mp4');

const VIDEO_MODEL = 'sora-2-pro';
const VIDEO_SIZE = '1280x720';
const VIDEO_SECONDS = '12';


/* ----------------------------- CSV Utilities ----------------------------- */

/**
 * Minimal CSV reader for a single-row CSV with a `data` column.
 * Assumes escaped quotes as shown in your sample.
 */
function readScrapedCSV() {
  const raw = fs.readFileSync(SCRAPED_CSV_PATH, 'utf-8').trim();

  const lines = raw.split('\n');
  if (lines.length < 2) {
    throw new Error('scraped.csv does not contain data rows');
  }

  const headers = lines[0].split(',');
  const dataIndex = headers.findIndex(h => h.trim() === 'data');

  if (dataIndex === -1) {
    throw new Error('scraped.csv missing `data` column');
  }

  // Join remaining columns in case commas exist inside JSON
  const row = lines[1]
    .split(',')
    .slice(dataIndex)
    .join(',');

  const parsed = JSON.parse(row.replace(/^"|"$/g, '').replace(/""/g, '"'));
  return parsed;
}

/* -------------------------- Script Generation ---------------------------- */

/**
 * Converts scraped brand data into a cinematic, Sora-optimized reel script.
 */
function buildPromotionalScript(brand) {
  const headline = brand.headlines.find(h => h.adWorthy)?.text;
  const cta = brand.ctaRecommendations?.[0] ?? 'Get Started';

  return {
    brandName: brand.brandName,
    tone: brand.emotionalTone,
    scenes: [
      {
        duration: 3,
        visual: `Wide cinematic shot of a modern tech office, fast-paced yet elegant atmosphere, subtle motion blur`,
        onScreenText: headline,
        voiceover: `Hiring is broken. Pipelines fail. Time is wasted.`,
      },
      {
        duration: 4,
        visual: `Close-up shots of AI interfaces analyzing profiles, glowing data points, smooth UI animations`,
        onScreenText: '800M+ Global Talent. Instantly.',
        voiceover: brand.keyMessages[0],
      },
      {
        duration: 3,
        visual: `Medium shot of diverse teams collaborating remotely, screens lighting faces, confident expressions`,
        onScreenText: 'Hire Across Every Stack',
        voiceover: brand.keyMessages[2],
      },
      {
        duration: 2,
        visual: `Hero shot of ${brand.brandName} logo on dark background, subtle particle animation, premium lighting`,
        onScreenText: cta,
        voiceover: `${brand.brandName}. Hire smarter. Faster.`,
      },
    ],
    brandColor: brand.brandColors?.[0] ?? '#000000',
    logo: brand.adReadyImages?.find(i => i.context === 'logo')?.url,
  };
}

/**
 * Converts the structured script into a single Sora prompt.
 */
function buildSoraPrompt(script) {
  const sceneDescriptions = script.scenes
    .map(
      (scene, idx) => `
Scene ${idx + 1} (${scene.duration}s):
Shot: ${scene.visual}
On-screen text: "${scene.onScreenText}"
Voiceover narration: "${scene.voiceover}"
Lighting: cinematic, high contrast, premium tech aesthetic
`
    )
    .join('\n');

  return `
Create a high-end promotional video reel for a tech startup.

Brand: ${script.brandName}
Emotional tone: ${script.tone}
Primary color accent: ${script.brandColor}

Style:
- Cinematic
- Modern SaaS
- Clean typography
- Smooth camera motion
- Professional advertising quality

Structure:
${sceneDescriptions}

Final frame:
Brand logo centered with subtle glow, call-to-action text visible.

Ensure:
- Text is legible on mobile
- No random elements
- No invented branding
- Consistent visual language
`;
}

/* -------------------------- Sora API Functions ---------------------------- */

/**
 * Function 1:
 * Reads scraped data → builds script → starts Sora video generation
 */
async function createReel() {
  const brandData = readScrapedCSV();
  const promoScript = buildPromotionalScript(brandData);
  const soraPrompt = buildSoraPrompt(promoScript);

  const video = await openai.videos.create({
    model: VIDEO_MODEL,
    prompt: soraPrompt,
    size: VIDEO_SIZE,
    seconds: VIDEO_SECONDS,
  });

  return {
    videoId: video.id,
    status: video.status,
  };
}

/**
 * Function 2:
 * Polls Sora job → downloads MP4 once completed
 */
async function fetchReel(videoId) {
  let video = await openai.videos.retrieve(videoId);

  while (video.status === 'queued' || video.status === 'in_progress') {
    await new Promise(res => setTimeout(res, 2000));
    video = await openai.videos.retrieve(videoId);
  }

  if (video.status !== 'completed') {
    throw new Error(`Video generation failed with status: ${video.status}`);
  }

  const content = await openai.videos.downloadContent(videoId);
  const buffer = Buffer.from(await content.arrayBuffer());

  fs.writeFileSync(OUTPUT_VIDEO_PATH, buffer);

  return {
    status: 'completed',
    path: OUTPUT_VIDEO_PATH,
  };
}

module.exports = {
  createReel,
  fetchReel,
};
