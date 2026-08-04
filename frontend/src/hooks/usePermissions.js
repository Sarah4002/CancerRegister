/**
 * hooks/usePermissions.js
 *
 * Hook central de gestion des droits d'accès.
 * Lit les permissions depuis le store d'authentification (JWT).
 *
 * Usage :
 *   const { can, role, isAdmin, isOncologue } = usePermissions();
 *   if (!can.writePatient) return <AccessDenied />;
 */

import useAuthStore from './useAuth';

// Rôles constants (miroir du backend)
export const ROLES = {
  ADMIN:          'admin',
  DOCTOR:         'doctor',
  ANAPATH:        'anapath',
  EPIDEMIOLOGIST: 'epidemiologist',
  PHARMACIST:     'pharmacist',
  SECRETAIRE:     'secretaire',
  DOCTOR_CHEF:    'doctor_chef',
  READONLY:       'readonly',
};

export const ROLE_LABELS = {
  admin:          'Administrateur',
  doctor:         'Médecin Oncologue',
  anapath:        'Médecin Anatomopathologiste',
  epidemiologist: 'Épidémiologiste',
  pharmacist:     'Pharmacien',
  secretaire:     'Secrétaire',
  doctor_chef:    'Médecin chef',
  readonly:       'Lecture seule',
};

export const ROLE_COLORS = {
  admin:          { color: '#ff4d6a', bg: 'rgba(255,77,106,0.1)',  border: 'rgba(255,77,106,0.25)'  },
  doctor:         { color: '#00a8ff', bg: 'rgba(0,168,255,0.1)',   border: 'rgba(0,168,255,0.25)'   },
  anapath:        { color: '#9b8afb', bg: 'rgba(155,138,251,0.1)', border: 'rgba(155,138,251,0.25)' },
  epidemiologist: { color: '#00e5a0', bg: 'rgba(0,229,160,0.1)',   border: 'rgba(0,229,160,0.25)'   },
  pharmacist:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)'   },
  secretaire:     { color: '#14b8a6', bg: 'rgba(20,184,166,0.1)',   border: 'rgba(20,184,166,0.25)'   },
  doctor_chef:    { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',   border: 'rgba(124,58,237,0.25)'   },
  readonly:       { color: '#9ca3af', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)' },
};

export function getHomeRouteForRole(role) {
  switch (role) {
    case ROLES.ADMIN:
      return '/dashboardadmin';
    case ROLES.SECRETAIRE:
      return '/secretaire';
    default:
      return '/dashboard';
  }
}

function buildEmptyCan() {
  return {
    readPatient:    false, writePatient:    false,
    readDiagnostic: false, writeDiagnostic: false,
    readTreatment:  false, writeTreatment:  false,
    viewStatistics: false, export:          false,
    viewMap:        false, manageUsers:     false,
    viewRcp:        false,
    writeAnapathReport: false, validateDiagnosis: false,
    exportIdentifiedData: false,
  };
}

export default function usePermissions() {
  const { user } = useAuthStore();

  if (!user) {
    return {
      can:              buildEmptyCan(),
      role:             null,
      isAdmin:          false,
      isOncologue:      false,
      isAnapath:        false,
      isEpidemiologist: false,
      roleLabel:        '',
      roleColor:        ROLE_COLORS.readonly,
    };
  }

  const role  = user.role;
  // Les sessions créées avant l'ajout des permissions granulaires ne
  // contiennent pas `user.permissions`. Conserver les droits attendus par rôle
  // évite de bloquer un médecin jusqu'à sa prochaine reconnexion.
  const rolePermissions = {
    can_read_patient: ['doctor_chef', 'doctor', 'secretaire', 'anapath', 'pharmacist'].includes(role),
    can_write_patient: ['doctor_chef', 'doctor', 'secretaire'].includes(role),
    can_read_diagnostic: ['doctor_chef', 'doctor', 'anapath'].includes(role),
    can_write_diagnostic: ['doctor_chef', 'doctor'].includes(role),
    can_read_treatment: ['doctor_chef', 'doctor', 'pharmacist'].includes(role),
    can_write_treatment: ['doctor_chef', 'doctor'].includes(role),
    can_view_statistics: ['admin', 'doctor_chef', 'doctor', 'pharmacist', 'anapath', 'epidemiologist'].includes(role),
    can_export: ['doctor_chef', 'epidemiologist'].includes(role),
    can_export_identified_data: role === 'doctor_chef',
    can_view_map: role === 'epidemiologist',
    can_manage_users: role === 'admin',
    can_view_rcp: ['doctor_chef', 'doctor'].includes(role),
    can_write_anapath_report: role === 'anapath',
    can_validate_diagnosis: role === 'doctor_chef',
  };
  const perms = user.permissions || rolePermissions;

  const can = {
    readPatient:     perms.can_read_patient     ?? false,
    writePatient:    perms.can_write_patient    ?? false,
    readDiagnostic:  perms.can_read_diagnostic  ?? false,
    writeDiagnostic: perms.can_write_diagnostic ?? false,
    readTreatment:   perms.can_read_treatment   ?? false,
    writeTreatment:  perms.can_write_treatment  ?? false,
    viewStatistics:  perms.can_view_statistics  ?? false,
    export:          perms.can_export           ?? false,
    viewMap:         perms.can_view_map         ?? false,
    manageUsers:     perms.can_manage_users     ?? false,
    viewRcp:         perms.can_view_rcp         ?? false,
    writeAnapathReport: perms.can_write_anapath_report ?? false,
    validateDiagnosis: perms.can_validate_diagnosis ?? false,
    exportIdentifiedData: perms.can_export_identified_data ?? false,
  };

  return {
    can,
    role,
    isAdmin:          role === ROLES.ADMIN,
    isOncologue:      role === ROLES.DOCTOR,
    isAnapath:        role === ROLES.ANAPATH,
    isEpidemiologist: role === ROLES.EPIDEMIOLOGIST,
    roleLabel:        ROLE_LABELS[role] || role,
    roleColor:        ROLE_COLORS[role] || ROLE_COLORS.readonly,
    user,
  };
}
