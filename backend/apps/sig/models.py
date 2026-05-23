from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import JSONField

User = get_user_model()


class PopulationCommune(models.Model):
    """Modèle pour la population par commune"""
    wilaya = models.CharField(max_length=100)
    commune = models.CharField(max_length=100)
    annee = models.PositiveSmallIntegerField()
    population = models.PositiveIntegerField()

    class Meta:
        db_table = 'sig_population_commune'
        ordering = ['wilaya', 'commune', 'annee']
        verbose_name = 'Population Commune'
        verbose_name_plural = 'Populations Communes'

    def __str__(self):
        return f"{self.commune} ({self.wilaya}) - {self.annee}"


class MapCard(models.Model):
    """Stocke une 'carte' créée par un utilisateur: zones, POI, filtres."""
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    cree_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='mapcards')
    wilaya = models.CharField(max_length=100, blank=True)
    commune = models.CharField(max_length=100, blank=True)
    zones = JSONField(default=list, blank=True)   # liste d'objets {name, polygon: [[lat,lng], ...]}
    pois = JSONField(default=list, blank=True)    # liste d'objets {label, lat, lng}
    filters = JSONField(default=dict, blank=True) # filtres appliqués (type_cancer, age_min, ...)
    est_actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(default=timezone.now)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sig_mapcards'
        ordering = ['-date_creation']
        verbose_name = 'Map Card'
        verbose_name_plural = 'Map Cards'

    def __str__(self):
        return f"{self.nom} ({self.cree_par})"