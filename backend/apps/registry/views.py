from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta, date

from apps.patients.models import Patient
from apps.diagnostics.models import Diagnostic
from apps.treatments.models import (
    Chimiotherapie, Radiotherapie,
    Chirurgie, Hormonotherapie, Immunotherapie
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_global(request):
    today      = timezone.now().date()
    an_courant = today.year
    debut_annee = date(an_courant, 1, 1)
    debut_mois  = date(an_courant, today.month, 1)
    il_y_a_30j  = today - timedelta(days=30)

    # ── KPIs ────────────────────────────────────────────────────
    total_patients     = Patient.objects.filter(est_actif=True).count()
    nouveaux_ce_mois   = Patient.objects.filter(date_enregistrement__date__gte=debut_mois).count()
    nouveaux_annee     = Patient.objects.filter(date_enregistrement__date__gte=debut_annee).count()
    patients_en_trt    = Patient.objects.filter(statut_dossier='traitement').count()
    patients_remission = Patient.objects.filter(statut_dossier='remission').count()
    patients_decedes   = Patient.objects.filter(statut_vital='decede').count()
    patients_perdus    = Patient.objects.filter(statut_dossier='perdu').count()
    total_diagnostics  = Diagnostic.objects.count()
    diagnostics_annee  = Diagnostic.objects.filter(date_diagnostic__gte=debut_annee).count()
    total_traitements  = (
        Chimiotherapie.objects.count() + Radiotherapie.objects.count() +
        Chirurgie.objects.count() + Hormonotherapie.objects.count() +
        Immunotherapie.objects.count()
    )

    # ── Répartition sexe ────────────────────────────────────────
    par_sexe = {
        'M': Patient.objects.filter(est_actif=True, sexe='M').count(),
        'F': Patient.objects.filter(est_actif=True, sexe='F').count(),
    }

    # ── Statuts dossiers ─────────────────────────────────────────
    par_statut = list(
        Patient.objects.filter(est_actif=True)
        .values('statut_dossier')
        .annotate(count=Count('id'))
        .order_by('statut_dossier')
    )

    # ── Top 10 cancers ───────────────────────────────────────────
    top_cancers = list(
        Diagnostic.objects.exclude(topographie_libelle='')
        .values('topographie_code', 'topographie_libelle')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # ── Distribution stades AJCC ─────────────────────────────────
    par_stade = list(
        Diagnostic.objects.values('stade_ajcc')
        .annotate(count=Count('id'))
        .order_by('stade_ajcc')
    )

    # ── Évolution 12 derniers mois ───────────────────────────────
    evolution_mensuelle = []
    for i in range(11, -1, -1):
        # Calcul mois correct
        mois_offset = today.month - i - 1
        annee_offset = today.year + mois_offset // 12
        mois_num = mois_offset % 12 + 1
        mois_date = date(annee_offset, mois_num, 1)

        if mois_date.month == 12:
            fin_mois = date(mois_date.year + 1, 1, 1)
        else:
            fin_mois = date(mois_date.year, mois_date.month + 1, 1)

        MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

        evolution_mensuelle.append({
            'mois':        f"{MOIS_FR[mois_date.month-1]} {mois_date.year}",
            'mois_court':  MOIS_FR[mois_date.month-1],
            'patients':    Patient.objects.filter(
                date_enregistrement__date__gte=mois_date,
                date_enregistrement__date__lt=fin_mois
            ).count(),
            'diagnostics': Diagnostic.objects.filter(
                date_diagnostic__gte=mois_date,
                date_diagnostic__lt=fin_mois
            ).count(),
        })

    # ── Top wilayas ──────────────────────────────────────────────
    top_wilayas = list(
        Patient.objects.filter(est_actif=True).exclude(wilaya='')
        .values('wilaya')
        .annotate(count=Count('id'))
        .order_by('-count')[:15]
    )

    # ── Tranches d'âge ───────────────────────────────────────────
    tranches_age = []
    for debut, fin, label in [(0,18,'0-17'),(18,30,'18-29'),(30,45,'30-44'),
                               (45,60,'45-59'),(60,75,'60-74'),(75,200,'75+')]:
        tranches_age.append({
            'tranche': label,
            'count': Patient.objects.filter(
                est_actif=True, age_diagnostic__gte=debut, age_diagnostic__lt=fin
            ).count()
        })

    # ── Traitements ──────────────────────────────────────────────
    traitements_types = [
        {'type': 'Chimiothérapie',  'count': Chimiotherapie.objects.count(),  'color': '#00a8ff'},
        {'type': 'Radiothérapie',   'count': Radiotherapie.objects.count(),   'color': '#f5a623'},
        {'type': 'Chirurgie',       'count': Chirurgie.objects.count(),       'color': '#ff4d6a'},
        {'type': 'Hormonothérapie', 'count': Hormonotherapie.objects.count(), 'color': '#00e5a0'},
        {'type': 'Immunothérapie',  'count': Immunotherapie.objects.count(),  'color': '#c084fc'},
    ]

    # ── Réponses chimio ──────────────────────────────────────────
    reponses_chimio = list(
        Chimiotherapie.objects.exclude(reponse_tumorale='')
        .values('reponse_tumorale')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # ── Activité récente ─────────────────────────────────────────
    activite_recente = {
        'nouveaux_patients':    Patient.objects.filter(date_enregistrement__date__gte=il_y_a_30j).count(),
        'nouveaux_diagnostics': Diagnostic.objects.filter(date_creation__date__gte=il_y_a_30j).count(),
        'nouveaux_chimio':      Chimiotherapie.objects.filter(date_creation__date__gte=il_y_a_30j).count(),
        'nouvelles_chirurgies': Chirurgie.objects.filter(date_creation__date__gte=il_y_a_30j).count(),
    }

    # ── Base du diagnostic ───────────────────────────────────────
    base_diagnostic = list(
        Diagnostic.objects.values('base_diagnostic')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'kpis': {
            'total_patients':    total_patients,
            'nouveaux_ce_mois':  nouveaux_ce_mois,
            'nouveaux_annee':    nouveaux_annee,
            'en_traitement':     patients_en_trt,
            'en_remission':      patients_remission,
            'decedes':           patients_decedes,
            'perdus_vue':        patients_perdus,
            'total_diagnostics': total_diagnostics,
            'diagnostics_annee': diagnostics_annee,
            'total_traitements': total_traitements,
            'annee_courante':    an_courant,
        },
        'par_sexe':            par_sexe,
        'par_statut':          par_statut,
        'top_cancers':         top_cancers,
        'par_stade':           par_stade,
        'evolution_mensuelle': evolution_mensuelle,
        'top_wilayas':         top_wilayas,
        'tranches_age':        tranches_age,
        'traitements_types':   traitements_types,
        'reponses_chimio':     reponses_chimio,
        'activite_recente':    activite_recente,
        'base_diagnostic':     base_diagnostic,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alertes(request):
    return Response({
        'patients_perdus_vue':  Patient.objects.filter(statut_dossier='perdu').count(),
        'nouveaux_dossiers':    Patient.objects.filter(statut_dossier='nouveau').count(),
        'sans_diagnostic':      Patient.objects.filter(
            diagnostics__isnull=True, est_actif=True
        ).count(),
    })


# ─────────────────────────────────────────────────────────────────
# STATISTIQUES AVANCÉES
# ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_incidence(request):
    """Incidence par wilaya, année, sexe."""
    annee = request.query_params.get('annee')
    sexe  = request.query_params.get('sexe')

    qs = Patient.objects.filter(est_actif=True)
    if annee:
        qs = qs.filter(date_enregistrement__year=annee)
    if sexe:
        qs = qs.filter(sexe=sexe)

    par_wilaya = list(
        qs.exclude(wilaya='')
        .values('wilaya')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    annees_dispo = list(
        Patient.objects.dates('date_enregistrement', 'year')
        .values_list('date_enregistrement__year', flat=True)
        .distinct().order_by('-date_enregistrement__year')
    )
    # fallback si vide
    from django.db.models.functions import ExtractYear
    annees_dispo = list(
        Patient.objects.annotate(annee=ExtractYear('date_enregistrement'))
        .values_list('annee', flat=True).distinct().order_by('-annee')
    )

    return Response({
        'par_wilaya':    par_wilaya,
        'annees_dispo':  annees_dispo,
        'total_filtre':  qs.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_cancers(request):
    """Statistiques détaillées par type de cancer."""
    annee = request.query_params.get('annee')
    sexe  = request.query_params.get('sexe')
    wilaya= request.query_params.get('wilaya')

    qs = Diagnostic.objects.all()
    if annee:
        qs = qs.filter(date_diagnostic__year=annee)
    if sexe:
        qs = qs.filter(patient__sexe=sexe)
    if wilaya:
        qs = qs.filter(patient__wilaya=wilaya)

    top_topographies = list(
        qs.exclude(topographie_libelle='')
        .values('topographie_code', 'topographie_libelle')
        .annotate(count=Count('id'))
        .order_by('-count')[:20]
    )

    par_morphologie = list(
        qs.exclude(morphologie_libelle='')
        .values('morphologie_code', 'morphologie_libelle')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    par_stade = list(
        qs.values('stade_ajcc')
        .annotate(count=Count('id'))
        .order_by('stade_ajcc')
    )

    par_base_diag = list(
        qs.values('base_diagnostic')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'top_topographies': top_topographies,
        'par_morphologie':  par_morphologie,
        'par_stade':        par_stade,
        'par_base_diag':    par_base_diag,
        'total':            qs.count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_patients(request):
    """Statistiques démographiques détaillées."""
    annee  = request.query_params.get('annee')
    wilaya = request.query_params.get('wilaya')

    qs = Patient.objects.filter(est_actif=True)
    if annee:
        qs = qs.filter(date_enregistrement__year=annee)
    if wilaya:
        qs = qs.filter(wilaya=wilaya)

    # Tranches d'âge
    tranches = []
    for debut, fin, label in [
        (0, 10,'0-9'), (10,20,'10-19'), (20,30,'20-29'), (30,40,'30-39'),
        (40,50,'40-49'), (50,60,'50-59'), (60,70,'60-69'), (70,80,'70-79'), (80,200,'80+')
    ]:
        n = qs.filter(age_diagnostic__gte=debut, age_diagnostic__lt=fin).count()
        tranches.append({ 'tranche': label, 'count': n })

    # Par sexe et tranche d'âge (pyramide)
    pyramide = []
    for debut, fin, label in [
        (0,10,'0-9'),(10,20,'10-19'),(20,30,'20-29'),(30,40,'30-39'),
        (40,50,'40-49'),(50,60,'50-59'),(60,70,'60-69'),(70,80,'70-79'),(80,200,'80+')
    ]:
        h = qs.filter(sexe='M', age_diagnostic__gte=debut, age_diagnostic__lt=fin).count()
        f = qs.filter(sexe='F', age_diagnostic__gte=debut, age_diagnostic__lt=fin).count()
        pyramide.append({'tranche': label, 'hommes': h, 'femmes': -f, 'femmes_abs': f})

    # Par statut vital
    par_statut_vital = list(
        qs.values('statut_vital')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Évolution annuelle sur 10 ans
    from django.db.models.functions import ExtractYear
    evolution_annuelle = list(
        Patient.objects.annotate(annee=ExtractYear('date_enregistrement'))
        .values('annee')
        .annotate(total=Count('id'),
                  hommes=Count('id', filter=Q(sexe='M')),
                  femmes=Count('id', filter=Q(sexe='F')))
        .order_by('annee')
    )

    return Response({
        'tranches_age':      tranches,
        'pyramide_ages':     pyramide,
        'par_statut_vital':  par_statut_vital,
        'evolution_annuelle':evolution_annuelle,
        'total':             qs.count(),
        'age_moyen':         qs.exclude(age_diagnostic__isnull=True)
                               .aggregate(moy=__import__('django.db.models', fromlist=['Avg']).Avg('age_diagnostic'))['moy'],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_traitements(request):
    """Statistiques sur les traitements."""
    annee = request.query_params.get('annee')

    def filter_qs(Model):
        qs = Model.objects.all()
        if annee:
            qs = qs.filter(date_debut__year=annee)
        return qs

    chimio_qs = filter_qs(Chimiotherapie)
    radio_qs  = filter_qs(Radiotherapie)
    chir_qs   = filter_qs(Chirurgie)

    protocoles = list(
        chimio_qs.exclude(protocole='')
        .values('protocole')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    techniques_radio = list(
        radio_qs.exclude(technique='')
        .values('technique')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    types_chir = list(
        chir_qs.values('type_chirurgie')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    marges = list(
        chir_qs.exclude(marges_resection='')
        .values('marges_resection')
        .annotate(count=Count('id'))
    )

    reponses = list(
        chimio_qs.exclude(reponse_tumorale='')
        .values('reponse_tumorale')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'totaux': {
            'chimiotherapie':  chimio_qs.count(),
            'radiotherapie':   radio_qs.count(),
            'chirurgie':       chir_qs.count(),
            'hormonotherapie': filter_qs(Hormonotherapie).count(),
            'immunotherapie':  filter_qs(Immunotherapie).count(),
        },
        'protocoles_chimio':   protocoles,
        'techniques_radio':    techniques_radio,
        'types_chirurgie':     types_chir,
        'marges_resection':    marges,
        'reponses_chimio':     reponses,
    })
