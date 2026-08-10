from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, DocumentAdministratifViewSet

router = DefaultRouter()
router.register(r'', PatientViewSet, basename='patient')
router.register(r'documents-administratifs', DocumentAdministratifViewSet, basename='document-administratif')

urlpatterns = [
    path('', include(router.urls)),
    path('public/<str:pk>/', PatientViewSet.as_view({'get': 'public'}), name='patient-public'),
    path('public/<str:pk>/habitudes/', PatientViewSet.as_view({'patch': 'habitudes'}), name='patient-habitudes'),
]
