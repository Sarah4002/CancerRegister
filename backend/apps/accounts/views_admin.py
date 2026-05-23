"""
apps/accounts/views_admin.py  — section MedecinsListView uniquement modifiée.

Changements :
- MedecinsListView retourne TOUS les utilisateurs actifs susceptibles de participer
  à une RCP (tous les rôles sauf 'readonly').
- Ajout du champ 'role_display' dans la réponse pour l'afficher dans le modal.
- Le filtre ?role=xxx permet au frontend de filtrer si besoin.
"""

from rest_framework import generics, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime, timedelta

from .permissions import CanManageUsers
from .models import AccessLog

User = get_user_model()

# Labels lisibles par rôle (utilisés dans la réponse API)
ROLE_LABELS = {
    'admin':          'Administrateur',
    'doctor':         'Medecin Oncologue',
    'anapath':        'Medecin Anapath',
    'epidemiologist': 'Epidemiologiste',
    'readonly':       'Lecture seule',
    # rôles éventuels ajoutés plus tard
    'pharmacist':     'Pharmacien',
    'nurse':          'Infirmier',
    'radiologist':    'Radiologue',
    'surgeon':        'Chirurgien',
}


# ── Sérialiseur admin (tous les champs) ────────────────────────
class AdminUserSerializer(serializers.ModelSerializer):
    full_name    = serializers.CharField(source='get_full_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'username', 'full_name',
            'first_name', 'last_name', 'phone',
            'role', 'role_display', 'speciality',
            'registration_number', 'institution', 'wilaya', 'department',
            'is_active', 'is_verified', 'is_staff',
            'can_view_patients', 'can_edit_patients',
            'can_export_data', 'can_manage_users', 'can_view_statistics',
            'date_joined', 'last_login', 'last_activity',
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'last_login', 'last_activity']


class AdminUserLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AccessLog
        fields = ['id', 'action', 'resource', 'resource_id', 'ip_address', 'timestamp', 'details']


# ── Liste des médecins / participants RCP ──────────────────────
class MedecinsListView(APIView):
    """
    GET /api/v1/auth/medecins/

    Retourne TOUS les utilisateurs actifs pouvant participer à une RCP.
    Seuls les comptes 'readonly' purs sont exclus (pas de valeur médicale
    dans une concertation).

    Paramètres optionnels :
      ?role=doctor         → filtrer par rôle exact
      ?search=nom          → filtrer par nom/email/institution
      ?exclude_ids=1,2,3   → exclure des IDs déjà présents (pour l'anti-doublon frontend)

    Réponse :
      { count: N, medecins: [ { id, full_name, role, role_display,
                                 speciality, institution, wilaya, email } ] }
    """
    permission_classes = []  # Tout utilisateur authentifié peut lister

    def get(self, request):
        # Tous les actifs sauf readonly
        qs = User.objects.filter(is_active=True).exclude(role='readonly')

        # Filtre optionnel par rôle
        role_param = request.query_params.get('role')
        if role_param:
            qs = qs.filter(role=role_param)

        # Recherche texte
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)  |
                Q(email__icontains=search)       |
                Q(institution__icontains=search) |
                Q(speciality__icontains=search)
            )

        # Exclusion d'IDs (déjà présents dans la RCP)
        exclude_raw = request.query_params.get('exclude_ids', '')
        if exclude_raw:
            try:
                exclude_ids = [int(x) for x in exclude_raw.split(',') if x.strip()]
                qs = qs.exclude(id__in=exclude_ids)
            except ValueError:
                pass

        qs = qs.order_by('last_name', 'first_name')

        data = []
        for u in qs:
            full_name = u.get_full_name().strip()
            if not full_name:
                full_name = u.email

            # Label rôle lisible : utilise get_role_display() du modèle en priorité,
            # sinon le dictionnaire local (pour les rôles ajoutés sans migration TextChoices)
            role_display = u.get_role_display() if hasattr(u, 'get_role_display') else ROLE_LABELS.get(u.role, u.role)

            data.append({
                'id':           u.id,
                'full_name':    full_name,
                'first_name':   u.first_name,
                'last_name':    u.last_name,
                'email':        u.email,
                'role':         u.role,
                'role_display': role_display,
                'speciality':   u.speciality or '',
                'institution':  u.institution or '',
                'wilaya':       u.wilaya or '',
            })

        return Response({
            'count':    len(data),
            'medecins': data,
        })


