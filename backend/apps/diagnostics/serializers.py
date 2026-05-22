import json

from rest_framework import serializers
from .models import Diagnostic, TopographieICD, MorphologieICD, StyleVie, ExamensHematologiques


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


# ─────────────────────────────────────────────────────────────────────────────
# Examens hématologiques
# ─────────────────────────────────────────────────────────────────────────────

class ExamensHematologiquesSerializer(serializers.ModelSerializer):
    """
    Sérialise tous les champs d'examens hématologiques.
    Utilisé en lecture (detail) et en écriture (create/update via DiagnosticCreateSerializer).
    """

    class Meta:
        model   = ExamensHematologiques
        exclude = ['diagnostic', 'date_creation', 'date_modification']

    def validate(self, attrs):
        """
        Vérifie que les champs obligatoires pour l'hémopathie sont bien renseignés.
        L'hémopathie est passée via le contexte par DiagnosticCreateSerializer.
        """
        hemopathie = self.context.get('hemopathie_maligne', '')
        champs_requis = ExamensHematologiques.EXAMENS_PAR_HEMOPATHIE.get(hemopathie, [])
        erreurs = {}
        for champ in champs_requis:
            val = attrs.get(champ, '')
            if not (val and str(val).strip()):
                label = ExamensHematologiques._meta.get_field(champ).verbose_name
                erreurs[champ] = f'Le champ "{label}" est obligatoire pour ce diagnostic.'
        if erreurs:
            raise serializers.ValidationError(erreurs)
        return attrs


# ─────────────────────────────────────────────────────────────────────────────
# Diagnostic — list
# ─────────────────────────────────────────────────────────────────────────────

class DiagnosticListSerializer(serializers.ModelSerializer):
    patient_nom            = serializers.CharField(source='patient.get_full_name',             read_only=True)
    patient_numero         = serializers.CharField(source='patient.registration_number',       read_only=True)
    tnm_complet            = serializers.CharField(source='get_tnm_display_full',              read_only=True)
    stade_label            = serializers.CharField(source='get_stade_ajcc_display',            read_only=True)
    base_diag_label        = serializers.CharField(source='get_base_diagnostic_display',       read_only=True)
    lateralite_label       = serializers.CharField(source='get_lateralite_display',            read_only=True)
    grade_label            = serializers.CharField(source='get_grade_histologique_display',    read_only=True)
    type_diag_label        = serializers.CharField(source='get_type_diagnostic_display',       read_only=True)
    etat_cancer_label      = serializers.CharField(source='get_etat_cancer_display',           read_only=True)
    categorie_cancer_label = serializers.CharField(source='get_categorie_cancer_display',      read_only=True)
    hemopathie_maligne_label = serializers.CharField(source='get_hemopathie_maligne_display',  read_only=True)
    diagnostic_resume      = serializers.SerializerMethodField()

    def get_diagnostic_resume(self, obj):
        if obj.categorie_cancer == Diagnostic.CategorieCancer.LIQUIDE and obj.hemopathie_maligne:
            return obj.get_hemopathie_maligne_display()
        return obj.topographie_libelle or obj.morphologie_libelle or ''

    class Meta:
        model  = Diagnostic
        fields = [
            'id', 'patient', 'patient_nom', 'patient_numero',
            'date_diagnostic', 'type_diagnostic', 'type_diag_label',
            'categorie_cancer', 'categorie_cancer_label',
            'topographie_code', 'topographie_libelle',
            'morphologie_code', 'morphologie_libelle',
            'hemopathie_maligne', 'hemopathie_maligne_label',
            'diagnostic_resume',
            'lateralite', 'lateralite_label',
            'grade_histologique', 'grade_label',
            'tnm_t', 'tnm_n', 'tnm_m', 'tnm_type', 'tnm_complet',
            'stade_ajcc', 'stade_label',
            'etat_cancer', 'etat_cancer_label',
            'base_diagnostic', 'base_diag_label',
            'statut_dossier', 'est_principal', 'date_creation',
        ]


