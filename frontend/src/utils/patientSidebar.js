export const PATIENT_SIDEBAR_SECTIONS = [
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

export function getVisiblePatientSections(patient, { can = {}, role, isPending } = {}) {
  const pending = isPending ?? Boolean(
    patient?.statut_confirmation && patient.statut_confirmation !== 'CANCER_CONFIRMED'
  );

  let sections = PATIENT_SIDEBAR_SECTIONS;
  if (pending) sections = sections.filter((section) => PENDING_SECTION_KEYS.has(section.key));
  if (role === 'secretaire') {
    sections = sections.filter((section) => ['identite', 'rendezvous'].includes(section.key));
  } else {
    const permissions = {
      identite: can.readPatient,
      clinique: can.writeDiagnostic,
      diagnostic: can.readDiagnostic,
      examens: can.readDiagnostic,
      traitements: can.readTreatment,
      suivi: can.accessClinicalFollowup,
      rcp: can.viewRcp,
      rendezvous: can.manageAppointments,
    };
    sections = sections.filter((section) => permissions[section.key]);
  }

  return sections.map((section) => pending && section.key === 'suivi'
    ? { ...section, label: 'Consultation' }
    : section);
}

export function createPatientSidebarContext(patient, activeKey, navigate, access = {}) {
  if (!patient) return undefined;

  const isPending = access.isPending ?? Boolean(
    patient.statut_confirmation && patient.statut_confirmation !== 'CANCER_CONFIRMED'
  );
  const id = patient.id ?? patient.patient_id;
  const sections = getVisiblePatientSections(patient, { ...access, isPending });

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
