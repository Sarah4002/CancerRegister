from django.contrib import admin
from .models import CancerType, Wilaya, IncidenceRecord, SurvivalRate, AIReport, SearchLog


@admin.register(CancerType)
class CancerTypeAdmin(admin.ModelAdmin):
    list_display = ('code', 'label', 'categorie', 'created_at')
    search_fields = ('code', 'label')
    list_filter = ('categorie',)


@admin.register(Wilaya)
class WilayaAdmin(admin.ModelAdmin):
    list_display = ('code', 'nom', 'latitude', 'longitude')
    search_fields = ('code', 'nom')


@admin.register(IncidenceRecord)
class IncidenceRecordAdmin(admin.ModelAdmin):
    list_display = ('cancer_type', 'wilaya', 'annee', 'mois', 'sexe', 'tranche_age', 'stade', 'nb_cas', 'nb_deces')
    list_filter = ('annee', 'sexe', 'stade', 'cancer_type')
    search_fields = ('cancer_type__label', 'wilaya__nom')
    raw_id_fields = ('cancer_type', 'wilaya')


@admin.register(SurvivalRate)
class SurvivalRateAdmin(admin.ModelAdmin):
    list_display = ('cancer_type', 'stade', 'annee_ref', 'survie_1an', 'survie_3ans', 'survie_5ans', 'updated_at')
    list_filter = ('annee_ref', 'stade', 'cancer_type')
    search_fields = ('cancer_type__label',)


@admin.register(AIReport)
class AIReportAdmin(admin.ModelAdmin):
    list_display = ('titre', 'status', 'created_by', 'created_at', 'completed_at')
    list_filter = ('status',)
    search_fields = ('titre', 'created_by')
    readonly_fields = ('created_at', 'completed_at')


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ('query', 'results_count', 'user', 'created_at')
    search_fields = ('query', 'user')
    readonly_fields = ('created_at',)