from django.db.models import Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import filters, parsers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    DecisionRCP,
    DossierRCP,
    FichierDossierRCP,
    MessageRCP,
    PresenceRCP,
    ReunionRCP,
)

from .serializers import (
    DecisionRCPSerializer,
    DossierRCPCreateSerializer,
    DossierRCPDetailSerializer,
    DossierRCPListSerializer,
    FichierDossierSerializer,
    MessageRCPSerializer,
    PresenceRCPSerializer,
    ReunionRCPCreateSerializer,
    ReunionRCPDetailSerializer,
    ReunionRCPListSerializer,
)


# =============================================================================
# HELPERS
# =============================================================================

def notifier_membres_rcp(
    reunion,
    type_notif,
    titre,
    message,
    exclude_user=None,
    reunion_id=None,
    dossier_id=None,
):
    """
    Envoyer une notification à tous les membres présents d'une RCP.
    """

    try:
        from apps.notifications.models import Notification

        presences = (
            reunion.presences
            .select_related("medecin")
            .filter(present=True)
        )

        for presence in presences:
            if not presence.medecin:
                continue

            if exclude_user and presence.medecin_id == exclude_user.id:
                continue

            Notification.objects.create(
                destinataire=presence.medecin,
                type=type_notif,
                titre=titre,
                message=message,
                reunion_id=reunion_id or reunion.id,
                dossier_id=dossier_id,
            )

    except Exception:
        # Ne jamais bloquer le système si les notifications échouent
        pass


# =============================================================================
# REUNION RCP VIEWSET
# =============================================================================

class ReunionRCPViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        "statut",
        "type_rcp",
        "coordinateur",
    ]

    search_fields = [
        "titre",
        "lieu",
        "etablissement",
        "objectif",
    ]

    ordering = ["-date_reunion"]

    # -------------------------------------------------------------------------
    # QUERYSET
    # -------------------------------------------------------------------------

    def get_queryset(self):
        queryset = (
            ReunionRCP.objects
            .select_related("coordinateur", "cree_par")
            .prefetch_related("presences", "dossiers")
        )
        if self.request.user.role in {"doctor", "doctor_chef"}:
            queryset = queryset.filter(presences__medecin=self.request.user).distinct()
        return queryset

    # -------------------------------------------------------------------------
    # SERIALIZER
    # -------------------------------------------------------------------------

    def get_serializer_class(self):

        if self.action == "list":
            return ReunionRCPListSerializer

        if self.action == "create":
            return ReunionRCPCreateSerializer

        return ReunionRCPDetailSerializer

    # -------------------------------------------------------------------------
    # CREATE
    # -------------------------------------------------------------------------

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    # -------------------------------------------------------------------------
    # ACTIONS
    # -------------------------------------------------------------------------

    @action(detail=False, methods=["get"])
    def prochaines(self, request):

        today = timezone.now().date()

        reunions = (
            self.get_queryset()
            .filter(
                statut="planifiee",
                date_reunion__gte=today,
            )
            .order_by("date_reunion", "heure_debut")[:10]
        )

        serializer = ReunionRCPListSerializer(reunions, many=True)

        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):

        reunions = self.get_queryset()
        reunion_ids = reunions.values("id")

        return Response({
            "total": reunions.count(),

            "par_statut": list(
                reunions
                .values("statut")
                .annotate(n=Count("id"))
            ),

            "par_type": list(
                reunions
                .values("type_rcp")
                .annotate(n=Count("id"))
                .order_by("-n")
            ),

            "total_dossiers": DossierRCP.objects.filter(reunion_id__in=reunion_ids).count(),

            "total_decisions": DecisionRCP.objects.filter(dossier__reunion_id__in=reunion_ids).count(),

            "decisions_en_attente":
                DecisionRCP.objects.filter(realise=False, dossier__reunion_id__in=reunion_ids).count(),
        })

    @action(detail=True, methods=["post"])
    def changer_statut(self, request, pk=None):

        reunion = self.get_object()

        nouveau_statut = request.data.get("statut")

        if nouveau_statut not in dict(ReunionRCP.Statut.choices):
            return Response(
                {"error": "Statut invalide"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ancien_statut = reunion.statut

        reunion.statut = nouveau_statut
        reunion.save()

        # Notifications
        if (
            nouveau_statut == "en_cours"
            and ancien_statut == "planifiee"
        ):

            notifier_membres_rcp(
                reunion=reunion,
                type_notif="rcp_demarre",
                titre=f"RCP démarrée : {reunion.titre}",
                message=(
                    f"La réunion '{reunion.titre}' "
                    f"du {reunion.date_reunion} vient de démarrer."
                ),
                exclude_user=request.user,
            )

        elif nouveau_statut == "terminee":

            notifier_membres_rcp(
                reunion=reunion,
                type_notif="rcp_terminee",
                titre=f"RCP terminée : {reunion.titre}",
                message=(
                    f"La réunion '{reunion.titre}' "
                    f"est maintenant terminée."
                ),
                exclude_user=request.user,
            )

        return Response({
            "statut": reunion.statut,
            "statut_label": reunion.get_statut_display(),
        })

    @action(detail=True, methods=["post"])
    def ajouter_presence(self, request, pk=None):

        reunion = self.get_object()

        data = request.data.copy()
        data["reunion"] = reunion.id

        medecin_id = data.get("medecin")

        if medecin_id in [None, ""]:

            return Response(
                {"error": 'champ "medecin" requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Vérification doublon
        existe = PresenceRCP.objects.filter(
            reunion_id=reunion.id,
            medecin_id=medecin_id,
        ).exists()

        if existe:

            return Response(
                {"error": "Ce médecin est déjà présent dans cette RCP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PresenceRCPSerializer(data=data)

        if serializer.is_valid():

            presence = serializer.save(reunion=reunion)

            try:
                from apps.notifications.models import Notification

                if presence.medecin:

                    Notification.objects.create(
                        destinataire=presence.medecin,
                        type="rcp_invite",
                        titre=(
                            f"Vous avez été ajouté à la RCP : "
                            f"{reunion.titre}"
                        ),
                        message=(
                            f"Vous avez été convié à la réunion "
                            f"'{reunion.titre}' du "
                            f"{reunion.date_reunion} "
                            f"à {reunion.heure_debut}."
                        ),
                        reunion_id=reunion.id,
                    )

            except Exception:
                pass

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # -------------------------------------------------------------------------
    # MESSAGES
    # -------------------------------------------------------------------------

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):

        reunion = self.get_object()

        dossier_id = request.query_params.get("dossier_id")
        since_id = request.query_params.get("since_id")

        messages = (
            MessageRCP.objects
            .filter(reunion=reunion)
            .select_related("auteur")
        )

        if dossier_id:
            messages = messages.filter(dossier_id=dossier_id)

        if since_id:
            messages = messages.filter(id__gt=since_id)

        serializer = MessageRCPSerializer(
            messages,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def envoyer_message(self, request, pk=None):

        reunion = self.get_object()

        data = request.data.copy()
        data["reunion"] = reunion.id

        serializer = MessageRCPSerializer(
            data=data,
            context={"request": request},
        )

        if serializer.is_valid():

            message = serializer.save()

            auteur_nom = (
                request.user.get_full_name()
                or request.user.username
            )

            dossier_info = ""

            if message.dossier:
                dossier_info = (
                    f" (dossier : "
                    f"{message.dossier.patient.get_full_name()})"
                )

            notifier_membres_rcp(
                reunion=reunion,
                type_notif="nouveau_msg",
                titre=f"Nouveau message dans la RCP : {reunion.titre}",
                message=(
                    f"{auteur_nom}"
                    f"{dossier_info} : "
                    f"{message.contenu[:120]}"
                ),
                exclude_user=request.user,
                dossier_id=message.dossier_id,
            )

            return Response(
                MessageRCPSerializer(
                    message,
                    context={"request": request},
                ).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


# =============================================================================
# DOSSIER RCP VIEWSET
# =============================================================================

class DossierRCPViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        "reunion",
        "patient",
        "statut",
        "type_presentation",
    ]

    search_fields = [
        "patient__nom",
        "patient__registration_number",
        "resume_clinique",
        "question_posee",
    ]

    ordering = ["ordre_passage"]

    # -------------------------------------------------------------------------
    # QUERYSET
    # -------------------------------------------------------------------------

    def get_queryset(self):

        queryset = (
            DossierRCP.objects
            .select_related(
                "patient",
                "diagnostic",
                "medecin_presenteur",
                "reunion",
            )
            .prefetch_related(
                "decisions",
                "fichiers",
            )
        )

        reunion_id = self.request.query_params.get("reunion_id")

        if reunion_id:
            queryset = queryset.filter(reunion_id=reunion_id)

        patient_id = self.request.query_params.get("patient_id")

        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        return queryset

    # -------------------------------------------------------------------------
    # SERIALIZER
    # -------------------------------------------------------------------------

    def get_serializer_class(self):

        if self.action == "list":
            return DossierRCPListSerializer

        if self.action in ["create", "update", "partial_update"]:
            return DossierRCPCreateSerializer

        return DossierRCPDetailSerializer

    # -------------------------------------------------------------------------
    # CREATE
    # -------------------------------------------------------------------------

    def perform_create(self, serializer):

        dossier = serializer.save(cree_par=self.request.user)

        notifier_membres_rcp(
            reunion=dossier.reunion,
            type_notif="dossier_ajoute",
            titre=(
                f"Nouveau dossier ajouté : "
                f"{dossier.patient.get_full_name()}"
            ),
            message=(
                f"Un dossier a été ajouté à la RCP "
                f"'{dossier.reunion.titre}' "
                f"pour le patient "
                f"{dossier.patient.get_full_name()}."
            ),
            exclude_user=self.request.user,
            dossier_id=dossier.id,
        )

    # -------------------------------------------------------------------------
    # DECISIONS
    # -------------------------------------------------------------------------

    @action(detail=True, methods=["post"])
    def ajouter_decision(self, request, pk=None):

        dossier = self.get_object()

        data = request.data.copy()
        data["dossier"] = dossier.id

        serializer = DecisionRCPSerializer(data=data)

        if serializer.is_valid():

            decision = serializer.save()

            if dossier.statut == "attente":
                dossier.statut = "discute"
                dossier.save()

            notifier_membres_rcp(
                reunion=dossier.reunion,
                type_notif="new_decision",
                titre=(
                    f"Nouvelle décision pour "
                    f"{dossier.patient.get_full_name()}"
                ),
                message=(
                    f"Décision : "
                    f"{decision.get_type_decision_display()} — "
                    f"{decision.description[:100]}"
                ),
                exclude_user=request.user,
                dossier_id=dossier.id,
            )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # -------------------------------------------------------------------------
    # PAR PATIENT
    # -------------------------------------------------------------------------

    @action(detail=False, methods=["get"])
    def par_patient(self, request):

        patient_id = request.query_params.get("patient_id")

        if not patient_id:

            return Response(
                {"error": "patient_id requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dossiers = (
            DossierRCP.objects
            .filter(patient_id=patient_id)
            .select_related(
                "reunion",
                "diagnostic",
                "medecin_presenteur",
            )
            .prefetch_related(
                "decisions",
                "fichiers",
            )
            .order_by("-reunion__date_reunion")
        )

        serializer = DossierRCPListSerializer(
            dossiers,
            many=True,
        )

        return Response(serializer.data)

    # -------------------------------------------------------------------------
    # FICHIERS
    # -------------------------------------------------------------------------

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[
            parsers.MultiPartParser,
            parsers.FormParser,
        ],
    )
    def upload_fichier(self, request, pk=None):

        dossier = self.get_object()

        fichier = request.FILES.get("fichier")

        if not fichier:

            return Response(
                {"error": "Aucun fichier fourni."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fichier_obj = FichierDossierRCP.objects.create(
            dossier=dossier,
            fichier=fichier,
            nom_original=fichier.name,
            type_fichier=request.data.get(
                "type_fichier",
                "autre",
            ),
            description=request.data.get("description", ""),
            taille_bytes=fichier.size,
            uploade_par=request.user,
        )

        serializer = FichierDossierSerializer(
            fichier_obj,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"fichiers/(?P<fichier_id>[^/.]+)",
    )
    def supprimer_fichier(self, request, pk=None, fichier_id=None):

        dossier = self.get_object()

        try:

            fichier = FichierDossierRCP.objects.get(
                id=fichier_id,
                dossier=dossier,
            )

            fichier.fichier.delete(save=False)
            fichier.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)

        except FichierDossierRCP.DoesNotExist:

            return Response(
                {"error": "Fichier introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )


# =============================================================================
# DECISION RCP VIEWSET
# =============================================================================

class DecisionRCPViewSet(viewsets.ModelViewSet):

    permission_classes = [IsAuthenticated]

    serializer_class = DecisionRCPSerializer

    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]

    filterset_fields = [
        "dossier",
        "type_decision",
        "priorite",
        "realise",
    ]

    ordering = [
        "dossier",
        "type_decision",
    ]

    # -------------------------------------------------------------------------
    # QUERYSET
    # -------------------------------------------------------------------------

    def get_queryset(self):

        return (
            DecisionRCP.objects
            .select_related(
                "dossier__patient",
                "medecin_referent",
            )
        )

    # -------------------------------------------------------------------------
    # ACTIONS
    # -------------------------------------------------------------------------

    @action(detail=True, methods=["post"])
    def marquer_realise(self, request, pk=None):

        decision = self.get_object()

        decision.realise = True
        decision.date_realisation = timezone.now().date()

        decision.save()

        serializer = DecisionRCPSerializer(decision)

        return Response(serializer.data)
