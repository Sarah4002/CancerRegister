import api from './api';

export const rcpService = {
  // ─── Réunions ─────────────────────────────────────────────────────────────
  reunions: {
    list:            (params) => api.get('/rcp/reunions/', { params }),
    get:             (id)     => api.get(`/rcp/reunions/${id}/`),
    create:          (data)   => api.post('/rcp/reunions/', data),
    update:          (id, d)  => api.put(`/rcp/reunions/${id}/`, d),
    patch:           (id, d)  => api.patch(`/rcp/reunions/${id}/`, d),
    delete:          (id)     => api.delete(`/rcp/reunions/${id}/`),
    prochaines:      ()       => api.get('/rcp/reunions/prochaines/'),
    stats:           ()       => api.get('/rcp/reunions/stats/'),
    changerStatut:   (id, s)  => api.post(`/rcp/reunions/${id}/changer_statut/`, { statut: s }),
    ajouterPresence: (id, d)  => api.post(`/rcp/reunions/${id}/ajouter_presence/`, d),
    // Messagerie
    messages:        (id, params) => api.get(`/rcp/reunions/${id}/messages/`, { params }),
    envoyerMessage:  (id, d)      => api.post(`/rcp/reunions/${id}/envoyer_message/`, d),
  },

  // ─── Dossiers ──────────────────────────────────────────────────────────────
  dossiers: {
    list:            (params) => api.get('/rcp/dossiers/', { params }),
    get:             (id)     => api.get(`/rcp/dossiers/${id}/`),
    create:          (data)   => api.post('/rcp/dossiers/', data),
    update:          (id, d)  => api.put(`/rcp/dossiers/${id}/`, d),
    patch:           (id, d)  => api.patch(`/rcp/dossiers/${id}/`, d),
    delete:          (id)     => api.delete(`/rcp/dossiers/${id}/`),
    parReunion:      (rid)    => api.get('/rcp/dossiers/', { params: { reunion_id: rid } }),
    parPatient:      (pid)    => api.get('/rcp/dossiers/par_patient/', { params: { patient_id: pid } }),
    ajouterDecision: (id, d)  => api.post(`/rcp/dossiers/${id}/ajouter_decision/`, d),
    // Fichiers
    uploadFichier:   (id, formData) => api.post(`/rcp/dossiers/${id}/upload_fichier/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    supprimerFichier: (dossierId, fichierId) =>
      api.delete(`/rcp/dossiers/${dossierId}/fichiers/${fichierId}/`),
  },

  // ─── Décisions ─────────────────────────────────────────────────────────────
  decisions: {
    list:           (params) => api.get('/rcp/decisions/', { params }),
    get:            (id)     => api.get(`/rcp/decisions/${id}/`),
    update:         (id, d)  => api.put(`/rcp/decisions/${id}/`, d),
    patch:          (id, d)  => api.patch(`/rcp/decisions/${id}/`, d),
    delete:         (id)     => api.delete(`/rcp/decisions/${id}/`),
    marquerRealise: (id)     => api.post(`/rcp/decisions/${id}/marquer_realise/`),
  },
};