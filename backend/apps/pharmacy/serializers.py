from rest_framework import serializers
from .models import Medicament, LotStock, MouvementStock


class LotStockSerializer(serializers.ModelSerializer):
    dci = serializers.CharField(source='medicament.dci', read_only=True)
    forme = serializers.CharField(source='medicament.forme', read_only=True)
    seuil = serializers.IntegerField(source='medicament.seuil_alerte', read_only=True)
    lot = serializers.CharField(source='numero_lot', read_only=True)
    stock = serializers.IntegerField(source='quantite', read_only=True)
    expiration = serializers.DateField(source='date_expiration', read_only=True)
    medicament_dci = serializers.CharField(write_only=True)
    presentation = serializers.CharField(write_only=True)
    seuil_alerte = serializers.IntegerField(write_only=True, min_value=0, required=False, default=0)
    numero_lot = serializers.CharField(required=False, allow_blank=True)
    quantite = serializers.IntegerField(write_only=True, min_value=0)
    date_expiration = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = LotStock
        fields = ['id', 'dci', 'forme', 'seuil', 'lot', 'stock', 'expiration', 'medicament_dci', 'presentation', 'seuil_alerte', 'numero_lot', 'quantite', 'date_expiration']

    def create(self, validated_data):
        dci = validated_data.pop('medicament_dci').strip()
        forme = validated_data.pop('presentation').strip()
        seuil = validated_data.pop('seuil_alerte', 0)
        medicament, created = Medicament.objects.get_or_create(dci=dci, forme=forme, defaults={'seuil_alerte': seuil})
        if not created and seuil != medicament.seuil_alerte:
            medicament.seuil_alerte = seuil
            medicament.save(update_fields=['seuil_alerte', 'modifie_le'])
        validated_data['medicament'] = medicament
        validated_data['numero_lot'] = validated_data.get('numero_lot') or f'SANS-LOT-{medicament.id}'
        return super().create(validated_data)


class MouvementStockSerializer(serializers.ModelSerializer):
    utilisateur = serializers.CharField(source='effectue_par.get_display_name', read_only=True)

    class Meta:
        model = MouvementStock
        fields = ['id', 'type', 'quantite', 'commentaire', 'utilisateur', 'cree_le']
        read_only_fields = fields
