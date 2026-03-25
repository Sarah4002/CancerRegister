from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Patient(models.Model):
    """
    Fiche patient complète conforme CanReg5 / CIRC-OMS.
    """

    class Sexe(models.TextChoices):
        MASCULIN = 'M', 'Masculin'
        FEMININ  = 'F', 'Féminin'

    class StatutVital(models.TextChoices):
        VIVANT    = 'vivant',  'Vivant'
        DECEDE    = 'decede',  'Décédé'
        INCONNU   = 'inconnu', 'Inconnu'
        PERDU_VUE = 'perdu',   'Perdu de vue'

    class StatutDossier(models.TextChoices):
        NOUVEAU       = 'nouveau',    'Nouveau'
        EN_TRAITEMENT = 'traitement', 'En traitement'
        REMISSION     = 'remission',  'Rémission'
        PERDU_VUE     = 'perdu',      'Perdu de vue'
        DECEDE        = 'decede',     'Décédé'
        ARCHIVE       = 'archive',    'Archivé'

    class NiveauInstruction(models.TextChoices):
        AUCUN      = '0', 'Aucun'
        PRIMAIRE   = '1', 'Primaire'
        MOYEN      = '2', 'Moyen'
        SECONDAIRE = '3', 'Secondaire'
        SUPERIEUR  = '4', 'Supérieur'
        INCONNU    = '9', 'Inconnu'

    class Profession(models.TextChoices):
        AGRICULTEUR   = 'AGR', 'Agriculteur'
        FONCTIONNAIRE = 'FON', 'Fonctionnaire'
        COMMERCANT    = 'COM', 'Commerçant'
        ARTISAN       = 'ART', 'Artisan'
        ETUDIANT      = 'ETU', 'Étudiant'
        RETRAITE      = 'RET', 'Retraité'
        SANS_EMPLOI   = 'SEM', 'Sans emploi'
        FEMME_FOYER   = 'FFO', 'Femme au foyer'
        PROF_SANTE    = 'PSA', 'Professionnel de santé'
        AUTRE         = 'AUT', 'Autre'
        INCONNU       = 'INC', 'Inconnu'

    # ── Identifiant CanReg5 ──────────────────────────────────────
    registration_number   = models.CharField(max_length=20, unique=True, blank=True)
    id_national           = models.CharField(max_length=20, blank=True, help_text="Numéro national d'identité")
    num_securite_sociale  = models.CharField(
        max_length=30, blank=True,
        verbose_name='N° sécurité sociale',
        help_text='Numéro de sécurité sociale / assurance maladie',
    )
    num_matricule = models.CharField(max_length=50, blank=True, help_text="Numéro de matricule")

    # ── Identité ─────────────────────────────────────────────────
    nom            = models.CharField(max_length=100)
    prenom         = models.CharField(max_length=100)
    nom_jeune_fille = models.CharField(max_length=100, blank=True, verbose_name="Nom de jeune fille")
    sexe           = models.CharField(max_length=1, choices=Sexe.choices)
    date_naissance = models.DateField(null=True, blank=True)
    age_diagnostic = models.PositiveSmallIntegerField(null=True, blank=True)
    lieu_naissance = models.CharField(max_length=100, blank=True)
    nationalite    = models.CharField(max_length=50, default='Algérienne')

    # ── Coordonnées ──────────────────────────────────────────────
    adresse     = models.TextField(blank=True)
    commune     = models.CharField(max_length=100, blank=True)
    wilaya      = models.CharField(max_length=100, blank=True)
    code_postal = models.CharField(max_length=10, blank=True)
    telephone   = models.CharField(max_length=20, blank=True)
    telephone2  = models.CharField(max_length=20, blank=True)
    email       = models.EmailField(blank=True)

    # ── Profil socio-démographique ────────────────────────────────
    niveau_instruction = models.CharField(
        max_length=1, choices=NiveauInstruction.choices, default='9'
    )
    profession = models.CharField(
        max_length=3, choices=Profession.choices, default='INC'
    )
    situation_familiale = models.CharField(
        max_length=20,
        choices=[
            ('celibataire', 'Célibataire'), ('marie', 'Marié(e)'),
            ('divorce', 'Divorcé(e)'),      ('veuf', 'Veuf/Veuve'),
            ('inconnu', 'Inconnu'),
        ],
        default='inconnu'
    )
    nombre_enfants = models.PositiveSmallIntegerField(null=True, blank=True)

    # ── Antécédents ───────────────────────────────────────────────
    antecedents_personnels = models.TextField(blank=True)
    antecedents_familiaux  = models.TextField(blank=True)

    # ── Habitudes de vie ──────────────────────────────────────────
    tabagisme = models.CharField(
        max_length=20,
        choices=[('non','Non-fumeur'),('ex','Ex-fumeur'),('actif','Fumeur actif'),('inconnu','Inconnu')],
        default='inconnu'
    )
    alcool = models.CharField(
        max_length=20,
        choices=[('non','Non'),('oui','Oui'),('inconnu','Inconnu')],
        default='inconnu'
    )
    activite_physique = models.CharField(
        max_length=20,
        choices=[('sedentaire','Sédentaire'),('moderee','Modérée'),('active','Active'),('inconnu','Inconnu')],
        default='inconnu',
        verbose_name='Activité physique',
    )
    alimentation = models.CharField(
        max_length=50,
        choices=[
            ('equilibree','Équilibrée'),('grasse','Riche en graisses'),
            ('sucree','Riche en sucres'),('vegetarienne','Végétarienne/Végane'),
            ('inconnu','Inconnu'),
        ],
        default='inconnu',
        verbose_name='Alimentation',
    )

    # ── Statut ────────────────────────────────────────────────────
    statut_dossier = models.CharField(
        max_length=20, choices=StatutDossier.choices, default='nouveau'
    )
    statut_vital = models.CharField(
        max_length=10, choices=StatutVital.choices, default='inconnu'
    )
    date_deces  = models.DateField(null=True, blank=True)
    cause_deces = models.CharField(max_length=200, blank=True)

    # ── Médecin référent ──────────────────────────────────────────
    medecin_referent = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='patients_suivis'
    )
    etablissement_pec = models.CharField(max_length=200, blank=True)
    service_clinique = models.CharField(max_length=200, blank=True, help_text="Service ou clinique d'origine")

    # ── Métadonnées ───────────────────────────────────────────────
    date_enregistrement = models.DateTimeField(auto_now_add=True)
    date_modification   = models.DateTimeField(auto_now=True)
    cree_par = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='patients_crees'
    )
    notes     = models.TextField(blank=True)
    est_actif = models.BooleanField(default=True)

    class Meta:
        db_table = 'patients'
        ordering = ['-date_enregistrement']
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'

    def __str__(self):
        return f"{self.registration_number} – {self.nom} {self.prenom}"

    def save(self, *args, **kwargs):
        if not self.registration_number:
            self.registration_number = self._generate_reg_number()
        super().save(*args, **kwargs)

    def _generate_reg_number(self):
        from django.utils import timezone
        year = timezone.now().year
        count = Patient.objects.filter(
            registration_number__startswith=f'P-{year}-'
        ).count()
        return f'P-{year}-{count + 1:04d}'

    def get_full_name(self):
        return f"{self.nom} {self.prenom}".strip()

    @property
    def age(self):
        if self.date_naissance:
            from django.utils import timezone
            today = timezone.now().date()
            return today.year - self.date_naissance.year - (
                (today.month, today.day) <
                (self.date_naissance.month, self.date_naissance.day)
            )
        return self.age_diagnostic

    def get_qr_url(self, base_url=None):
        """Retourne l'URL mobile encodée dans le QR code."""
        from django.conf import settings
        base = base_url or getattr(settings, 'MOBILE_APP_BASE_URL', 'https://votre-app.com/patient')
        return f"{base}/{self.id}?token={self.registration_number}"


