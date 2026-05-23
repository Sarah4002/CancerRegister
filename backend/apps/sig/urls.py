from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_sig_stats, name='sig-home'), # Ajouté pour gérer le chemin vide /api/v1/sig/
    path('map-data/', views.get_map_data, name='map-data'),
    path('analyze/', views.analyze_sig_scope, name='analyze-sig-scope'),
    path('all-wilayas/', views.get_all_wilayas_data, name='all-wilayas'),
    path('statistics/', views.get_statistics, name='statistics'),
    path('patients/', views.create_patient, name='create-patient'),
    path('health/', views.health_check, name='health-check'),
    path('tlemcen-data/', views.get_tlemcen_data, name='tlemcen-data'),
    path('cancer-statistics/', views.get_cancer_statistics, name='cancer-statistics'),
    path('stats/', views.get_sig_stats, name='sig-stats'),
    path('wilaya/<str:nom>/', views.get_wilaya_details, name='wilaya-details'),
    path('cards/', views.mapcards, name='map-cards'),
    path('cards/<int:pk>/', views.mapcard_detail, name='mapcard-detail'),
]