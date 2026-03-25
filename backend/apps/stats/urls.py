"""
apps/stats/urls.py
------------------
Monté dans urls.py principal via :
    path('api/', include('apps.stats.urls'))

URLs finales :
    /api/stats/kpi/
    /api/stats/chart-data/<source>/
    /api/stats/ai/report/
    /api/search/
"""

from django.urls import path
from . import views

urlpatterns = [

    # ── KPI global ────────────────────────────────────────────────────────────
    path('stats/kpi/',                          views.KPIView.as_view(),                 name='stats-kpi'),

    # ── Chart Data générique ──────────────────────────────────────────────────
    path('stats/chart-data/<str:source>/',      views.ChartDataView.as_view(),           name='stats-chart-data'),

    # ── Cancer ────────────────────────────────────────────────────────────────
    path('stats/cancer/count/',                 views.CancerCountView.as_view(),         name='cancer-count'),
    path('stats/cancer/sexe/',                  views.CancerSexeView.as_view(),          name='cancer-sexe'),
    path('stats/cancer/stade/',                 views.CancerStadeView.as_view(),         name='cancer-stade'),
    path('stats/cancer/incidence/',             views.CancerIncidenceView.as_view(),     name='cancer-incidence'),
    path('stats/cancer/mortalite/',             views.CancerMortaliteView.as_view(),     name='cancer-mortalite'),
    path('stats/cancer/top10/',                 views.CancerTop10View.as_view(),         name='cancer-top10'),
    path('stats/cancer/sein-detail/',           views.CancerSeinDetailView.as_view(),    name='cancer-sein-detail'),
    path('stats/cancer/poumon-detail/',         views.CancerPoumonDetailView.as_view(),  name='cancer-poumon-detail'),
    path('stats/cancer/colon-detail/',          views.CancerColonDetailView.as_view(),   name='cancer-colon-detail'),
    path('stats/cancer/double/',                views.CancerDoubleView.as_view(),        name='cancer-double'),

    # ── Âge ───────────────────────────────────────────────────────────────────
    path('stats/age/count/',                    views.AgeCountView.as_view(),            name='age-count'),
    path('stats/age/stade/',                    views.AgeStadeView.as_view(),            name='age-stade'),
    path('stats/age/sexe/',                     views.AgeSexeView.as_view(),             name='age-sexe'),
    path('stats/age/cancer-type/',              views.AgeCancerTypeView.as_view(),       name='age-cancer-type'),
    path('stats/age/incidence/',                views.AgeIncidenceView.as_view(),        name='age-incidence'),
    path('stats/age/median-cancer/',            views.AgeMedianCancerView.as_view(),     name='age-median-cancer'),
    path('stats/age/pediatrique/',              views.AgePediatriqueView.as_view(),      name='age-pediatrique'),

    # ── Stade ─────────────────────────────────────────────────────────────────
    path('stats/stade/count/',                  views.StadeCountView.as_view(),          name='stade-count'),
    path('stats/stade/sexe/',                   views.StadeSexeView.as_view(),           name='stade-sexe'),
    path('stats/stade/age/',                    views.StadeAgeView.as_view(),            name='stade-age'),
    path('stats/stade/wilaya/',                 views.StadeWilayaView.as_view(),         name='stade-wilaya'),
    path('stats/stade/evolution/',              views.StadeEvolutionView.as_view(),      name='stade-evolution'),
    path('stats/stade/delai/',                  views.StadeDelaiView.as_view(),          name='stade-delai'),

    # ── Temporel ──────────────────────────────────────────────────────────────
    path('stats/temporal/monthly-cas/',         views.MonthlyCasView.as_view(),          name='monthly-cas'),
    path('stats/temporal/monthly-deces/',       views.MonthlyDecesView.as_view(),        name='monthly-deces'),
    path('stats/temporal/monthly-cas-deces/',   views.MonthlyCasDecesView.as_view(),     name='monthly-cas-deces'),
    path('stats/temporal/annuel-tendance/',     views.AnnuelTendanceView.as_view(),      name='annuel-tendance'),
    path('stats/temporal/annuel-incidence-std/',views.AnnuelIncidenceStdView.as_view(),  name='annuel-incidence-std'),
    path('stats/temporal/saisonnier/',          views.SaisonnierView.as_view(),          name='saisonnier'),
    path('stats/temporal/delai-diagnostic/',    views.DelaiDiagnosticView.as_view(),     name='delai-diagnostic'),
    path('stats/temporal/delai-traitement/',    views.DelaiTraitementView.as_view(),     name='delai-traitement'),

    # ── Wilaya ────────────────────────────────────────────────────────────────
    path('stats/wilaya/cas/',                   views.WilayaCasView.as_view(),           name='wilaya-cas'),
    path('stats/wilaya/cancer/',                views.WilayaCancerView.as_view(),        name='wilaya-cancer'),
    path('stats/wilaya/incidence/',             views.WilayaIncidenceView.as_view(),     name='wilaya-incidence'),
    path('stats/wilaya/mortalite/',             views.WilayaMortaliteView.as_view(),     name='wilaya-mortalite'),
    path('stats/wilaya/stade/',                 views.WilayaStadeView.as_view(),         name='wilaya-stade'),
    path('stats/wilaya/region-nord-sud/',       views.RegionNordSudView.as_view(),       name='region-nord-sud'),
    path('stats/wilaya/evolution/',             views.WilayaEvolutionView.as_view(),     name='wilaya-evolution'),

    # ── Survie ────────────────────────────────────────────────────────────────
    path('stats/survie/',                       views.SurvivalView.as_view(),            name='survie'),
    path('stats/survie/1-3-5/',                 views.Survival135View.as_view(),         name='survie-1-3-5'),
    path('stats/survie/stade/',                 views.SurvivalStadeView.as_view(),       name='survie-stade'),
    path('stats/survie/age/',                   views.SurvivalAgeView.as_view(),         name='survie-age'),
    path('stats/survie/sexe/',                  views.SurvivalSexeView.as_view(),        name='survie-sexe'),
    path('stats/survie/kaplan-meier/',          views.KaplanMeierView.as_view(),         name='kaplan-meier'),

    # ── Traitement ────────────────────────────────────────────────────────────
    path('stats/traitement/type/',              views.TraitementTypeView.as_view(),      name='traitement-type'),
    path('stats/traitement/combo/',             views.TraitementComboView.as_view(),     name='traitement-combo'),
    path('stats/traitement/cancer/',            views.TraitementCancerView.as_view(),    name='traitement-cancer'),
    path('stats/traitement/delai/',             views.TraitementDelaiView.as_view(),     name='traitement-delai'),
    path('stats/traitement/reponse/',           views.TraitementReponseView.as_view(),   name='traitement-reponse'),

    # ── Épidémiologie ─────────────────────────────────────────────────────────
    path('stats/epidemio/facteurs-risque/',     views.FacteursRisqueView.as_view(),      name='facteurs-risque'),
    path('stats/epidemio/comorbidites/',        views.ComorbiditesView.as_view(),        name='comorbidites'),
    path('stats/epidemio/antecedents-familiaux/', views.AntecedentsFamiliauxView.as_view(), name='antecedents-familiaux'),
    path('stats/epidemio/tabac-cancer/',        views.TabacCancerView.as_view(),         name='tabac-cancer'),
    path('stats/epidemio/imc-cancer/',          views.ImcCancerView.as_view(),           name='imc-cancer'),

    # ── Dimensions pures ──────────────────────────────────────────────────────
    path('stats/dim/cancer/',                   views.DimCancerView.as_view(),           name='dim-cancer'),
    path('stats/dim/age/',                      views.DimAgeView.as_view(),              name='dim-age'),
    path('stats/dim/stade/',                    views.DimStadeView.as_view(),            name='dim-stade'),
    path('stats/dim/sexe/',                     views.DimSexeView.as_view(),             name='dim-sexe'),
    path('stats/dim/wilaya/',                   views.DimWilayaView.as_view(),           name='dim-wilaya'),
    path('stats/dim/annee/',                    views.DimAnneeView.as_view(),            name='dim-annee'),
    path('stats/dim/mois/',                     views.DimMoisView.as_view(),             name='dim-mois'),
    path('stats/dim/topographie/',              views.DimTopographieView.as_view(),      name='dim-topographie'),
    path('stats/dim/morphologie/',              views.DimMorphologieView.as_view(),      name='dim-morphologie'),
    path('stats/dim/traitement/',               views.DimTraitementView.as_view(),       name='dim-traitement'),
    path('stats/dim/survie/',                   views.DimSurvieView.as_view(),           name='dim-survie'),

    # ── Rapport IA ────────────────────────────────────────────────────────────
    path('stats/ai/report/',                    views.AIReportListCreateView.as_view(),  name='ai-report-list'),
    path('stats/ai/report/<str:pk>/',           views.AIReportDetailView.as_view(),      name='ai-report-detail'),

    # ── Recherche ─────────────────────────────────────────────────────────────
    path('search/',                             views.SearchView.as_view(),              name='search'),
]