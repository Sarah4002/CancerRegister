from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Notification(models.Model):
    class Type(models.TextChoices):
        RCP_INVITE      = 'rcp_invite',   'Invitation à une RCP'
        RCP_DEMARRE     = 'rcp_demarre',  'Réunion démarrée'
        RCP_TERMINEE    = 'rcp_terminee', 'Réunion terminée'
        NOUVEAU_MESSAGE = 'nouveau_msg',  'Nouveau message'
        NOUVELLE_DECISION = 'new_decision', 'Nouvelle décision'
        DOSSIER_AJOUTE  = 'dossier_ajoute', 'Dossier ajouté'

    destinataire = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications'
    )
    type         = models.CharField(max_length=30, choices=Type.choices)
    titre        = models.CharField(max_length=200)
    message      = models.TextField(blank=True)
    lue          = models.BooleanField(default=False)
    date_envoi   = models.DateTimeField(auto_now_add=True)

    # Liens optionnels vers les objets concernés
    reunion_id   = models.IntegerField(null=True, blank=True)
    dossier_id   = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table  = 'notifications'
        ordering  = ['-date_envoi']
        verbose_name = 'Notification'

    def __str__(self):
        return f"[{self.type}] {self.destinataire} — {self.titre}"