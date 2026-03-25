from django.urls import path
from . import views

urlpatterns = [
    path('map-data/', views.get_map_data, name='map-data'),
    path('all-wilayas/', views.get_all_wilayas_data, name='all-wilayas'),
    path('statistics/', views.get_statistics, name='statistics'),
    path('patients/', views.create_patient, name='create-patient'),
    path('health/', views.health_check, name='health-check'),
    path('tlemcen-data/', views.get_tlemcen_data, name='tlemcen-data'),
    path('cancer-statistics/', views.get_cancer_statistics, name='cancer-statistics'),
    path('stats/', views.get_sig_stats, name='sig-stats'),
    path('wilaya/<str:nom>/', views.get_wilaya_details, name='wilaya-details'),
]