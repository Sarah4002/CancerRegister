from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth import get_user_model
from django.db.models import Max
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_all_view(request):
    """POST /api/v1/auth/logout-all/ - Blacklist all refresh tokens for current user."""
    count = 0
    for token in OutstandingToken.objects.filter(user=request.user):
        _, created = BlacklistedToken.objects.get_or_create(token=token)
        if created:
            count += 1

    AccessLog.objects.create(
        user=request.user,
        action=AccessLog.Action.LOGOUT,
        ip_address=_get_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        details={'scope': 'all_devices', 'blacklisted_tokens': count},
    )
    return Response({"message": "Tous les appareils ont ete deconnectes.", "count": count})


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
    AccessLog.objects.create(
        user=user,
        action=AccessLog.Action.UPDATE,
        resource='password',
        ip_address=_get_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )
    return Response({"message": "Mot de passe modifié avec succès."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_activity_view(request):
    """GET /api/v1/auth/me/activity/ - Recent actions for current user."""
    logs = AccessLog.objects.filter(user=request.user).order_by('-timestamp')[:50]
    return Response({
        'count': len(logs),
        'results': [
            {
                'id': log.id,
                'action': log.action,
                'resource': log.resource,
                'resource_id': log.resource_id,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent,
                'timestamp': log.timestamp,
                'details': log.details,
            }
            for log in logs
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_devices_view(request):
    """GET /api/v1/auth/me/devices/ - Devices inferred from recent login logs."""
    current_ip = _get_ip(request)
    current_agent = request.META.get('HTTP_USER_AGENT', '')
    recent_logins = (
        AccessLog.objects
        .filter(user=request.user, action=AccessLog.Action.LOGIN)
        .values('ip_address', 'user_agent')
        .annotate(last_seen=Max('timestamp'))
        .order_by('-last_seen')[:12]
    )

    devices = []
    seen_current = False
    for index, login in enumerate(recent_logins, start=1):
        is_current = login['ip_address'] == current_ip and login['user_agent'] == current_agent
        seen_current = seen_current or is_current
        devices.append({
            'id': index,
            'name': _device_name(login['user_agent']),
            'ip_address': login['ip_address'],
            'user_agent': login['user_agent'],
            'last_seen': login['last_seen'],
            'current': is_current,
        })

    if not seen_current:
        devices.insert(0, {
            'id': 0,
            'name': _device_name(current_agent),
            'ip_address': current_ip,
            'user_agent': current_agent,
            'last_seen': timezone.now(),
            'current': True,
        })

    return Response({'count': len(devices), 'results': devices})


def _get_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0] if x_forwarded else request.META.get('REMOTE_ADDR')


def _device_name(user_agent):
    agent = user_agent or ''
    browser = 'Navigateur'
    if 'Edg/' in agent:
        browser = 'Edge'
    elif 'Chrome/' in agent:
        browser = 'Chrome'
    elif 'Firefox/' in agent:
        browser = 'Firefox'
    elif 'Safari/' in agent:
        browser = 'Safari'

    os_name = 'Appareil'
    if 'Windows' in agent:
        os_name = 'Windows'
    elif 'Mac OS' in agent:
        os_name = 'macOS'
    elif 'Android' in agent:
        os_name = 'Android'
    elif 'iPhone' in agent or 'iPad' in agent:
        os_name = 'iOS'

    return f'{browser} - {os_name}'