from django.conf import settings
from django.db import models


class Medicament(models.Model):
    dci = models.CharField(max_length=150)
    forme = models.CharField(max_length=150)
    seuil_alerte = models.PositiveIntegerField(default=0)
    actif = models.BooleanField(default=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacie_medicament'
        ordering = ['dci', 'forme']
        constraints = [models.UniqueConstraint(fields=['dci', 'forme'], name='pharmacie_medicament_dci_forme_uniq')]

    def __str__(self):
        return f'{self.dci} — {self.forme}'


class LotStock(models.Model):
    medicament = models.ForeignKey(Medicament, on_delete=models.PROTECT, related_name='lots')
    numero_lot = models.CharField(max_length=80)
    quantite = models.PositiveIntegerField(default=0)
    date_expiration = models.DateField(null=True, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pharmacie_lot_stock'
        ordering = ['date_expiration', 'medicament__dci']
        constraints = [models.UniqueConstraint(fields=['medicament', 'numero_lot'], name='pharmacie_lot_numero_uniq')]

    def __str__(self):
        return f'{self.medicament} [{self.numero_lot}]'


class MouvementStock(models.Model):
    class Type(models.TextChoices):
        ENTREE = 'entree', 'Entrée'
        SORTIE = 'sortie', 'Sortie'
        AJUSTEMENT = 'ajustement', 'Ajustement'

    lot = models.ForeignKey(LotStock, on_delete=models.PROTECT, related_name='mouvements')
    type = models.CharField(max_length=15, choices=Type.choices)
    quantite = models.IntegerField(help_text='Variation signée : positive pour une entrée, négative pour une sortie.')
    commentaire = models.CharField(max_length=255, blank=True)
    effectue_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='mouvements_stock_pharmacie')
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pharmacie_mouvement_stock'
        ordering = ['-cree_le']
