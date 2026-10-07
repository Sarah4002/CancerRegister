"""
apps/accounts/permissions.py

Permissions granulaires par rôle.
Utilisé dans tous les ViewSets pour contrôler l'accès.

Fonction / Permission   	              Admin (IT)	Doctor Chef	Doctor	Secrétaire	Pharmacie	Anapath	Épidémiologiste
Gérer les utilisateurs	                      ✅	        ❌	      ❌	      ❌	         ❌      	❌	     ❌
Gérer les rôles	                              ✅	        ❌	      ❌    	  ❌          ❌	        ❌	     ❌
Paramètres de l'application	                  ✅	        ❌	      ❌	      ❌	         ❌	        ❌	     ❌
Sauvegarde / Restauration	                  ✅	        ❌	      ❌	      ❌	         ❌	        ❌	     ❌
Consulter les logs	                          ✅	        ❌	      ❌	      ❌	         ❌	        ❌        ❌
Voir les dossiers patients                    ❌	        ✅	      ✅	      ⚠️(Administratif)	   ⚠️  (Prescription)	⚠️ (Résultats AP)	❌
Créer un patient	                          ❌	        ✅	      ✅	      ✅	         ❌	        ❌	     ❌
Modifier les informations administratives	  ❌	        ✅	      ✅	      ✅	         ❌	        ❌	     ❌
Modifier les données médicales	              ❌	        ✅	      ✅	      ❌	         ❌	        ❌	     ❌
Valider le diagnostic	                      ❌	        ✅	      ❌	      ❌	         ❌	        ❌	     ❌
Ajouter un compte rendu d'Anapath	          ❌	   Consultation	Consultation ❌	        ❌	       ✅	    ❌
Prescrire un traitement	                      ❌	        ✅	      ✅	      ❌	         ❌	        ❌	     ❌
Consulter les prescriptions	                  ❌	        ✅	      ✅	      ❌	         ✅	        ❌	     ❌
Délivrer les médicaments	                  ❌	        ❌	      ❌	      ❌	         ✅	        ❌	     ❌
Gérer le stock pharmacie	                  ❌    	    ❌	      ❌	      ❌	         ✅	        ❌	     ❌
Générer les statistiques	                  ❌ 	    ✅	      ⚠️	   ❌	      ⚠️	      ⚠️	    ✅
Exporter les données anonymisées	          ❌	        ✅	      ❌	      ❌	         ❌	        ❌	     ✅
Exporter les données nominatives	          ❌	        ✅	      ❌	      ❌	         ❌	        ❌	     ❌
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

# PATTERN Strategy — les helpers historiques délèguent aux stratégies
# enregistrées plus bas, ce qui conserve la même interface pour leurs appelants.

# ── Constantes de rôles ────────────────────────────────────────
ROLE_ADMIN          = 'admin'
ROLE_DOCTOR         = 'doctor'          # Médecin oncologue
ROLE_ANAPATH        = 'anapath'         # Médecin anatomopathologiste
ROLE_EPIDEMIOLOGIST = 'epidemiologist'  # Épidémiologiste
ROLE_PHARMACIST     = 'pharmacist'      # Pharmacien
ROLE_READONLY       = 'readonly'
ROLE_SECRETAIRE     = 'secretaire'       # Saisie des données
ROLE_DOCTOR_CHEF    = 'doctor_chef'     # Médecin chef
ROLE_RADIOLOGIST    = 'radiologist'
ROLE_LABORATORY     = 'laboratory'
ROLE_NURSE          = 'nurse'


ALL_ROLES = [ROLE_ADMIN, ROLE_DOCTOR, ROLE_ANAPATH, ROLE_EPIDEMIOLOGIST, ROLE_PHARMACIST, ROLE_READONLY, ROLE_SECRETAIRE, ROLE_DOCTOR_CHEF, ROLE_RADIOLOGIST, ROLE_LABORATORY, ROLE_NURSE]


class AllowedRolesStrategy:
    """Politique interchangeable qui autorise une capacité à certains rôles."""

    def __init__(self, *roles):
        self.roles = frozenset(roles)

    def allows(self, user):
        return bool(user and user.is_authenticated and user.role in self.roles)


# PATTERN Strategy — le registre associe chaque capacité à sa politique d'accès.
ROLE_PERMISSION_STRATEGIES = {
    'write_patient': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_SECRETAIRE),
    'read_patient': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_SECRETAIRE, ROLE_DOCTOR, ROLE_ANAPATH, ROLE_PHARMACIST, ROLE_RADIOLOGIST, ROLE_LABORATORY, ROLE_NURSE),
    'write_diagnostic': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR),
    'read_diagnostic': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_ANAPATH, ROLE_RADIOLOGIST, ROLE_LABORATORY),
    'write_anapath_report': AllowedRolesStrategy(ROLE_ANAPATH),
    'manage_exam_results': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_ANAPATH, ROLE_RADIOLOGIST, ROLE_LABORATORY),
    'validate_diagnosis': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR),
    'write_treatment': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR),
    'read_treatment': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_PHARMACIST),
    'view_statistics': AllowedRolesStrategy(ROLE_ADMIN, ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_PHARMACIST, ROLE_ANAPATH, ROLE_EPIDEMIOLOGIST),
    'export': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_EPIDEMIOLOGIST),
    'export_identified_data': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR),
    'view_map': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_EPIDEMIOLOGIST),
    'manage_sig_configuration': AllowedRolesStrategy(ROLE_DOCTOR_CHEF),
    'manage_users': AllowedRolesStrategy(ROLE_ADMIN),
    'view_rcp': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR),
    'manage_appointments': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_SECRETAIRE),
    'clinical_followup': AllowedRolesStrategy(ROLE_DOCTOR_CHEF, ROLE_DOCTOR),
    'manage_canreg': AllowedRolesStrategy(ROLE_ADMIN, ROLE_DOCTOR_CHEF),
    'medical_configuration': AllowedRolesStrategy(ROLE_ADMIN, ROLE_DOCTOR_CHEF),
    'manage_pharmacy': AllowedRolesStrategy(ROLE_PHARMACIST),
}


def _allows(user, capability):
    return ROLE_PERMISSION_STRATEGIES[capability].allows(user)



# ── Helpers ────────────────────────────────────────────────────
def has_role(user, *roles):
    return user.is_authenticated and user.role in roles

def is_admin(user):
    return has_role(user, ROLE_ADMIN)

def is_doctor_chef(user):
    return has_role(user, ROLE_DOCTOR_CHEF)

def can_write_patient(user):
    """Créer ou modifier un dossier patient (identité, coordonnées, profil)."""
    return _allows(user, 'write_patient')

def can_read_patient(user):
    """Voir les dossiers patients selon le périmètre défini par rôle."""
    return _allows(user, 'read_patient')

def can_write_diagnostic(user):
    """Saisir ou modifier les données médicales hors compte rendu anapath."""
    return _allows(user, 'write_diagnostic')

def can_read_diagnostic(user):
    """Consulter les diagnostics et résultats anatomopathologiques."""
    return _allows(user, 'read_diagnostic')

def can_write_anapath_report(user):
    """Ajouter ou modifier un compte rendu d'anatomopathologie."""
    return _allows(user, 'write_anapath_report')