# ─────────────────────────────────────────────────────────────────────────────
# Diagnostic — detail
# ─────────────────────────────────────────────────────────────────────────────

class DiagnosticDetailSerializer(serializers.ModelSerializer):
    patient_nom              = serializers.CharField(source='patient.get_full_name',             read_only=True)
    patient_numero           = serializers.CharField(source='patient.registration_number',       read_only=True)
    tnm_complet              = serializers.CharField(source='get_tnm_display_full',              read_only=True)
    stade_label              = serializers.CharField(source='get_stade_ajcc_display',            read_only=True)
    base_diag_label          = serializers.CharField(source='get_base_diagnostic_display',       read_only=True)
    lateralite_label         = serializers.CharField(source='get_lateralite_display',            read_only=True)
    grade_label              = serializers.CharField(source='get_grade_histologique_display',    read_only=True)
    type_diag_label          = serializers.CharField(source='get_type_diagnostic_display',       read_only=True)
    etat_cancer_label        = serializers.CharField(source='get_etat_cancer_display',           read_only=True)
    categorie_cancer_label   = serializers.CharField(source='get_categorie_cancer_display',      read_only=True)
    hemopathie_maligne_label = serializers.CharField(source='get_hemopathie_maligne_display',    read_only=True)
    perf_status_label        = serializers.CharField(source='get_performance_status_display',    read_only=True)
    topographie_info         = TopographieSerializer(source='topographie',                       read_only=True)
    morphologie_info         = MorphologieSerializer(source='morphologie',                       read_only=True)
    style_vie                = StyleVieSerializer(read_only=True)
    # Examens hématologiques structurés (null pour les tumeurs solides)
    examens_hemato           = ExamensHematologiquesSerializer(read_only=True)
    diagnostic_resume        = serializers.SerializerMethodField()

    def get_diagnostic_resume(self, obj):
        if obj.categorie_cancer == Diagnostic.CategorieCancer.LIQUIDE and obj.hemopathie_maligne:
            return obj.get_hemopathie_maligne_display()
        return obj.topographie_libelle or obj.morphologie_libelle or ''

    class Meta:
        model            = Diagnostic
        fields           = '__all__'
        read_only_fields = [
            'date_creation', 'date_modification', 'cree_par',
            'topographie_code', 'topographie_libelle',
            'morphologie_code', 'morphologie_libelle',
        ]


# ─────────────────────────────────────────────────────────────────────────────
# Diagnostic — create / update
# ─────────────────────────────────────────────────────────────────────────────

