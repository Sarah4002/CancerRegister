from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q

from .models import (
    Chimiotherapie, Radiotherapie,
    Chirurgie, Hormonotherapie, Immunotherapie,
)
from .serializers import (
    ChimiotherapieListSerializer, ChimiotherapieDetailSerializer,
    ChimiotherapieCreateSerializer,
    RadiotherapieSerializer, ChirurgieSerializer,
    HormonotherapieSerializer, ImmunotherapieSerializer,
)
from apps.accounts.models import AccessLog
from apps.accounts.permissions import CanReadOrWriteTreatment


class ChimiotherapieViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanReadOrWriteTreatment]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['patient', 'statut', 'intention', 'ligne']
    search_fields      = ['protocole', 'patient__nom', 'patient__registration_number']
    ordering           = ['-date_debut']

    def get_queryset(self):
        qs = Chimiotherapie.objects.select_related('patient', 'diagnostic').prefetch_related('medicaments')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ChimiotherapieListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ChimiotherapieCreateSerializer
        return ChimiotherapieDetailSerializer

    def perform_create(self, serializer):
        obj = serializer.save(cree_par=self.request.user)
        AccessLog.objects.create(
            user=self.request.user, action=AccessLog.Action.CREATE,
            resource='chimiotherapie', resource_id=str(obj.id),
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )


class RadiotherapieViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanReadOrWriteTreatment]
    serializer_class   = RadiotherapieSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['patient', 'statut', 'technique', 'intention']
    search_fields      = ['site_irradie', 'patient__nom', 'patient__registration_number']
    ordering           = ['-date_debut']

    def get_queryset(self):
        qs = Radiotherapie.objects.select_related('patient', 'diagnostic')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs


class ChirurgieViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanReadOrWriteTreatment]
    serializer_class   = ChirurgieSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['patient', 'statut', 'type_chirurgie', 'marges_resection']
    search_fields      = ['intitule_acte', 'patient__nom', 'patient__registration_number']
    ordering           = ['-date_debut']

    def get_queryset(self):
        qs = Chirurgie.objects.select_related('patient', 'diagnostic')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs


class HormonotherapieViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanReadOrWriteTreatment]
    serializer_class   = HormonotherapieSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['patient', 'statut', 'type_hormonotherapie']
    search_fields      = ['molecule', 'patient__nom']
    ordering           = ['-date_debut']

    def get_queryset(self):
        qs = Hormonotherapie.objects.select_related('patient', 'diagnostic')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs


class ImmunotherapieViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanReadOrWriteTreatment]
    serializer_class   = ImmunotherapieSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['patient', 'statut', 'type_immunotherapie']
    search_fields      = ['molecule', 'biomarqueur_cible', 'patient__nom']
    ordering           = ['-date_debut']

    def get_queryset(self):
        qs = Immunotherapie.objects.select_related('patient', 'diagnostic')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs


class TraitementsViewSet(viewsets.ViewSet):
    """Vue consolidée : tous les traitements."""
    permission_classes = [IsAuthenticated, CanReadOrWriteTreatment]

    @action(detail=False, methods=['get'])
    def par_patient(self, request):
        pid = request.query_params.get('patient_id')
        if not pid:
            return Response({'error': 'patient_id requis'}, status=400)
        return Response({
            'chimiotherapies':  ChimiotherapieListSerializer(
                Chimiotherapie.objects.filter(patient_id=pid).prefetch_related('medicaments'), many=True).data,
            'radiotherapies':   RadiotherapieSerializer(
                Radiotherapie.objects.filter(patient_id=pid), many=True).data,
            'chirurgies':       ChirurgieSerializer(
                Chirurgie.objects.filter(patient_id=pid), many=True).data,
            'hormonotherapies': HormonotherapieSerializer(
                Hormonotherapie.objects.filter(patient_id=pid), many=True).data,
            'immunotherapies':  ImmunotherapieSerializer(
                Immunotherapie.objects.filter(patient_id=pid), many=True).data,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        return Response({
            'chimiotherapies':  Chimiotherapie.objects.count(),
            'radiotherapies':   Radiotherapie.objects.count(),
            'chirurgies':       Chirurgie.objects.count(),
            'hormonotherapies': Hormonotherapie.objects.count(),
            'immunotherapies':  Immunotherapie.objects.count(),
            'par_statut_chimio': list(
                Chimiotherapie.objects.values('statut').annotate(n=Count('id'))
            ),
            'par_reponse': list(
                Chimiotherapie.objects.exclude(reponse_tumorale='')
                    .values('reponse_tumorale').annotate(n=Count('id'))
            ),
            'par_type_radio': list(
                Radiotherapie.objects.values('technique').annotate(n=Count('id'))
            ),
            'par_marges_chir': list(
                Chirurgie.objects.exclude(marges_resection='')
                    .values('marges_resection').annotate(n=Count('id'))
            ),
        })