def can_manage_exam_results(user):
    """Prescrire les examens et saisir leurs résultats selon le rôle médical."""
    return _allows(user, 'manage_exam_results')

def can_validate_diagnosis(user):
    """Valider un diagnostic définitif."""
    return _allows(user, 'validate_diagnosis')

def can_write_treatment(user):
    """Saisir ou modifier un traitement."""
    return _allows(user, 'write_treatment')

def can_read_treatment(user):
    """Voir les traitements."""
    return _allows(user, 'read_treatment')

def can_view_statistics(user):
    """Voir les statistiques."""
    return _allows(user, 'view_statistics')

def can_export(user):
    """Exporter des données anonymisées."""
    return _allows(user, 'export')

def can_export_identified_data(user):
    """Exporter des données nominatives."""
    return _allows(user, 'export_identified_data')

def can_view_map(user):
    """Carte SIG."""
    return _allows(user, 'view_map')


def can_manage_sig_configuration(user):
    """Créer, modifier ou supprimer les zones/cartes SIG partagées."""
    return _allows(user, 'manage_sig_configuration')

def can_manage_users(user):
    """Gérer les comptes utilisateurs."""
    return _allows(user, 'manage_users')

def can_view_rcp(user):
    """RCP — réunion de concertation pluridisciplinaire."""
    return _allows(user, 'view_rcp')


