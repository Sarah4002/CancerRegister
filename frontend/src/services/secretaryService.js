import api from './api';

const STATUS_MAP = {
  planifiee: 'en_attente',
  realisee: 'termine',
  annulee: 'annule',
  reportee: 'en_attente',
  confirme: 'confirme',
  termine: 'termine',
  absent: 'absent',
};

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

function normalizeRdv(item) {
  const date = item.date_consultation || item.date || item.rdv_date || '';
  const statut = STATUS_MAP[item.statut] || item.statut || 'en_attente';
  const type = TYPE_MAP[item.type_consultation] || TYPE_MAP[item.type] || item.type_consultation || item.type || 'consultation';
  const heure = item.heure || item.heure_rdv || '09:00';

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

export const secretaryService = {
  getRendezVous: async ({ mois, annee } = {}) => {
    const { data } = await api.get('/suivi/consultations/', {
      params: { ordering: '-date_consultation' },
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
      params: { ordering: '-date_consultation' },
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
};
