// services/documentService.js
import api from './api';

export const documentService = {
  list:     (patientId)         => api.get('/patients/documents/', { params: { patient: patientId } }),
  upload:   (patientId, formData) => api.post('/patients/documents/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { patient: patientId },
  }),
  delete:   (docId) => api.delete(`/patients/documents/${docId}/`),
};