def can_manage_appointments(user):
    """Consulter et gérer les rendez-vous, sans accéder au suivi clinique."""
    return _allows(user, 'manage_appointments')


def can_access_clinical_followup(user):
    """Consulter ou renseigner les consultations et leurs données médicales."""
    return _allows(user, 'clinical_followup')


def can_manage_canreg(user):
    """Importer/exporter CanReg5 : opération sensible contenant des données médicales."""
    return _allows(user, 'manage_canreg')


def can_manage_medical_configuration(user):
    """Gérer les règles de validation et champs médicaux configurables."""
    return _allows(user, 'medical_configuration')


def can_manage_pharmacy(user):
    """Consulter et gérer le stock de la pharmacie hospitalière."""
    return _allows(user, 'manage_pharmacy')


# ── Classes de permission DRF ──────────────────────────────────

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_admin(request.user)


class CanManagePharmacy(BasePermission):
    message = "Cet espace est réservé au service de pharmacie."

    def has_permission(self, request, view):
        return can_manage_pharmacy(request.user)


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
        return can_write_diagnostic(request.user) or can_write_anapath_report(request.user)


class CanManageMedicalExams(BasePermission):
    message = "Accès aux examens médicaux non autorisé."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return can_read_patient(request.user) or can_read_diagnostic(request.user)
        return can_manage_exam_results(request.user)


class CanWriteAnapathReport(BasePermission):
    message = "Ajout de compte rendu anatomopathologique réservé au service d'anapath."

    def has_permission(self, request, view):
        return can_write_anapath_report(request.user)


class CanValidateDiagnosis(BasePermission):
    message = "Validation du diagnostic réservée au médecin chef."

    def has_permission(self, request, view):
        return can_validate_diagnosis(request.user)


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


class CanViewMap(BasePermission):
    message = "Accès à la carte SIG non autorisé."

    def has_permission(self, request, view):
        return can_view_map(request.user)


class CanManageAppointmentsOrClinicalFollowup(BasePermission):
    """La secrétaire ne peut utiliser ce module que via le sérialiseur RDV."""
    message = "Accès aux rendez-vous ou au suivi clinique non autorisé."

    def has_permission(self, request, view):
        return can_manage_appointments(request.user)


class CanAccessClinicalFollowup(BasePermission):
    message = "Accès aux données de suivi clinique non autorisé."

    def has_permission(self, request, view):
        return can_access_clinical_followup(request.user)


class CanManageCanReg(BasePermission):
    message = "Import/export CanReg5 réservé à l'administrateur et au médecin chef."

    def has_permission(self, request, view):
        return can_manage_canreg(request.user)


class CanManageMedicalConfiguration(BasePermission):
    message = "Configuration médicale réservée au médecin chef et à l'administrateur."

    def has_permission(self, request, view):
        return can_manage_medical_configuration(request.user)


class CanExport(BasePermission):
    message = "Export non autorisé pour votre profil."
    def has_permission(self, request, view):
        return can_export(request.user)


class CanExportIdentifiedData(BasePermission):
    message = "Export de données nominatives réservé au médecin chef."

    def has_permission(self, request, view):
        return can_export_identified_data(request.user)


class CanManageUsers(BasePermission):
    message = "Gestion des utilisateurs réservée aux administrateurs."
    def has_permission(self, request, view):
        return can_manage_users(request.user)
