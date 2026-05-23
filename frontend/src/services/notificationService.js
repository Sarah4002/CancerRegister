// notificationService.js — correct avec votre api.js
export const notificationService = {
  list:            (params) => api.get('/notifications/notifications/', { params }),
  nonLues:         ()       => api.get('/notifications/notifications/non_lues/'),
  marquerLue:      (id)     => api.post(`/notifications/notifications/${id}/marquer_lue/`),
  toutMarquerLues: ()       => api.post('/notifications/notifications/tout_marquer_lues/'),
};