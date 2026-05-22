from rest_framework import serializers
from .models import Diagnostic, TopographieICD, MorphologieICD


class TopographieSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopographieICD
        fields = ['id', 'code', 'libelle', 'categorie']


class MorphologieSerializer(serializers.ModelSerializer):
    comportement_label = serializers.CharField(source='get_comportement_display', read_only=True)

    class Meta:
        model = MorphologieICD
        fields = ['id', 'code', 'libelle', 'comportement', 'comportement_label', 'groupe']


class DiagnosticListSerializer(serializers.ModelSerializer):
    patient_nom        = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero     = serializers.CharField(source='patient.registration_number', read_only=True)
    tnm_complet        = serializers.CharField(source='get_tnm_display_full', read_only=True)
    stade_label        = serializers.CharField(source='get_stade_ajcc_display', read_only=True)
    base_diag_label    = serializers.CharField(source='get_base_diagnostic_display', read_only=True)
    lateralite_label   = serializers.CharField(source='get_lateralite_display', read_only=True)
    grade_label        = serializers.CharField(source='get_grade_histologique_display', read_only=True)

    class Meta:
        model = Diagnostic
        fields = [
            'id', 'patient', 'patient_nom', 'patient_numero',
            'date_diagnostic', 'topographie_code', 'topographie_libelle',
            'morphologie_code', 'morphologie_libelle',
            'lateralite', 'lateralite_label',
            'grade_histologique', 'grade_label',
            'tnm_t', 'tnm_n', 'tnm_m', 'tnm_type', 'tnm_complet',
            'stade_ajcc', 'stade_label',
            'base_diagnostic', 'base_diag_label',
            'est_principal', 'date_creation',
        ]


class DiagnosticDetailSerializer(serializers.ModelSerializer):
    patient_nom        = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero     = serializers.CharField(source='patient.registration_number', read_only=True)
    tnm_complet        = serializers.CharField(source='get_tnm_display_full', read_only=True)
    stade_label        = serializers.CharField(source='get_stade_ajcc_display', read_only=True)
    base_diag_label    = serializers.CharField(source='get_base_diagnostic_display', read_only=True)
    lateralite_label   = serializers.CharField(source='get_lateralite_display', read_only=True)
    grade_label        = serializers.CharField(source='get_grade_histologique_display', read_only=True)
    topographie_info   = TopographieSerializer(source='topographie', read_only=True)
    morphologie_info   = MorphologieSerializer(source='morphologie', read_only=True)

    class Meta:
        model = Diagnostic
        fields = '__all__'
        read_only_fields = ['date_creation', 'date_modification', 'cree_par',
                            'topographie_code', 'topographie_libelle',
                            'morphologie_code', 'morphologie_libelle']


class DiagnosticCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Diagnostic
        exclude = ['cree_par', 'date_creation', 'date_modification',
                   'topographie_code', 'topographie_libelle',
                   'morphologie_code', 'morphologie_libelle']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['cree_par'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
