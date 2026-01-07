import { useCallback, useState } from "react";
import { generateVoiceOver, getVoicePresets } from "../lib/services/voice";
import type {
  AnalysisResponse,
  VideoScriptResponse as GenerateScriptResponse,
  SuggestionsResponse,
  VoiceOverResponse,
  VoiceOver,
  VoiceOverRequest,
  VoicePresetsResponse,
} from "../lib/api-types";
import { VoicePreset } from "@/lib/types";

export function useVoiceOver() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const voiceOverGeneration = useCallback(async (voice: VoiceOverRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateVoiceOver(
        voice.text,
        voice.voiceId,
        voice.provider,
        voice.settings
      );
      console.log("Voice Over response:", res);
      return res.data;
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVoiceOverPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res: { presets: VoicePreset[] } = await getVoicePresets();
      console.log("Voice Presets response:", res);
      return res;
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    voiceOverGeneration,
    getVoiceOverPresets,
  } as const;
}
