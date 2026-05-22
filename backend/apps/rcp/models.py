from django.db import models
from django.contrib.auth import get_user_model
from apps.patients.models import Patient
from apps.diagnostics.models import Diagnostic

User = get_user_model()


# ─────────────────────────────────────────────────────────────────
# 1. RÉUNION DE CONCERTATION PLURIDISCIPLINAIRE
# ─────────────────────────────────────────────────────────────────

class ReunionRCP(models.Model):

    class Statut(models.TextChoices):
        PLANIFIEE  = 'planifiee',  'Planifiée'
        EN_COURS   = 'en_cours',   'En cours'
        TERMINEE   = 'terminee',   'Terminée'
        ANNULEE    = 'annulee',    'Annulée'
        REPORTEE   = 'reportee',   'Reportée'

    class TypeRCP(models.TextChoices):
        SEIN           = 'sein',        'RCP Sein'
        DIGESTIF       = 'digestif',    'RCP Digestif'
        POUMON         = 'poumon',      'RCP Thoracique / Poumon'
        ORL            = 'orl',         'RCP ORL / Tête & Cou'
        GYNECO         = 'gyneco',      'RCP Gynécologique'
        URO            = 'uro',         'RCP Urologique'
        HEMATO         = 'hemato',      'RCP Hématologique'
        NEURO          = 'neuro',       'RCP Neurologique'
        DERMATO        = 'dermato',     'RCP Dermatologique'
        OS_TISSU       = 'os',          'RCP Os / Tissus mous'
        PEDIATRIQUE    = 'pediatrique', 'RCP Pédiatrique'
        PALLIATIVE     = 'palliative',  'RCP Soins palliatifs'
        GENERALE       = 'generale',    'RCP Générale / Autre'

    titre          = models.CharField(max_length=200)
    type_rcp       = models.CharField(max_length=20, choices=TypeRCP.choices, default='generale')
    statut         = models.CharField(max_length=20, choices=Statut.choices, default='planifiee')
    date_reunion   = models.DateField()
    heure_debut    = models.TimeField()
    heure_fin      = models.TimeField(null=True, blank=True)
    lieu           = models.CharField(max_length=200, blank=True)
    salle          = models.CharField(max_length=100, blank=True)
    coordinateur   = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='rcps_coordonnees',
        help_text="Médecin coordinateur de la RCP"
    )
    etablissement  = models.CharField(max_length=200, blank=True)
    objectif       = models.TextField(blank=True, help_text="Ordre du jour / objectifs de la réunion")
    compte_rendu   = models.TextField(blank=True)
    observations   = models.TextField(blank=True)
    nombre_dossiers_prevus = models.PositiveSmallIntegerField(default=0)

    date_creation     = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    cree_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='rcps_crees')

    class Meta:
        db_table  = 'reunions_rcp'
        ordering  = ['-date_reunion', '-heure_debut']
        verbose_name = 'Réunion RCP'
        verbose_name_plural = 'Réunions RCP'

    def __str__(self):
        return f"{self.titre} – {self.date_reunion}"

    @property
    def nombre_dossiers(self):
        return self.dossiers.count()

    @property
    def nombre_membres_presents(self):
        return self.presences.filter(present=True).count()


# ─────────────────────────────────────────────────────────────────
# 2. PRÉSENCES MEMBRES RCP
# ─────────────────────────────────────────────────────────────────

class PresenceRCP(models.Model):

    class Specialite(models.TextChoices):
        ONCOLOGUE       = 'onco',     'Oncologue médical'
        CHIRURGIEN      = 'chir',     'Chirurgien'
        RADIOLOGUE      = 'radio',    'Radiologue'
        RADIOTHERAPEUTE = 'radiot',   'Radiothérapeute'
        ANATOMOPATHO    = 'anapath',  'Anatomopathologiste'
        BIOLOGISTE      = 'bio',      'Biologiste'
        MEDECIN_REF     = 'ref',      'Médecin référent'
        PSYCHOLOGUE     = 'psy',      'Psychologue'
        INFIRMIER       = 'inf',      'Infirmier coordinateur'
        INTERNE         = 'intern',   'Interne / Résident'
        AUTRE           = 'autre',    'Autre'

    reunion     = models.ForeignKey(ReunionRCP, on_delete=models.CASCADE, related_name='presences')
    medecin     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='presences_rcp', null=True, blank=True)
    nom_externe = models.CharField(max_length=150, blank=True, help_text="Médecin externe non inscrit")
    specialite  = models.CharField(max_length=20, choices=Specialite.choices, default='onco')
    present     = models.BooleanField(default=True)
    role        = models.CharField(max_length=100, blank=True, help_text="Rôle spécifique dans cette RCP")

    class Meta:
        db_table = 'presences_rcp'
        unique_together = [['reunion', 'medecin']]
        verbose_name = 'Présence RCP'

    def __str__(self):
        nom = self.medecin.get_full_name() if self.medecin else self.nom_externe
        return f"{nom} – {self.reunion}"


