import api from "../api-client";
import type { GenerateReelResponse, ReelData, UpdateScriptRequest, UpdateScriptResponse } from "../api-types";

export async function generateReel(scriptId?: string): Promise<ReelData> {
  const res = await api.post<GenerateReelResponse>("/generate-reel", {
    scriptId,
  });
  console.log("Reel API response:", res);
  return res.data;
}

export async function updateScript(updates: UpdateScriptRequest): Promise<UpdateScriptResponse> {
  return api.patch<UpdateScriptResponse>("/scripts/update-script", updates);
}
