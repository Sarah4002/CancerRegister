import api from './api';

const FALLBACK_TOPOGRAPHIES = [
  { id: 'fallback-c50-0', code: 'C50.0', libelle: 'Mamelon et aréole du sein', categorie: 'Sein' },
  { id: 'fallback-c50-1', code: 'C50.1', libelle: 'Portion centrale du sein', categorie: 'Sein' },
  { id: 'fallback-c50-2', code: 'C50.2', libelle: 'Quadrant supéro-interne du sein', categorie: 'Sein' },
  { id: 'fallback-c50-3', code: 'C50.3', libelle: 'Quadrant inféro-interne du sein', categorie: 'Sein' },
  { id: 'fallback-c50-4', code: 'C50.4', libelle: 'Quadrant supéro-externe du sein', categorie: 'Sein' },
  { id: 'fallback-c50-5', code: 'C50.5', libelle: 'Quadrant inféro-externe du sein', categorie: 'Sein' },
  { id: 'fallback-c50-9', code: 'C50.9', libelle: 'Sein, sans précision', categorie: 'Sein' },
  { id: 'fallback-c61', code: 'C61', libelle: 'Glande prostatique', categorie: 'Prostate' },
  { id: 'fallback-c34-9', code: 'C34.9', libelle: 'Poumon, sans précision', categorie: 'Poumon' },
  { id: 'fallback-c18-9', code: 'C18.9', libelle: 'Côlon, sans précision', categorie: 'Côlon-Rectum' },
  { id: 'fallback-c53-9', code: 'C53.9', libelle: 'Col utérin, sans précision', categorie: 'Utérus' },
  { id: 'fallback-c56', code: 'C56', libelle: 'Ovaire', categorie: 'Ovaire' },
];

const FALLBACK_MORPHOLOGIES = [
  { id: 'fallback-8500-2', code: '8500/2', libelle: 'Carcinome canalaire in situ', groupe: 'Carcinome du sein', comportement: '2' },
  { id: 'fallback-8500-3', code: '8500/3', libelle: 'Carcinome canalaire infiltrant, sans précision', groupe: 'Carcinome du sein', comportement: '3' },
  { id: 'fallback-8520-3', code: '8520/3', libelle: 'Carcinome lobulaire infiltrant, sans précision', groupe: 'Carcinome du sein', comportement: '3' },
  { id: 'fallback-8140-3', code: '8140/3', libelle: 'Adénocarcinome, sans précision', groupe: 'Adénocarcinome', comportement: '3' },
  { id: 'fallback-8010-3', code: '8010/3', libelle: 'Carcinome, sans précision', groupe: 'Carcinome', comportement: '3' },
  { id: 'fallback-8070-3', code: '8070/3', libelle: 'Carcinome épidermoïde, sans précision', groupe: 'Carcinome épidermoïde', comportement: '3' },
  { id: 'fallback-8260-3', code: '8260/3', libelle: 'Carcinome papillaire', groupe: 'Thyroïde', comportement: '3' },
  { id: 'fallback-9650-3', code: '9650/3', libelle: 'Maladie de Hodgkin, sclérose nodulaire', groupe: 'Lymphome', comportement: '3' },
];

const normalizeResults = (payload, fallbackList, query = '') => {
  const q = String(query || '').trim().toLowerCase();
  const raw = payload?.results || payload?.data || payload;

  if (Array.isArray(raw) && raw.length > 0) {
    return raw;
  }

  if (Array.isArray(raw) && raw.length === 0) {
    return fallbackList.filter((item) => {
      const haystack = `${item.code} ${item.libelle} ${item.categorie || item.groupe || ''}`.toLowerCase();
      return !q || haystack.includes(q);
    }).slice(0, 12);
  }

  if (q) {
    return fallbackList.filter((item) => {
      const haystack = `${item.code} ${item.libelle} ${item.categorie || item.groupe || ''}`.toLowerCase();
      return haystack.includes(q);
    }).slice(0, 12);
  }

  return fallbackList.slice(0, 12);
};

const fallbackSearchTopographies = async (q) => {
  const data = normalizeResults(null, FALLBACK_TOPOGRAPHIES, q);
  return { data };
};

const fallbackSearchMorphologies = async (q) => {
  const data = normalizeResults(null, FALLBACK_MORPHOLOGIES, q);
  return { data };
};

export const diagnosticService = {
  // Diagnostics
  list:   (params = {}) => api.get('/diagnostics/', { params }),
  get:    (id)          => api.get(`/diagnostics/${id}/`),
  create: (data)        => api.post('/diagnostics/', data),
  update: (id, data)    => api.put(`/diagnostics/${id}/`, data),
  patch:  (id, data)    => api.patch(`/diagnostics/${id}/`, data),
  delete: (id)          => api.delete(`/diagnostics/${id}/`),

  // Par patient
  parPatient: (patientId) =>
    api.get('/diagnostics/par_patient/', { params: { patient_id: patientId } }),

  // Stats
  stats: () => api.get('/diagnostics/stats/'),

  // Référentiels ICD-O-3
  searchTopographies: async (q) => {
    try {
      const response = await api.get('/diagnostics/topographies/', { params: { search: q } });
      const data = normalizeResults(response.data, FALLBACK_TOPOGRAPHIES, q);
      return { data };
    } catch (error) {
      return fallbackSearchTopographies(q);
    }
  },
  searchMorphologies: async (q) => {
    try {
      const response = await api.get('/diagnostics/morphologies/', { params: { search: q } });
      const data = normalizeResults(response.data, FALLBACK_MORPHOLOGIES, q);
      return { data };
    } catch (error) {
      return fallbackSearchMorphologies(q);
    }
  },
};
