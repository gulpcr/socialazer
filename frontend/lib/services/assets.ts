import api from '../api-client';
import type { Asset } from '../api-types';

export async function uploadAsset(file: File, type: 'image' | 'video' | 'audio', name?: string): Promise<Asset> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', type);
  if (name) fd.append('name', name);
  return api.upload<Asset>('/assets/upload', fd);
}

export async function listAssets(type?: string, page = 1, limit = 20): Promise<{ assets: Asset[]; pagination: any }> {
  const q = new URLSearchParams();
  if (type) q.set('type', type);
  q.set('page', String(page));
  q.set('limit', String(limit));
  return api.get(`/assets?${q.toString()}`);
}

export async function deleteAsset(id: string): Promise<void> {
  return api.delete(`/assets/${id}`);
}
