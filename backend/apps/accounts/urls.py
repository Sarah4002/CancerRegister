from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from .views_admin import AdminUserListView, AdminUserDetailView, AdminUserLogsView

urlpatterns = [
    # Auth
    path('login/',           views.LoginView.as_view(),       name='login'),
    path('register/',        views.RegisterView.as_view(),    name='register'),
    path('logout/',          views.logout_view,                name='logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),       name='token_refresh'),
    path('profile/',         views.ProfileView.as_view(),      name='profile'),
    path('change-password/', views.change_password_view,      name='change_password'),

    # Admin utilisateurs (réservé role=admin)
    path('admin/users/',               AdminUserListView.as_view(),   name='admin-users'),
    path('admin/users/<int:pk>/',      AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/users/<int:pk>/logs/', AdminUserLogsView.as_view(),   name='admin-user-logs'),
]