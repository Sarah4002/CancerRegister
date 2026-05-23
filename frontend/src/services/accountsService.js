import api from './api';

export const accountsService = {
  /**
   * Liste tous les utilisateurs pouvant participer à une RCP.
   * Paramètres optionnels :
   *   - role       : filtrer par rôle exact ('doctor', 'anapath', etc.)
   *   - search     : recherche texte (nom, email, institution)
   *   - exclude_ids: IDs à exclure (déjà présents dans la RCP), ex: "1,2,3"
   */
  medecins: (params) => api.get('/auth/medecins/', { params }),
};
