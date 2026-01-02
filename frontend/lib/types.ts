export type AdStatus = "draft" | "rendering" | "ready" | "failed"

export interface Ad {
  id: string
  name: string
  thumbnail: string
  status: AdStatus
  createdAt: string
  updatedAt: string
  templateId: string
  aspectRatio: "9:16" | "1:1" | "16:9"
}

export interface Template {
  id: string
  name: string
  thumbnail: string
  formats: ("9:16" | "1:1" | "16:9")[]
  platform: "reels" | "shorts" | "feed" | "all"
  industry: string
}

export interface Asset {
  id: string
  name: string
  type: "image" | "video" | "audio"
  url: string
  thumbnail?: string
  createdAt: string
}

export interface VoiceOption {
  id: string
  name: string
  language: string
  gender: "male" | "female" | "neutral"
}

export interface RenderJob {
  id: string
  adId: string
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  format: "mp4" | "png"
  outputUrl?: string
}

export interface URLAnalysis {
  id: string
  url: string
  title: string
  description: string
  pageType: "product" | "service" | "landing" | "article"
  headlines: { text: string; included: boolean }[]
  valueProposition: string
  targetAudience: string
  images: { url: string; relevance: "high" | "medium" | "low"; selected: boolean }[]
  brandColors: string[]
  brandName: string
}

export interface VideoConfig {
  platform: "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin"
  duration: 15 | 30 | 60
  aspectRatio: "9:16" | "1:1" | "16:9"
  tone: "professional" | "casual" | "energetic" | "emotional" | "humorous"
  voiceStyle: "narrative" | "conversational" | "urgent" | "calm"
}

export interface Scene {
  id: string
  name: string
  duration: number
  primaryText: string
  secondaryText?: string
  textStyle: "headline" | "body" | "caption" | "cta"
  voiceOver: string
  voiceOverPacing: "slow" | "normal" | "fast"
  imageUrl: string
  transition: "cut" | "fade" | "slide" | "zoom"
  animation: "none" | "ken-burns" | "parallax" | "fade-in"
  notes?: string
}

export interface VideoScript {
  id: string
  analysisId: string
  scenes: Scene[]
  totalDuration: number
}

export interface Suggestion {
  id: string
  priority: "high" | "medium" | "low"
  category: "content" | "visuals" | "audio" | "cta"
  title: string
  description: string
  autoApplicable: boolean
}

export interface ScoreMetrics {
  engagement: number
  clarity: number
  brandAlignment: number
  callToAction: number
}

export interface VoicePreset {
  id: string
  name: string
  gender: "male" | "female" | "neutral"
  language: string
  provider: "elevenlabs" | "google"
  previewUrl?: string
}
