// services/dashboardService.js
import api from './api';

/**
 * Retire les clés dont la valeur est vide/null/undefined avant l'envoi.
 * Le panneau de filtres du dashboard part de valeurs par défaut à ''
 * (DEFAULT_FILTERS) — sans ce nettoyage, le tout premier chargement de
 * page envoie déjà ?annee=&sexe=&statut=&wilaya=&stade=&dateFrom=&dateTo=
 * ce qui peut faire planter le backend selon comment les query params
 * sont parsés côté Django.
 */
function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
}

export const dashboardService = {
  global:  (params = {}) => api.get('/registry/dashboard/', { params: cleanParams(params) }),
  alertes: () => api.get('/registry/alertes/'),
};