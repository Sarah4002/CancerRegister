import api from './api';

export const dashboardService = {
  global: (filters = {}) => {
  // Nettoyer les paramètres vides avant envoi
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '')
  );
  return api.get('/stats/dashboard/', { params });
},
  alertes: () => api.get('/registry/alertes/'),
};
