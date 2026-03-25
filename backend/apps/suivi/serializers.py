from rest_framework import serializers
from .models import ConsultationSuivi, QualiteVie, EffetIndesirable


class ConsultationSuiviListSerializer(serializers.ModelSerializer):
    patient_nom          = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero       = serializers.CharField(source='patient.registration_number', read_only=True)
    patient_num_dossier  = serializers.CharField(source='patient.registration_number', read_only=True)
    patient_statut_vital = serializers.CharField(source='patient.statut_vital', read_only=True)
    type_label      = serializers.CharField(source='get_type_consultation_display', read_only=True)
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    evolution_label = serializers.CharField(source='get_evolution_maladie_display', read_only=True)
    medecin_nom     = serializers.SerializerMethodField()

    class Meta:
        model  = ConsultationSuivi
        fields = [
            'id', 'patient', 'patient_nom', 'patient_numero',
            'type_consultation', 'type_label', 'statut', 'statut_label',
            'date_consultation', 'ps_ecog', 'poids_kg',
            'evolution_maladie', 'evolution_label',
            'rechute', 'nombre_rechutes',
            'date_dernier_rdv', 'prochaine_consultation',
            'medecin_nom', 'date_creation',
            'patient_num_dossier', 'patient_statut_vital',
        ]

    def get_medecin_nom(self, obj):
        if obj.medecin:
            return f"{obj.medecin.first_name} {obj.medecin.last_name}".strip() or obj.medecin.username
        return None


class ConsultationSuiviDetailSerializer(serializers.ModelSerializer):
    patient_nom          = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero       = serializers.CharField(source='patient.registration_number', read_only=True)
    patient_num_dossier  = serializers.CharField(source='patient.registration_number', read_only=True)
    patient_statut_vital = serializers.CharField(source='patient.statut_vital', read_only=True)
    type_label      = serializers.CharField(source='get_type_consultation_display', read_only=True)
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    evolution_label = serializers.CharField(source='get_evolution_maladie_display', read_only=True)
    ps_ecog_label   = serializers.CharField(source='get_ps_ecog_display', read_only=True)
    patient_statut_vital  = serializers.CharField(source='patient.statut_vital', read_only=True)
    patient_cause_deces   = serializers.CharField(source='patient.cause_deces', read_only=True)
    patient_num_dossier   = serializers.CharField(source='patient.registration_number', read_only=True)
    tabac_label     = serializers.CharField(source='get_tabac_display', read_only=True)
    alcool_label    = serializers.CharField(source='get_alcool_display', read_only=True)
    activite_label  = serializers.CharField(source='get_activite_physique_display', read_only=True)
    medecin_nom     = serializers.SerializerMethodField()
    qualite_vie_id  = serializers.SerializerMethodField()

    class Meta:
        model  = ConsultationSuivi
        fields = '__all__'
        read_only_fields = ['date_creation', 'date_modification', 'cree_par', 'imc']

    def get_medecin_nom(self, obj):
        if obj.medecin:
            return f"{obj.medecin.first_name} {obj.medecin.last_name}".strip() or obj.medecin.username
        return None

    def get_qualite_vie_id(self, obj):
        try:
            return obj.qualite_vie.id
        except Exception:
            return None


class ConsultationSuiviCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model   = ConsultationSuivi
        exclude = ['cree_par', 'date_creation', 'date_modification', 'imc']

    def create(self, validated_data):
        if self.context.get('request'):
            validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class QualiteVieSerializer(serializers.ModelSerializer):
    patient_nom       = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero    = serializers.CharField(source='patient.registration_number', read_only=True)
    score_fonctionnel = serializers.FloatField(read_only=True)
    score_symptomes   = serializers.FloatField(read_only=True)

    class Meta:
        model  = QualiteVie
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']

    def create(self, validated_data):
        if self.context.get('request'):
            validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)



class EffetIndesirableSerializer(serializers.ModelSerializer):
    patient_nom           = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero        = serializers.CharField(source='patient.registration_number', read_only=True)
    type_label            = serializers.CharField(source='get_type_effet_display', read_only=True)
    severite_label        = serializers.CharField(source='get_severite_display', read_only=True)
    impact_traitement_label = serializers.CharField(source='get_impact_traitement_display', read_only=True)

    class Meta:
        model  = EffetIndesirable
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']

    def create(self, validated_data):
        if self.context.get('request'):
            validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)