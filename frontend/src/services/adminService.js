// services/adminService.js
import api from './api';

/**
 * Retire les clés dont la valeur est vide/null/undefined avant l'envoi.
 * Évite d'envoyer ?annee=&sexe=&role= au backend, ce qui peut
 * provoquer des erreurs 500 si Django tente un int('') ou un
 * filtre strict sur une chaîne vide.
 */
function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
}

export const adminService = {
  // Users
  users: {
    list:          (params)   => api.get('/auth/admin/users/', { params: cleanParams(params) }),
    get:           (id)       => api.get(`/auth/admin/users/${id}/`),
    update:        (id, d)    => api.patch(`/auth/admin/users/${id}/`, d),
    activer:       (id)       => api.patch(`/auth/admin/users/${id}/`, { is_active: true }),
    desactiver:    (id)       => api.patch(`/auth/admin/users/${id}/`, { is_active: false }),
    resetPassword: (id, pwd)  => api.post(`/auth/admin/users/${id}/reset_password/`, { password: pwd }),
    setRole:       (id, role) => api.patch(`/auth/admin/users/${id}/`, { role }),
    stats:         (params)   => api.get('/auth/admin/users/stats/', { params: cleanParams(params) }),
  },

  // Audit logs
  audit: {
    list:  (params) => api.get('/auth/admin/audit-logs/', { params: cleanParams(params) }),
    stats: (params)  => api.get('/auth/admin/audit-logs/stats/', { params: cleanParams(params) }),
  },

  // System
  system: () => api.get('/auth/admin/system/'),
};