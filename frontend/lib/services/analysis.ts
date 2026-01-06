import api from "../api-client";
import type {
  AnalysisResponse,
  VideoScriptResponse as GenerateScriptResponse,
  SuggestionsResponse,
} from "../api-types";

export async function analyzeUrl(url: string): Promise<AnalysisResponse> {
  return await api.post<AnalysisResponse>("/analyze-url", { url });
}

export async function generateScript(
  analysisId: string,
  config: Record<string, any>
): Promise<GenerateScriptResponse | any> {
  return api.post<GenerateScriptResponse>("/generate-script", {
    analysisId,
    config,
  });
}

export async function getSuggestions(
  scriptId: string
): Promise<SuggestionsResponse> {
  return api.post<SuggestionsResponse>("/suggestions", { scriptId });
}
