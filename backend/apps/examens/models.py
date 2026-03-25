from django.db import models
from django.contrib.auth import get_user_model
from apps.patients.models import Patient

User = get_user_model()

class ExamenMedical(models.Model):
    class CategorieChoices(models.TextChoices):
        BIOLOGIE = 'biologie', 'Bilan biologique'
        IMAGERIE = 'imagerie', 'Imagerie'
        ANAPATH = 'anapath', 'Anatomopathologie'
        ENDOSCOPIE = 'endoscopie', 'Endoscopie'
        CARDIOLOGIE = 'cardiologie', 'Cardiologie'

    class StatutChoices(models.TextChoices):
        PRESCRIT = 'prescrit', 'Prescrit'
        EN_ATTENTE = 'en_attente', 'En attente'
        REALISE = 'realise', 'Réalisé'
        ANNULE = 'annule', 'Annulé'

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='examens_medicaux')
    categorie = models.CharField(max_length=50, choices=CategorieChoices.choices)
    nom_examen = models.CharField(max_length=200)
    date_prescription = models.DateField()
    date_realisation = models.DateField(null=True, blank=True)
    resultat = models.TextField(blank=True)
    fichier_dicom = models.FileField(upload_to='examens/dicom/', null=True, blank=True)
    statut = models.CharField(max_length=20, choices=StatutChoices.choices, default=StatutChoices.PRESCRIT)
    prescrit_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='examens_prescrits')
    observations = models.TextField(blank=True)
    
    date_creation = models.DateTimeField(auto_now_add=True)
    date_mise_a_jour = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'examen_medical'
        ordering = ['-date_prescription']
        verbose_name = 'Examen Médical'
        verbose_name_plural = 'Examens Médicaux'

    def __str__(self):
        return f"{self.get_categorie_display()} - {self.nom_examen} ({self.patient.registration_number})"
