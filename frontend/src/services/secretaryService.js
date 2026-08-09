import api from './api';

/* ── Mapping des statuts : vocabulaire "consultation" (backend) ↔ vocabulaire "RDV" (frontend calendrier) ── */
const STATUS_MAP = {
  planifiee: 'en_attente',
  realisee: 'termine',
  annulee: 'annule',
  reportee: 'en_attente',
  confirme: 'confirme',
  termine: 'termine',
  absent: 'absent',
};

// Remarque : ce mapping n'est pas parfaitement bijectif (confirme/termine → tous deux 'realisee').
// C'est acceptable pour la mise à jour d'un statut existant, mais NE PAS l'utiliser pour la création
// d'un nouveau rendez-vous — voir normalizeStatutForCreate() plus bas.
const REVERSE_STATUS_MAP = {
  en_attente: 'planifiee',
  confirme: 'realisee',
  annule: 'annulee',
  termine: 'realisee',
  absent: 'planifiee',
};

const TYPE_MAP = {
  consultation: 'consultation',
  suivi: 'suivi',
  post_trt: 'suivi',
  urgence: 'consultation',
  bilan: 'examen',
  annonce: 'consultation',
  palliative: 'consultation',
  psycho: 'consultation',
  dietet: 'consultation',
  rcp: 'rcp',
  chimio: 'chimio',
  examen: 'examen',
};

// Choix réellement acceptés par le backend (endpoint /suivi/consultations/).
// Toute valeur "type" hors de cette liste sera ramenée à 'suivi' par défaut.
const VALID_TYPES_CONSULTATION = [
  'suivi', 'post_trt', 'urgence', 'bilan', 'annonce', 'palliative', 'psycho', 'dietet',
];

// Choix réellement acceptés par le backend pour le statut.
const VALID_STATUTS_CONSULTATION = ['planifiee', 'realisee', 'annulee', 'reportee'];

function normalizeRdv(item) {
  const date = item.date_consultation || item.date || item.rdv_date || '';
  const statut = STATUS_MAP[item.statut] || item.statut || 'en_attente';
  const type = TYPE_MAP[item.type_consultation] || TYPE_MAP[item.type] || item.type_consultation || item.type || 'consultation';
  const heure = item.heure ? String(item.heure).slice(0, 5) : (item.heure_rdv || '09:00');

  return {
    ...item,
    id: item.id,
    date: date ? String(date) : '',
    heure,
    statut,
    type,
    patient_nom: item.patient_nom || item.patient?.nom || item.patient?.full_name || '',
    medecin_nom: item.medecin_nom || item.medecin?.nom || item.medecin?.full_name || '',
  };
}

