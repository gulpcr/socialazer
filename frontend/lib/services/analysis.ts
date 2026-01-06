import api from '../api-client';
import type { AnalysisResponse, GenerateScriptResponse,SuggestionsResponse } from '../api-types';

export async function analyzeUrl(url: string): Promise<AnalysisResponse | any> {
  try {
    return await api.post<AnalysisResponse>('/analyze-url', { url });
    
  } catch {
    await api.post('/scrape', { url });
    const infoRes = await api.get('/info');
    return infoRes.data.scraped;
  }
}

export async function generateScript(analysisId: string, config: Record<string, any>): Promise<GenerateScriptResponse | any> {
  try{
    return api.post<GenerateScriptResponse>('/generate-script', { analysisId, config });
} catch{
    return api.post('set-config', { configData: config });
}
}

export async function getSuggestions(scriptId: string): Promise<SuggestionsResponse> {
  return api.post<SuggestionsResponse>('/suggestions', { scriptId });
}
