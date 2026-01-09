import api from '../api-client';
import type { Project } from '../api-types';

export async function createProject(name: string, scriptId?: string, config?: Record<string, any>): Promise<Project> {
  return api.post<Project>('/projects', { name, scriptId, config });
}

export async function getProject(id: string): Promise<Project> {
  return api.get<Project>(`/projects/${id}`);
}

export async function listProjects(page = 1, limit = 20): Promise<{ projects: Project[]; pagination?: any }> {
  const q = new URLSearchParams();
  q.set('page', String(page));
  q.set('limit', String(limit));
  return api.get(`/projects?${q.toString()}`);
}

export async function updateProjectLayers(id: string, layers: any[]): Promise<{ success: boolean; updatedLayers: any[] }> {
  return api.put(`/projects/${id}/layers`, { layers });
}

export async function addLayer(id: string, layer: any): Promise<any> {
  return api.post(`/projects/${id}/layers`, layer);
}

export async function deleteLayer(id: string, layerId: string): Promise<void> {
  return api.delete(`/projects/${id}/layers/${layerId}`);
}

export async function reorderLayers(id: string, layerIds: string[]): Promise<void> {
  return api.put(`/projects/${id}/layers/reorder`, { layerIds });
}

export async function shareProject(id: string, permission: 'view' | 'edit', expiresIn?: number): Promise<{ shareUrl: string; expiresAt: string }> {
  return api.post(`/projects/${id}/share`, { permission, expiresIn });
}
