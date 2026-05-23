from apps.diagnostics.models import Diagnostic
from apps.patients.models import Patient
from rest_framework import serializers

from .models import PopulationCommune


class WilayaSerializer(serializers.Serializer):
    """Serializer for wilaya data"""
    nom = serializers.CharField()
    code = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    zoom = serializers.IntegerField()


class CommuneSerializer(serializers.Serializer):
    """Serializer for commune data"""
    nom = serializers.CharField()
    lat = serializers.FloatField(required=False)
    lng = serializers.FloatField(required=False)


class CancerStatsSerializer(serializers.Serializer):
    """Serializer for cancer statistics by type"""
    type_cancer = serializers.CharField()
    label = serializers.CharField()
    nombre_cas = serializers.IntegerField()
    pourcentage = serializers.FloatField()


class WilayaDetailSerializer(serializers.Serializer):
    """Serializer for detailed wilaya information"""
    nom = serializers.CharField()
    code = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    zoom = serializers.IntegerField()
    total_cas = serializers.IntegerField()
    communes = CommuneSerializer(many=True)
    cancers = CancerStatsSerializer(many=True)
    causes = serializers.DictField()


class CommuneDetailSerializer(serializers.Serializer):
    """Serializer for detailed commune information"""
    nom = serializers.CharField()
    wilaya = serializers.CharField()
    lat = serializers.FloatField(required=False)
    lng = serializers.FloatField(required=False)
    total_cas = serializers.IntegerField()
    cancers = CancerStatsSerializer(many=True)
    causes = serializers.DictField()


class StatsNationalesSerializer(serializers.Serializer):
    """Serializer for national statistics"""
    total_cas = serializers.IntegerField()
    annee_plus_recente = serializers.IntegerField()
    cancers = CancerStatsSerializer(many=True)
    top_wilayas = serializers.ListField()
    repartition_sexe = serializers.DictField()
    repartition_age = serializers.DictField()


class PopulationCommuneSerializer(serializers.ModelSerializer):
    class Meta:
        model = PopulationCommune
        fields = ['id', 'wilaya', 'commune', 'annee', 'population']
        read_only_fields = ['id']


class MapCardSerializer(serializers.ModelSerializer):
    cree_par = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = None
        # set model dynamically to avoid circular imports in module load
        fields = ['id', 'nom', 'description', 'cree_par', 'wilaya', 'commune', 'zones', 'pois', 'filters', 'est_actif', 'date_creation', 'date_modification']
        read_only_fields = ['id', 'cree_par', 'date_creation', 'date_modification']

    def __init__(self, *args, **kwargs):
        from .models import MapCard
        super().__init__(*args, **kwargs)
        self.Meta.model = MapCard