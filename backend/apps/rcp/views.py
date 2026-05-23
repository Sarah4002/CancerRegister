from rest_framework import viewsets, filters, status, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Prefetch
from django.utils import timezone

from .models import ReunionRCP, PresenceRCP, DossierRCP, DecisionRCP, MessageRCP, FichierDossierRCP
from .serializers import (
    ReunionRCPListSerializer, ReunionRCPDetailSerializer, ReunionRCPCreateSerializer,
    DossierRCPListSerializer, DossierRCPDetailSerializer, DossierRCPCreateSerializer,
    DecisionRCPSerializer, PresenceRCPSerializer, MessageRCPSerializer, FichierDossierSerializer,
)

# ── Helper: créer une notification pour tous les membres d'une RCP ──────────────
def _notifier_membres_rcp(reunion, type_notif, titre, message, exclude_user=None, reunion_id=None, dossier_id=None):
    try:
        from apps.notifications.models import Notification
        presences = reunion.presences.select_related('medecin').filter(present=True)
        for presence in presences:
            if presence.medecin and (exclude_user is None or presence.medecin_id != exclude_user.id):
                Notification.objects.create(
                    destinataire=presence.medecin,
                    type=type_notif,
                    titre=titre,
                    message=message,
                    reunion_id=reunion_id or reunion.id,
                    dossier_id=dossier_id,
                )
    except Exception:
        pass  # Ne pas bloquer si le module notifications est absent


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
        today = timezone.now().date()
        qs = ReunionRCP.objects.filter(
            statut='planifiee', date_reunion__gte=today
        ).order_by('date_reunion', 'heure_debut')[:10]
        return Response(ReunionRCPListSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = ReunionRCP.objects.count()
        return Response({
            'total':               total,
            'par_statut':          list(ReunionRCP.objects.values('statut').annotate(n=Count('id'))),
            'par_type':            list(ReunionRCP.objects.values('type_rcp').annotate(n=Count('id')).order_by('-n')),
            'total_dossiers':      DossierRCP.objects.count(),
            'total_decisions':     DecisionRCP.objects.count(),
            'decisions_en_attente': DecisionRCP.objects.filter(realise=False).count(),
        })

    @action(detail=True, methods=['post'])
    def changer_statut(self, request, pk=None):
        reunion = self.get_object()
        nouveau_statut = request.data.get('statut')
        if nouveau_statut not in dict(ReunionRCP.Statut.choices):
            return Response({'error': 'Statut invalide'}, status=400)
        ancien_statut = reunion.statut
        reunion.statut = nouveau_statut
        reunion.save()

        # Notifications
        if nouveau_statut == 'en_cours' and ancien_statut == 'planifiee':
            _notifier_membres_rcp(
                reunion, 'rcp_demarre',
                f"RCP démarrée : {reunion.titre}",
                f"La réunion '{reunion.titre}' du {reunion.date_reunion} vient de démarrer.",
                exclude_user=request.user,
            )
        elif nouveau_statut == 'terminee':
            _notifier_membres_rcp(
                reunion, 'rcp_terminee',
                f"RCP terminée : {reunion.titre}",
                f"La réunion '{reunion.titre}' est maintenant terminée.",
                exclude_user=request.user,
            )

        return Response({'statut': reunion.statut, 'statut_label': reunion.get_statut_display()})

    @action(detail=True, methods=['post'])
    def ajouter_presence(self, request, pk=None):
        reunion = self.get_object()
        medecin_id = request.data.get('medecin')

        # Vérification doublon
        if medecin_id and PresenceRCP.objects.filter(reunion=reunion, medecin_id=medecin_id).exists():
            return Response({'error': 'Ce médecin est déjà présent dans cette RCP.'}, status=400)

        data = request.data.copy()
        data['reunion'] = reunion.id

        # Make the operation idempotent to avoid 500 on unique_together(reunion, medecin)
        medecin_id = data.get('medecin')
        if medecin_id in [None, '']:
            return Response(
                {'error': 'champ "medecin" requis pour enregistrer une présence (unique reunion+medecin).'},
                status=400,
            )

        try:
            existing = PresenceRCP.objects.select_for_update().get(
                reunion_id=reunion.id,
                medecin_id=medecin_id,
            )
        except PresenceRCP.DoesNotExist:
            existing = None

        if existing is not None:
            # Update existing record
            for field in ['nom_externe', 'specialite', 'present', 'role']:
                if field in data:
                    setattr(existing, field, data[field])
            existing.reunion = reunion
            existing.save()
            serializer = PresenceRCPSerializer(existing)
            return Response(serializer.data, status=200)

        serializer = PresenceRCPSerializer(data=data)
        if serializer.is_valid():
            presence = serializer.save()
            # Notifier le médecin ajouté
            try:
                from apps.notifications.models import Notification
                if presence.medecin:
                    Notification.objects.create(
                        destinataire=presence.medecin,
                        type='rcp_invite',
                        titre=f"Vous avez été ajouté à la RCP : {reunion.titre}",
                        message=f"Vous avez été convié à la réunion '{reunion.titre}' du {reunion.date_reunion} à {reunion.heure_debut}.",
                        reunion_id=reunion.id,
                    )
            except Exception:
                pass
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)

    # ── Messages ──────────────────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        reunion = self.get_object()
        dossier_id = request.query_params.get('dossier_id')
        since_id   = request.query_params.get('since_id')

        qs = MessageRCP.objects.filter(reunion=reunion).select_related('auteur')
        if dossier_id:
            qs = qs.filter(dossier_id=dossier_id)
        if since_id:
            qs = qs.filter(id__gt=since_id)

        return Response(MessageRCPSerializer(qs, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def envoyer_message(self, request, pk=None):
        reunion = self.get_object()
        data = request.data.copy()
        data['reunion'] = reunion.id
        serializer = MessageRCPSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            msg = serializer.save()
            # Notifications aux autres membres
            auteur_nom = request.user.get_full_name() or request.user.username
            dossier_info = ''
            if msg.dossier:
                dossier_info = f" (dossier : {msg.dossier.patient.get_full_name()})"
            _notifier_membres_rcp(
                reunion, 'nouveau_msg',
                f"Nouveau message dans la RCP : {reunion.titre}",
                f"{auteur_nom}{dossier_info} : {msg.contenu[:120]}",
                exclude_user=request.user,
                dossier_id=msg.dossier_id,
            )
            return Response(MessageRCPSerializer(msg, context={'request': request}).data, status=201)
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
        ).prefetch_related('decisions', 'fichiers')
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
        dossier = serializer.save(cree_par=self.request.user)
        # Notifier les membres de la RCP
        try:
            from apps.notifications.models import Notification
            reunion = dossier.reunion
            _notifier_membres_rcp(
                reunion, 'dossier_ajoute',
                f"Nouveau dossier ajouté : {dossier.patient.get_full_name()}",
                f"Un dossier a été ajouté à la RCP '{reunion.titre}' pour le patient {dossier.patient.get_full_name()}.",
                exclude_user=self.request.user,
                dossier_id=dossier.id,
            )
        except Exception:
            pass

    @action(detail=True, methods=['post'])
    def ajouter_decision(self, request, pk=None):
        dossier = self.get_object()
        data = request.data.copy()
        data['dossier'] = dossier.id
        serializer = DecisionRCPSerializer(data=data)
        if serializer.is_valid():
            decision = serializer.save()
            if dossier.statut == 'attente':
                dossier.statut = 'discute'
                dossier.save()
            # Notification
            _notifier_membres_rcp(
                dossier.reunion, 'new_decision',
                f"Nouvelle décision pour {dossier.patient.get_full_name()}",
                f"Décision : {decision.get_type_decision_display()} — {decision.description[:100]}",
                exclude_user=request.user,
                dossier_id=dossier.id,
            )
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['get'])
    def par_patient(self, request):
        pid = request.query_params.get('patient_id')
        if not pid:
            return Response({'error': 'patient_id requis'}, status=400)
        qs = DossierRCP.objects.filter(patient_id=pid).select_related(
            'reunion', 'diagnostic', 'medecin_presenteur'
        ).prefetch_related('decisions', 'fichiers').order_by('-reunion__date_reunion')
        return Response(DossierRCPListSerializer(qs, many=True).data)

    # ── Upload fichier / DICOM ─────────────────────────────────────────────────
    @action(detail=True, methods=['post'], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload_fichier(self, request, pk=None):
        dossier = self.get_object()
        fichier = request.FILES.get('fichier')
        if not fichier:
            return Response({'error': 'Aucun fichier fourni.'}, status=400)

        obj = FichierDossierRCP(
            dossier      = dossier,
            fichier      = fichier,
            nom_original = fichier.name,
            type_fichier = request.data.get('type_fichier', 'autre'),
            description  = request.data.get('description', ''),
            taille_bytes = fichier.size,
            uploade_par  = request.user,
        )
        obj.save()
        return Response(FichierDossierSerializer(obj, context={'request': request}).data, status=201)

    @action(detail=True, methods=['delete'], url_path='fichiers/(?P<fichier_id>[^/.]+)')
    def supprimer_fichier(self, request, pk=None, fichier_id=None):
        dossier = self.get_object()
        try:
            fichier = FichierDossierRCP.objects.get(id=fichier_id, dossier=dossier)
            fichier.fichier.delete(save=False)
            fichier.delete()
            return Response(status=204)
        except FichierDossierRCP.DoesNotExist:
            return Response({'error': 'Fichier introuvable.'}, status=404)


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
        decision.realise = True
        decision.date_realisation = timezone.now().date()
        decision.save()
        return Response(DecisionRCPSerializer(decision).data)