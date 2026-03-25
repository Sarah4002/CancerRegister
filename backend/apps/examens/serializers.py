from rest_framework import serializers
from .models import ExamenMedical
from apps.accounts.serializers import UserSummarySerializer

class ExamenMedicalSerializer(serializers.ModelSerializer):
    prescrit_par_info = UserSummarySerializer(source='prescrit_par', read_only=True)
    fichier_dicom_url = serializers.FileField(source='fichier_dicom', read_only=True)

    class Meta:
        model = ExamenMedical
        fields = [
            'id', 'patient', 'categorie', 'nom_examen', 
            'date_prescription', 'date_realisation', 'resultat', 
            'fichier_dicom', 'fichier_dicom_url', 'statut', 
            'prescrit_par', 'prescrit_par_info', 'observations', 
            'date_creation', 'date_mise_a_jour'
        ]
        read_only_fields = ['id', 'date_creation', 'date_mise_a_jour', 'prescrit_par']
