import api from './api';

export const dashboardService = {
  global:  (params = {}) => api.get('/registry/dashboard/', { params }),
  alertes: () => api.get('/registry/alertes/'),
};
