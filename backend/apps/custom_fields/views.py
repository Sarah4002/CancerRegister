"""
apps/custom_fields/views.py
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import ChampPersonnalise, ValeurChamp, PropositionConfigurationMedicale
from .serializers import (
    ChampPersonnaliseSerializer,
    ValeurChampSerializer,
    ValeurChampBulkSerializer,
    PropositionConfigurationMedicaleSerializer,
)
from apps.accounts.permissions import CanManageMedicalConfiguration, is_doctor_chef
from django.utils import timezone


class ChampPersonnaliseViewSet(viewsets.ModelViewSet):
    """
    CRUD complet sur les champs personnalisés.
    - Lecture  : tous les utilisateurs authentifiés
    - Écriture : admin uniquement
    """
    serializer_class = ChampPersonnaliseSerializer

    def get_queryset(self):
        qs = ChampPersonnalise.objects.all()

        # Filtres
        module = self.request.query_params.get('module')
        if module:
            qs = qs.filter(module=module)

        actif = self.request.query_params.get('actif')
        if actif is not None:
            qs = qs.filter(actif=actif.lower() == 'true')

        topo = self.request.query_params.get('topographie_code')
        if topo:
            # Retourner champs globaux + champs spécifiques à cette topo
            qs = qs.filter(
                topographie_code__in=['', topo]
            )
        else:
            # Sans filtre topo → retourner tous (admin) ou globaux seulement
            pass

        return qs.order_by('module', 'ordre', 'nom')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'reordonner']:
            return [IsAuthenticated(), CanManageMedicalConfiguration()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='reordonner')
    def reordonner(self, request):
        """
        POST /custom-fields/reordonner/
        Body : { "ordre": [{ "id": 1, "ordre": 0 }, { "id": 2, "ordre": 1 }, ...] }
        """
        items = request.data.get('ordre', [])
        with transaction.atomic():
            for item in items:
                ChampPersonnalise.objects.filter(pk=item['id']).update(ordre=item['ordre'])
        return Response({'detail': 'Ordre mis à jour.'})

    @action(detail=False, methods=['get'], url_path='par-module')
    def par_module(self, request):
        """
        GET /custom-fields/par-module/
        Retourne tous les champs actifs groupés par module.
        Optionnel : ?topographie_code=C50
        """
        topo = request.query_params.get('topographie_code', '')
        modules = ['patient', 'diagnostic', 'traitement', 'suivi']
        result = {}

        for module in modules:
            qs = ChampPersonnalise.objects.filter(module=module, actif=True)
            if topo:
                qs = qs.filter(topographie_code__in=['', topo])
            result[module] = ChampPersonnaliseSerializer(
                qs.order_by('ordre', 'nom'), many=True
            ).data

        return Response(result)


class ValeurChampViewSet(viewsets.ModelViewSet):
    """
    CRUD valeurs des champs personnalisés.
    """
    serializer_class   = ValeurChampSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ValeurChamp.objects.select_related('champ')

        module    = self.request.query_params.get('module')
        object_id = self.request.query_params.get('object_id')

        if module:
            qs = qs.filter(module=module)
        if object_id:
            qs = qs.filter(object_id=object_id)

        return qs

    @action(detail=False, methods=['post'], url_path='bulk-save')
    def bulk_save(self, request):
        """
        POST /custom-fields/valeurs/bulk-save/
        Sauvegarde ou met à jour toutes les valeurs d'un objet en une seule requête.

        Body :
        {
            "module": "patient",
            "object_id": 42,
            "valeurs": {
                "patient_her2": "Positif",
                "patient_grade_sbr": "3",
                "patient_er": "true"
            }
        }
        """
        serializer = ValeurChampBulkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        module    = serializer.validated_data['module']
        object_id = serializer.validated_data['object_id']
        valeurs   = serializer.validated_data['valeurs']

        saved   = []
        errors  = []

        with transaction.atomic():
            for code, valeur in valeurs.items():
                try:
                    champ = ChampPersonnalise.objects.get(code=code, actif=True)

                    # Vérification obligatoire
                    if champ.obligatoire and (valeur is None or str(valeur).strip() == ''):
                        errors.append({'code': code, 'error': f'Le champ "{champ.nom}" est obligatoire.'})
                        continue

                    obj, created = ValeurChamp.objects.update_or_create(
                        champ=champ,
                        module=module,
                        object_id=object_id,
                        defaults={
                            'valeur':    str(valeur) if valeur is not None else None,
                            'saisi_par': request.user,
                        }
                    )
                    saved.append({'code': code, 'valeur': valeur, 'created': created})

                except ChampPersonnalise.DoesNotExist:
                    errors.append({'code': code, 'error': f'Champ "{code}" introuvable ou inactif.'})

        return Response({
            'saved':  saved,
            'errors': errors,
            'total_saved': len(saved),
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='pour-objet')
    def pour_objet(self, request):
        """
        GET /custom-fields/valeurs/pour-objet/?module=patient&object_id=42
        Retourne toutes les valeurs d'un objet avec les infos du champ.
        """
        module    = request.query_params.get('module')
        object_id = request.query_params.get('object_id')

        if not module or not object_id:
            return Response(
                {'error': 'Paramètres module et object_id requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valeurs = ValeurChamp.objects.filter(
            module=module,
            object_id=object_id
        ).select_related('champ')

        return Response(ValeurChampSerializer(valeurs, many=True).data)


class PropositionConfigurationMedicaleViewSet(viewsets.ModelViewSet):
    """Les médecins proposent ; seul le médecin chef décide et applique."""
    serializer_class = PropositionConfigurationMedicaleSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        qs = PropositionConfigurationMedicale.objects.select_related('proposee_par', 'traitee_par')
        if is_doctor_chef(self.request.user):
            return qs
        return qs.filter(proposee_par=self.request.user)

    def create(self, request, *args, **kwargs):
        if request.user.role not in {'doctor', 'doctor_chef'}:
            return Response({'detail': 'Seuls les médecins peuvent proposer une configuration.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(proposee_par=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approuver(self, request, pk=None):
        if not is_doctor_chef(request.user):
            return Response({'detail': 'Décision réservée au médecin chef.'}, status=status.HTTP_403_FORBIDDEN)
        proposition = self.get_object()
        if proposition.statut != PropositionConfigurationMedicale.Statut.EN_ATTENTE:
            return Response({'detail': 'Cette proposition a déjà été traitée.'}, status=status.HTTP_400_BAD_REQUEST)
        payload = proposition.donnees.copy()
        if proposition.type_proposition == PropositionConfigurationMedicale.Type.CHAMP:
            serializer = ChampPersonnaliseSerializer(data=payload, context={'request': request})
        else:
            from apps.diagnostics.serializers import DiagnosticValidationRuleSerializer
            serializer = DiagnosticValidationRuleSerializer(data=payload, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        proposition.statut = PropositionConfigurationMedicale.Statut.APPROUVEE
        proposition.traitee_par = request.user
        proposition.commentaire_decision = request.data.get('commentaire', '')
        proposition.date_decision = timezone.now()
        proposition.save()
        return Response(self.get_serializer(proposition).data)

    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        if not is_doctor_chef(request.user):
            return Response({'detail': 'Décision réservée au médecin chef.'}, status=status.HTTP_403_FORBIDDEN)
        commentaire = str(request.data.get('commentaire', '')).strip()
        if not commentaire:
            return Response({'commentaire': 'Un argument de refus est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        proposition = self.get_object()
        if proposition.statut != PropositionConfigurationMedicale.Statut.EN_ATTENTE:
            return Response({'detail': 'Cette proposition a déjà été traitée.'}, status=status.HTTP_400_BAD_REQUEST)
        proposition.statut = PropositionConfigurationMedicale.Statut.REFUSEE
        proposition.traitee_par = request.user
        proposition.commentaire_decision = commentaire
        proposition.date_decision = timezone.now()
        proposition.save()
        return Response(self.get_serializer(proposition).data)
