"""
apps/custom_fields/serializers.py
"""

from rest_framework import serializers
from .models import ChampPersonnalise, ValeurChamp


class ChampPersonnaliseSerializer(serializers.ModelSerializer):
    options      = serializers.ListField(child=serializers.CharField(), required=False)
    cree_par_nom = serializers.SerializerMethodField()
    # Accepter null ET chaîne vide → convertir en null
    valeur_min   = serializers.FloatField(required=False, allow_null=True)
    valeur_max   = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model  = ChampPersonnalise
        fields = [
            'id', 'nom', 'code', 'description',
            'type_champ', 'module',
            'topographie_code', 'topographie_libelle',
            'options', 'obligatoire', 'actif', 'ordre',
            'valeur_min', 'valeur_max', 'unite',
            'cree_par_nom', 'date_creation', 'date_modification',
        ]
        read_only_fields = ['code', 'cree_par_nom', 'date_creation', 'date_modification']

    def get_cree_par_nom(self, obj):
        if obj.cree_par:
            return f"{obj.cree_par.first_name} {obj.cree_par.last_name}".strip() or obj.cree_par.email
        return None

    def validate(self, data):
        # SELECT doit avoir des options
        if data.get('type_champ') == 'select':
            opts = data.get('options', [])
            if not opts:
                raise serializers.ValidationError(
                    {'options': 'Une liste déroulante doit avoir au moins une option.'}
                )
        # valeur_min < valeur_max
        vmin = data.get('valeur_min')
        vmax = data.get('valeur_max')
        if vmin is not None and vmax is not None and vmin >= vmax:
            raise serializers.ValidationError(
                {'valeur_min': 'valeur_min doit être inférieure à valeur_max.'}
            )
        return data

    def create(self, validated_data):
        options = validated_data.pop('options', [])
        champ   = ChampPersonnalise(**validated_data)
        champ.options = options
        champ.cree_par = self.context['request'].user
        champ.save()
        return champ

    def update(self, instance, validated_data):
        options = validated_data.pop('options', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if options is not None:
            instance.options = options
        instance.save()
        return instance


class ValeurChampSerializer(serializers.ModelSerializer):
    champ_nom        = serializers.ReadOnlyField(source='champ.nom')
    champ_code       = serializers.ReadOnlyField(source='champ.code')
    champ_type       = serializers.ReadOnlyField(source='champ.type_champ')
    champ_unite      = serializers.ReadOnlyField(source='champ.unite')
    valeur_typee     = serializers.SerializerMethodField()

    class Meta:
        model  = ValeurChamp
        fields = [
            'id', 'champ', 'champ_nom', 'champ_code', 'champ_type', 'champ_unite',
            'module', 'object_id', 'valeur', 'valeur_typee',
            'date_creation', 'date_modification',
        ]
        read_only_fields = ['date_creation', 'date_modification']

    def get_valeur_typee(self, obj):
        return obj.get_valeur_typee()


class ValeurChampBulkSerializer(serializers.Serializer):
    """
    Sérializer pour sauvegarder plusieurs valeurs en une seule requête.
    Body : { "module": "patient", "object_id": 42, "valeurs": { "champ_code": "valeur", ... } }
    """
    module    = serializers.ChoiceField(choices=['patient','diagnostic','traitement','suivi'])
    object_id = serializers.IntegerField()
    valeurs   = serializers.DictField(child=serializers.CharField(allow_blank=True, allow_null=True))