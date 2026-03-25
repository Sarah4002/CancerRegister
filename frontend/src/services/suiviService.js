import api from './api';

export const suiviService = {
  // Consultations
  consultations: {
    list:      (params) => api.get('/suivi/consultations/', { params }),
    get:       (id)     => api.get(`/suivi/consultations/${id}/`),
    create:    (data)   => api.post('/suivi/consultations/', data),
    update:    (id, d)  => api.put(`/suivi/consultations/${id}/`, d),
    patch:     (id, d)  => api.patch(`/suivi/consultations/${id}/`, d),
    delete:    (id)     => api.delete(`/suivi/consultations/${id}/`),
    parPatient:(pid)    => api.get('/suivi/consultations/par_patient/', { params: { patient_id: pid } }),
    aVenir:    ()       => api.get('/suivi/consultations/a_venir/'),
    stats:     ()       => api.get('/suivi/consultations/stats/'),
  },

  // Qualité de vie
  qualiteVie: {
    list:             (params) => api.get('/suivi/qualite-vie/', { params }),
    get:              (id)     => api.get(`/suivi/qualite-vie/${id}/`),
    create:           (data)   => api.post('/suivi/qualite-vie/', data),
    update:           (id, d)  => api.put(`/suivi/qualite-vie/${id}/`, d),
    delete:           (id)     => api.delete(`/suivi/qualite-vie/${id}/`),
    evolutionPatient: (pid)    => api.get('/suivi/qualite-vie/evolution_patient/', { params: { patient_id: pid } }),
  },


  // Effets indésirables
  effets: {
    list:        (params) => api.get('/suivi/effets-indesirables/', { params }),
    get:         (id)     => api.get(`/suivi/effets-indesirables/${id}/`),
    create:      (data)   => api.post('/suivi/effets-indesirables/', data),
    update:      (id, d)  => api.put(`/suivi/effets-indesirables/${id}/`, d),
    patch:       (id, d)  => api.patch(`/suivi/effets-indesirables/${id}/`, d),
    delete:      (id)     => api.delete(`/suivi/effets-indesirables/${id}/`),
    parPatient:  (pid)    => api.get('/suivi/effets-indesirables/', { params: { patient: pid } }),
    nonResolus:  ()       => api.get('/suivi/effets-indesirables/', { params: { resolu: false } }),
  },
};