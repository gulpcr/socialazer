import { useCallback, useState } from 'react';
import { analyzeUrl, generateScript, getSuggestions } from '../lib/services/analysis';
import type { AnalysisResponse, GenerateScriptResponse, SuggestionsResponse } from '../lib/api-types';

export function useAnalyzeUrl() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const runAnalyze = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeUrl(url);
      setAnalysis(res);
      return res;
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const runGenerateScript = useCallback(async (analysisId: string, config: Record<string, any>) => {
    setLoading(true);
    try {
      const res: GenerateScriptResponse = await generateScript(analysisId, config);
      return res;
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const runSuggestions = useCallback(async (scriptId: string) => {
    setLoading(true);
    try {
      const res: SuggestionsResponse = await getSuggestions(scriptId);
      return res;
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, analysis, runAnalyze, runGenerateScript, runSuggestions } as const;
}
