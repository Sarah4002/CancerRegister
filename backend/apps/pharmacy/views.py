from django.db import transaction
from django.db.models import Count, F, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.accounts.permissions import CanManagePharmacy
from .models import LotStock, MouvementStock
from .serializers import LotStockSerializer, MouvementStockSerializer


class StockViewSet(viewsets.ModelViewSet):
    serializer_class = LotStockSerializer
    permission_classes = [IsAuthenticated, CanManagePharmacy]
    search_fields = ['medicament__dci', 'medicament__forme', 'numero_lot']
    ordering_fields = ['medicament__dci', 'quantite', 'date_expiration']
    ordering = ['medicament__dci', 'date_expiration']

    def get_queryset(self):
        return LotStock.objects.select_related('medicament')

    def perform_create(self, serializer):
        lot = serializer.save()
        MouvementStock.objects.create(lot=lot, type=MouvementStock.Type.ENTREE, quantite=lot.quantite, commentaire='Stock initial', effectue_par=self.request.user)

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        try:
            variation = int(request.data.get('quantity', 0))
        except (TypeError, ValueError):
            variation = 0
        if variation == 0:
            return Response({'detail': 'La quantité doit être différente de zéro.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            lot = LotStock.objects.select_for_update().get(pk=pk)
            if lot.quantite + variation < 0:
                return Response({'detail': 'Stock insuffisant.'}, status=status.HTTP_400_BAD_REQUEST)
            lot.quantite = F('quantite') + variation
            lot.save(update_fields=['quantite', 'modifie_le'])
            MouvementStock.objects.create(lot=lot, type=MouvementStock.Type.ENTREE if variation > 0 else MouvementStock.Type.SORTIE, quantite=variation, commentaire=request.data.get('commentaire', ''), effectue_par=request.user)
        lot.refresh_from_db()
        return Response(self.get_serializer(lot).data)

    @action(detail=True, methods=['get'])
    def movements(self, request, pk=None):
        lot = self.get_object()
        return Response(MouvementStockSerializer(lot.mouvements.select_related('effectue_par')[:50], many=True).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        lots = self.get_queryset()
        low_stock = lots.filter(quantite__lte=F('medicament__seuil_alerte')).count()
        return Response({'references_actives': lots.values('medicament_id').distinct().count(), 'unites_en_stock': lots.aggregate(total=Sum('quantite'))['total'] or 0, 'alertes_stock': low_stock, 'lots': lots.count()})
