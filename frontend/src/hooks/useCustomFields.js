/**
 * hooks/useCustomFields.js
 *
 * Hook pour charger les champs personnalisés d'un module
 * et sauvegarder leurs valeurs.
 *
 * Usage :
 *   const { champs, valeurs, setValeur, sauvegarder, loading } =
 *     useCustomFields({ module: 'patient', objectId: 42, topographieCode: 'C50' });
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

export default function useCustomFields({ module, objectId = null, topographieCode = '' }) {
  const [champs,   setChamps]   = useState([]);   // définitions des champs
  const [valeurs,  setValeurs]  = useState({});   // { code: valeur }
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  // ── Charger les champs du module ──────────────────────────
  useEffect(() => {
    if (!module) return;

    const fetchChamps = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ module, actif: 'true' });
        if (topographieCode) params.append('topographie_code', topographieCode);

        const { data } = await apiClient.get(`/custom-fields/champs/?${params}`);
        setChamps(data.results || data);
      } catch (err) {
        setError('Impossible de charger les champs personnalisés.');
        console.error('useCustomFields — champs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChamps();
  }, [module, topographieCode]);

  // ── Charger les valeurs existantes (si objectId connu) ────
  useEffect(() => {
    if (!module || !objectId) return;

    const fetchValeurs = async () => {
      try {
        const { data } = await apiClient.get(
          `/custom-fields/valeurs/pour-objet/?module=${module}&object_id=${objectId}`
        );
        // Convertir array → dict { code: valeur }
        const dict = {};
        data.forEach(v => { dict[v.champ_code] = v.valeur ?? ''; });
        setValeurs(dict);
      } catch (err) {
        console.error('useCustomFields — valeurs:', err);
      }
    };

    fetchValeurs();
  }, [module, objectId]);

  // ── Modifier une valeur localement ───────────────────────
  const setValeur = useCallback((code, valeur) => {
    setValeurs(prev => ({ ...prev, [code]: valeur }));
  }, []);

  // ── Sauvegarder toutes les valeurs (bulk) ─────────────────
  const sauvegarder = useCallback(async (objId = objectId) => {
    if (!objId) {
      console.warn('useCustomFields.sauvegarder — objectId manquant');
      return { success: false };
    }
    if (Object.keys(valeurs).length === 0) return { success: true, saved: 0 };

    setSaving(true);
    try {
      const { data } = await apiClient.post('/custom-fields/valeurs/bulk-save/', {
        module,
        object_id: objId,
        valeurs,
      });
      return { success: true, ...data };
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erreur lors de la sauvegarde.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, [module, objectId, valeurs]);

  // ── Valider les champs obligatoires ───────────────────────
  const valider = useCallback(() => {
    const manquants = champs
      .filter(c => c.obligatoire && (!valeurs[c.code] || String(valeurs[c.code]).trim() === ''))
      .map(c => c.nom);
    return { valide: manquants.length === 0, manquants };
  }, [champs, valeurs]);

  return {
    champs,
    valeurs,
    setValeur,
    sauvegarder,
    valider,
    loading,
    saving,
    error,
  };
}