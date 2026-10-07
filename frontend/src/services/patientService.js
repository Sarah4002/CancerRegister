import api from './api';

// PATTERN (façade/adaptateur HTTP) — relie les pages patient au ViewSet backend.
// Les filtres de list() sont traités par PatientRepository et PatientQueryBuilder.
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
  // Accepte un objet `params` contenant tous les filtres/pagination
  searchAdvanced: (params = {}) => api.get('/patients/search_advanced/', { params }),

  // Commande backend pour les transitions de statut; aussi appelée par PATCH
  // des formulaires qui modifient statut_dossier.
  changeStatus: (id, statut_dossier) =>
    api.post(`/patients/${id}/changer_statut/`, { statut_dossier }),
  changerStatut: (id, statut_dossier) =>
    api.post(`/patients/${id}/changer_statut/`, { statut_dossier }),

  getEnAttente: () => api.get('/patients/en_attente/'),

  // Commande backend; le State de confirmation applique la décision.
  confirmPatient: (id, payload = {}) => api.post(`/patients/${id}/confirmer/`, payload),

  envoyerPourValidation: (id, payload) => api.post(`/patients/${id}/envoyer_validation/`, payload),
};
