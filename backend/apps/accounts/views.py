from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone

from .serializers import (
    CustomTokenObtainPairSerializer,
    UserRegistrationSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
)
from .models import AccessLog
from .permissions import CanManageUsers

User = get_user_model()


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ - Authenticate and get JWT tokens."""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Log the login
            try:
                user = User.objects.get(email=request.data.get('email'))
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
                AccessLog.objects.create(
                    user=user,
                    action=AccessLog.Action.LOGIN,
                    ip_address=self._get_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                )
            except User.DoesNotExist:
                pass
        return response

    def _get_ip(self, request):
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        return x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ - Register a new user (admin only).

    L'accès public est désactivé : les comptes sont créés depuis la console admin.
    """
    serializer_class   = UserRegistrationSerializer
    permission_classes = [IsAuthenticated, CanManageUsers]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Compte créé avec succès. Le compte est activé et peut se connecter immédiatement.",
                "email": user.email,
                "status": "active",
            },
            status=status.HTTP_201_CREATED,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """POST /api/v1/auth/logout/ - Blacklist the refresh token."""
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        AccessLog.objects.create(
            user=request.user,
            action=AccessLog.Action.LOGOUT,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response({"message": "Déconnexion réussie."}, status=status.HTTP_200_OK)
    except Exception:
        return Response({"error": "Token invalide."}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/profile/ - Get or update current user profile."""
    serializer_class   = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """POST /api/v1/auth/change-password/ - Change user password."""
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = request.user
    if not user.check_password(serializer.validated_data['old_password']):
        return Response({"error": "Ancien mot de passe incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(serializer.validated_data['new_password'])
    user.save()
    return Response({"message": "Mot de passe modifié avec succès."})
