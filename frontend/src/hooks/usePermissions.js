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
  READONLY:       'readonly',
};

export const ROLE_LABELS = {
  admin:          'Administrateur',
  doctor:         'Médecin Oncologue',
  anapath:        'Médecin Anatomopathologiste',
  epidemiologist: 'Épidémiologiste',
  readonly:       'Lecture seule',
};

export const ROLE_COLORS = {
  admin:          { color: '#ff4d6a', bg: 'rgba(255,77,106,0.1)',  border: 'rgba(255,77,106,0.25)'  },
  doctor:         { color: '#00a8ff', bg: 'rgba(0,168,255,0.1)',   border: 'rgba(0,168,255,0.25)'   },
  anapath:        { color: '#9b8afb', bg: 'rgba(155,138,251,0.1)', border: 'rgba(155,138,251,0.25)' },
  epidemiologist: { color: '#00e5a0', bg: 'rgba(0,229,160,0.1)',   border: 'rgba(0,229,160,0.25)'   },
  readonly:       { color: '#9ca3af', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)' },
};

function buildEmptyCan() {
  return {
    readPatient:    false, writePatient:    false,
    readDiagnostic: false, writeDiagnostic: false,
    readTreatment:  false, writeTreatment:  false,
    viewStatistics: false, export:          false,
    viewMap:        false, manageUsers:     false,
    viewRcp:        false,
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

  const perms = user.permissions || {};
  const role  = user.role;

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