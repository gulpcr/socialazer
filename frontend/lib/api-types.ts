export interface AnalysisResponse {
  id: string;
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
  extractedContent: {
    title?: string;
    description?: string;
    pageType?: string;
    headlines?: Array<{ text: string; included?: boolean }>;
    valueProposition?: string;
    targetAudience?: string;
    keyPoints?: string[];
  };
  media: {
    images?: Array<{
      url: string;
      alt?: string;
      relevance?: string;
      selected?: boolean;
    }>;
    videos?: any[];
  };
  branding: { brandName?: string; colors?: string[]; logoUrl?: string };
}

export interface VideoConfig {
  analysisId?: string;
  config: {
    platform: "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin";
    duration: 15 | 30 | 60;
    aspectRatio: "9:16" | "1:1" | "16:9";
    tone: "professional" | "casual" | "energetic" | "emotional" | "humorous";
    voiceStyle: "narrative" | "conversational" | "urgent" | "calm";
  };
}

import type {
  AnimationType,
  TransitionType,
  VoiceOverPacing,
  TextStyle,
} from "@/lib/types";

export interface ScriptScene {
  id: string;
  order: number;
  duration: number;
  text?: string;
  primaryText: string;
  secondaryText?: string;
  voiceOver?: string;
  voiceOverPacing?: VoiceOverPacing;
  textStyle: TextStyle;
  visuals?: {
    type: string;
    url?: string;
    animation: AnimationType;
  };
  transition?: TransitionType;
}

export interface VideoScript {
  id: string;
  scenes: ScriptScene[];
  totalDuration: number;
}

export interface VideoScriptResponse {
  success: boolean;
  message: string;
  data: VideoScript;
}

export interface Suggestion {
  id: string;
  priority: string;
  category: string;
  title: string;
  description?: string;
  sceneId?: string;
  autoApplicable?: boolean;
  specificChange?: string[];
}

export interface ScriptSuggestions {
  scriptId: string;
  overallAssessment: string;
  generatedAt: string;
  suggestions: Suggestion[];
  qualityScores?: Record<string, number>;
}

export interface SuggestionsResponse {
  success: boolean;
  message: string;
  data: ScriptSuggestions;
}

export interface VoicePreset {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  language: string;
  provider: "elevenlabs" | "google";
  previewUrl?: string;
}

export interface VoicePresetsResponse {
  success: boolean;
  message: string;
  data: {
    presets: VoicePreset[];
  };
}

export interface VoiceOverRequest {
  text: string;
  voiceId: string;
  provider: string;
  settings?: Record<string, any>;
}

export interface VoiceOver {
  id: string;
  audioUrl: string;
  duration: number;
  format?: string;
  sampleRate?: number;
}
export interface VoiceOverResponse {
  success: boolean;
  message: string;
  data: VoiceOver;
}

export interface ReelData {
  status: "completed" | "failed";
  videoUrl?: string;
  completedAt?: string;
}
export interface GenerateReelResponse {
  success: boolean;
  message: string;
  data: ReelData;
}