class DiagnosticCreateSerializer(serializers.ModelSerializer):
    style_vie      = StyleVieSerializer(required=False)
    # Examens hématologiques : obligatoires si categorie_cancer == 'liquide'
    examens_hemato = ExamensHematologiquesSerializer(required=False)

    class Meta:
        model   = Diagnostic
        exclude = [
            'cree_par', 'modifie_par', 'date_creation', 'date_modification',
            'topographie_code', 'topographie_libelle',
            'morphologie_code', 'morphologie_libelle',
        ]

    def _get_examens_hemato_payload(self, attrs):
        examens_hemato = attrs.get('examens_hemato', None)
        if examens_hemato is not None:
            return examens_hemato

        legacy_payload = self.initial_data.get('examens_complementaires')
        if not legacy_payload:
            return None

        if isinstance(legacy_payload, dict):
            attrs['examens_hemato'] = legacy_payload
            return legacy_payload

        if isinstance(legacy_payload, str):
            try:
                parsed_payload = json.loads(legacy_payload)
            except json.JSONDecodeError:
                return None

            if isinstance(parsed_payload, dict):
                attrs['examens_hemato'] = parsed_payload
                return parsed_payload

        return None

    def validate(self, attrs):
        instance   = getattr(self, 'instance', None)
        categorie  = attrs.get('categorie_cancer',  getattr(instance, 'categorie_cancer',  Diagnostic.CategorieCancer.SOLIDE))
        topographie = attrs.get('topographie',      getattr(instance, 'topographie',       None))
        hemopathie  = attrs.get('hemopathie_maligne', getattr(instance, 'hemopathie_maligne', ''))
        examens_hemato = self._get_examens_hemato_payload(attrs)

        errors = {}

        if categorie == Diagnostic.CategorieCancer.LIQUIDE:
            if not hemopathie:
                errors['hemopathie_maligne'] = 'Veuillez sÃ©lectionner une hÃ©mopathie maligne.'
            has_existing_examens = bool(
                instance and hasattr(instance, 'examens_hemato') and instance.examens_hemato
            )
            if examens_hemato is None and not has_existing_examens:
                errors['examens_hemato'] = 'Les examens hÃ©matologiques sont obligatoires pour un cancer liquide.'
            elif examens_hemato is not None:
                hemato_serializer = ExamensHematologiquesSerializer(
                    data=examens_hemato,
                    context={**self.context, 'hemopathie_maligne': hemopathie},
                )
                if not hemato_serializer.is_valid():
                    errors['examens_hemato'] = hemato_serializer.errors
        else:
            if not topographie:
                errors['topographie'] = 'Veuillez sélectionner une topographie ICD-O-3 pour une tumeur solide.'
            # Nettoyer les champs hémato pour les tumeurs solides
            attrs['hemopathie_maligne']       = ''
            attrs['examens_complementaires']  = ''

        if errors:
            raise serializers.ValidationError(errors)

        # Vérification simple de cohérence sexe <-> topographie (ex: sein/prostate)
        try:
            patient = attrs.get('patient') or (instance.patient if instance else None)
        except Exception:
            patient = None

        if patient and topographie:
            libelle = ''
            try:
                # topographie peut être une instance ou une PK
                if hasattr(topographie, 'libelle'):
                    libelle = (topographie.libelle or '')
                else:
                    tp = TopographieICD.objects.filter(pk=topographie).first()
                    libelle = (tp.libelle if tp else '')
            except Exception:
                libelle = ''

            libelle_low = libelle.lower()
            sexe = (getattr(patient, 'sexe', '') or '').lower()
            # règles simples — augmenter la liste si besoin
            if 'sein' in libelle_low and sexe and not sexe.startswith('f'):
                errors['topographie'] = 'Incohérence: diagnostic sur le sein pour un patient déclaré de sexe masculin.'
            if 'prostate' in libelle_low and sexe and sexe.startswith('f'):
                errors['topographie'] = 'Incohérence: diagnostic sur la prostate pour un patient déclaré de sexe féminin.'

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):
        style_vie_data     = validated_data.pop('style_vie', None)
        examens_hemato_data = validated_data.pop('examens_hemato', None)

        request = self.context.get('request')
        if request and request.user:
            validated_data['cree_par'] = request.user

        diag = super().create(validated_data)

        if style_vie_data:
            StyleVie.objects.create(diagnostic=diag, **style_vie_data)

        if examens_hemato_data and diag.categorie_cancer == Diagnostic.CategorieCancer.LIQUIDE:
            ExamensHematologiques.objects.create(diagnostic=diag, **examens_hemato_data)

        return diag

    def update(self, instance, validated_data):
        style_vie_data      = validated_data.pop('style_vie', None)
        examens_hemato_data = validated_data.pop('examens_hemato', None)

        request = self.context.get('request')
        if request and request.user:
            validated_data['modifie_par'] = request.user

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if style_vie_data is not None:
            StyleVie.objects.update_or_create(diagnostic=instance, defaults=style_vie_data)

        if examens_hemato_data is not None and instance.categorie_cancer == Diagnostic.CategorieCancer.LIQUIDE:
            ExamensHematologiques.objects.update_or_create(
                diagnostic=instance,
                defaults=examens_hemato_data,
            )

        return instance