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

export interface ScriptScene {
  id: string;
  order: number;
  duration: number;
  text?: string;
  voiceOver?: string;
  visuals?: { type: string; url?: string; animation?: string };
  transition?: string;
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
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  qualityScores?: Record<string, number>;
}
