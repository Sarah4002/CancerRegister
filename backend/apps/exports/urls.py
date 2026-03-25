from django.urls import path
from . import views

urlpatterns = [
    path('canreg/preview/', views.canreg_preview, name='canreg-preview'),
    path('canreg/import/',  views.canreg_import,  name='canreg-import'),
    path('canreg/export/',  views.canreg_export,  name='canreg-export'),
]