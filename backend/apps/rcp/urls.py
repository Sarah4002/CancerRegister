from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReunionRCPViewSet, DossierRCPViewSet, DecisionRCPViewSet, MessageRCPViewSet

router = DefaultRouter()
router.register(r'reunions',  ReunionRCPViewSet,  basename='reunion-rcp')
router.register(r'dossiers',  DossierRCPViewSet,  basename='dossier-rcp')
router.register(r'decisions', DecisionRCPViewSet, basename='decision-rcp')
router.register(r'messages',  MessageRCPViewSet,  basename='message-rcp')

urlpatterns = [path('', include(router.urls))]