# ── Liste / création ───────────────────────────────────────────
class AdminUserListView(generics.ListAPIView):
    serializer_class   = AdminUserSerializer
    permission_classes = [CanManageUsers]

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        role   = self.request.query_params.get('role')
        active = self.request.query_params.get('active')
        search = self.request.query_params.get('search')
        if role:
            qs = qs.filter(role=role)
        if active is not None:
            qs = qs.filter(is_active=(active.lower() == 'true'))
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)  |
                Q(email__icontains=search)
            )
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response({'count': qs.count(), 'results': serializer.data})


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    queryset           = User.objects.all()
    serializer_class   = AdminUserSerializer
    permission_classes = [CanManageUsers]

    def perform_update(self, serializer):
        user = serializer.save()
        _sync_role_flags(user)


class AdminUserLogsView(APIView):
    permission_classes = [CanManageUsers]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable.'}, status=404)
        logs = AccessLog.objects.filter(user=user).order_by('-timestamp')[:100]
        serializer = AdminUserLogSerializer(logs, many=True)
        return Response({'count': logs.count(), 'results': serializer.data})


class AdminAuditLogsView(generics.ListAPIView):
    permission_classes = [CanManageUsers]
    serializer_class   = AdminUserLogSerializer

    def get_queryset(self):
        qs = AccessLog.objects.all().order_by('-timestamp')
        action    = self.request.query_params.get('action')
        date_from = self.request.query_params.get('date_from')
        date_to   = self.request.query_params.get('date_to')
        if action:    qs = qs.filter(action=action)
        if date_from: qs = qs.filter(timestamp__date__gte=date_from)
        if date_to:   qs = qs.filter(timestamp__date__lte=date_to)
        return qs


class AdminAuditStatsView(APIView):
    permission_classes = [CanManageUsers]

    def get(self, request):
        now   = timezone.now()
        today = timezone.localdate()
        today_start = timezone.make_aware(
            datetime.combine(today, datetime.min.time()),
            timezone.get_current_timezone()
        )
        total          = AccessLog.objects.count()
        aujourd_hui    = AccessLog.objects.filter(timestamp__gte=today_start).count()
        cette_semaine  = AccessLog.objects.filter(timestamp__gte=now - timedelta(days=7)).count()
        ce_mois        = AccessLog.objects.filter(timestamp__year=now.year, timestamp__month=now.month).count()

        activite_7j = []
        for day_offset in range(6, -1, -1):
            day = today - timedelta(days=day_offset)
            count = AccessLog.objects.filter(timestamp__date=day).count()
            activite_7j.append({'date': day.isoformat(), 'count': count})

        par_action = [
            {'action': r['action'], 'n': r['n']}
            for r in AccessLog.objects.values('action').annotate(n=Count('id')).order_by('-n')
        ]
        top_users = [
            {
                'user__first_name': r['user__first_name'],
                'user__last_name':  r['user__last_name'],
                'user__username':   r['user__username'],
                'n': r['n'],
            }
            for r in AccessLog.objects
                .values('user__first_name', 'user__last_name', 'user__username')
                .annotate(n=Count('id')).order_by('-n')[:8]
        ]
        return Response({
            'total': total, 'aujourd_hui': aujourd_hui,
            'cette_semaine': cette_semaine, 'ce_mois': ce_mois,
            'activite_7j': activite_7j, 'par_action': par_action, 'top_users': top_users,
        })


class AdminUserStatsView(APIView):
    permission_classes = [CanManageUsers]

    def get(self, request):
        total      = User.objects.count()
        actifs     = User.objects.filter(is_active=True).count()
        inactifs   = total - actifs
        dernier_7j = timezone.now() - timedelta(days=7)
        connectes_7j = AccessLog.objects.filter(
            action=AccessLog.Action.LOGIN,
            timestamp__gte=dernier_7j
        ).values('user').distinct().count()

        roles = User.objects.values('role').annotate(count=Count('id')).order_by('-count')
        role_stats = [{'role': r['role'], 'n': r['count']} for r in roles]

        return Response({
            'total': total, 'actifs': actifs,
            'inactifs': inactifs, 'connectes_7j': connectes_7j,
            'par_role': role_stats,
        })


def _sync_role_flags(user):
    from .permissions import (
        can_read_patient, can_write_patient,
        can_export, can_manage_users, can_view_statistics,
    )
    user.can_view_patients   = can_read_patient(user)
    user.can_edit_patients   = can_write_patient(user)
    user.can_export_data     = can_export(user)
    user.can_manage_users    = can_manage_users(user)
    user.can_view_statistics = can_view_statistics(user)
    user.save(update_fields=[
        'can_view_patients', 'can_edit_patients',
        'can_export_data', 'can_manage_users', 'can_view_statistics',
    ])
