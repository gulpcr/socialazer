import { useCallback, useState } from 'react';
import { uploadAsset, listAssets, deleteAsset } from '../lib/services/assets';
import type { Asset } from '../lib/api-types';

export function useAssets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(async (file: File, type: 'image' | 'video' | 'audio', name?: string) => {
    setLoading(true);
    setError(null);
    try {
      return await uploadAsset(file, type, name);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const list = useCallback(async (type?: string, page = 1, limit = 20) => {
    setLoading(true);
    try {
      return await listAssets(type, page, limit);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    try {
      return await deleteAsset(id);
    } catch (e: any) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, upload, list, remove } as const;
}
