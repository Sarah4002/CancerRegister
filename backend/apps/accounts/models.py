from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for the Cancer Registry.
    Roles match CanReg5 user levels.
    """
    class Role(models.TextChoices):
        ADMIN        = 'admin',       'Administrateur'
        DOCTOR       = 'doctor',      'Médecin Oncologue'
        ANAPATH      = 'anapath',   'Médecin Anapath'
        EPIDEMIOLOGIST = 'epidemiologist', 'Épidémiologiste'
        READONLY     = 'readonly',    'Lecture seule'

    class Speciality(models.TextChoices):
        ONCOLOGY          = 'oncology',          'Oncologie'
        HEMATOLOGY        = 'hematology',        'Hématologie'
        RADIOTHERAPY      = 'radiotherapy',      'Radiothérapie'
        SURGERY           = 'surgery',           'Chirurgie Oncologique'
        PATHOLOGY         = 'pathology',         'Anatomopathologie'
        EPIDEMIOLOGY      = 'epidemiology',      'Épidémiologie'
        GENERAL_MEDICINE  = 'general_medicine',  'Médecine Générale'
        OTHER             = 'other',             'Autre'

    # Authentication fields
    email           = models.EmailField(unique=True)
    username        = models.CharField(max_length=50, unique=True)

    # Personal info
    first_name      = models.CharField(max_length=100)
    last_name       = models.CharField(max_length=100)
    phone           = models.CharField(max_length=20, blank=True)
    avatar          = models.ImageField(upload_to='avatars/', blank=True, null=True)

    # Professional info (CanReg5 style)
    role            = models.CharField(max_length=20, choices=Role.choices, default=Role.READONLY)
    speciality      = models.CharField(max_length=30, choices=Speciality.choices, blank=True)
    registration_number = models.CharField(max_length=50, blank=True, help_text="Numéro CNOM / identifiant professionnel")
    institution     = models.CharField(max_length=200, blank=True, help_text="Hôpital / Clinique / Centre")
    wilaya          = models.CharField(max_length=100, blank=True)
    department      = models.CharField(max_length=200, blank=True)

    # CanReg5 data access levels
    can_view_patients    = models.BooleanField(default=False)
    can_edit_patients    = models.BooleanField(default=False)
    can_export_data      = models.BooleanField(default=False)
    can_manage_users     = models.BooleanField(default=False)
    can_view_statistics  = models.BooleanField(default=True)

    # Status
    is_active       = models.BooleanField(default=False)  # requires admin activation
    is_staff        = models.BooleanField(default=False)
    is_verified     = models.BooleanField(default=False)

    # Timestamps
    date_joined     = models.DateTimeField(default=timezone.now)
    last_login      = models.DateTimeField(null=True, blank=True)
    last_activity   = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'users'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_display_name(self):
        prefix = "Dr." if self.role == self.Role.DOCTOR else ""
        return f"{prefix} {self.get_full_name()}".strip()


class AccessLog(models.Model):
    """Audit log for all user actions - mirrors CanReg5 access logs."""
    class Action(models.TextChoices):
        LOGIN       = 'login',       'Connexion'
        LOGOUT      = 'logout',      'Déconnexion'
        VIEW        = 'view',        'Consultation'
        CREATE      = 'create',      'Création'
        UPDATE      = 'update',      'Modification'
        DELETE      = 'delete',      'Suppression'
        EXPORT      = 'export',      'Export'
        IMPORT      = 'import',      'Import'
        REPORT      = 'report',      'Rapport'

    user        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='access_logs')
    action      = models.CharField(max_length=20, choices=Action.choices)
    resource    = models.CharField(max_length=100, blank=True)
    resource_id = models.CharField(max_length=50, blank=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    user_agent  = models.TextField(blank=True)
    timestamp   = models.DateTimeField(auto_now_add=True)
    details     = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'access_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"
