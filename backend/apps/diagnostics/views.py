from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q

from .models import Diagnostic, TopographieICD, MorphologieICD, DiagnosticValidationRule
from .serializers import (
    DiagnosticListSerializer, DiagnosticDetailSerializer,
    DiagnosticCreateSerializer, TopographieSerializer, MorphologieSerializer,
    DiagnosticValidationRuleSerializer,
)
from apps.accounts.models import AccessLog
from apps.accounts.permissions import (
    CanReadOrWriteDiagnostic, can_write_diagnostic, can_validate_diagnosis,
    CanManageMedicalConfiguration,
)


class TopographieViewSet(viewsets.ModelViewSet):
    """Referentiel ICD-O-3 Topographies — lecture et création via API.
    La création/modification/suppression est restreinte via un controle
    explicite dans `perform_create`/`perform_update`.
    """
    serializer_class   = TopographieSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['code', 'libelle', 'categorie']
    queryset           = TopographieICD.objects.all()
    pagination_class   = None

    def perform_create(self, serializer):
        # seuls les utilisateurs ayant la permission d'ecrire des diagnostics
        # peuvent créer de nouvelles topographies.
        from apps.accounts.permissions import can_write_diagnostic
        if not can_write_diagnostic(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Non autorise a creer des topographies.')
        serializer.save()

    def perform_update(self, serializer):
        from apps.accounts.permissions import can_write_diagnostic
        if not can_write_diagnostic(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Non autorise a modifier des topographies.')
        serializer.save()

    @action(detail=True, methods=['post'], url_path='valider')
    def valider(self, request, pk=None):
        """Validation clinique finale réservée au médecin chef."""
        if not can_validate_diagnosis(request.user):
            return Response({'detail': 'Validation réservée au médecin chef.'}, status=status.HTTP_403_FORBIDDEN)
        diagnostic = self.get_object()
        diagnostic.est_principal = True
        diagnostic.modifie_par = request.user
        diagnostic.save(update_fields=['est_principal', 'modifie_par', 'date_modification'])
        return Response(DiagnosticDetailSerializer(diagnostic, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        # Soft-delete: mark est_actif False
        from apps.accounts.permissions import can_write_diagnostic
        if not can_write_diagnostic(request.user):
            return Response({'detail': 'Non autorise.'}, status=403)
        instance = self.get_object()
        instance.est_actif = False
        instance.save()
        return Response({'detail': 'Topographie desactivee.'})


class MorphologieViewSet(viewsets.ReadOnlyModelViewSet):
    """Referentiel ICD-O-3 Morphologies — lecture seule."""
    serializer_class   = MorphologieSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, DjangoFilterBackend]
    search_fields      = ['code', 'libelle', 'groupe']
    filterset_fields   = ['comportement', 'groupe']
    queryset           = MorphologieICD.objects.filter(est_actif=True)
    pagination_class   = None


class DiagnosticValidationRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanManageMedicalConfiguration]
    serializer_class = DiagnosticValidationRuleSerializer
    queryset = DiagnosticValidationRule.objects.all()
    filterset_fields = ['active', 'severity', 'code']
    search_fields = ['code', 'label', 'description']


class DiagnosticViewSet(viewsets.ModelViewSet):
    # CanReadOrWriteDiagnostic gere automatiquement :
    #   - SAFE_METHODS => can_read_diagnostic (oncologue + anapath + admin)
    #   - autres       => can_write_diagnostic (oncologue + anapath + admin)
    #   - epidemio     => acces REFUSE (meme en lecture)
    permission_classes = [IsAuthenticated, CanReadOrWriteDiagnostic]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['patient', 'stade_ajcc', 'lateralite', 'est_principal', 'tnm_type', 'categorie_cancer', 'hemopathie_maligne']
    search_fields      = ['topographie_code', 'topographie_libelle',
                          'morphologie_code', 'morphologie_libelle',
                          'hemopathie_maligne', 'examens_complementaires',
                          'patient__nom', 'patient__registration_number']
    ordering_fields    = ['date_diagnostic', 'date_creation']
    ordering           = ['-date_diagnostic']

    def get_queryset(self):
        qs = Diagnostic.objects.select_related(
            'patient', 'topographie', 'morphologie', 'cree_par'
        )
        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return DiagnosticListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return DiagnosticCreateSerializer
        return DiagnosticDetailSerializer

    def perform_create(self, serializer):
        if not can_write_diagnostic(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Saisie de diagnostics réservée aux oncologues et anatomopathologistes.")
        diag = serializer.save(cree_par=self.request.user)
        AccessLog.objects.create(
            user=self.request.user,
            action=AccessLog.Action.CREATE,
            resource='diagnostic',
            resource_id=str(diag.id),
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_update(self, serializer):
        if not can_write_diagnostic(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Modification de diagnostics réservée aux oncologues et anatomopathologistes.")
        serializer.save()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = Diagnostic.objects.all()
        return Response({
            'total': qs.count(),
            'par_stade': list(
                qs.values('stade_ajcc').annotate(count=Count('id')).order_by('stade_ajcc')
            ),
            'par_topographie': list(
                qs.values('topographie_code', 'topographie_libelle')
                  .annotate(count=Count('id')).order_by('-count')[:10]
            ),
            'par_morphologie_groupe': list(
                qs.exclude(morphologie__isnull=True)
                  .values('morphologie__groupe')
                  .annotate(count=Count('id')).order_by('-count')[:8]
            ),
            'par_base': list(
                qs.values('base_diagnostic').annotate(count=Count('id'))
            ),
        })

    @action(detail=False, methods=['get'])
    def par_patient(self, request):
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response({'error': 'patient_id requis'}, status=400)
        qs = self.get_queryset().filter(patient_id=patient_id)
        return Response(DiagnosticListSerializer(qs, many=True).data)
