import api from './api';

export const diagnosticService = {
  // Diagnostics
  list:   (params = {}) => api.get('/diagnostics/', { params }),
  get:    (id)          => api.get(`/diagnostics/${id}/`),
  create: (data)        => api.post('/diagnostics/', data),
  update: (id, data)    => api.put(`/diagnostics/${id}/`, data),
  patch:  (id, data)    => api.patch(`/diagnostics/${id}/`, data),
  delete: (id)          => api.delete(`/diagnostics/${id}/`),

  // Par patient
  parPatient: (patientId) =>
    api.get('/diagnostics/par_patient/', { params: { patient_id: patientId } }),

  // Stats
  stats: () => api.get('/diagnostics/stats/'),

  // Référentiels ICD-O-3
  searchTopographies: (q) =>
    api.get('/diagnostics/topographies/', { params: { search: q } }),
  searchMorphologies: (q) =>
    api.get('/diagnostics/morphologies/', { params: { search: q } }),
};
