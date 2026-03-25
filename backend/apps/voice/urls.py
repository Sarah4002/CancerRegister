from django.urls import path
from .views import extract_voice_fields

urlpatterns = [
    path('extract/', extract_voice_fields),
]