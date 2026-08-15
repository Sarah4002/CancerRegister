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


# ── Constantes de rôles ────────────────────────────────────────
ROLE_ADMIN          = 'admin'
ROLE_DOCTOR         = 'doctor'          # Médecin oncologue
ROLE_ANAPATH        = 'anapath'         # Médecin anatomopathologiste
ROLE_EPIDEMIOLOGIST = 'epidemiologist'  # Épidémiologiste
ROLE_PHARMACIST     = 'pharmacist'      # Pharmacien
ROLE_READONLY       = 'readonly'
ROLE_SECRETAIRE     = 'secretaire'       # Saisie des données
ROLE_DOCTOR_CHEF    = 'doctor_chef'     # Médecin chef


ALL_ROLES = [ROLE_ADMIN, ROLE_DOCTOR, ROLE_ANAPATH, ROLE_EPIDEMIOLOGIST, ROLE_PHARMACIST, ROLE_READONLY,ROLE_SECRETAIRE,ROLE_DOCTOR_CHEF]



# ── Helpers ────────────────────────────────────────────────────
def has_role(user, *roles):
    return user.is_authenticated and user.role in roles

def is_admin(user):
    return has_role(user, ROLE_ADMIN)

def is_doctor_chef(user):
    return has_role(user, ROLE_DOCTOR_CHEF)

def can_write_patient(user):
    """Créer ou modifier un dossier patient (identité, coordonnées, profil)."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_DOCTOR,ROLE_SECRETAIRE)

def can_read_patient(user):
    """Voir les dossiers patients selon le périmètre défini par rôle."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_SECRETAIRE, ROLE_DOCTOR, ROLE_ANAPATH, ROLE_PHARMACIST)

def can_write_diagnostic(user):
    """Saisir ou modifier les données médicales hors compte rendu anapath."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_DOCTOR)

def can_read_diagnostic(user):
    """Consulter les diagnostics et résultats anatomopathologiques."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_ANAPATH)

def can_write_anapath_report(user):
    """Ajouter ou modifier un compte rendu d'anatomopathologie."""
    return has_role(user, ROLE_ANAPATH)

def can_validate_diagnosis(user):
    """Valider un diagnostic définitif."""
    return has_role(user, ROLE_DOCTOR_CHEF)

def can_write_treatment(user):
    """Saisir ou modifier un traitement."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_DOCTOR)

def can_read_treatment(user):
    """Voir les traitements."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_PHARMACIST)

def can_view_statistics(user):
    """Voir les statistiques."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_PHARMACIST, ROLE_ANAPATH, ROLE_EPIDEMIOLOGIST)

def can_export(user):
    """Exporter des données anonymisées."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_DOCTOR,ROLE_EPIDEMIOLOGIST)

def can_export_identified_data(user):
    """Exporter des données nominatives."""
    return has_role(user, ROLE_DOCTOR_CHEF,ROLE_DOCTOR)

def can_view_map(user):
    """Carte SIG."""
    return has_role(user, ROLE_EPIDEMIOLOGIST)

def can_manage_users(user):
    """Gérer les comptes utilisateurs."""
    return has_role(user, ROLE_ADMIN)

def can_view_rcp(user):
    """RCP — réunion de concertation pluridisciplinaire."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_DOCTOR)


def can_manage_appointments(user):
    """Consulter et gérer les rendez-vous, sans accéder au suivi clinique."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_DOCTOR, ROLE_SECRETAIRE)


def can_access_clinical_followup(user):
    """Consulter ou renseigner les consultations et leurs données médicales."""
    return has_role(user, ROLE_DOCTOR_CHEF, ROLE_DOCTOR)


def can_manage_canreg(user):
    """Importer/exporter CanReg5 : opération sensible contenant des données médicales."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR_CHEF)


def can_manage_medical_configuration(user):
    """Gérer les règles de validation et champs médicaux configurables."""
    return has_role(user, ROLE_ADMIN, ROLE_DOCTOR_CHEF)


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
        return can_write_diagnostic(request.user) or can_write_anapath_report(request.user)


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
