from django.db import models


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