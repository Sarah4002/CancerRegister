import api from './api';

export const patientService = {
  // Liste avec filtres/pagination
  list: (params = {}) => api.get('/patients/', { params }),

  // Détail complet
  get: (id) => api.get(`/patients/${id}/`),

  // Création
  create: (data) => api.post('/patients/', data),

  // Modification
  update: (id, data) => api.put(`/patients/${id}/`, data),
  patch: (id, data) => api.patch(`/patients/${id}/`, data),

  // Dossier Médical
  getDossier: (id) => api.get(`/patients/${id}/dossier/`),
  updateDossier: (id, data) => api.patch(`/patients/${id}/dossier/`, data),

  // Suppression (soft delete)
  delete: (id) => api.delete(`/patients/${id}/`),

  // Statistiques
  stats: () => api.get('/patients/stats/'),

  // Recherche avancée
  searchAdvanced: (params = {}) => api.get('/patients/search_advanced/', { params }),

  // Changer statut
  changerStatut: (id, statut_dossier) =>
    api.post(`/patients/${id}/changer_statut/`, { statut_dossier }),
};
