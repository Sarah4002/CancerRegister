from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Prefetch
from django.utils import timezone

from .models import ReunionRCP, PresenceRCP, DossierRCP, DecisionRCP
from .serializers import (
    ReunionRCPListSerializer, ReunionRCPDetailSerializer, ReunionRCPCreateSerializer,
    DossierRCPListSerializer, DossierRCPDetailSerializer, DossierRCPCreateSerializer,
    DecisionRCPSerializer, PresenceRCPSerializer,
)


class ReunionRCPViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['statut', 'type_rcp', 'coordinateur']
    search_fields      = ['titre', 'lieu', 'etablissement', 'objectif']
    ordering           = ['-date_reunion']

    def get_queryset(self):
        return ReunionRCP.objects.select_related('coordinateur', 'cree_par') \
            .prefetch_related('presences', 'dossiers')

    def get_serializer_class(self):
        if self.action == 'list':
            return ReunionRCPListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ReunionRCPCreateSerializer
        return ReunionRCPDetailSerializer

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=False, methods=['get'])
    def prochaines(self, request):
        """Prochaines RCPs planifiées."""
        today = timezone.now().date()
        qs = ReunionRCP.objects.filter(
            statut='planifiee', date_reunion__gte=today
        ).order_by('date_reunion', 'heure_debut')[:10]
        return Response(ReunionRCPListSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = ReunionRCP.objects.count()
        return Response({
            'total':           total,
            'par_statut':      list(ReunionRCP.objects.values('statut').annotate(n=Count('id'))),
            'par_type':        list(ReunionRCP.objects.values('type_rcp').annotate(n=Count('id')).order_by('-n')),
            'total_dossiers':  DossierRCP.objects.count(),
            'total_decisions': DecisionRCP.objects.count(),
            'decisions_en_attente': DecisionRCP.objects.filter(realise=False).count(),
        })

    @action(detail=True, methods=['post'])
    def changer_statut(self, request, pk=None):
        reunion = self.get_object()
        nouveau_statut = request.data.get('statut')
        if nouveau_statut not in dict(ReunionRCP.Statut.choices):
            return Response({'error': 'Statut invalide'}, status=400)
        reunion.statut = nouveau_statut
        reunion.save()
        return Response({'statut': reunion.statut, 'statut_label': reunion.get_statut_display()})

    @action(detail=True, methods=['post'])
    def ajouter_presence(self, request, pk=None):
        reunion = self.get_object()
        data = request.data.copy()
        data['reunion'] = reunion.id
        serializer = PresenceRCPSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class DossierRCPViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['reunion', 'patient', 'statut', 'type_presentation']
    search_fields      = ['patient__nom', 'patient__registration_number', 'resume_clinique', 'question_posee']
    ordering           = ['ordre_passage']

    def get_queryset(self):
        qs = DossierRCP.objects.select_related(
            'patient', 'diagnostic', 'medecin_presenteur', 'reunion'
        ).prefetch_related('decisions')
        rid = self.request.query_params.get('reunion_id')
        if rid:
            qs = qs.filter(reunion_id=rid)
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return DossierRCPListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return DossierRCPCreateSerializer
        return DossierRCPDetailSerializer

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=['post'])
    def ajouter_decision(self, request, pk=None):
        dossier = self.get_object()
        data = request.data.copy()
        data['dossier'] = dossier.id
        serializer = DecisionRCPSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            # Marquer dossier comme discuté
            if dossier.statut == 'attente':
                dossier.statut = 'discute'
                dossier.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['get'])
    def par_patient(self, request):
        pid = request.query_params.get('patient_id')
        if not pid:
            return Response({'error': 'patient_id requis'}, status=400)
        qs = DossierRCP.objects.filter(patient_id=pid).select_related(
            'reunion', 'diagnostic', 'medecin_presenteur'
        ).prefetch_related('decisions').order_by('-reunion__date_reunion')
        return Response(DossierRCPListSerializer(qs, many=True).data)


class DecisionRCPViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = DecisionRCPSerializer
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['dossier', 'type_decision', 'priorite', 'realise']
    ordering           = ['dossier', 'type_decision']

    def get_queryset(self):
        return DecisionRCP.objects.select_related('dossier__patient', 'medecin_referent')

    @action(detail=True, methods=['post'])
    def marquer_realise(self, request, pk=None):
        decision = self.get_object()
        from django.utils import timezone
        decision.realise = True
        decision.date_realisation = timezone.now().date()
        decision.save()
        return Response(DecisionRCPSerializer(decision).data)
