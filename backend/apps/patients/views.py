from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from django.utils import timezone

from apps.accounts.permissions import CanWritePatient, CanReadPatient, can_write_patient, can_read_patient
from .duplicate_service import detecter_doublons, fusionner_patients
from .models import Patient, ContactUrgence, DossierMedical
from .serializers import (
    PatientListSerializer,
    PatientDetailSerializer,
    PatientCreateSerializer,
    ContactUrgenceSerializer,
    DossierMedicalSerializer,
)
from apps.accounts.models import AccessLog


class PatientViewSet(viewsets.ModelViewSet):
    # CanWritePatient gere automatiquement :
    #   - SAFE_METHODS (GET/HEAD/OPTIONS) => can_read_patient (oncologue + anapath + epidemio + admin)
    #   - autres (POST/PUT/PATCH/DELETE)  => can_write_patient (oncologue + admin seulement)
    permission_classes = [IsAuthenticated, CanWritePatient]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['sexe', 'statut_dossier', 'statut_vital', 'wilaya']
    search_fields      = ['nom', 'prenom', 'registration_number', 'id_national', 'telephone']
    ordering_fields    = ['nom', 'date_enregistrement', 'date_naissance']
    ordering           = ['-date_enregistrement']

    def get_queryset(self):
        qs = Patient.objects.filter(est_actif=True).select_related(
            'medecin_referent', 'cree_par'
        ).prefetch_related('contacts_urgence')

        age_min = self.request.query_params.get('age_min')
        age_max = self.request.query_params.get('age_max')
        if age_min:
            qs = qs.filter(age_diagnostic__gte=age_min)
        if age_max:
            qs = qs.filter(age_diagnostic__lte=age_max)

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return PatientCreateSerializer
        return PatientDetailSerializer

    def perform_create(self, serializer):
        # Verifier explicitement la permission d'ecriture
        if not can_write_patient(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seuls les médecins oncologues peuvent créer un dossier patient.")
        patient = serializer.save(cree_par=self.request.user)
        AccessLog.objects.create(
            user=self.request.user,
            action=AccessLog.Action.CREATE,
            resource='patient',
            resource_id=str(patient.id),
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_update(self, serializer):
        # Verifier explicitement la permission d'ecriture
        if not can_write_patient(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous n'avez pas le droit de modifier un dossier patient.")
        serializer.save()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated:
            AccessLog.objects.create(
                user=request.user,
                action=AccessLog.Action.VIEW,
                resource='patient',
                resource_id=str(instance.id),
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = Patient.objects.filter(est_actif=True)
        return Response({
            'total':      qs.count(),
            'nouveau':    qs.filter(statut_dossier='nouveau').count(),
            'traitement': qs.filter(statut_dossier='traitement').count(),
            'remission':  qs.filter(statut_dossier='remission').count(),
            'decede':     qs.filter(statut_vital='decede').count(),
            'perdu_vue':  qs.filter(statut_dossier='perdu').count(),
            'par_sexe': {
                'M': qs.filter(sexe='M').count(),
                'F': qs.filter(sexe='F').count(),
            },
            'par_wilaya': list(
                qs.values('wilaya').annotate(count=Count('id'))
                  .order_by('-count')[:10]
            ),
        })

    @action(detail=True, methods=['post'])
    def changer_statut(self, request, pk=None):
        if not can_write_patient(request.user):
            return Response({'detail': 'Non autorise.'}, status=403)
        patient = self.get_object()
        nouveau_statut = request.data.get('statut_dossier')
        if nouveau_statut not in dict(Patient.StatutDossier.choices):
            return Response({'error': 'Statut invalide.'}, status=400)
        patient.statut_dossier = nouveau_statut
        patient.save()
        return Response({'message': 'Statut mis a jour.', 'statut': nouveau_statut})

    @action(detail=True, methods=['get', 'patch', 'put'])
    def dossier(self, request, pk=None):
        patient = self.get_object()
        dossier, created = DossierMedical.objects.get_or_create(patient=patient)
        
        if request.method == 'GET':
            serializer = DossierMedicalSerializer(dossier)
            return Response(serializer.data)
            
        if not can_write_patient(request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous n'avez pas le droit de modifier le dossier médical.")
            
        serializer = DossierMedicalSerializer(dossier, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def search_advanced(self, request):
        qs = self.get_queryset()

        # simple full-text q over common identifiers
        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(nom__icontains=q) | Q(prenom__icontains=q) |
                Q(registration_number__icontains=q) |
                Q(id_national__icontains=q) |
                Q(telephone__icontains=q)
            )

        # filters by explicit fields
        date_naissance = request.query_params.get('date_naissance')
        if date_naissance:
            try:
                qs = qs.filter(date_naissance=date_naissance)
            except Exception:
                pass

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date_enregistrement__date__gte=date_from)
        if date_to:
            qs = qs.filter(date_enregistrement__date__lte=date_to)

        wilaya = request.query_params.get('wilaya')
        if wilaya:
            qs = qs.filter(wilaya__icontains=wilaya)

        commune = request.query_params.get('commune')
        if commune:
            qs = qs.filter(commune__icontains=commune)

        sexe = request.query_params.get('sexe')
        if sexe:
            qs = qs.filter(sexe__iexact=sexe)

        statut_dossier = request.query_params.get('statut_dossier')
        if statut_dossier:
            qs = qs.filter(statut_dossier__iexact=statut_dossier)

        # age filters handled by get_queryset via age_min/age_max
        serializer = PatientListSerializer(qs[:100], many=True)
        return Response({'results': serializer.data, 'count': qs.count()})

    def destroy(self, request, *args, **kwargs):
        # Soft-delete: set est_actif False instead of hard delete
        if not can_write_patient(request.user):
            return Response({'detail': 'Non autorise.'}, status=403)
        instance = self.get_object()
        instance.est_actif = False
        instance.save(update_fields=['est_actif', 'date_modification'])
        AccessLog.objects.create(
            user=request.user,
            action=AccessLog.Action.DELETE,
            resource='patient',
            resource_id=str(instance.id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response({'detail': 'Patient supprime (est_actif=false).'}, status=200)

    # Action mobile : habitudes de vie (acces public via QR code)
    @action(
        detail=True,
        methods=['patch'],
        permission_classes=[AllowAny],
        url_path='habitudes',
    )
    def habitudes(self, request, pk=None):
        patient = self.get_object()

        CHAMPS_AUTORISES = {
            'tabagisme', 'alcool', 'activite_physique',
            'alimentation', 'antecedents_familiaux',
        }
        VALEURS_VALIDES = {
            'tabagisme':         {'non', 'ex', 'actif', 'inconnu'},
            'alcool':            {'non', 'oui', 'inconnu'},
            'activite_physique': {'sedentaire', 'moderee', 'active', 'inconnu'},
            'alimentation':      {'equilibree', 'grasse', 'sucree', 'vegetarienne', 'inconnu'},
        }

        errors  = {}
        updates = {}

        for champ, valeur in request.data.items():
            if champ not in CHAMPS_AUTORISES:
                continue
            if champ in VALEURS_VALIDES:
                if valeur not in VALEURS_VALIDES[champ]:
                    errors[champ] = f"Valeur invalide : {valeur!r}"
                    continue
            updates[champ] = valeur

        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        if not updates:
            return Response({'detail': 'Aucune donnee valide recue.'}, status=status.HTTP_400_BAD_REQUEST)

        for champ, valeur in updates.items():
            setattr(patient, champ, valeur)
        patient.save(update_fields=list(updates.keys()) + ['date_modification'])

        AccessLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action=AccessLog.Action.UPDATE,
            resource='patient_habitudes_mobile',
            resource_id=str(patient.id),
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response({
            'detail': 'Habitudes de vie mises a jour.',
            'updated_fields': list(updates.keys()),
        })

    # GET /api/v1/patients/doublons/
    @action(detail=False, methods=['get'], url_path='doublons')
    def doublons(self, request):
        # Seuls les utilisateurs pouvant ecrire peuvent gerer les doublons
        if not can_write_patient(request.user):
            return Response({'detail': 'Non autorise.'}, status=403)

        seuil     = float(request.query_params.get('seuil', 0.82))
        certitude = request.query_params.get('certitude', None)

        paires = detecter_doublons(seuil_similarite=seuil)
        if certitude:
            paires = [p for p in paires if p.certitude == certitude]

        data = [
            {
                'patient_a_id':   p.patient_a_id,
                'patient_b_id':   p.patient_b_id,
                'score':          p.score,
                'certitude':      p.certitude,
                'raisons':        p.raisons,
                'apercu_a':       p.apercu_a,
                'apercu_b':       p.apercu_b,
                'fusion_preview': p.fusion_preview,
            }
            for p in paires
        ]

        return Response({'count': len(data), 'seuil': seuil, 'paires': data})

    # POST /api/v1/patients/{id}/fusionner/
    @action(detail=True, methods=['post'], url_path='fusionner')
    def fusionner(self, request, pk=None):
        if not can_write_patient(request.user):
            return Response({'detail': 'Non autorise.'}, status=403)

        id_secondaire = request.data.get('id_secondaire')
        if not id_secondaire:
            return Response({'detail': 'Le champ id_secondaire est requis.'}, status=400)
        try:
            id_secondaire = int(id_secondaire)
        except (ValueError, TypeError):
            return Response({'detail': 'id_secondaire doit etre un entier.'}, status=400)

        if int(pk) == id_secondaire:
            return Response({'detail': 'Les deux dossiers sont identiques.'}, status=400)

        try:
            champs_fusion = request.data.get('champs_fusion', None)
            resultat = fusionner_patients(
                id_principal=int(pk),
                id_secondaire=id_secondaire,
                user=request.user,
                champs_fusion=champs_fusion,
            )
            return Response(resultat, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': str(e)}, status=400)

    # POST /api/v1/patients/verifier_doublon/
    @action(detail=False, methods=['post'], url_path='verifier_doublon')
    def verifier_doublon(self, request):
        # Tous les roles ayant acces aux patients peuvent verifier
        if not can_read_patient(request.user):
            return Response({'detail': 'Non autorise.'}, status=403)

        from apps.patients.duplicate_service import normalize, similarity, _apercu, _previsualiser_fusion

        nom         = request.data.get('nom', '')
        prenom      = request.data.get('prenom', '')
        date_naiss  = request.data.get('date_naissance')
        id_national = request.data.get('id_national', '')

        if not nom or not prenom:
            return Response({'suspects': [], 'has_doublon': False})

        patients = list(
            Patient.objects.filter(est_actif=True)
            .values(
                'id', 'nom', 'prenom', 'date_naissance',
                'id_national', 'telephone', 'registration_number',
                'date_modification', 'sexe', 'wilaya', 'statut_dossier',
            )
        )

        suspects = []

        for p in patients:
            score   = 0.0
            raisons = []

            if (id_national and p['id_national']
                    and normalize(id_national) == normalize(p['id_national'])):
                score = 1.0
                raisons.append("Meme numero d'identite nationale")

            if date_naiss and p['date_naissance']:
                try:
                    from datetime import date
                    dn = date.fromisoformat(str(date_naiss))
                    if dn == p['date_naissance']:
                        nom_score = similarity(
                            f"{nom} {prenom}", f"{p['nom']} {p['prenom']}"
                        )
                        if nom_score >= 0.95:
                            score = max(score, 0.97)
                            raisons.append('Meme nom, prenom et date de naissance')
                        elif nom_score >= 0.82:
                            score = max(score, 0.90)
                            raisons.append(f'Noms similaires + meme date de naissance ({int(nom_score*100)}%)')
                except Exception:
                    pass

            nom_sim = similarity(f"{nom} {prenom}", f"{p['nom']} {p['prenom']}")
            if nom_sim >= 0.88 and not raisons:
                score = max(score, nom_sim * 0.88)
                raisons.append(f'Noms similaires ({int(nom_sim*100)}%)')

            if score >= 0.80:
                certitude = 'haute' if score >= 0.95 else 'moyenne' if score >= 0.85 else 'faible'
                suspects.append({
                    'score':     round(score, 3),
                    'certitude': certitude,
                    'raisons':   raisons,
                    'apercu':    _apercu(p),
                })

        suspects.sort(key=lambda s: s['score'], reverse=True)
        return Response({'suspects': suspects[:5], 'has_doublon': len(suspects) > 0})