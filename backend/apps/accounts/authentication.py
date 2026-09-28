from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


class PasswordChangeRequiredJWTAuthentication(JWTAuthentication):
    allowed_paths = {'/api/v1/auth/change-password/', '/api/v1/auth/logout/', '/api/v1/auth/logout-all/'}

    def authenticate(self, request):
        result = super().authenticate(request)
        if result and result[0].must_change_password and request.path not in self.allowed_paths:
            raise PermissionDenied('Vous devez changer votre mot de passe avant de continuer.')
        return result