class ContactUrgence(models.Model):
    patient    = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='contacts_urgence')
    nom        = models.CharField(max_length=100)
    prenom     = models.CharField(max_length=100)
    lien       = models.CharField(max_length=50)
    telephone  = models.CharField(max_length=20)
    telephone2 = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'contacts_urgence'


class DossierMedical(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='dossier_medical')
    
    # ── Constantes vitales ───────────────────────────────────────
    tension_arterielle = models.CharField(max_length=20, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    pouls = models.PositiveSmallIntegerField(null=True, blank=True)
    glycemie = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    taille_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    poids_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    
    # ── Actes et Allergies ───────────────────────────────────────
    acte_chirurgical = models.TextField(blank=True)
    actes_par_pathologie = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    bilan_psychologique = models.TextField(blank=True)
    
    # ── Sécurité ─────────────────────────────────────────────────
    dossier_crypte = models.BooleanField(default=False)
    
    # ── Informations Cliniques et Suivi ──────────────────────────
    class LocalisationChoices(models.TextChoices):
        LOCAL = '1', 'Local'
        LOCOREGIONAL = '2', 'Locorégional'
        METASTASE = '3', 'Métastase'
        INDETERMINE = '4', 'Indéterminé'

    class SuiviChoices(models.TextChoices):
        VIVANT = '1', 'Vivant'
        DECEDE = '2', 'Décédé'
        PERDU_VUE = '3', 'Perdu de vue'

    class BaseDiagnosticChoices(models.TextChoices):
        ANAPATH_PRIMITIVE = '1', 'Anatomopathologie primitive'
        CYTOLOGIE = '2', 'Cytologie/examen cellulaire'
        ANAPATH_METASTASE = '3', 'Anatomopathologie métastase'
        CLINIQUE_IMAGERIE = '4', 'Clinique ou imagerie'

    localisation_tumorale = models.CharField(max_length=1, choices=LocalisationChoices.choices, blank=True)
    suivi = models.CharField(max_length=1, choices=SuiviChoices.choices, blank=True)
    
    date_deces = models.DateField(null=True, blank=True)
    cause_deces = models.CharField(max_length=200, blank=True)
    date_derniere_consultation = models.DateField(null=True, blank=True)
    medecin_traitant = models.CharField(max_length=150, blank=True)
    
    base_diagnostic = models.CharField(max_length=1, choices=BaseDiagnosticChoices.choices, blank=True)
    marqueurs_tumoraux = models.TextField(blank=True)
    premier_examen_anapath_positif = models.DateField(null=True, blank=True)
    type_grade_histologique = models.CharField(max_length=100, blank=True)
    stade_diagnostic = models.CharField(max_length=100, blank=True)

    date_creation = models.DateTimeField(auto_now_add=True)
    date_mise_a_jour = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dossier_medical'
        verbose_name = 'Dossier Médical'
        verbose_name_plural = 'Dossiers Médicaux'

    def __str__(self):
        return f"Dossier Médical - {self.patient.registration_number}"
