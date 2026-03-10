import { useEffect, useState, useCallback } from 'react';
import { getPartsForModel, createPartForModel, deletePart, VehiclePartData } from '@/api/database';

export function useModelParts(modelId?: string) {
  const [parts, setParts] = useState<VehiclePartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Check admin status
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setIsAdmin(user.isAdmin === true || user.role === 'admin');
      }
    } catch (e) {
      console.error('Error checking admin status:', e);
    }
  }, []);

  // Fetch parts
  const fetchParts = useCallback(async () => {
    if (!modelId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getPartsForModel(modelId);
      setParts(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des pièces';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Add a new part
  const addPart = async (data: Omit<VehiclePartData, 'id' | 'model_id' | 'created_at' | 'updated_at'>) => {
    if (!modelId) return { success: false, error: 'Model ID manquant' };

    setIsSaving(true);

    try {
      const newPart = await createPartForModel(modelId, data);
      setParts(prev => [newPart, ...prev]);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'ajout de la pièce';
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a part
  const removePart = async (partId: number) => {
    setDeletingId(partId);

    try {
      await deletePart(partId);
      setParts(prev => prev.filter(p => p.id !== partId));
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      return { success: false, error: message };
    } finally {
      setDeletingId(null);
    }
  };

  return {
    parts,
    loading,
    error,
    isAdmin,
    isSaving,
    deletingId,
    addPart,
    removePart,
    refresh: fetchParts,
  };
}

