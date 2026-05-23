import api from './api';

export const sigService = {
  getSigStats: (params = {}) => api.get('/sig/stats/', { params }),
  getWilayaDetails: (nom) => api.get(`/sig/wilaya/${nom}/`),
  
  /**
   * Récupère les données de Tlemcen par commune
   * @returns {Promise} { wilaya, total_patients, total_diagnostics, communes: {...} }
   */
  getTlemcenData: () => 
    api.get('/sig/tlemcen-data/'),

  /**
   * Récupère les statistiques des cancers dominants
   * @param {string} wilaya - Nom de la wilaya (default: 'Tlemcen')
   * @param {string} commune - Nom de la commune (optionnel)
   * @returns {Promise} { total_diagnostics, total_patients, cancer_statistics, cancer_causes, gender_distribution }
   */
  getCancerStatistics: (wilaya = 'Tlemcen', commune = null) => {
    const params = { wilaya };
    if (commune) params.commune = commune;
    return api.get('/sig/cancer-statistics/', { params });
  },

  /**
   * Récupère les données de toutes les wilayas
   * @returns {Promise} Liste des wilayas avec leurs cas
   */
  getMapData: () =>
    api.get('/sig/map-data/'),

  /**
   * Récupère les statistiques globales
   * @param {string} year - Année (optionnel)
   * @returns {Promise} Statistiques générales
   */
  getStatistics: (year = null) => {
    const params = year ? { year } : {};
    return api.get('/sig/statistics/', { params });
  },

  /**
   * Récupère les patients filtrés par wilaya et commune
   * Utilisé pour enrichir les données SIG
   * @param {string} wilaya - Wilaya
   * @param {string} commune - Commune (optionnel)
   * @returns {Promise}
   */
  getPatientsData: (wilaya = 'Tlemcen', commune = null) => {
    const params = { wilaya };
    if (commune) params.commune = commune;
    return api.get('/patients/', { params });
  },

  /**
   * Récupère les diagnostics filtrés par wilaya et commune
   * Utilisé pour enrichir les statistiques SIG
   * @param {string} wilaya - Wilaya
   * @param {string} commune - Commune (optionnel)
   * @returns {Promise}
   */
  getDiagnosticsData: (params = {}) => {
    // params: { wilaya, commune, topographie__code, age_min, age_max, date_from, date_to }
    return api.get('/diagnostics/', { params });
  },

  /**
   * Récupère les données complètes pour Tlemcen
   * Combine patients, diagnostics et statistiques
   * @returns {Promise}
   */
  getCompleteTlemcenData: async () => {
    try {
      const [tlemcenData, stats] = await Promise.all([
        api.get('/sig/tlemcen-data/'),
        api.get('/sig/cancer-statistics/?wilaya=Tlemcen'),
      ]);
      return {
        ...tlemcenData.data,
        statistics: stats.data,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Récupère les données pour une commune spécifique
   * @param {string} commune - Nom de la commune
   * @returns {Promise}
   */
  getCommuneData: async (commune) => {
    try {
      const stats = await api.get('/sig/cancer-statistics/', {
        params: { wilaya: 'Tlemcen', commune }
      });
      return stats.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Récupère toutes les données des wilayas avec cases de cancer
   * @returns {Promise} { total_patients, total_diagnostics, wilayas_count, wilayas: {...} }
   */
  getAllWilayasData: () =>
    api.get('/sig/all-wilayas/'),

  /**
   * Récupère les données complètes de toutes les wilayas pour la carte
   * @returns {Promise}
   */
  getCompleteAllWilayasData: async () => {
    try {
      const [mapData, wilayasData] = await Promise.all([
        api.get('/sig/map-data/'),
        api.get('/sig/all-wilayas/'),
      ]);
      return {
        map: mapData.data,
        wilayas: wilayasData.data,
      };
    } catch (error) {
      throw error;
    }
  },  analyzeScope: (payload) => api.post('/sig/analyze/', payload),  getMapCards: () => api.get('/sig/cards/'),
  createMapCard: (data) => api.post('/sig/cards/', data),
  updateMapCard: (id, data) => api.patch(`/sig/cards/${id}/`, data),
  deleteMapCard: (id) => api.delete(`/sig/cards/${id}/`),
};