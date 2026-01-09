import { useCallback, useState } from "react";
import type { ReelData, UpdateScriptRequest, UpdateScriptResponse } from "../lib/api-types";
import { generateReel, updateScript } from "@/lib/services/index";

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

  const update = useCallback(async (updates: UpdateScriptRequest) => {
    setLoading(true);
    setError(null);
    try {
      return await updateScript(updates);
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
    updateScript: update,
  } as const;
}
