from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DiagnosticViewSet, TopographieViewSet, MorphologieViewSet, DiagnosticValidationRuleViewSet

router = DefaultRouter()
router.register(r'topographies',      TopographieViewSet,             basename='topographie')
router.register(r'morphologies',      MorphologieViewSet,             basename='morphologie')
router.register(r'validation-rules',  DiagnosticValidationRuleViewSet, basename='validation-rule')
router.register(r'',                  DiagnosticViewSet,               basename='diagnostic')

urlpatterns = [
    path('', include(router.urls)),
]