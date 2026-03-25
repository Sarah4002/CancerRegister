from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DiagnosticViewSet, TopographieViewSet, MorphologieViewSet

router = DefaultRouter()
router.register(r'topographies',  TopographieViewSet,  basename='topographie')
router.register(r'morphologies',  MorphologieViewSet,  basename='morphologie')
router.register(r'',              DiagnosticViewSet,   basename='diagnostic')

urlpatterns = [
    path('', include(router.urls)),
]