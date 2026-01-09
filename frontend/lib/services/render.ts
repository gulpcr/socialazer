import api from '../api-client';
import type { RenderJob } from '../api-types';

export async function startRender(projectId: string, format = 'mp4', quality = 'high', resolution = '1080p') {
  return api.post<{ jobId: string; status: string; estimatedTime?: number }>('/render', { projectId, format, quality, resolution });
}

export async function getRenderStatus(jobId: string): Promise<RenderJob> {
  return api.get<RenderJob>(`/render/${jobId}`);
}

export async function downloadRender(jobId: string) {
  return api.get<Blob>(`/render/${jobId}/download`);
}
