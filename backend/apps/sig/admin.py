from django.contrib import admin

from .models import PopulationCommune


@admin.register(PopulationCommune)
class PopulationCommuneAdmin(admin.ModelAdmin):
    list_display = ['wilaya', 'commune', 'annee', 'population']
    list_filter = ['wilaya', 'annee']
    search_fields = ['wilaya', 'commune']
    ordering = ['wilaya', 'commune', 'annee']