from rest_framework import serializers
from .models import ReunionRCP, PresenceRCP, DossierRCP, DecisionRCP, MessageRCP, FichierDossierRCP


class PresenceRCPSerializer(serializers.ModelSerializer):
    medecin_nom      = serializers.SerializerMethodField()
    specialite_label = serializers.CharField(source='get_specialite_display', read_only=True)

    class Meta:
        model  = PresenceRCP
        fields = ['id', 'medecin', 'medecin_nom', 'nom_externe', 'specialite', 'specialite_label', 'present', 'role']

    def get_medecin_nom(self, obj):
        if obj.medecin:
            return obj.medecin.get_full_name() or obj.medecin.username
        return obj.nom_externe or '—'


class FichierDossierSerializer(serializers.ModelSerializer):
    uploade_par_nom  = serializers.SerializerMethodField()
    type_label       = serializers.CharField(source='get_type_fichier_display', read_only=True)
    url              = serializers.SerializerMethodField()

    class Meta:
        model  = FichierDossierRCP
        fields = [
            'id', 'nom_original', 'type_fichier', 'type_label',
            'description', 'taille_bytes', 'date_upload',
            'uploade_par_nom', 'url',
        ]
        read_only_fields = ['date_upload', 'nom_original', 'taille_bytes']

    def get_uploade_par_nom(self, obj):
        if obj.uploade_par:
            return obj.uploade_par.get_full_name() or obj.uploade_par.username
        return None

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.fichier and request:
            return request.build_absolute_uri(obj.fichier.url)
        return None


class DecisionRCPSerializer(serializers.ModelSerializer):
    type_label     = serializers.CharField(source='get_type_decision_display', read_only=True)
    priorite_label = serializers.CharField(source='get_priorite_display', read_only=True)
    referent_nom   = serializers.SerializerMethodField()

    class Meta:
        model  = DecisionRCP
        fields = '__all__'
        read_only_fields = ['date_creation']

    def get_referent_nom(self, obj):
        if obj.medecin_referent:
            return obj.medecin_referent.get_full_name() or obj.medecin_referent.username
        return None


class MessageRCPSerializer(serializers.ModelSerializer):
    auteur_nom   = serializers.SerializerMethodField()
    auteur_initiales = serializers.SerializerMethodField()

    class Meta:
        model  = MessageRCP
        fields = [
            'id', 'reunion', 'dossier', 'auteur', 'auteur_nom',
            'auteur_initiales', 'contenu', 'est_important', 'date_envoi',
        ]
        read_only_fields = ['date_envoi', 'auteur']

    def get_auteur_nom(self, obj):
        return obj.auteur.get_full_name() or obj.auteur.username

    def get_auteur_initiales(self, obj):
        full = obj.auteur.get_full_name()
        if full:
            parts = full.split()
            return ''.join(p[0].upper() for p in parts[:2])
        return obj.auteur.username[:2].upper()

    def create(self, validated_data):
        validated_data['auteur'] = self.context['request'].user
        return super().create(validated_data)


class DossierRCPListSerializer(serializers.ModelSerializer):
    patient_nom      = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero   = serializers.CharField(source='patient.registration_number', read_only=True)
    presenteur_nom   = serializers.SerializerMethodField()
    statut_label     = serializers.CharField(source='get_statut_display', read_only=True)
    type_label       = serializers.CharField(source='get_type_presentation_display', read_only=True)
    nb_decisions     = serializers.SerializerMethodField()
    nb_fichiers      = serializers.SerializerMethodField()

    class Meta:
        model  = DossierRCP
        fields = [
            'id', 'reunion', 'patient', 'patient_nom', 'patient_numero',
            'ordre_passage', 'type_presentation', 'type_label',
            'statut', 'statut_label', 'presenteur_nom',
            'question_posee', 'nb_decisions', 'nb_fichiers', 'date_creation',
        ]

    def get_presenteur_nom(self, obj):
        if obj.medecin_presenteur:
            return obj.medecin_presenteur.get_full_name() or obj.medecin_presenteur.username
        return None

    def get_nb_decisions(self, obj):
        return obj.decisions.count()

    def get_nb_fichiers(self, obj):
        return obj.fichiers.count()


class DossierRCPDetailSerializer(serializers.ModelSerializer):
    patient_nom    = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero = serializers.CharField(source='patient.registration_number', read_only=True)
    presenteur_nom = serializers.SerializerMethodField()
    statut_label   = serializers.CharField(source='get_statut_display', read_only=True)
    type_label     = serializers.CharField(source='get_type_presentation_display', read_only=True)
    decisions      = DecisionRCPSerializer(many=True, read_only=True)
    fichiers       = FichierDossierSerializer(many=True, read_only=True)

    class Meta:
        model  = DossierRCP
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']

    def get_presenteur_nom(self, obj):
        if obj.medecin_presenteur:
            return obj.medecin_presenteur.get_full_name() or obj.medecin_presenteur.username
        return None


class DossierRCPCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model   = DossierRCP
        exclude = ['cree_par', 'date_creation']

    def create(self, validated_data):
        if self.context.get('request'):
            validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)


class ReunionRCPListSerializer(serializers.ModelSerializer):
    type_label        = serializers.CharField(source='get_type_rcp_display', read_only=True)
    statut_label      = serializers.CharField(source='get_statut_display', read_only=True)
    coordinateur_nom  = serializers.SerializerMethodField()
    nombre_dossiers   = serializers.IntegerField(read_only=True)
    nombre_membres_presents = serializers.IntegerField(read_only=True)

    class Meta:
        model  = ReunionRCP
        fields = [
            'id', 'titre', 'type_rcp', 'type_label', 'statut', 'statut_label',
            'date_reunion', 'heure_debut', 'heure_fin', 'lieu', 'salle',
            'coordinateur_nom', 'etablissement',
            'nombre_dossiers', 'nombre_membres_presents',
            'nombre_dossiers_prevus', 'date_creation',
        ]

    def get_coordinateur_nom(self, obj):
        if obj.coordinateur:
            return obj.coordinateur.get_full_name() or obj.coordinateur.username
        return None


class ReunionRCPDetailSerializer(serializers.ModelSerializer):
    type_label        = serializers.CharField(source='get_type_rcp_display', read_only=True)
    statut_label      = serializers.CharField(source='get_statut_display', read_only=True)
    coordinateur_nom  = serializers.SerializerMethodField()
    presences         = PresenceRCPSerializer(many=True, read_only=True)
    dossiers          = DossierRCPListSerializer(many=True, read_only=True)
    nombre_dossiers   = serializers.IntegerField(read_only=True)
    nombre_membres_presents = serializers.IntegerField(read_only=True)

    class Meta:
        model  = ReunionRCP
        fields = '__all__'
        read_only_fields = ['date_creation', 'date_modification', 'cree_par']

    def get_coordinateur_nom(self, obj):
        if obj.coordinateur:
            return obj.coordinateur.get_full_name() or obj.coordinateur.username
        return None


class ReunionRCPCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model   = ReunionRCP
        exclude = ['cree_par', 'date_creation', 'date_modification']

    def create(self, validated_data):
        if self.context.get('request'):
            validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)