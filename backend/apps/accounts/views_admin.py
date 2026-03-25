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