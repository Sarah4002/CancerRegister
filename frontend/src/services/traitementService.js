import api from './api';

const BASE = '/treatments';

export const traitementService = {
  // Stats globales
  stats: () => api.get(`${BASE}/stats/`),

  // Tous les traitements d'un patient
  parPatient: (patientId) =>
    api.get(`${BASE}/par_patient/`, { params: { patient_id: patientId } }),

  // ── Chimiothérapie ─────────────────────────────────────────
  chimio: {
    list:   (params) => api.get(`${BASE}/chimiotherapies/`, { params }),
    get:    (id)     => api.get(`${BASE}/chimiotherapies/${id}/`),
    create: (data)   => api.post(`${BASE}/chimiotherapies/`, data),
    update: (id, d)  => api.put(`${BASE}/chimiotherapies/${id}/`, d),
    delete: (id)     => api.delete(`${BASE}/chimiotherapies/${id}/`),
  },

  // ── Radiothérapie ──────────────────────────────────────────
  radio: {
    list:   (params) => api.get(`${BASE}/radiotherapies/`, { params }),
    get:    (id)     => api.get(`${BASE}/radiotherapies/${id}/`),
    create: (data)   => api.post(`${BASE}/radiotherapies/`, data),
    update: (id, d)  => api.put(`${BASE}/radiotherapies/${id}/`, d),
    delete: (id)     => api.delete(`${BASE}/radiotherapies/${id}/`),
  },

  // ── Chirurgie ──────────────────────────────────────────────
  chirurgie: {
    list:   (params) => api.get(`${BASE}/chirurgies/`, { params }),
    get:    (id)     => api.get(`${BASE}/chirurgies/${id}/`),
    create: (data)   => api.post(`${BASE}/chirurgies/`, data),
    update: (id, d)  => api.put(`${BASE}/chirurgies/${id}/`, d),
    delete: (id)     => api.delete(`${BASE}/chirurgies/${id}/`),
  },

  // ── Hormonothérapie ────────────────────────────────────────
  hormono: {
    list:   (params) => api.get(`${BASE}/hormonotherapies/`, { params }),
    get:    (id)     => api.get(`${BASE}/hormonotherapies/${id}/`),
    create: (data)   => api.post(`${BASE}/hormonotherapies/`, data),
    update: (id, d)  => api.put(`${BASE}/hormonotherapies/${id}/`, d),
    delete: (id)     => api.delete(`${BASE}/hormonotherapies/${id}/`),
  },

  // ── Immunothérapie ─────────────────────────────────────────
  immuno: {
    list:   (params) => api.get(`${BASE}/immunotherapies/`, { params }),
    get:    (id)     => api.get(`${BASE}/immunotherapies/${id}/`),
    create: (data)   => api.post(`${BASE}/immunotherapies/`, data),
    update: (id, d)  => api.put(`${BASE}/immunotherapies/${id}/`, d),
    delete: (id)     => api.delete(`${BASE}/immunotherapies/${id}/`),
  },

  // ── Thérapie ciblée (alias immunothérapie) ────────────────
  ciblee: {
    list:   (params) => api.get(`${BASE}/immunotherapies/`, { params }),
    get:    (id)     => api.get(`${BASE}/immunotherapies/${id}/`),
    create: (data)   => api.post(`${BASE}/immunotherapies/`, data),
    update: (id, d)  => api.put(`${BASE}/immunotherapies/${id}/`, d),
    delete: (id)     => api.delete(`${BASE}/immunotherapies/${id}/`),
  },
};
