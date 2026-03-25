from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg

from .models import ConsultationSuivi, QualiteVie, EffetIndesirable
from .serializers import (
    ConsultationSuiviListSerializer, ConsultationSuiviDetailSerializer,
    ConsultationSuiviCreateSerializer,
    QualiteVieSerializer,     EffetIndesirableSerializer,
)
from apps.accounts.models import AccessLog


class ConsultationSuiviViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['patient', 'statut', 'type_consultation', 'medecin']
    search_fields      = ['patient__nom', 'patient__registration_number', 'motif', 'conclusion']
    ordering           = ['-date_consultation']

    def get_queryset(self):
        qs = ConsultationSuivi.objects.select_related('patient', 'medecin', 'diagnostic')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ConsultationSuiviListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ConsultationSuiviCreateSerializer
        return ConsultationSuiviDetailSerializer

    def perform_create(self, serializer):
        obj = serializer.save(cree_par=self.request.user)
        AccessLog.objects.create(
            user=self.request.user, action=AccessLog.Action.CREATE,
            resource='consultation_suivi', resource_id=str(obj.id),
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    @action(detail=False, methods=['get'])
    def par_patient(self, request):
        pid = request.query_params.get('patient_id')
        if not pid:
            return Response({'error': 'patient_id requis'}, status=400)
        qs = self.get_queryset().filter(patient_id=pid)
        return Response(ConsultationSuiviListSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def a_venir(self, request):
        from django.utils import timezone
        qs = ConsultationSuivi.objects.filter(
            statut='planifiee',
            date_consultation__gte=timezone.now().date()
        ).select_related('patient', 'medecin').order_by('date_consultation')[:20]
        return Response(ConsultationSuiviListSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        from apps.patients.models import Patient
        from apps.suivi.models import EffetIndesirable
        return Response({
            # Nouveaux cas (patients enregistrés)
            'nouveaux_cas':        Patient.objects.count(),
            # Consultations à venir
            'a_venir':             ConsultationSuivi.objects.filter(statut='planifiee').count(),
            # Rechutes
            'total_rechutes':      ConsultationSuivi.objects.filter(rechute=True).values('patient').distinct().count(),
            # Décès
            'total_deces':         Patient.objects.filter(statut_vital='decede').count(),
            # Effets indésirables non résolus
            'effets_non_resolus':  EffetIndesirable.objects.filter(resolu=False).count(),
            # Gardé pour usage interne
            'total':               ConsultationSuivi.objects.count(),
            'par_evolution':       list(ConsultationSuivi.objects.exclude(evolution_maladie='').values('evolution_maladie').annotate(n=Count('id'))),
        })


class QualiteVieViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = QualiteVieSerializer
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['patient']
    ordering           = ['-date_evaluation']

    def get_queryset(self):
        qs = QualiteVie.objects.select_related('patient', 'consultation')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs

    @action(detail=False, methods=['get'])
    def evolution_patient(self, request):
        pid = request.query_params.get('patient_id')
        if not pid:
            return Response({'error': 'patient_id requis'}, status=400)
        qs = QualiteVie.objects.filter(patient_id=pid).order_by('date_evaluation')
        return Response([{
            'date':              str(q.date_evaluation),
            'score_global':      q.score_global_sante,
            'score_fonctionnel': q.score_fonctionnel,
            'score_symptomes':   q.score_symptomes,
            'score_fatigue':     q.score_fatigue,
            'score_douleur':     q.score_douleur,
            'score_anxiete':     q.score_anxiete,
        } for q in qs])



class EffetIndesirableViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = EffetIndesirableSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['patient', 'type_effet', 'severite', 'resolu', 'impact_traitement']
    search_fields      = ['medicament_cause', 'description', 'patient__nom', 'patient__registration_number']
    ordering           = ['-date_apparition']

    def get_queryset(self):
        qs = EffetIndesirable.objects.select_related('patient', 'consultation')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(cree_par=self.request.user)
        AccessLog.objects.create(
            user=self.request.user, action=AccessLog.Action.CREATE,
            resource='effet_indesirable', resource_id=str(obj.id),
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    @action(detail=False, methods=['get'])
    def non_resolus(self, request):
        qs = EffetIndesirable.objects.filter(resolu=False).select_related('patient').order_by('-date_apparition')[:30]
        return Response(EffetIndesirableSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        return Response({
            'total':       EffetIndesirable.objects.count(),
            'non_resolus': EffetIndesirable.objects.filter(resolu=False).count(),
            'par_type':    list(EffetIndesirable.objects.values('type_effet').annotate(n=Count('id')).order_by('-n')),
            'par_severite':list(EffetIndesirable.objects.values('severite').annotate(n=Count('id'))),
            'par_medicament': list(EffetIndesirable.objects.values('medicament_cause').annotate(n=Count('id')).order_by('-n')[:10]),
        })