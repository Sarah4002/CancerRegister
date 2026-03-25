/**
 * statsApi.js  —  Service API pour StatsPage.jsx
 * ================================================
 * Toutes les méthodes appellent le backend Django via JWT.
 *
 * Convention backend :
 *   GET  /api/stats/chart-data/<source>/?annee=2024&sexe=Hommes
 *   GET  /api/stats/kpi/?annee=2024
 *   POST /api/stats/ai/report/          { titre, annee, sexe, … }
 *   GET  /api/stats/ai/report/<id>/
 *
 * La réponse du backend est soit :
 *   { data: [...] }    ← cas standard
 *   [...]              ← tableau direct (ChartCard normalise les deux)
 */

import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env?.VITE_STATS_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires internes
// ─────────────────────────────────────────────────────────────────────────────

/** Lit le JWT depuis le localStorage (clé standard). */
const getToken = () =>
  localStorage.getItem('access_token') ||
  localStorage.getItem('token') ||
  '';

/** En-têtes avec Authorization Bearer. */
const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

/**
 * Construit les query-params depuis un objet de filtres.
 * Les tableaux sont répétés : { ids: [1,2] } → "ids=1&ids=2".
 * Les valeurs null / undefined / '' / 'all' / 'Tous' sont ignorées.
 */
function toQS(filters = {}) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'all' || v === 'Tous') return;
    if (Array.isArray(v)) {
      v.forEach(item => p.append(k, item));
    } else {
      p.append(k, v);
    }
  });
  return p.toString();
}

/**
 * Fetch générique avec gestion des erreurs et refresh token.
 */
async function apiFetch(path, opts = {}) {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: authHeaders(),
    ...opts,
  });

  // Token expiré → émet un événement global pour que l'app redirige vers /login
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new Error('Session expirée — veuillez vous reconnecter.');
  }

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail || body?.message || body?.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// API principale
// ─────────────────────────────────────────────────────────────────────────────

export const statsApi = {

  // ── KPI global ─────────────────────────────────────────────────────────────
  /**
   * Retourne les KPIs principaux affichés en haut de la page.
   * @returns {{ total_cas, nouveaux_cas, taux_incidence, deces, survie_5ans, types_cancer }}
   */
  async getKPI(filters = {}) {
    const qs = toQS(filters);
    return apiFetch(`/api/stats/kpi/${qs ? '?' + qs : ''}`);
  },

  // ── Chart Data (point d'entrée principal pour ChartCard) ───────────────────
  /**
   * Récupère les données d'un graphique identifié par son `source` (endpoint).
   *
   * Exemple d'appel depuis ChartCard :
   *   statsApi.getChartData('cancer_count', { annee: 2024, sexe: 'Femmes' })
   *
   * Le backend retourne { data: [...] } ou directement [...].
   * ChartCard normalise : Array.isArray(res) ? res : (res?.data || [])
   *
   * @param {string} source   - Identifiant du endpoint (ex: 'cancer_count')
   * @param {object} filters  - Filtres actifs
   * @returns {Promise<Array|object>}
   */
  async getChartData(source, filters = {}) {
    const qs = toQS(filters);
    return apiFetch(`/api/stats/chart-data/${source}/${qs ? '?' + qs : ''}`);
  },

  // ── Shortcuts pratiques (optionnels — utilisez getChartData en priorité) ───

  async getCancerCount(filters = {}) {
    return this.getChartData('cancer_count', filters);
  },

  async getCancerSexe(filters = {}) {
    return this.getChartData('cancer_sexe', filters);
  },

  async getCancerStade(filters = {}) {
    return this.getChartData('cancer_stade', filters);
  },

  async getByAge(filters = {}) {
    return this.getChartData('age_count', filters);
  },

  async getByStade(filters = {}) {
    return this.getChartData('stade_count', filters);
  },

  async getByWilaya(filters = {}) {
    return this.getChartData('wilaya_cas', filters);
  },

  async getMonthly(filters = {}) {
    return this.getChartData('monthly_cas', filters);
  },

  async getSurvival(filters = {}) {
    return this.getChartData('survival', filters);
  },

  // ── Rapport IA ─────────────────────────────────────────────────────────────
  /**
   * Crée un nouveau rapport IA (génération asynchrone côté backend).
   * @returns {{ id, status: 'pending'|'done', titre, contenu_md?, recommandations? }}
   */
  async generateReport(payload) {
    return apiFetch('/api/stats/ai/report/', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
  },

  /**
   * Récupère l'état d'un rapport IA.
   * Polling depuis MiniAIReport toutes les 1.5 s jusqu'à status === 'done'.
   * @returns {{ id, status, titre, contenu_md, recommandations }}
   */
  async getReport(id) {
    return apiFetch(`/api/stats/ai/report/${id}/`);
  },

  /** Liste les rapports de l'utilisateur courant. */
  async listReports() {
    return apiFetch('/api/stats/ai/report/');
  },

  // ── Suggestions IA ─────────────────────────────────────────────────────────
  /**
   * Demande au backend de suggérer les graphiques les plus pertinents.
   * @returns {Array<{ source, label, score, reason }>}
   */
  async suggestCharts(filters = {}) {
    const qs = toQS(filters);
    return apiFetch(`/api/stats/ai/suggest-charts/${qs ? '?' + qs : ''}`);
  },

  // ── Recherche ──────────────────────────────────────────────────────────────
  async search(q, limit = 10) {
    return apiFetch(`/api/search/?q=${encodeURIComponent(q)}&limit=${limit}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook React optionnel (pour les composants qui ne passent pas par ChartCard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook qui enveloppe les appels API avec état loading/error.
 *
 * Usage :
 *   const { loading, error, getChartData } = useStatsApi();
 *   const data = await getChartData('cancer_count', filters);
 */
export function useStatsApi() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const execute = async (apiCall) => {
    setLoading(true);
    setError(null);
    try {
      return await apiCall();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getKPI:           (filters)         => execute(() => statsApi.getKPI(filters)),
    getChartData:     (source, filters) => execute(() => statsApi.getChartData(source, filters)),
    generateReport:   (payload)         => execute(() => statsApi.generateReport(payload)),
    getReport:        (id)              => execute(() => statsApi.getReport(id)),
    search:           (q)               => execute(() => statsApi.search(q)),
    suggestCharts:    (filters)         => execute(() => statsApi.suggestCharts(filters)),
  };
}

export default statsApi;