# ─────────────────────────────────────────────────────────────────
# 3. DOSSIER PATIENT EN RCP
# ─────────────────────────────────────────────────────────────────

class DossierRCP(models.Model):

    class StatutDossier(models.TextChoices):
        EN_ATTENTE  = 'attente',   'En attente'
        DISCUTE     = 'discute',   'Discuté'
        REPORTE     = 'reporte',   'Reporté'
        ANNULE      = 'annule',    'Annulé'

    class TypePresentation(models.TextChoices):
        NOUVEAU        = 'nouveau',   'Nouveau dossier'
        RECIDIVE       = 'recidive',  'Récidive / Rechute'
        REVAL          = 'reval',     'Réévaluation'
        POST_TRAITEMENT= 'post_trt',  'Post-traitement'
        SECOND_AVIS    = 'second',    'Second avis'
        AUTRE          = 'autre',     'Autre'

    reunion          = models.ForeignKey(ReunionRCP, on_delete=models.CASCADE, related_name='dossiers')
    patient          = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='dossiers_rcp')
    diagnostic       = models.ForeignKey(Diagnostic, on_delete=models.SET_NULL, null=True, blank=True)
    ordre_passage    = models.PositiveSmallIntegerField(default=1, help_text="Ordre de présentation dans la réunion")
    type_presentation= models.CharField(max_length=20, choices=TypePresentation.choices, default='nouveau')
    statut           = models.CharField(max_length=20, choices=StatutDossier.choices, default='attente')
    medecin_presenteur= models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='dossiers_presentes',
    )
    resume_clinique  = models.TextField(blank=True, help_text="Résumé du cas clinique présenté")
    question_posee   = models.TextField(blank=True, help_text="Question clinique soumise à la RCP")
    date_creation    = models.DateTimeField(auto_now_add=True)
    cree_par         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='dossiers_rcp_crees')

    class Meta:
        db_table     = 'dossiers_rcp'
        ordering     = ['reunion', 'ordre_passage']
        unique_together = [['reunion', 'patient']]
        verbose_name = 'Dossier RCP'

    def __str__(self):
        return f"[RCP {self.reunion.date_reunion}] {self.patient.registration_number}"


# ─────────────────────────────────────────────────────────────────
# 4. DÉCISION RCP
# ─────────────────────────────────────────────────────────────────

class DecisionRCP(models.Model):

    class TypeDecision(models.TextChoices):
        CHIRURGIE        = 'chir',     'Chirurgie'
        CHIMIOTHERAPIE   = 'chimio',   'Chimiothérapie'
        RADIOTHERAPIE    = 'radio',    'Radiothérapie'
        HORMONOTHERAPIE  = 'hormono',  'Hormonothérapie'
        IMMUNOTHERAPIE   = 'immuno',   'Immunothérapie / Thérapie ciblée'
        RADIOCHIMIOTH    = 'radiochim','Radiochimiothérapie concomitante'
        SURVEILLANCE     = 'surveill', 'Surveillance active'
        SOINS_SUPPORT    = 'support',  'Soins de support'
        SOINS_PALLIATIFS = 'palliatif','Soins palliatifs'
        ESSAI_CLINIQUE   = 'essai',    'Inclusion essai clinique'
        SECOND_AVIS      = 'second',   'Demande second avis'
        BILAN_COMPL      = 'bilan',    'Bilan complémentaire'
        ABSTENTION       = 'abstention','Abstention thérapeutique'
        AUTRE            = 'autre',    'Autre'

    class Priorite(models.TextChoices):
        URGENTE  = 'urgente',  'Urgente (< 1 semaine)'
        RAPIDE   = 'rapide',   'Rapide (< 1 mois)'
        NORMALE  = 'normale',  'Normale (1–3 mois)'
        DIFFEREE = 'differee', 'Différée (> 3 mois)'

    dossier          = models.ForeignKey(DossierRCP, on_delete=models.CASCADE, related_name='decisions')
    type_decision    = models.CharField(max_length=20, choices=TypeDecision.choices)
    priorite         = models.CharField(max_length=10, choices=Priorite.choices, default='normale')
    description      = models.TextField(help_text="Détail de la décision thérapeutique")
    protocole        = models.CharField(max_length=200, blank=True, help_text="Protocole proposé ex: FOLFOX, AC-T")
    medecin_referent = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='decisions_rcp_referentes',
    )
    delai_semaines   = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Délai de mise en œuvre en semaines")
    accord_patient   = models.BooleanField(default=False, help_text="Accord du patient requis")
    realise          = models.BooleanField(default=False)
    date_realisation = models.DateField(null=True, blank=True)
    observations     = models.TextField(blank=True)
    date_creation    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = 'decisions_rcp'
        ordering  = ['dossier', 'type_decision']
        verbose_name = 'Décision RCP'

    def __str__(self):
        return f"[{self.dossier}] {self.get_type_decision_display()}"
