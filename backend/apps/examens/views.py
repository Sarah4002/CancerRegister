from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import ExamenMedical
from .serializers import ExamenMedicalSerializer

class ExamenMedicalViewSet(viewsets.ModelViewSet):
    serializer_class = ExamenMedicalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'categorie', 'statut']
    search_fields = ['nom_examen', 'resultat']
    ordering_fields = ['date_prescription', 'date_realisation']
    ordering = ['-date_prescription']

    def get_queryset(self):
        return ExamenMedical.objects.all().select_related('prescrit_par')

    def perform_create(self, serializer):
        serializer.save(prescrit_par=self.request.user)
