export type AdStatus = "draft" | "rendering" | "ready" | "failed";

export interface Ad {
  id: string;
  name: string;
  thumbnail: string;
  status: AdStatus;
  createdAt: string;
  updatedAt: string;
  templateId: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
}

export interface Template {
  id: string;
  name: string;
  thumbnail: string;
  formats: ("9:16" | "1:1" | "16:9")[];
  platform: "reels" | "shorts" | "feed" | "all";
  industry: string;
}

export interface Asset {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  url: string;
  thumbnail?: string;
  createdAt: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: "male" | "female" | "neutral";
}

export interface RenderJob {
  id: string;
  adId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  format: "mp4" | "png";
  outputUrl?: string;
}

export const ANIMATIONS = [
  "fade-in",
  "zoom-in",
  "zoom-out",
  "slide-up",
  "pan",
  "none",
] as const;
export type AnimationType = (typeof ANIMATIONS)[number];

export const TEXTSTYLES = [
  "bold_uppercase",
  "bold",
  "uppercase",
  "body",
  "italic",
] as const;
export type TextStyle = (typeof TEXTSTYLES)[number];

export const TRANSITIONS = ["fade", "cut", "dissolve", "slide"] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

export const PACINGS = ["slow", "normal", "fast"] as const;
export type VoiceOverPacing = (typeof PACINGS)[number];

export interface ScoreMetrics {
  engagement: number;
  clarity: number;
  brandAlignment: number;
  callToAction: number;
}

export interface VoicePreset {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  language: string;
  provider: "elevenlabs" | "google";
  previewUrl?: string;
}
