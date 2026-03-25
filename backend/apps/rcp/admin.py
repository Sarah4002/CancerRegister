from django.contrib import admin
from .models import ReunionRCP, PresenceRCP, DossierRCP, DecisionRCP


class PresenceInline(admin.TabularInline):
    model = PresenceRCP
    extra = 1
    raw_id_fields = ['medecin']


class DossierInline(admin.TabularInline):
    model = DossierRCP
    extra = 0
    raw_id_fields = ['patient', 'diagnostic', 'medecin_presenteur']
    fields = ['ordre_passage', 'patient', 'type_presentation', 'statut', 'question_posee']


class DecisionInline(admin.TabularInline):
    model = DecisionRCP
    extra = 1
    fields = ['type_decision', 'priorite', 'description', 'protocole', 'realise']


@admin.register(ReunionRCP)
class ReunionAdmin(admin.ModelAdmin):
    list_display  = ['titre', 'type_rcp', 'date_reunion', 'heure_debut', 'statut', 'coordinateur', 'nombre_dossiers']
    list_filter   = ['statut', 'type_rcp', 'date_reunion']
    search_fields = ['titre', 'lieu', 'etablissement']
    raw_id_fields = ['coordinateur']
    inlines       = [PresenceInline, DossierInline]
    readonly_fields = ['date_creation', 'date_modification']


@admin.register(DossierRCP)
class DossierAdmin(admin.ModelAdmin):
    list_display  = ['patient', 'reunion', 'ordre_passage', 'type_presentation', 'statut']
    list_filter   = ['statut', 'type_presentation']
    search_fields = ['patient__nom', 'patient__registration_number']
    raw_id_fields = ['patient', 'diagnostic', 'reunion', 'medecin_presenteur']
    inlines       = [DecisionInline]


@admin.register(DecisionRCP)
class DecisionAdmin(admin.ModelAdmin):
    list_display  = ['dossier', 'type_decision', 'priorite', 'realise', 'date_realisation']
    list_filter   = ['type_decision', 'priorite', 'realise']
    raw_id_fields = ['dossier', 'medecin_referent']
