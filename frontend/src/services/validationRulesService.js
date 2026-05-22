import api from './api';

export const validationRulesService = {
  list:   (params = {}) => api.get('/diagnostics/validation-rules/', { params }),
  get:    (id)          => api.get(`/diagnostics/validation-rules/${id}/`),
  create: (data)        => api.post('/diagnostics/validation-rules/', data),
  update: (id, data)    => api.patch(`/diagnostics/validation-rules/${id}/`, data),
  delete: (id)          => api.delete(`/diagnostics/validation-rules/${id}/`),
};
