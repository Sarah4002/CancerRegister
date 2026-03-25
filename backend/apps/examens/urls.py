from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExamenMedicalViewSet

router = DefaultRouter()
router.register(r'', ExamenMedicalViewSet, basename='examen')

urlpatterns = [
    path('', include(router.urls)),
]
