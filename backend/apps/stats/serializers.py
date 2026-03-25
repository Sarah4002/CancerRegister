from rest_framework import serializers
from .models import CancerType, Wilaya, IncidenceRecord, SurvivalRate, AIReport


# ─── CANCER TYPE ──────────────────────────────────────────────────────────────

class CancerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CancerType
        fields = ['id','code','label','categorie']


# ─── WILAYA ───────────────────────────────────────────────────────────────────

class WilayaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Wilaya
        fields = ['id','code','nom','latitude','longitude']


# ─── INCIDENCE ────────────────────────────────────────────────────────────────

class IncidenceRecordSerializer(serializers.ModelSerializer):
    cancer_label = serializers.CharField(source='cancer_type.label', read_only=True)
    wilaya_nom   = serializers.CharField(source='wilaya.nom',        read_only=True)

    class Meta:
        model  = IncidenceRecord
        fields = ['id','cancer_type','cancer_label','wilaya','wilaya_nom',
                  'annee','mois','sexe','tranche_age','stade','nb_cas','nb_deces']


# ─── AGGREGATIONS (lecture seule, calculées dans les vues) ────────────────────

class IncidenceByTypeSerializer(serializers.Serializer):
    """Résultat de l'agrégation par type de cancer"""
    cancer_type = serializers.IntegerField()
    label       = serializers.CharField()
    categorie   = serializers.CharField()
    total_cas   = serializers.IntegerField()
    total_deces = serializers.IntegerField()
    pct         = serializers.FloatField()
    survie_5ans = serializers.FloatField(allow_null=True)
    incidence   = serializers.FloatField(allow_null=True)


class IncidenceByAgeSerializer(serializers.Serializer):
    tranche_age = serializers.CharField()
    total_cas   = serializers.IntegerField()
    hommes      = serializers.IntegerField()
    femmes      = serializers.IntegerField()
    pct         = serializers.FloatField()


class IncidenceByWilayaSerializer(serializers.Serializer):
    wilaya_id   = serializers.IntegerField()
    nom         = serializers.CharField()
    latitude    = serializers.FloatField()
    longitude   = serializers.FloatField()
    total_cas   = serializers.IntegerField()
    total_deces = serializers.IntegerField()
    incidence   = serializers.FloatField()
    cancer_dominant = serializers.CharField()


class IncidenceByStadeSerializer(serializers.Serializer):
    stade       = serializers.CharField()
    total_cas   = serializers.IntegerField()
    pct         = serializers.FloatField()
    survie_5ans = serializers.FloatField(allow_null=True)
    delai_moyen = serializers.FloatField(allow_null=True)


class MonthlyTrendSerializer(serializers.Serializer):
    annee       = serializers.IntegerField()
    mois        = serializers.IntegerField()
    mois_label  = serializers.CharField()
    total_cas   = serializers.IntegerField()
    hommes      = serializers.IntegerField()
    femmes      = serializers.IntegerField()


class SurvivalSerializer(serializers.ModelSerializer):
    cancer_label = serializers.CharField(source='cancer_type.label', read_only=True)

    class Meta:
        model  = SurvivalRate
        fields = ['id','cancer_type','cancer_label','stade','annee_ref',
                  'survie_1an','survie_3ans','survie_5ans']


# ─── KPI GLOBAUX ──────────────────────────────────────────────────────────────

class GlobalKPISerializer(serializers.Serializer):
    total_cas_annee     = serializers.IntegerField()
    variation_vs_n1     = serializers.FloatField()
    age_median          = serializers.FloatField()
    sex_ratio_hf        = serializers.FloatField()
    taux_mortalite      = serializers.FloatField()
    variation_mort_n1   = serializers.FloatField()
    taux_survie_5ans    = serializers.FloatField()
    annee               = serializers.IntegerField()


# ─── AI REPORT ────────────────────────────────────────────────────────────────

class AIReportCreateSerializer(serializers.Serializer):
    """Payload envoyé par le frontend pour déclencher la génération"""
    titre           = serializers.CharField(max_length=255, required=False, default='')
    annee           = serializers.IntegerField(required=False, default=2024)
    wilaya_ids      = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    cancer_type_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    sexe            = serializers.ChoiceField(choices=['M','F','all'], required=False, default='all')
    stades          = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    include_charts  = serializers.BooleanField(default=True)


class AIReportSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AIReport
        fields = ['id','titre','filters_json','contenu_md','recommandations',
                  'charts_json','status','created_by','created_at','completed_at']
        read_only_fields = ['id','status','created_at','completed_at']


# ─── SEARCH ───────────────────────────────────────────────────────────────────

class SearchResultSerializer(serializers.Serializer):
    type        = serializers.CharField()    # 'patient' | 'rapport' | 'stat' | 'wilaya'
    id          = serializers.CharField()
    label       = serializers.CharField()
    subtitle    = serializers.CharField(allow_blank=True)
    icon        = serializers.CharField()
    url_key     = serializers.CharField()    # clé de page React à ouvrir