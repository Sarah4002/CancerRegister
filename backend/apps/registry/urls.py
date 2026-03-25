from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/',          views.dashboard_global,    name='dashboard'),
    path('alertes/',            views.alertes,             name='alertes'),
    path('stats/incidence/',    views.stats_incidence,     name='stats-incidence'),
    path('stats/cancers/',      views.stats_cancers,       name='stats-cancers'),
    path('stats/patients/',     views.stats_patients,      name='stats-patients'),
    path('stats/traitements/',  views.stats_traitements,   name='stats-traitements'),
]
