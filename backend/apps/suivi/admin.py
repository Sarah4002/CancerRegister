from django.contrib import admin
from .models import ConsultationSuivi, QualiteVie, EvenementClinique


@admin.register(ConsultationSuivi)
class ConsultationAdmin(admin.ModelAdmin):
    list_display  = ['patient', 'date_consultation', 'type_consultation', 'statut', 'ps_ecog', 'evolution_maladie', 'medecin']
    list_filter   = ['statut', 'type_consultation', 'evolution_maladie']
    search_fields = ['patient__nom', 'patient__registration_number', 'motif']
    raw_id_fields = ['patient', 'diagnostic', 'medecin']
    readonly_fields = ['imc', 'date_creation', 'date_modification']


@admin.register(QualiteVie)
class QualiteVieAdmin(admin.ModelAdmin):
    list_display  = ['patient', 'date_evaluation', 'score_global_sante', 'score_fatigue', 'score_douleur']
    list_filter   = ['date_evaluation']
    search_fields = ['patient__nom', 'patient__registration_number']
    raw_id_fields = ['patient', 'consultation']


@admin.register(EvenementClinique)
class EvenementAdmin(admin.ModelAdmin):
    list_display  = ['patient', 'date_evenement', 'type_evenement', 'severite', 'resolu']
    list_filter   = ['type_evenement', 'severite', 'resolu']
    search_fields = ['patient__nom', 'description']
    raw_id_fields = ['patient']