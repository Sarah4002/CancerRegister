const ALL_PATIENT_SECTIONS = [
  { key: 'identite', label: 'Identité & Profil' },
  { key: 'clinique', label: 'Infos Cliniques' },
  { key: 'diagnostic', label: 'Diagnostic' },
  { key: 'examens', label: 'Examens & Bilans' },
  { key: 'traitements', label: 'Traitements' },
  { key: 'suivi', label: 'Suivi Clinique' },
  { key: 'rcp', label: 'RCP' },
  { key: 'rendezvous', label: 'Rendez-vous' },
];

const PENDING_SECTION_KEYS = new Set(['identite', 'suivi', 'examens', 'rendezvous']);

export function createPatientSidebarContext(patient, activeKey, navigate) {
  if (!patient) return undefined;

  const isPending = patient.statut_confirmation !== 'CANCER_CONFIRMED';
  const id = patient.id ?? patient.patient_id;
  const sections = ALL_PATIENT_SECTIONS
    .filter((section) => !isPending || PENDING_SECTION_KEYS.has(section.key))
    .map((section) => isPending && section.key === 'suivi'
      ? { ...section, label: 'Consultation' }
      : section);

  return {
    patient,
    sections,
    activeKey,
    backPath: `/patients/${id}`,
    backLabel: 'Retour au patient',
    onSelect: (key) => navigate(`/patients/${id}`, {
      state: { returnSection: key, fromAttente: isPending },
    }),
  };
}