function getDateOnly(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/**
 * Traduit un statut "frontend calendrier" (confirme, en_attente, annule...)
 * vers un statut valide côté backend consultations, pour la CRÉATION.
 * Utilise une logique dédiée (pas REVERSE_STATUS_MAP, qui est ambigu).
 */
function normalizeStatutForCreate(statut) {
  if (VALID_STATUTS_CONSULTATION.includes(statut)) return statut;
  const map = {
    confirme: 'planifiee',
    en_attente: 'planifiee',
    honore: 'realisee',
    termine: 'realisee',
    annule: 'annulee',
    reporte: 'reportee',
    absent: 'annulee',
  };
  return map[statut] || 'planifiee';
}

/**
 * Traduit un type "frontend calendrier" (chimio, rcp, examen, consultation...)
 * vers un type_consultation valide côté backend, pour la CRÉATION.
 */
function normalizeTypeForCreate(type) {
  if (VALID_TYPES_CONSULTATION.includes(type)) return type;
  const map = {
    consultation: 'suivi',
    chimio: 'suivi',
    radiotherapie: 'suivi',
    rcp: 'suivi',
    examen: 'bilan',
    chirurgie: 'suivi',
    autre: 'suivi',
  };
  return map[type] || 'suivi';
}

// Nombre de résultats à récupérer par appel — évite la troncature silencieuse
// si l'API pagine par défaut (bug corrigé : absent de la version précédente).
const RDV_PAGE_SIZE = 1000;

export const secretaryService = {
  getRendezVous: async ({ mois, annee } = {}) => {
    const { data } = await api.get('/suivi/consultations/', {
      params: { ordering: '-date_consultation', page_size: RDV_PAGE_SIZE },
    });

    const items = Array.isArray(data) ? data : (data?.results || []);
    const normalized = items.map(normalizeRdv).filter((item) => {
      if (!item.date) return false;
      const dateObj = getDateOnly(item.date);
      if (!dateObj) return false;
      const matchesMonth = mois ? dateObj.getMonth() + 1 === Number(mois) : true;
      const matchesYear = annee ? dateObj.getFullYear() === Number(annee) : true;
      return matchesMonth && matchesYear;
    });

    return { data: normalized };
  },

  getStats: async () => {
    const { data } = await api.get('/suivi/consultations/', {
      params: { ordering: '-date_consultation', page_size: RDV_PAGE_SIZE },
    });

    const items = Array.isArray(data) ? data : (data?.results || []);
    const rdvs = items.map(normalizeRdv);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const diff = (day + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const rdvAujourdhui = rdvs.filter((item) => item.date === todayStr).length;
    const rdvSemaine = rdvs.filter((item) => {
      const dateObj = getDateOnly(item.date);
      return dateObj && dateObj >= startOfWeek && dateObj <= endOfWeek;
    }).length;

    return {
      data: {
        rdv_aujourdhui: rdvAujourdhui,
        rdv_semaine: rdvSemaine,
        rdv_en_attente: rdvs.filter((item) => item.statut === 'en_attente').length,
        rdv_confirmes: rdvs.filter((item) => item.statut === 'confirme').length,
        rdv_annules: rdvs.filter((item) => item.statut === 'annule').length,
      },
    };
  },

  updateStatut: async (id, statut) => {
    const apiStatut = REVERSE_STATUS_MAP[statut] || statut;
    return api.patch(`/suivi/consultations/${id}/`, { statut: apiStatut });
  },

  /**
   * Crée un nouveau rendez-vous. Traduit les valeurs "libres" du formulaire
   * frontend (type, statut) vers le vocabulaire strict attendu par
   * /suivi/consultations/, et fusionne date + heure si le backend attend
   * un seul champ. Si votre serializer accepte un champ `heure` distinct,
   * il sera transmis tel quel (voir normalizeRdv qui sait déjà le relire).
   */
  createRendezVous: async ({ patient, date, heure, type, statut, medecin, salle }) => {
    const payload = {
      patient,
      date_consultation: date,
      heure: heure || '09:00',
      type_consultation: normalizeTypeForCreate(type),
      statut: normalizeStatutForCreate(statut),
      etablissement: salle || undefined,
      // Les notes médicales restent réservées au médecin. Le secrétariat
      // n'envoie ici que les informations nécessaires à l'organisation.
    };
    // Le champ médecin est facultatif. Le formulaire accepte aussi un libellé
    // libre pour l'organisation, qui ne doit pas être envoyé comme identifiant API.
    if (medecin && /^\d+$/.test(String(medecin))) payload.medecin = medecin;
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined || payload[k] === '') delete payload[k];
    });

    const { data } = await api.post('/suivi/consultations/', payload);
    return { data: normalizeRdv(data) };
  },

  /**
   * Supprime / annule un rendez-vous.
   */
  deleteRendezVous: async (id) => {
    return api.delete(`/suivi/consultations/${id}/`);
  },

  /**
   * Met à jour les champs d'un rendez-vous existant (date, heure, notes...).
   */
  updateRendezVous: async (id, updates) => {
    const payload = { ...updates };
    if (payload.date) { payload.date_consultation = payload.date; delete payload.date; }
    if (payload.type) { payload.type_consultation = normalizeTypeForCreate(payload.type); delete payload.type; }
    if (payload.statut) { payload.statut = normalizeStatutForCreate(payload.statut); }
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined || payload[k] === '') delete payload[k];
    });
    const { data } = await api.patch(`/suivi/consultations/${id}/`, payload);
    return { data: normalizeRdv(data) };
  },
};
