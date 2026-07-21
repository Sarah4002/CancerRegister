import api from './api';

export const adminService = {
  // Users
  users: {
    list:          (params)  => api.get('/auth/admin/users/', { params }),
    get:           (id)      => api.get(`/auth/admin/users/${id}/`),
    update:        (id, d)   => api.patch(`/auth/admin/users/${id}/`, d),
    activer:       (id)      => api.patch(`/auth/admin/users/${id}/`, { is_active: true }),
    desactiver:    (id)      => api.patch(`/auth/admin/users/${id}/`, { is_active: false }),
    resetPassword: (id, pwd) => api.post(`/auth/admin/users/${id}/reset_password/`, { password: pwd }),
    setRole:       (id, role)=> api.patch(`/auth/admin/users/${id}/`, { role }),
    stats:         ()        => api.get('/auth/admin/users/stats/'),
  },

  // Audit logs
  audit: {
    list:  (params) => api.get('/auth/admin/audit-logs/', { params }),
    stats: ()       => api.get('/auth/admin/audit-logs/stats/'),
  },

  // System
  system: () => api.get('/auth/admin/system/'),
};
