"""
apps/stats/models.py
--------------------
Modèles exacts déduits de l'admin.py existant.

Champs référencés dans list_display / search_fields / list_filter :
  CancerType    : code, label, categorie, created_at
  Wilaya        : code, nom, latitude, longitude
  IncidenceRecord: cancer_type, wilaya, annee, mois, sexe, tranche_age, stade, nb_cas, nb_deces
  SurvivalRate  : cancer_type, stade, annee_ref, survie_1an, survie_3ans, survie_5ans, updated_at
  AIReport      : titre, status, created_by, created_at, completed_at
  SearchLog     : query, results_count, user, created_at
"""

from django.db import models
from django.conf import settings
from django.utils import timezone


# ─────────────────────────────────────────────────────────────────────────────
# CancerType
# ─────────────────────────────────────────────────────────────────────────────

class CancerType(models.Model):
    code        = models.CharField(max_length=20, unique=True)
    label       = models.CharField(max_length=200)           # ← 'label' (pas 'libelle')
    categorie   = models.CharField(max_length=100, blank=True)
    icd_codes   = models.JSONField(default=list, blank=True)
    est_actif   = models.BooleanField(default=True)
    ordre       = models.PositiveSmallIntegerField(default=0)
    created_at  = models.DateTimeField(auto_now_add=True)    # ← dans list_display

    class Meta:
        db_table            = 'stats_cancer_type'
        ordering            = ['ordre', 'label']
        verbose_name        = 'Type de cancer'
        verbose_name_plural = 'Types de cancer'

    def __str__(self):
        return f"{self.code} — {self.label}"


# ─────────────────────────────────────────────────────────────────────────────
# Wilaya
# ─────────────────────────────────────────────────────────────────────────────

class Wilaya(models.Model):
    code        = models.CharField(max_length=3, unique=True)
    nom         = models.CharField(max_length=100)
    region      = models.CharField(max_length=50, blank=True)
    population  = models.PositiveIntegerField(default=0)
    latitude    = models.FloatField(null=True, blank=True)   # ← dans list_display
    longitude   = models.FloatField(null=True, blank=True)   # ← dans list_display

    class Meta:
        db_table            = 'stats_wilaya'
        ordering            = ['code']
        verbose_name        = 'Wilaya'
        verbose_name_plural = 'Wilayas'

    def __str__(self):
        return f"{self.code} — {self.nom}"


# ─────────────────────────────────────────────────────────────────────────────
# IncidenceRecord
# ─────────────────────────────────────────────────────────────────────────────

class IncidenceRecord(models.Model):

    SEXE_CHOICES = [('M', 'Homme'), ('F', 'Femme'), ('T', 'Tous')]
    STADE_CHOICES = [
        ('I',   'Stade I'),
        ('II',  'Stade II'),
        ('III', 'Stade III'),
        ('IV',  'Stade IV'),
        ('INC', 'Inconnu'),
    ]

    cancer_type = models.ForeignKey(
        CancerType, on_delete=models.CASCADE,
        related_name='incidence_records', null=True, blank=True
    )
    wilaya      = models.ForeignKey(
        Wilaya, on_delete=models.SET_NULL,
        related_name='incidence_records', null=True, blank=True
    )
    annee       = models.PositiveSmallIntegerField()          # ← list_display
    mois        = models.PositiveSmallIntegerField(           # ← list_display
        null=True, blank=True,
        help_text="1-12, null = données annuelles"
    )
    sexe        = models.CharField(                           # ← list_display + list_filter
        max_length=1, choices=SEXE_CHOICES, default='T'
    )
    tranche_age = models.CharField(                           # ← list_display
        max_length=20, blank=True,
        help_text="ex: 40-49, 50-59, 60+"
    )
    stade       = models.CharField(                           # ← list_display + list_filter
        max_length=5, choices=STADE_CHOICES, blank=True
    )
    nb_cas      = models.PositiveIntegerField(default=0)      # ← list_display
    nb_deces    = models.PositiveIntegerField(default=0)      # ← list_display
    taux_brut   = models.FloatField(default=0.0, help_text="Pour 100 000 habitants")
    taux_std    = models.FloatField(default=0.0, help_text="Taux standardisé monde")
    population  = models.PositiveIntegerField(default=0)

    class Meta:
        db_table            = 'stats_incidence_record'
        unique_together     = [['cancer_type', 'wilaya', 'annee', 'mois', 'sexe', 'tranche_age', 'stade']]
        ordering            = ['-annee', '-mois', 'cancer_type']
        verbose_name        = "Enregistrement d'incidence"
        verbose_name_plural = "Enregistrements d'incidence"

    def __str__(self):
        return f"{self.cancer_type} | {self.wilaya} | {self.annee}/{self.mois} | {self.nb_cas} cas"


