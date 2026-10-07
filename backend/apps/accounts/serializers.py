from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .factories import UserFactory

from apps.accounts.permissions import (
    can_read_patient,    can_write_patient,
    can_read_diagnostic, can_write_diagnostic,
    can_read_treatment,  can_write_treatment,
    can_view_statistics, can_export, can_export_identified_data,
    can_view_map,        can_manage_users,
    can_view_rcp,        can_write_anapath_report, can_validate_diagnosis,
    can_manage_appointments, can_access_clinical_followup, can_manage_canreg,
    can_manage_medical_configuration,
    can_manage_pharmacy,
    can_manage_exam_results,
)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Extended JWT token with user info."""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email']      = user.email
        token['full_name']  = user.get_display_name()
        token['role']       = user.role
        token['username']   = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'id':           user.id,
            'email':        user.email,
            'username':     user.username,
            'full_name':    user.get_display_name(),
            'role':         user.role,
            'must_change_password': user.must_change_password,
            'role_display': user.get_role_display(),
            'institution':  user.institution,
            'wilaya':       user.wilaya,
            'speciality':   user.speciality,
            'avatar':       user.avatar.url if user.avatar else None,
            # Permissions granulaires calculées dynamiquement selon le rôle
            # (pas les flags statiques du modèle)
            'permissions': {
                'can_read_patient':     can_read_patient(user),
                'can_write_patient':    can_write_patient(user),
                'can_read_diagnostic':  can_read_diagnostic(user),
                'can_write_diagnostic': can_write_diagnostic(user),
                'can_read_treatment':   can_read_treatment(user),
                'can_write_treatment':  can_write_treatment(user),
                'can_view_statistics':  can_view_statistics(user),
                'can_export':           can_export(user),
                'can_export_identified_data': can_export_identified_data(user),
                'can_view_map':         can_view_map(user),
                'can_manage_users':     can_manage_users(user),
                'can_view_rcp':         can_view_rcp(user),
                'can_write_anapath_report': can_write_anapath_report(user),
                'can_validate_diagnosis': can_validate_diagnosis(user),
                'can_manage_appointments': can_manage_appointments(user),
                'can_access_clinical_followup': can_access_clinical_followup(user),
                'can_manage_canreg': can_manage_canreg(user),
                'can_manage_medical_configuration': can_manage_medical_configuration(user),
                'can_manage_pharmacy': can_manage_pharmacy(user),
                'can_manage_exam_results': can_manage_exam_results(user),
            }
        }
        return data


class UserSummarySerializer(serializers.ModelSerializer):
    """Minimal user info for nested representations."""
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'display_name', 'role', 'role_display', 'institution']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for new user registration."""
    password         = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, label="Confirmation mot de passe")

    class Meta:
        model  = User
        fields = [
            'email', 'username', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone',
            'role', 'speciality', 'registration_number',
            'institution', 'wilaya', 'department',
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name':  {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        user = UserFactory.create_user(**validated_data)
        user.is_active = True  # compte activé immédiatement par défaut
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    full_name    = serializers.CharField(source='get_full_name', read_only=True)
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'username', 'full_name', 'display_name',
            'first_name', 'last_name', 'phone', 'avatar',
            'role', 'role_display', 'speciality', 'registration_number',
            'institution', 'wilaya', 'department',
            'consultation_schedule', 'consultation_leave_days',
            'can_view_patients', 'can_edit_patients',
            'can_export_data', 'can_manage_users', 'can_view_statistics',
            'is_active', 'is_verified', 'date_joined', 'last_login',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'is_active', 'is_verified',
            'date_joined', 'last_login',
            'can_view_patients', 'can_edit_patients',
            'can_export_data', 'can_manage_users',
        ]

    def validate(self, attrs):
        if ('consultation_schedule' in attrs or 'consultation_leave_days' in attrs) and self.context['request'].user.role not in ['doctor', 'doctor_chef']:
            raise serializers.ValidationError('Seuls les médecins peuvent modifier leurs disponibilités.')
        schedule = attrs.get('consultation_schedule')
        if schedule is not None:
            from datetime import datetime
            if not isinstance(schedule, dict) or any(key not in [str(i) for i in range(1, 8)] or not isinstance(value, dict) for key, value in schedule.items()):
                raise serializers.ValidationError({'consultation_schedule': 'Planning hebdomadaire invalide.'})
            for value in schedule.values():
                if value.get('active'):
                    try:
                        start = datetime.strptime(value.get('start', ''), '%H:%M')
                        end = datetime.strptime(value.get('end', ''), '%H:%M')
                    except ValueError:
                        raise serializers.ValidationError({'consultation_schedule': 'Les heures doivent être au format HH:MM.'})
                    if start >= end:
                        raise serializers.ValidationError({'consultation_schedule': 'L’heure de fin doit être après l’heure de début.'})
        leave_days = attrs.get('consultation_leave_days')
        if leave_days is not None:
            from datetime import date
            try:
                if not isinstance(leave_days, list):
                    raise ValueError
                for leave_day in leave_days:
                    date.fromisoformat(leave_day)
            except (ValueError, TypeError):
                raise serializers.ValidationError({'consultation_leave_days': 'Les congés doivent être une liste de dates AAAA-MM-JJ.'})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password     = serializers.CharField(required=True)
    new_password     = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"new_password": "Les mots de passe ne correspondent pas."})
        return attrs
