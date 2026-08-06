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

  // À ajouter dans services/adminService.js, dans l'objet adminService

  // Paramètres application
  settings: {
    get:    ()    => api.get('/auth/admin/settings/'),
    update: (d)   => api.patch('/auth/admin/settings/', d),
  },

  // Sauvegarde / restauration
  backup: {
    list:     ()      => api.get('/auth/admin/backups/'),
    create:   ()       => api.post('/auth/admin/backups/'),
    download: (id)     => api.get(`/auth/admin/backups/${id}/download/`, { responseType: 'blob' }),
    restore:  (id)     => api.post(`/auth/admin/backups/${id}/restore/`),
    upload:   (formData) => api.post('/auth/admin/backups/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete:   (id)     => api.delete(`/auth/admin/backups/${id}/`),
  },

  // Notifications (mot de passe oublié, etc.)
  notifications: {
    getConfig:  ()    => api.get('/auth/admin/notifications/config/'),
    updateConfig: (d) => api.patch('/auth/admin/notifications/config/', d),
    sendTest:   (email) => api.post('/auth/admin/notifications/test/', { email }),
  },
};