# ─────────────────────────────────────────────────────────────────────────────
# SurvivalRate
# ─────────────────────────────────────────────────────────────────────────────

class SurvivalRate(models.Model):

    STADE_CHOICES = [
        ('I',   'Stade I'),
        ('II',  'Stade II'),
        ('III', 'Stade III'),
        ('IV',  'Stade IV'),
        ('ALL', 'Tous stades'),
    ]

    cancer_type = models.ForeignKey(
        CancerType, on_delete=models.CASCADE,
        related_name='survival_rates', null=True, blank=True
    )
    stade       = models.CharField(max_length=5, choices=STADE_CHOICES, default='ALL')  # ← list_display + filter
    annee_ref   = models.PositiveSmallIntegerField()                                     # ← list_display + filter (pas 'annee'!)
    groupe_age  = models.CharField(max_length=20, blank=True)
    sexe        = models.CharField(max_length=10, blank=True)
    survie_1an  = models.FloatField(default=0.0)   # ← list_display
    survie_3ans = models.FloatField(default=0.0)   # ← list_display
    survie_5ans = models.FloatField(default=0.0)   # ← list_display
    n_patients  = models.PositiveIntegerField(default=0)
    updated_at  = models.DateTimeField(auto_now=True)  # ← list_display

    class Meta:
        db_table            = 'stats_survival_rate'
        unique_together     = [['cancer_type', 'annee_ref', 'stade', 'groupe_age', 'sexe']]
        ordering            = ['-annee_ref', 'cancer_type', 'stade']
        verbose_name        = 'Taux de survie'
        verbose_name_plural = 'Taux de survie'

    def __str__(self):
        return f"{self.cancer_type} | Stade {self.stade} | {self.annee_ref} | 5 ans: {self.survie_5ans}%"


# ─────────────────────────────────────────────────────────────────────────────
# AIReport
# ─────────────────────────────────────────────────────────────────────────────

class AIReport(models.Model):

    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        RUNNING = 'running', 'En cours'
        DONE    = 'done',    'Terminé'
        ERROR   = 'error',   'Erreur'

    titre           = models.CharField(max_length=255)                         # ← list_display
    status          = models.CharField(                                        # ← list_display + filter
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    payload         = models.JSONField(default=dict, blank=True)
    contenu_md      = models.TextField(blank=True)
    recommandations = models.JSONField(default=list, blank=True)
    created_by      = models.ForeignKey(                                       # ← list_display + search
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='ai_reports'
    )
    created_at      = models.DateTimeField(auto_now_add=True)                  # ← list_display + readonly
    completed_at    = models.DateTimeField(null=True, blank=True)              # ← list_display + readonly

    class Meta:
        db_table            = 'stats_ai_report'
        ordering            = ['-created_at']
        verbose_name        = 'Rapport IA'
        verbose_name_plural = 'Rapports IA'

    def __str__(self):
        return f"{self.titre} [{self.status}]"

    def mark_done(self, contenu_md, recommandations):
        """Marque le rapport comme terminé et enregistre completed_at."""
        self.status          = self.Status.DONE
        self.contenu_md      = contenu_md
        self.recommandations = recommandations
        self.completed_at    = timezone.now()
        self.save()

    def mark_error(self):
        self.status       = self.Status.ERROR
        self.completed_at = timezone.now()
        self.save()


# ─────────────────────────────────────────────────────────────────────────────
# SearchLog
# ─────────────────────────────────────────────────────────────────────────────

class SearchLog(models.Model):

    query         = models.CharField(max_length=500)          # ← list_display + search
    results_count = models.PositiveSmallIntegerField(default=0)  # ← list_display (pas 'results'!)
    user          = models.ForeignKey(                         # ← list_display + search
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='search_logs'
    )
    source        = models.CharField(max_length=50, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)   # ← list_display + readonly
    ip_address    = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table            = 'stats_search_log'
        ordering            = ['-created_at']
        verbose_name        = 'Log de recherche'
        verbose_name_plural = 'Logs de recherche'

    def __str__(self):
        return f'"{self.query}" → {self.results_count} résultats'