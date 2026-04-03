import api from './api';

export const accountsService = {
  // Liste des médecins pour les formulaires
  medecins: () => api.get('/accounts/medecins/'),
};