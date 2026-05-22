from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReunionRCPViewSet, DossierRCPViewSet, DecisionRCPViewSet

router = DefaultRouter()
router.register(r'reunions',  ReunionRCPViewSet,  basename='reunion-rcp')
router.register(r'dossiers',  DossierRCPViewSet,  basename='dossier-rcp')
router.register(r'decisions', DecisionRCPViewSet, basename='decision-rcp')

urlpatterns = [path('', include(router.urls))]
