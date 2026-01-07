import api from "../api-client";
import type {
  VoiceOverResponse,
  VoicePreset,
  VoicePresetsResponse,
} from "../api-types";

export async function generateVoiceOver(
  text: string,
  voiceId: string,
  provider: string,
  settings?: Record<string, any>
): Promise<VoiceOverResponse> {
  const res = await api.post<VoiceOverResponse>("/voice-over/generate", {
    text,
    voiceId,
    provider,
    settings,
  });
  console.log("Voice Over API response:", res);
  return res;
}

export async function getVoicePresets(): Promise<{
  presets: VoicePresetsResponse["data"]["presets"];
}> {
  const res = await api.get("/voice-over/presets");
  console.log("Voice Presets API response:", res);
  return res.data;
}
