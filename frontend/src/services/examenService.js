import api from './api';

export const examenService = {
  // Liste avec filtres (ex: patient=123)
  list: (params = {}) => api.get('/examens/', { params }),

  // Détail d'un examen
  get: (id) => api.get(`/examens/${id}/`),

  // Création (supporte FormData pour le fichier DICOM)
  create: (data) => {
    // Si FormData, utiliser le Content-Type approprié (géré par axios généralement)
    return api.post('/examens/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
  },

  // Modification
  update: (id, data) => {
    return api.patch(`/examens/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
  },

  // Suppression
  delete: (id) => api.delete(`/examens/${id}/`),
};
