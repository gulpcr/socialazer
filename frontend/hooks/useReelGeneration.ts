import { useCallback, useState } from "react";
import { generateVoiceOver, getVoicePresets } from "../lib/services/voice";
import type { ReelData } from "../lib/api-types";
import { VoicePreset } from "@/lib/types";
import { StringDecoder } from "string_decoder";
import { generateReel } from "@/lib/services/reel";

export function useReelGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reelGeneration = useCallback(async (scriptId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res: ReelData = await generateReel(scriptId);
      console.log("Reel response:", res);
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
    reelGeneration,
  } as const;
}
