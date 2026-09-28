from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views_admin import (
    AdminUserListView,
    AdminUserDetailView,
    AdminUserLogsView,
    AdminUserStatsView,
    AdminAuditLogsView,
    AdminAuditStatsView,
    MedecinsListView,
    AdminBackupListCreateView,
    AdminBackupDetailView,
    AdminBackupUploadView,
)

urlpatterns = [
    # Auth
    path('login/',           views.LoginView.as_view(),       name='login'),
    path('register/',        views.RegisterView.as_view(),    name='register'),
    path('logout/',          views.logout_view,                name='logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),       name='token_refresh'),
    path('profile/',         views.ProfileView.as_view(),      name='profile'),
    path('change-password/', views.change_password_view,      name='change_password'),
    path('me/activity/',     views.my_activity_view,          name='my_activity'),
    path('me/devices/',      views.my_devices_view,           name='my_devices'),
    path('logout-all/',      views.logout_all_view,           name='logout_all'),

    # Admin utilisateurs (réservé role=admin)
    path('admin/users/',               AdminUserListView.as_view(),   name='admin-users'),
    path('admin/users/stats/',         AdminUserStatsView.as_view(),  name='admin-users-stats'),
    path('admin/users/<int:pk>/',      AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/users/<int:pk>/logs/', AdminUserLogsView.as_view(),   name='admin-user-logs'),
    path('admin/users/<int:pk>/reset_password/', views.admin_reset_password_view, name='admin-reset-password'),
    path('admin/backups/', AdminBackupListCreateView.as_view(), name='admin-backups'),
    path('admin/backups/upload/', AdminBackupUploadView.as_view(), name='admin-backup-upload'),
    path('admin/backups/<str:filename>/download/', AdminBackupDetailView.as_view(), name='admin-backup-download'),
    path('admin/backups/<str:filename>/restore/', AdminBackupDetailView.as_view(), name='admin-backup-restore'),
    path('admin/backups/<str:filename>/', AdminBackupDetailView.as_view(), name='admin-backup-detail'),
    # Audit logs (réservé role=admin)
    path('admin/audit-logs/',          AdminAuditLogsView.as_view(),  name='admin-audit-logs'),
    path('admin/audit-logs/stats/',    AdminAuditStatsView.as_view(), name='admin-audit-logs-stats'),

    # Liste des médecins (pour formulaires)
    path('medecins/',                  MedecinsListView.as_view(),    name='medecins-list'),
    path('medecins/<int:pk>/disponibilites/', views.doctor_availability_view, name='doctor-availability'),
]
