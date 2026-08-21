import api from './api';

export const pharmacyService = {
  stock: () => api.get('/pharmacy/stock/'),
  addStock: (data) => api.post('/pharmacy/stock/', data),
  adjustStock: (id, quantity) => api.post(`/pharmacy/stock/${id}/adjust/`, { quantity }),
};
