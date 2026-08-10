import api from './api';

/**
 * Service pour la gestion des comptes utilisateurs (médecins, secrétaires, etc.)
 */
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

/**
 * Service dédié aux médecins, utilisé notamment par PatientDossierPage
 * pour peupler la liste déroulante lors de l'envoi d'un dossier pour validation.
 */
export const medecinService = {
  list: (params) => api.get('/auth/medecins/', { params }),
};

export default accountsService;