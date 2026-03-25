from django.contrib import admin
from .models import Diagnostic, TopographieICD, MorphologieICD, StyleVie


@admin.register(TopographieICD)
class TopographieAdmin(admin.ModelAdmin):
    list_display  = ['code', 'libelle', 'categorie', 'est_actif']
    list_filter   = ['categorie', 'est_actif']
    search_fields = ['code', 'libelle']


@admin.register(MorphologieICD)
class MorphologieAdmin(admin.ModelAdmin):
    list_display  = ['code', 'libelle', 'comportement', 'groupe', 'est_actif']
    list_filter   = ['comportement', 'groupe', 'est_actif']
    search_fields = ['code', 'libelle']


class StyleVieInline(admin.StackedInline):
    model       = StyleVie
    extra       = 0
    can_delete  = False
    readonly_fields = ['imc', 'score_risque_global']
    fieldsets = (
        ('Tabagisme', {'fields': ('statut_tabagique','paquets_annees','nombre_cigarettes_jour','age_debut_tabac','age_arret_tabac','type_tabac')}),
        ('Alcool',    {'fields': ('consommation_alcool','unites_par_semaine','type_alcool','duree_consommation_annees')}),
        ('Activité physique', {'fields': ('niveau_activite','heures_par_semaine','type_activite','frequence_activite')}),
        ('Alimentation & IMC', {'fields': ('poids','taille','imc','fruits_legumes_quotidien','alimentation_desc','regime_particulier')}),
        ('Expositions', {'fields': ('profession','exposition_professionnelle','duree_exposition_annees')}),
        ('Autres', {'fields': ('stress_chronique','qualite_sommeil','heures_sommeil','contraception_hormonale','allaitement_duree_mois','score_risque_global')}),
    )


@admin.register(Diagnostic)
class DiagnosticAdmin(admin.ModelAdmin):
    inlines       = [StyleVieInline]
    list_display  = ['patient', 'date_diagnostic', 'type_diagnostic', 'topographie_code',
                     'morphologie_code', 'stade_ajcc', 'etat_cancer', 'get_tnm_display_full']
    list_filter   = ['stade_ajcc', 'type_diagnostic', 'etat_cancer', 'lateralite',
                     'base_diagnostic', 'tnm_type', 'statut_dossier']
    search_fields = ['patient__nom', 'patient__registration_number',
                     'topographie_code', 'morphologie_code', 'numero_dossier']
    raw_id_fields = ['patient', 'topographie', 'morphologie']
    readonly_fields = ['date_creation', 'date_modification', 'topographie_code',
                       'topographie_libelle', 'morphologie_code', 'morphologie_libelle']
    fieldsets = (
        ('Identification', {
            'fields': ('patient','numero_dossier','statut_dossier','est_principal',
                       'medecin_referent','medecin_diagnostiqueur','etablissement_diagnostic')
        }),
        ('Dates & Type', {
            'fields': ('date_diagnostic','date_premier_symptome','type_diagnostic','base_diagnostic')
        }),
        ('Topographie ICD-O-3', {
            'fields': ('categorie_cancer','topographie','topographie_code','topographie_libelle','lateralite')
        }),
        ('Morphologie ICD-O-3', {
            'fields': ('morphologie','morphologie_code','morphologie_libelle',
                       'grade_histologique','differentiation','variante_histologique')
        }),
        ('Classification TNM 8e éd.', {
            'fields': ('tnm_type','tnm_t','tnm_n','tnm_m','tnm_edition',
                       'tnm_descripteurs','tnm_certitude','tnm_date_evaluation','tnm_commentaire')
        }),
        ('Stade & État', {
            'fields': ('stade_ajcc','etat_cancer','performance_status','pronostic_evaluation')
        }),
        ('Méthodes de confirmation', {
            'fields': ('conf_histologie_tumeur','conf_cytologie','conf_microscopie_sans_histo',
                       'conf_marqueurs_biologiques','conf_imagerie','conf_biopsie_medullaire',
                       'methodes_confirmation_text'),
            'classes': ('collapse',)
        }),
        ('Marqueurs biologiques', {
            'fields': ('recepteur_re','recepteur_re_pourcentage','recepteur_rp','recepteur_rp_pourcentage',
                       'her2','her2_fish','ki67','psa','cea','ca_19_9','ca_125','afp','pdl1',
                       'mmr_status','autres_marqueurs'),
            'classes': ('collapse',)
        }),
        ('Imagerie & Mesures', {
            'fields': ('taille_tumeur','taille_tumeur_axe_max','taille_tumeur_3d',
                       'nombre_ganglions','nombre_ganglions_preleves',
                       'metastases_sites','nombre_metastases','volume_tumoral',
                       'invasion_vasculaire','invasion_perineurale',
                       'img_scanner','img_irm_cerebrale','img_pet_scan',
                       'img_echographie','img_radiographie','img_scintigraphie'),
            'classes': ('collapse',)
        }),
        ('Rapport anatomopathologique', {
            'fields': ('numero_bloc_anapath','medecin_anatomopathologiste','laboratoire_anapath',
                       'date_analyse_anapath','technique_prelevement','qualite_prelevement',
                       'immunohistochimie','rapport_complet','marges_chirurgicales',
                       'distance_marge_minimale','emboles_lymphatiques','emboles_vasculaires'),
            'classes': ('collapse',)
        }),
        ('CIM-10 & Notes', {
            'fields': ('cim10_code','cim10_libelle','observations')
        }),
        ('Métadonnées', {
            'fields': ('date_creation','date_modification','cree_par','modifie_par'),
            'classes': ('collapse',)
        }),
    )