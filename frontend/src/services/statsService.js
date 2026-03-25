import api from './api';

export const statsService = {
  incidence:   (params) => api.get('/registry/stats/incidence/',   { params }),
  cancers:     (params) => api.get('/registry/stats/cancers/',     { params }),
  patients:    (params) => api.get('/registry/stats/patients/',    { params }),
  traitements: (params) => api.get('/registry/stats/traitements/', { params }),
};
