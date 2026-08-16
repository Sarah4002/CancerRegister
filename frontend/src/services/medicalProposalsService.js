import api from './api';

export const medicalProposalsService = {
  list: (params = {}) => api.get('/custom-fields/propositions/', { params }),
  create: (data) => api.post('/custom-fields/propositions/', data),
  approve: (id, commentaire = '') => api.post(`/custom-fields/propositions/${id}/approuver/`, { commentaire }),
  refuse: (id, commentaire) => api.post(`/custom-fields/propositions/${id}/refuser/`, { commentaire }),
};
