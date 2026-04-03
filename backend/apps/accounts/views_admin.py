"""
apps/accounts/views_admin.py

Endpoints de gestion des utilisateurs — réservés aux administrateurs.
À ajouter dans apps/accounts/urls.py :

    path('admin/users/',           AdminUserListView.as_view(),   name='admin-users'),
    path('admin/users/<int:pk>/',  AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/users/<int:pk>/logs/', AdminUserLogsView.as_view(), name='admin-user-logs'),
"""

from rest_framework import generics, serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.db.models import Count
from django.utils import timezone
from datetime import datetime, timedelta

from .permissions import CanManageUsers
from .models import AccessLog

User = get_user_model()


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


# ── Liste des médecins (pour formulaires) ──────────────────────
class MedecinsListView(APIView):
    """
    Liste des médecins actifs (rôles DOCTOR et ANAPATH) pour les formulaires.
    Exclut les admins et épidémiologistes.
    """
    permission_classes = []  # Accessible à tous les utilisateurs authentifiés

    def get(self, request):
        medecins = User.objects.filter(
            is_active=True,
            role__in=['doctor', 'anapath']
        ).exclude(
            role__in=['admin', 'epidemiologist']
        ).values(
            'id', 'first_name', 'last_name', 'email', 'role', 'speciality', 'institution'
        ).order_by('last_name', 'first_name')

        data = []
        for m in medecins:
            full_name = f"{m['first_name']} {m['last_name']}".strip()
            if not full_name:
                full_name = m['email']
            data.append({
                'id': m['id'],
                'full_name': full_name,
                'role': m['role'],
                'speciality': m['speciality'],
                'institution': m['institution'] or '',
            })

        return Response({
            'count': len(data),
            'medecins': data
        })


# ── Liste / création ───────────────────────────────────────────
class AdminUserListView(generics.ListAPIView):
    """
    GET  /api/v1/auth/admin/users/  — liste tous les utilisateurs
    """
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
                __import__('django.db.models', fromlist=['Q']).Q(first_name__icontains=search) |
                __import__('django.db.models', fromlist=['Q']).Q(last_name__icontains=search) |
                __import__('django.db.models', fromlist=['Q']).Q(email__icontains=search)
            )
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response({
            'count':   qs.count(),
            'results': serializer.data,
        })


# ── Détail / modification ──────────────────────────────────────
class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/auth/admin/users/<id>/  — détail utilisateur
    PATCH /api/v1/auth/admin/users/<id>/  — modifier rôle, statut, etc.
    """
    queryset           = User.objects.all()
    serializer_class   = AdminUserSerializer
    permission_classes = [CanManageUsers]

    def perform_update(self, serializer):
        user = serializer.save()
        # Synchroniser les flags is_* selon le nouveau rôle
        _sync_role_flags(user)


# ── Logs d'accès d'un utilisateur ─────────────────────────────
class AdminUserLogsView(APIView):
    """
    GET /api/v1/auth/admin/users/<id>/logs/
    """
    permission_classes = [CanManageUsers]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Utilisateur introuvable.'}, status=404)

        logs = AccessLog.objects.filter(user=user).order_by('-timestamp')[:100]
        serializer = AdminUserLogSerializer(logs, many=True)
        return Response({
            'count':   logs.count(),
            'results': serializer.data,
        })


class AdminAuditLogsView(generics.ListAPIView):
    """GET /api/v1/auth/admin/audit-logs/"""
    permission_classes = [CanManageUsers]
    serializer_class = AdminUserLogSerializer

    def get_queryset(self):
        qs = AccessLog.objects.all().order_by('-timestamp')
        action = self.request.query_params.get('action')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if action:
            qs = qs.filter(action=action)
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)
        return qs


class AdminAuditStatsView(APIView):
    """GET /api/v1/auth/admin/audit-logs/stats/"""
    permission_classes = [CanManageUsers]

    def get(self, request):
        now = timezone.now()
        today = timezone.localdate()
        today_start_naive = datetime.combine(today, datetime.min.time())
        today_start = timezone.make_aware(today_start_naive, timezone.get_current_timezone())

        total = AccessLog.objects.count()
        aujourd_hui = AccessLog.objects.filter(timestamp__gte=today_start).count()
        cette_semaine = AccessLog.objects.filter(timestamp__gte=now - timedelta(days=7)).count()
        ce_mois = AccessLog.objects.filter(timestamp__year=now.year, timestamp__month=now.month).count()

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
                'user__last_name': r['user__last_name'],
                'user__username': r['user__username'],
                'n': r['n'],
            }
            for r in AccessLog.objects.values('user__first_name', 'user__last_name', 'user__username')
                .annotate(n=Count('id')).order_by('-n')[:8]
        ]

        return Response({
            'total': total,
            'aujourd_hui': aujourd_hui,
            'cette_semaine': cette_semaine,
            'ce_mois': ce_mois,
            'activite_7j': activite_7j,
            'par_action': par_action,
            'top_users': top_users,
        })


class AdminUserStatsView(APIView):
    """GET /api/v1/auth/admin/users/stats/"""
    permission_classes = [CanManageUsers]

    def get(self, request):
        total = User.objects.count()
        actifs = User.objects.filter(is_active=True).count()
        inactifs = total - actifs
        dernier_7j = timezone.now() - timedelta(days=7)
        connectes_7j = AccessLog.objects.filter(
            action=AccessLog.Action.LOGIN,
            timestamp__gte=dernier_7j
        ).values('user').distinct().count()

        roles = User.objects.values('role').annotate(count=Count('id')).order_by('-count')
        role_stats = [
            {'role': r['role'], 'n': r['count']}
            for r in roles
        ]

        return Response({
            'total': total,
            'actifs': actifs,
            'inactifs': inactifs,
            'connectes_7j': connectes_7j,
            'par_role': role_stats,
        })


# ── Synchronisation des flags selon le rôle ───────────────────
def _sync_role_flags(user):
    """
    Après un changement de rôle, met à jour les flags booléens
    pour rester cohérents avec la matrice des permissions.
    """
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