import re
from datetime import datetime

from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import AccessLog
from apps.accounts.permissions import (
    CanWritePatient,
    can_read_patient,
    can_write_patient,
)

from .duplicate_service import detecter_doublons, fusionner_patients
from .models import ContactUrgence, DossierMedical, Patient
from .serializers import (
    ContactUrgenceSerializer,
    DossierMedicalSerializer,
    PatientCreateSerializer,
    PatientDetailSerializer,
    PatientListSerializer,
)


class PatientViewSet(viewsets.ModelViewSet):
    """
    ViewSet principal des patients
    """

    permission_classes = [IsAuthenticated, CanWritePatient]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        'sexe',
        'statut_dossier',
        'statut_vital',
        'wilaya',
    ]

    search_fields = [
        'nom',
        'prenom',
        'registration_number',
        'id_national',
        'telephone',
    ]

    ordering_fields = [
        'nom',
        'date_enregistrement',
        'date_naissance',
    ]

    ordering = ['-date_enregistrement']

    # =========================================================================
    # CONFIGURATION
    # =========================================================================

    CHAMPS_HABITUDES = {
        'tabagisme',
        'alcool',
        'activite_physique',
        'alimentation',
        'antecedents_familiaux',
    }

    VALEURS_VALIDES_HABITUDES = {
        'tabagisme': {'non', 'ex', 'actif', 'inconnu'},
        'alcool': {'non', 'oui', 'inconnu'},
        'activite_physique': {
            'sedentaire',
            'moderee',
            'active',
            'inconnu',
        },
        'alimentation': {
            'equilibree',
            'grasse',
            'sucree',
            'vegetarienne',
            'inconnu',
        },
    }

    # =========================================================================
    # QUERYSET
    # =========================================================================

    def get_queryset(self):
        queryset = (
            Patient.objects
            .filter(est_actif=True)
            .select_related('medecin_referent', 'cree_par')
            .prefetch_related('contacts_urgence')
        )

        queryset = self._filter_age(queryset)
        queryset = self._apply_search_date_filter(queryset)

        return queryset

    def _filter_age(self, queryset):
        age_min = self.request.query_params.get('age_min')
        age_max = self.request.query_params.get('age_max')

        if age_min:
            queryset = queryset.filter(age_diagnostic__gte=age_min)

        if age_max:
            queryset = queryset.filter(age_diagnostic__lte=age_max)

        return queryset

    def _apply_search_date_filter(self, queryset):
        search_query = self.request.query_params.get('search', '').strip()

        if not search_query:
            return queryset

        periode_match = re.match(r'^(\d{4})[\-/](\d{4})$', search_query)
        date_fr_match = re.match(r'^(\d{2})[\-/](\d{2})[\-/](\d{4})$', search_query)
        date_iso_match = re.match(r'^(\d{4})[\-/](\d{2})[\-/](\d{2})$', search_query)

        if periode_match:
            annee_debut = int(periode_match.group(1))
            annee_fin = int(periode_match.group(2))

            self.search_fields = []

            return queryset.filter(
                date_naissance__year__gte=min(annee_debut, annee_fin),
                date_naissance__year__lte=max(annee_debut, annee_fin),
            )

        if date_fr_match:
            date_obj = self._parse_fr_date(date_fr_match)

            if date_obj:
                self.search_fields = []
                return queryset.filter(date_naissance=date_obj)

        if date_iso_match:
            date_obj = self._parse_iso_date(date_iso_match)

            if date_obj:
                self.search_fields = []
                return queryset.filter(date_naissance=date_obj)

        return queryset

    # =========================================================================
    # SERIALIZERS
    # =========================================================================

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer

        if self.action in ['create', 'update', 'partial_update']:
            return PatientCreateSerializer

        return PatientDetailSerializer

    # =========================================================================
    # CRUD
    # =========================================================================

    def perform_create(self, serializer):
        if not can_write_patient(self.request.user):
            raise PermissionDenied(
                "Seuls les médecins oncologues peuvent créer un dossier patient."
            )

        patient = serializer.save(cree_par=self.request.user)

        self._create_access_log(
            user=self.request.user,
            action=AccessLog.Action.CREATE,
            resource='patient',
            resource_id=patient.id,
        )

    def perform_update(self, serializer):
        if not can_write_patient(self.request.user):
            raise PermissionDenied(
                "Vous n'avez pas le droit de modifier ce dossier patient."
            )

        serializer.save()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        if request.user.is_authenticated:
            self._create_access_log(
                user=request.user,
                action=AccessLog.Action.VIEW,
                resource='patient',
                resource_id=instance.id,
            )

        serializer = self.get_serializer(instance)

        return Response(serializer.data)

    # =========================================================================
    # ACTIONS PUBLIQUES MOBILE QR CODE
    # =========================================================================

    @action(
        detail=True,
        methods=['get'],
        permission_classes=[AllowAny],
        url_path='public',
    )
    def public(self, request, pk=None):
        """
        Endpoint public pour application mobile QR code.
        """

        patient = self._get_public_patient(pk)

        if not patient:
            return Response(
                {'detail': 'Dossier introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            'id': patient.id,
            'registration_number': patient.registration_number,
            'nom': patient.nom,
            'prenom': patient.prenom,
            'age': patient.age,
            'wilaya': patient.wilaya,

            # Habitudes de vie
            'tabagisme': patient.tabagisme,
            'alcool': patient.alcool,
            'activite_physique': patient.activite_physique,
            'alimentation': patient.alimentation,
            'antecedents_familiaux': patient.antecedents_familiaux,
        })

    @action(
        detail=True,
        methods=['patch'],
        permission_classes=[AllowAny],
        url_path='habitudes',
    )
    def habitudes(self, request, pk=None):
        """
        Mise à jour publique des habitudes de vie via QR code.
        """

        patient = self._get_public_patient(pk)

        if not patient:
            return Response(
                {'detail': 'Dossier introuvable.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        errors, updates = self._validate_habitudes_data(request.data)

        if errors:
            return Response(
                {'errors': errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not updates:
            return Response(
                {'detail': 'Aucune donnée valide reçue.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for champ, valeur in updates.items():
            setattr(patient, champ, valeur)

        patient.save(
            update_fields=list(updates.keys()) + ['date_modification']
        )

        self._create_access_log(
            user=request.user if request.user.is_authenticated else None,
            action=AccessLog.Action.UPDATE,
            resource='patient_habitudes_mobile',
            resource_id=patient.id,
        )

        return Response({
            'detail': 'Habitudes de vie mises à jour.',
            'updated_fields': list(updates.keys()),
        })

    # =========================================================================
    # STATISTIQUES
    # =========================================================================

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = Patient.objects.filter(est_actif=True)

        return Response({
            'total': queryset.count(),
            'nouveau': queryset.filter(
                statut_dossier='nouveau'
            ).count(),

            'traitement': queryset.filter(
                statut_dossier='traitement'
            ).count(),

            'remission': queryset.filter(
                statut_dossier='remission'
            ).count(),

            'decede': queryset.filter(
                statut_vital='decede'
            ).count(),

            'perdu_vue': queryset.filter(
                statut_dossier='perdu'
            ).count(),

            'par_sexe': {
                'M': queryset.filter(sexe='M').count(),
                'F': queryset.filter(sexe='F').count(),
            },

            'par_wilaya': list(
                queryset
                .values('wilaya')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),
        })

    # =========================================================================
    # CHANGEMENT STATUT
    # =========================================================================

    @action(detail=True, methods=['post'])
    def changer_statut(self, request, pk=None):
        if not can_write_patient(request.user):
            return Response(
                {'detail': 'Non autorisé.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        patient = self.get_object()

        nouveau_statut = request.data.get('statut_dossier')

        if nouveau_statut not in dict(Patient.StatutDossier.choices):
            return Response(
                {'error': 'Statut invalide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient.statut_dossier = nouveau_statut
        patient.save(update_fields=['statut_dossier'])

        return Response({
            'message': 'Statut mis à jour.',
            'statut': nouveau_statut,
        })

    # =========================================================================
    # DOSSIER MEDICAL
    # =========================================================================

    @action(detail=True, methods=['get', 'patch', 'put'])
    def dossier(self, request, pk=None):
        patient = self.get_object()

        dossier, created = DossierMedical.objects.get_or_create(
            patient=patient
        )

        if request.method == 'GET':
            serializer = DossierMedicalSerializer(dossier)
            return Response(serializer.data)

        if not can_write_patient(request.user):
            raise PermissionDenied(
                "Vous n'avez pas le droit de modifier le dossier médical."
            )

        serializer = DossierMedicalSerializer(
            dossier,
            data=request.data,
            partial=(request.method == 'PATCH'),
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    # =========================================================================
    # RECHERCHE AVANCEE
    # =========================================================================

    @action(detail=False, methods=['get'])
    def search_advanced(self, request):
        queryset = self.get_queryset()

        q = request.query_params.get('q', '').strip()

        if q:
            queryset = self._advanced_search(queryset, q)

        serializer = PatientListSerializer(
            queryset[:50],
            many=True,
        )

        return Response({
            'results': serializer.data,
            'count': queryset.count(),
        })

    def _advanced_search(self, queryset, query):
        periode_match = re.match(r'^(\d{4})[\-/](\d{4})$', query)
        date_fr_match = re.match(r'^(\d{2})[\-/](\d{2})[\-/](\d{4})$', query)
        date_iso_match = re.match(r'^(\d{4})[\-/](\d{2})[\-/](\d{2})$', query)

        if periode_match:
            annee_debut = int(periode_match.group(1))
            annee_fin = int(periode_match.group(2))

            return queryset.filter(
                date_enregistrement__year__gte=min(
                    annee_debut,
                    annee_fin,
                ),
                date_enregistrement__year__lte=max(
                    annee_debut,
                    annee_fin,
                ),
            )

        if date_fr_match:
            date_obj = self._parse_fr_date(date_fr_match)

            if date_obj:
                return queryset.filter(date_naissance=date_obj)

        if date_iso_match:
            date_obj = self._parse_iso_date(date_iso_match)

            if date_obj:
                return queryset.filter(date_naissance=date_obj)

        return queryset.filter(
            Q(nom__icontains=query)
            | Q(prenom__icontains=query)
            | Q(registration_number__icontains=query)
            | Q(id_national__icontains=query)
            | Q(telephone__icontains=query)
        )

    # =========================================================================
    # GESTION DES DOUBLONS
    # =========================================================================

    @action(detail=False, methods=['get'], url_path='doublons')
    def doublons(self, request):
        if not can_write_patient(request.user):
            return Response(
                {'detail': 'Non autorisé.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        seuil = float(request.query_params.get('seuil', 0.82))
        certitude = request.query_params.get('certitude')

        paires = detecter_doublons(seuil_similarite=seuil)

        if certitude:
            paires = [
                p for p in paires
                if p.certitude == certitude
            ]

        data = [
            {
                'patient_a_id': p.patient_a_id,
                'patient_b_id': p.patient_b_id,
                'score': p.score,
                'certitude': p.certitude,
                'raisons': p.raisons,
                'apercu_a': p.apercu_a,
                'apercu_b': p.apercu_b,
                'fusion_preview': p.fusion_preview,
            }
            for p in paires
        ]

        return Response({
            'count': len(data),
            'seuil': seuil,
            'paires': data,
        })

    @action(detail=True, methods=['post'], url_path='fusionner')
    def fusionner(self, request, pk=None):
        if not can_write_patient(request.user):
            return Response(
                {'detail': 'Non autorisé.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        id_secondaire = request.data.get('id_secondaire')

        if not id_secondaire:
            return Response(
                {'detail': 'Le champ id_secondaire est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            id_secondaire = int(id_secondaire)

        except (ValueError, TypeError):
            return Response(
                {'detail': 'id_secondaire doit être un entier.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if int(pk) == id_secondaire:
            return Response(
                {'detail': 'Les deux dossiers sont identiques.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resultat = fusionner_patients(
                id_principal=int(pk),
                id_secondaire=id_secondaire,
                user=request.user,
                champs_fusion=request.data.get('champs_fusion'),
            )

            return Response(
                resultat,
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(
        detail=False,
        methods=['post'],
        url_path='verifier_doublon',
    )
    def verifier_doublon(self, request):
        if not can_read_patient(request.user):
            return Response(
                {'detail': 'Non autorisé.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from apps.patients.duplicate_service import (
            _apercu,
            normalize,
            similarity,
        )

        nom = request.data.get('nom', '')
        prenom = request.data.get('prenom', '')
        date_naissance = request.data.get('date_naissance')
        id_national = request.data.get('id_national', '')

        if not nom or not prenom:
            return Response({
                'suspects': [],
                'has_doublon': False,
            })

        patients = list(
            Patient.objects
            .filter(est_actif=True)
            .values(
                'id',
                'nom',
                'prenom',
                'date_naissance',
                'id_national',
                'telephone',
                'registration_number',
                'date_modification',
                'sexe',
                'wilaya',
                'statut_dossier',
            )
        )

        suspects = []

        for patient in patients:
            resultat = self._analyser_doublon_patient(
                patient=patient,
                nom=nom,
                prenom=prenom,
                date_naissance=date_naissance,
                id_national=id_national,
                normalize=normalize,
                similarity=similarity,
                apercu=_apercu,
            )

            if resultat:
                suspects.append(resultat)

        suspects.sort(
            key=lambda item: item['score'],
            reverse=True,
        )

        return Response({
            'suspects': suspects[:5],
            'has_doublon': len(suspects) > 0,
        })

    # =========================================================================
    # HELPERS
    # =========================================================================

    def _parse_fr_date(self, match):
        try:
            return datetime.strptime(
                f"{match.group(3)}-{match.group(2)}-{match.group(1)}",
                "%Y-%m-%d",
            ).date()

        except ValueError:
            return None

    def _parse_iso_date(self, match):
        try:
            return datetime.strptime(
                f"{match.group(1)}-{match.group(2)}-{match.group(3)}",
                "%Y-%m-%d",
            ).date()

        except ValueError:
            return None

    def _get_public_patient(self, pk):
        try:
            return Patient.objects.get(
                pk=pk,
                est_actif=True,
            )

        except Patient.DoesNotExist:
            return None

    def _validate_habitudes_data(self, data):
        errors = {}
        updates = {}

        for champ, valeur in data.items():

            if champ not in self.CHAMPS_HABITUDES:
                continue

            if champ in self.VALEURS_VALIDES_HABITUDES:

                if valeur not in self.VALEURS_VALIDES_HABITUDES[champ]:
                    errors[champ] = f"Valeur invalide : {valeur!r}"
                    continue

            updates[champ] = valeur

        return errors, updates

    def _create_access_log(
        self,
        user,
        action,
        resource,
        resource_id,
    ):
        AccessLog.objects.create(
            user=user,
            action=action,
            resource=resource,
            resource_id=str(resource_id),
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def _analyser_doublon_patient(
        self,
        patient,
        nom,
        prenom,
        date_naissance,
        id_national,
        normalize,
        similarity,
        apercu,
    ):
        score = 0.0
        raisons = []

        # Vérification identité nationale
        if (
            id_national
            and patient['id_national']
            and normalize(id_national)
            == normalize(patient['id_national'])
        ):
            score = 1.0
            raisons.append(
                "Même numéro d'identité nationale"
            )

        # Vérification date naissance
        if date_naissance and patient['date_naissance']:

            try:
                from datetime import date

                dn = date.fromisoformat(str(date_naissance))

                if dn == patient['date_naissance']:

                    nom_score = similarity(
                        f"{nom} {prenom}",
                        f"{patient['nom']} {patient['prenom']}",
                    )

                    if nom_score >= 0.95:
                        score = max(score, 0.97)

                        raisons.append(
                            'Même nom, prénom et date de naissance'
                        )

                    elif nom_score >= 0.82:
                        score = max(score, 0.90)

                        raisons.append(
                            f'Noms similaires + même date '
                            f'de naissance ({int(nom_score * 100)}%)'
                        )

            except Exception:
                pass

        # Similarité nom
        nom_sim = similarity(
            f"{nom} {prenom}",
            f"{patient['nom']} {patient['prenom']}",
        )

        if nom_sim >= 0.88 and not raisons:
            score = max(score, nom_sim * 0.88)

            raisons.append(
                f'Noms similaires ({int(nom_sim * 100)}%)'
            )

        if score < 0.80:
            return None

        certitude = (
            'haute'
            if score >= 0.95
            else 'moyenne'
            if score >= 0.85
            else 'faible'
        )

        return {
            'score': round(score, 3),
            'certitude': certitude,
            'raisons': raisons,
            'apercu': apercu(patient),
        }