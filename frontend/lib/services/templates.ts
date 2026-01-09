import api from '../api-client';
import type { TemplateItem } from '../api-types';

export async function listTemplates(platform?: string, industry?: string): Promise<{ templates: TemplateItem[] }> {
  const q = new URLSearchParams();
  if (platform) q.set('platform', platform);
  if (industry) q.set('industry', industry);
  return api.get(`/templates?${q.toString()}`);
}

export async function createProjectFromTemplate(templateId: string, name: string) {
  return api.post(`/templates/${templateId}/create-project`, { name });
}
