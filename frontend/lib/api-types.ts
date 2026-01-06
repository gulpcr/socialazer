export interface AnalysisResponse {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extractedContent?: {
    title?: string;
    description?: string;
    pageType?: string;
    headlines?: Array<{ text: string; included?: boolean }>;
    valueProposition?: string;
    targetAudience?: string;
    keyPoints?: string[];
  };
  media?: { images?: Array<{ url: string; alt?: string; relevance?: string; selected?: boolean }>; videos?: any[] };
  branding?: { brandName?: string; colors?: string[]; logoUrl?: string };
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

export interface GenerateScriptResponse {
  id: string;
  scenes: ScriptScene[];
  totalDuration: number;
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