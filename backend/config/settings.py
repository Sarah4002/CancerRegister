"""
Django settings for Cancer Registry project.
Registre National du Cancer - Algérie
"""

from pathlib import Path
from datetime import timedelta
from decouple import config
import os
import dj_database_url

DATABASE_URL = config('DATABASE_URL', default=None)

if DATABASE_URL:
    DATABASES = {'default': dj_database_url.parse(DATABASE_URL)}
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='cancer_registry'),
            'USER': config('DB_USER', default='registry_user'),
            'PASSWORD': config('DB_PASSWORD', default='registry_pass_2024'),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }

# ─────────────────────────────────────────────
# Base
# ─────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
GROQ_API_KEY = config('GROQ_API_KEY', default=None)

# ─────────────────────────────────────────────
# Security
# ─────────────────────────────────────────────
SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production-2024')
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1,.github.dev,.app.github.dev,rnc-registre-nationale-de-cancer-1.onrender.com'
).split(',')

# ─────────────────────────────────────────────
# Applications
# ─────────────────────────────────────────────
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'django_filters',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.patients',
    'apps.diagnostics',
    'apps.treatments',
    'apps.registry',
    'apps.suivi',
    'apps.stats',
    'apps.rcp',
    'apps.voice',
    'apps.custom_fields',
    'apps.sig',
    'apps.exports',
    'apps.examens',
    'apps.notifications',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

# ─────────────────────────────────────────────
# Templates
# ─────────────────────────────────────────────
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ─────────────────────────────────────────────
# Custom User
# ─────────────────────────────────────────────
AUTH_USER_MODEL = 'accounts.User'

# ─────────────────────────────────────────────
# Password validation
# ─────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─────────────────────────────────────────────
# Internationalization
# ─────────────────────────────────────────────
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Algiers'
USE_I18N = True
USE_TZ = True

# ─────────────────────────────────────────────
# Static & Media
# ─────────────────────────────────────────────
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─────────────────────────────────────────────
# Django REST Framework
# ─────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# ─────────────────────────────────────────────
# JWT
# ─────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'TOKEN_OBTAIN_SERIALIZER': 'apps.accounts.serializers.CustomTokenObtainPairSerializer',
}

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
# Origines autorisées — inclut l'app mobile Vercel (formulaire QR code patient)
# et le frontend React local/production.
# Pour ajouter une nouvelle origine sans modifier ce fichier :
#   CORS_ALLOWED_ORIGINS=https://mon-app.vercel.app,http://localhost:5173  dans .env
_CORS_DEFAULTS = ','.join([
    'http://localhost:3000',
    'http://localhost:5173',
    'https://patientlifestyleform.vercel.app',
    'https://devona-copasetic-chieko.ngrok-free.dev',
    'https://registredecancer.vercel.app',
    'https://registrecancer.vercel.app',
])

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default=_CORS_DEFAULTS,
).split(',')

# Autorise également tous les sous-domaines *.vercel.app en preview deployments
# (Vercel génère une URL unique par branche, ex: patientlifestyleform-git-main-xxx.vercel.app)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://patientlifestyleform[a-zA-Z0-9\-]*\.vercel\.app$',
]

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'ngrok-skip-browser-warning',
]

# ─────────────────────────────────────────────
# Mobile App URL (QR Code generation)
# ─────────────────────────────────────────────
# URL de base utilisée pour construire les liens QR code dans PatientDetailPage.
# Format final : MOBILE_APP_BASE_URL + "/{patient_id}?ref={registration_number}"
# → https://patientlifestyleform.vercel.app/patient/79?ref=P-2026-0049
MOBILE_APP_BASE_URL = config(
    'MOBILE_APP_BASE_URL',
    default='https://patientlifestyleform.vercel.app/patient',
)

# ─────────────────────────────────────────────
# API Documentation
# ─────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'Cancer Registry API - Registre National du Cancer',
    'DESCRIPTION': "API pour le Registre National du Cancer d'Algérie",
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}