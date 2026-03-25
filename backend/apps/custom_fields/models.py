"""
apps/custom_fields/models.py

Système de champs personnalisés dynamiques.
- ChampPersonnalise : définit un champ créé par l'admin
- ValeurChamp       : stocke la valeur saisie pour un objet donné
"""

from django.db import models
from django.conf import settings
import json


class ChampPersonnalise(models.Model):
    """
    Définition d'un champ personnalisé créé par l'admin.
    """

    class TypeChamp(models.TextChoices):
        TEXTE    = 'texte',    'Texte libre'
        NOMBRE   = 'nombre',   'Nombre'
        DATE     = 'date',     'Date'
        BOOLEEN  = 'booleen',  'Oui / Non'
        TEXTAREA = 'textarea', 'Texte long'
        SELECT   = 'select',   'Liste déroulante'

    class Module(models.TextChoices):
        PATIENT    = 'patient',    'Dossier patient'
        DIAGNOSTIC = 'diagnostic', 'Diagnostic'
        TRAITEMENT = 'traitement', 'Traitement'
        SUIVI      = 'suivi',      'Suivi / Consultation'

    # Identification
    nom          = models.CharField(max_length=100, help_text="Nom du champ affiché")
    code         = models.SlugField(max_length=100, unique=True, help_text="Identifiant interne (généré auto)")
    description  = models.TextField(blank=True, help_text="Description / aide pour le médecin")

    # Type et module
    type_champ   = models.CharField(max_length=20, choices=TypeChamp.choices)
    module       = models.CharField(max_length=20, choices=Module.choices)

    # Lien cancer spécifique (optionnel)
    # Ex: "C50" pour sein, "C18" pour côlon — code ICD-O-3 préfixe
    # Si vide → champ global pour tous les patients du module
    topographie_code = models.CharField(
        max_length=10, blank=True,
        help_text="Code ICD-O-3 si spécifique à un cancer (ex: C50 pour sein). Vide = global."
    )
    topographie_libelle = models.CharField(max_length=100, blank=True)

    # Options pour type SELECT (JSON liste de strings)
    # Ex: '["Positif", "Négatif", "Inconnu"]'
    options_json = models.TextField(
        blank=True, default='[]',
        help_text='Options pour liste déroulante — JSON array ex: ["Option1","Option2"]'
    )

    # Paramètres
    obligatoire  = models.BooleanField(default=False)
    actif        = models.BooleanField(default=True)
    ordre        = models.PositiveIntegerField(default=0, help_text="Ordre d'affichage")

    # Pour type NOMBRE
    valeur_min   = models.FloatField(null=True, blank=True)
    valeur_max   = models.FloatField(null=True, blank=True)
    unite        = models.CharField(max_length=20, blank=True, help_text="Unité ex: mg/L, cm, %")

    # Métadonnées
    cree_par     = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='champs_crees'
    )
    date_creation    = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'custom_fields_definition'
        ordering = ['module', 'ordre', 'nom']
        verbose_name = 'Champ personnalisé'
        verbose_name_plural = 'Champs personnalisés'

    def __str__(self):
        return f"[{self.module}] {self.nom} ({self.type_champ})"

    @property
    def options(self):
        """Retourne la liste des options (pour type SELECT)."""
        try:
            return json.loads(self.options_json) if self.options_json else []
        except (json.JSONDecodeError, TypeError):
            return []

    @options.setter
    def options(self, value):
        self.options_json = json.dumps(value, ensure_ascii=False)

    def save(self, *args, **kwargs):
        # Générer le code slug depuis le nom si vide
        if not self.code:
            import re
            import unicodedata
            nfkd = unicodedata.normalize('NFKD', self.nom)
            ascii_str = nfkd.encode('ascii', 'ignore').decode('ascii')
            slug = re.sub(r'[^a-z0-9]+', '_', ascii_str.lower()).strip('_')
            # Garantir l'unicité
            base = f"{self.module}_{slug}"
            code = base
            i = 1
            while ChampPersonnalise.objects.filter(code=code).exclude(pk=self.pk).exists():
                code = f"{base}_{i}"
                i += 1
            self.code = code
        super().save(*args, **kwargs)


class ValeurChamp(models.Model):
    """
    Valeur d'un champ personnalisé pour un objet donné.
    Utilise une FK générique via object_id (int) pour supporter
    Patient, Diagnostic, Traitement, Suivi.
    """
    champ       = models.ForeignKey(
        ChampPersonnalise, on_delete=models.CASCADE,
        related_name='valeurs'
    )
    module      = models.CharField(max_length=20)   # 'patient', 'diagnostic', etc.
    object_id   = models.PositiveIntegerField()      # ID de l'objet lié

    # Valeur stockée sous forme texte (convertie selon le type)
    valeur      = models.TextField(blank=True, null=True)

    date_creation     = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    saisi_par   = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True
    )

    class Meta:
        db_table = 'custom_fields_values'
        unique_together = ('champ', 'module', 'object_id')
        verbose_name = 'Valeur champ personnalisé'

    def __str__(self):
        return f"{self.champ.nom} = {self.valeur}"

    def get_valeur_typee(self):
        """Retourne la valeur convertie selon le type du champ."""
        if self.valeur is None:
            return None
        t = self.champ.type_champ
        try:
            if t == 'nombre':
                return float(self.valeur)
            if t == 'booleen':
                return self.valeur.lower() in ('true', '1', 'oui', 'yes')
            if t == 'date':
                from datetime import date
                return date.fromisoformat(self.valeur)
        except (ValueError, TypeError):
            pass
        return self.valeur