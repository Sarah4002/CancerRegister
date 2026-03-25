from rest_framework import serializers
from .models import Diagnostic, TopographieICD, MorphologieICD, StyleVie


class TopographieSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TopographieICD
        fields = ['id', 'code', 'libelle', 'categorie']


class MorphologieSerializer(serializers.ModelSerializer):
    comportement_label = serializers.CharField(source='get_comportement_display', read_only=True)

    class Meta:
        model  = MorphologieICD
        fields = ['id', 'code', 'libelle', 'comportement', 'comportement_label', 'groupe']


class StyleVieSerializer(serializers.ModelSerializer):
    statut_tabagique_label    = serializers.CharField(source='get_statut_tabagique_display',    read_only=True)
    consommation_alcool_label = serializers.CharField(source='get_consommation_alcool_display', read_only=True)
    niveau_activite_label     = serializers.CharField(source='get_niveau_activite_display',     read_only=True)
    qualite_sommeil_label     = serializers.CharField(source='get_qualite_sommeil_display',     read_only=True)

    class Meta:
        model            = StyleVie
        exclude          = ['diagnostic']
        read_only_fields = ['imc', 'score_risque_global']


class DiagnosticListSerializer(serializers.ModelSerializer):
    patient_nom       = serializers.CharField(source='patient.get_full_name',          read_only=True)
    patient_numero    = serializers.CharField(source='patient.registration_number',    read_only=True)
    tnm_complet       = serializers.CharField(source='get_tnm_display_full',           read_only=True)
    stade_label       = serializers.CharField(source='get_stade_ajcc_display',         read_only=True)
    base_diag_label   = serializers.CharField(source='get_base_diagnostic_display',    read_only=True)
    lateralite_label  = serializers.CharField(source='get_lateralite_display',         read_only=True)
    grade_label       = serializers.CharField(source='get_grade_histologique_display', read_only=True)
    type_diag_label   = serializers.CharField(source='get_type_diagnostic_display',    read_only=True)
    etat_cancer_label = serializers.CharField(source='get_etat_cancer_display',        read_only=True)

    class Meta:
        model  = Diagnostic
        fields = [
            'id','patient','patient_nom','patient_numero',
            'date_diagnostic','type_diagnostic','type_diag_label',
            'topographie_code','topographie_libelle',
            'morphologie_code','morphologie_libelle',
            'lateralite','lateralite_label',
            'grade_histologique','grade_label',
            'tnm_t','tnm_n','tnm_m','tnm_type','tnm_complet',
            'stade_ajcc','stade_label',
            'etat_cancer','etat_cancer_label',
            'base_diagnostic','base_diag_label',
            'statut_dossier','est_principal','date_creation',
        ]


class DiagnosticDetailSerializer(serializers.ModelSerializer):
    patient_nom       = serializers.CharField(source='patient.get_full_name',             read_only=True)
    patient_numero    = serializers.CharField(source='patient.registration_number',       read_only=True)
    tnm_complet       = serializers.CharField(source='get_tnm_display_full',              read_only=True)
    stade_label       = serializers.CharField(source='get_stade_ajcc_display',            read_only=True)
    base_diag_label   = serializers.CharField(source='get_base_diagnostic_display',       read_only=True)
    lateralite_label  = serializers.CharField(source='get_lateralite_display',            read_only=True)
    grade_label       = serializers.CharField(source='get_grade_histologique_display',    read_only=True)
    type_diag_label   = serializers.CharField(source='get_type_diagnostic_display',       read_only=True)
    etat_cancer_label = serializers.CharField(source='get_etat_cancer_display',           read_only=True)
    perf_status_label = serializers.CharField(source='get_performance_status_display',    read_only=True)
    topographie_info  = TopographieSerializer(source='topographie',                       read_only=True)
    morphologie_info  = MorphologieSerializer(source='morphologie',                       read_only=True)
    style_vie         = StyleVieSerializer(read_only=True)

    class Meta:
        model            = Diagnostic
        fields           = '__all__'
        read_only_fields = [
            'date_creation','date_modification','cree_par',
            'topographie_code','topographie_libelle',
            'morphologie_code','morphologie_libelle',
        ]


class DiagnosticCreateSerializer(serializers.ModelSerializer):
    style_vie = StyleVieSerializer(required=False)

    class Meta:
        model   = Diagnostic
        exclude = [
            'cree_par','modifie_par','date_creation','date_modification',
            'topographie_code','topographie_libelle',
            'morphologie_code','morphologie_libelle',
        ]

    def create(self, validated_data):
        style_vie_data = validated_data.pop('style_vie', None)
        request = self.context.get('request')
        if request and request.user:
            validated_data['cree_par'] = request.user
        diag = super().create(validated_data)
        if style_vie_data:
            StyleVie.objects.create(diagnostic=diag, **style_vie_data)
        return diag

    def update(self, instance, validated_data):
        style_vie_data = validated_data.pop('style_vie', None)
        request = self.context.get('request')
        if request and request.user:
            validated_data['modifie_par'] = request.user
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if style_vie_data is not None:
            StyleVie.objects.update_or_create(diagnostic=instance, defaults=style_vie_data)
        return instance