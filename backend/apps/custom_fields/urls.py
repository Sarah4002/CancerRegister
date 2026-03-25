"""
apps/custom_fields/urls.py
"""
from rest_framework.routers import DefaultRouter
from .views import ChampPersonnaliseViewSet, ValeurChampViewSet

router = DefaultRouter()
router.register(r'champs',  ChampPersonnaliseViewSet, basename='custom-fields')
router.register(r'valeurs', ValeurChampViewSet,        basename='custom-values')

urlpatterns = router.urls