import { useCallback, useState } from 'react';
import { createProject, getProject, updateProjectLayers, addLayer, deleteLayer, reorderLayers, shareProject } from '../lib/services/projects';

export function useProjects() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (name: string, scriptId?: string, config?: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      return await createProject(name, scriptId, config);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const list = useCallback(async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      // dynamically import to avoid circular deps
      const svc = await import('../lib/services/projects');
      return await svc.listProjects(page, limit);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetch = useCallback(async (id: string) => {
    setLoading(true);
    try {
      return await getProject(id);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLayers = useCallback(async (id: string, layers: any[]) => {
    setLoading(true);
    try {
      return await updateProjectLayers(id, layers);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (id: string, layer: any) => {
    setLoading(true);
    try {
      return await addLayer(id, layer);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string, layerId: string) => {
    setLoading(true);
    try {
      return await deleteLayer(id, layerId);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reorder = useCallback(async (id: string, layerIds: string[]) => {
    setLoading(true);
    try {
      return await reorderLayers(id, layerIds);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const share = useCallback(async (id: string, permission: 'view' | 'edit', expiresIn?: number) => {
    setLoading(true);
    try {
      return await shareProject(id, permission, expiresIn);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, create, fetch, updateLayers, add, remove, reorder, share } as const;
}

export type UseProjects = ReturnType<typeof useProjects>;

