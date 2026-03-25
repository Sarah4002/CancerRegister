import axios from 'axios';

/**
 * Backend Django expose:
 * http://localhost:8000/api/v1/
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});


// ─────────────────────────────────────────────
// Attach JWT to every request
// ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// ─────────────────────────────────────────────
// Auto refresh token on 401
// ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/token/refresh/`,
          { refresh }
        );

        localStorage.setItem('access_token', data.access);

        api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
        original.headers.Authorization = `Bearer ${data.access}`;

        return api(original);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);


// ─────────────────────────────────────────────
// AUTH SERVICE
// ─────────────────────────────────────────────
export const authService = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (data) => api.post('/auth/register/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
};


// ─────────────────────────────────────────────
// PATIENTS SERVICE
// ─────────────────────────────────────────────
export const patientService = {
  list: (params) => api.get('/patients/', { params }),
  get: (id) => api.get(`/patients/${id}/`),
  create: (data) => api.post('/patients/', data),
  update: (id, data) => api.patch(`/patients/${id}/`, data),
  delete: (id) => api.delete(`/patients/${id}/`),
  stats: () => api.get('/patients/stats/'),
};


// ─────────────────────────────────────────────
// REGISTRY SERVICE
// ─────────────────────────────────────────────
export const registryService = {
  stats: () => api.get('/registry/stats/'),
  incidenceByWilaya: () => api.get('/registry/incidence/wilaya/'),
  cancerTypes: () => api.get('/registry/cancer-types/'),
};


export default api;