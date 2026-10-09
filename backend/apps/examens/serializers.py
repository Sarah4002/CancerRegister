from rest_framework import serializers
from .models import ExamenMedical
from apps.accounts.serializers import UserSummarySerializer

class ExamenMedicalSerializer(serializers.ModelSerializer):
    prescrit_par_info = UserSummarySerializer(source='prescrit_par', read_only=True)
    fichier_dicom_url = serializers.FileField(source='fichier_dicom', read_only=True)
    patient_nom = serializers.SerializerMethodField()
    patient_numero = serializers.CharField(source='patient.registration_number', read_only=True)
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)

    def get_patient_nom(self, obj):
        return f'{obj.patient.prenom} {obj.patient.nom}'.strip()

    class Meta:
        model = ExamenMedical
        fields = [
            'id', 'patient', 'patient_nom', 'patient_numero', 'consultation', 'categorie', 'nom_examen',
            'date_prescription', 'date_realisation', 'resultat', 
            'fichier_dicom', 'fichier_dicom_url', 'fichier_resultat', 'service_destinataire', 'statut',
            'statut_label', 'prescrit_par', 'prescrit_par_info', 'observations', 'note_medecin',
            'date_creation', 'date_mise_a_jour'
        ]
        read_only_fields = ['id', 'date_creation', 'date_mise_a_jour', 'prescrit_par', 'service_destinataire']

    def validate(self, attrs):
        patient = attrs.get('patient', getattr(self.instance, 'patient', None))
        consultation = attrs.get('consultation', getattr(self.instance, 'consultation', None))
        if consultation and patient and consultation.patient_id != patient.id:
            raise serializers.ValidationError({'consultation': 'La consultation doit appartenir au même patient que l’examen.'})
        resultat = attrs.get('resultat', getattr(self.instance, 'resultat', ''))
        if resultat and not attrs.get('statut'):
            attrs['statut'] = ExamenMedical.StatutChoices.RESULTAT_DISPONIBLE
        if resultat and not attrs.get('date_realisation') and not getattr(self.instance, 'date_realisation', None):
            from django.utils import timezone
            attrs['date_realisation'] = timezone.localdate()
        return attrs
