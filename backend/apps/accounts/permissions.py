"""
apps/accounts/permissions.py

Permissions granulaires par rôle.
Utilisé dans tous les ViewSets pour contrôler l'accès.

MATRICE DES DROITS :
┌─────────────────────────┬───────┬───────────┬─────────┬──────────┐
│ Fonctionnalité          │ Admin │ Oncologue │ Anapath │ Epidémio │
├─────────────────────────┼───────┼───────────┼─────────┼──────────┤
│ Créer patient           │  ✅   │    ✅     │   ❌    │    ❌    │
│ Modifier patient        │  ✅   │    ✅     │   ❌    │    ❌    │
│ Voir patients           │  ✅   │    ✅     │   👁    │    👁    │
│ Saisir diagnostic       │  ✅   │    ✅     │   ✅    │    ❌    │
│ Modifier diagnostic     │  ✅   │    ✅     │   ✅    │    ❌    │
│ Voir diagnostic         │  ✅   │    ✅     │   ✅    │    ❌    │
│ Saisir traitement       │  ✅   │    ✅     │   ❌    │    ❌    │
│ Voir statistiques       │  ✅   │    👁     │   ❌    │    ✅    │
│ Exporter données        │  ✅   │    ❌     │   ❌    │    ✅    │
│ Carte SIG               │  ✅   │    ❌     │   ❌    │    ✅    │
│ Gérer utilisateurs      │  ✅   │    ❌     │   ❌    │    ❌    │
└─────────────────────────┴───────┴───────────┴─────────┴──────────┘
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


# ── Constantes de rôles ────────────────────────────────────────
ROLE_ADMIN          = 'admin'
ROLE_DOCTOR         = 'doctor'          # Médecin oncologue
ROLE_ANAPATH        = 'anapath'         # Médecin anatomopathologiste
ROLE_EPIDEMIOLOGIST = 'epidemiologist'  # Épidémiologiste
ROLE_READONLY       = 'readonly'

ALL_ROLES = [ROLE_ADMIN, ROLE_DOCTOR, ROLE_ANAPATH, ROLE_EPIDEMIOLOGIST, ROLE_READONLY]


# ── Helpers ────────────────────────────────────────────────────
def has_role(user, *roles):
    return user.is_authenticated and user.role in roles

def is_admin(user):
    return has_role(user, ROLE_ADMIN)

def can_write_patient(user):
    """Créer ou modifier un dossier patient (identité, coordonnées, profil)."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR)

def can_read_patient(user):
    """Voir les dossiers patients."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR, ROLE_ANAPATH, ROLE_EPIDEMIOLOGIST)

def can_write_diagnostic(user):
    """Saisir ou modifier un diagnostic / morphologie."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR, ROLE_ANAPATH)

def can_read_diagnostic(user):
    """Voir les diagnostics."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR, ROLE_ANAPATH)

def can_write_treatment(user):
    """Saisir ou modifier un traitement."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR)

def can_read_treatment(user):
    """Voir les traitements."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR)

def can_view_statistics(user):
    """Voir les statistiques."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR, ROLE_EPIDEMIOLOGIST)

def can_export(user):
    """Exporter les données."""
    return has_role(user, ROLE_ADMIN, ROLE_EPIDEMIOLOGIST)

def can_view_map(user):
    """Carte SIG."""
    return has_role(user, ROLE_ADMIN, ROLE_EPIDEMIOLOGIST)

def can_manage_users(user):
    """Gérer les comptes utilisateurs."""
    return has_role(user, ROLE_ADMIN)

def can_view_rcp(user):
    """RCP — réunion de concertation pluridisciplinaire."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR)


# ── Classes de permission DRF ──────────────────────────────────

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_admin(request.user)


class CanReadPatient(BasePermission):
    message = "Vous n'avez pas accès aux dossiers patients."
    def has_permission(self, request, view):
        return can_read_patient(request.user)


class CanWritePatient(BasePermission):
    message = "Vous n'avez pas le droit de créer ou modifier un dossier patient."
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return can_read_patient(request.user)
        return can_write_patient(request.user)


class CanReadOrWriteDiagnostic(BasePermission):
    message = "Accès aux diagnostics non autorisé."
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return can_read_diagnostic(request.user)
        return can_write_diagnostic(request.user)


class CanReadOrWriteTreatment(BasePermission):
    message = "Accès aux traitements non autorisé."
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return can_read_treatment(request.user)
        return can_write_treatment(request.user)


class CanViewStatistics(BasePermission):
    message = "Vous n'avez pas accès aux statistiques."
    def has_permission(self, request, view):
        return can_view_statistics(request.user)


class CanExport(BasePermission):
    message = "Export non autorisé pour votre profil."
    def has_permission(self, request, view):
        return can_export(request.user)


class CanManageUsers(BasePermission):
    message = "Gestion des utilisateurs réservée aux administrateurs."
    def has_permission(self, request, view):
        return can_manage_users(request.user)