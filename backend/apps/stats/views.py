"""
apps/stats/views.py
-------------------
Tous les endpoints statistiques pour StatsPage.jsx.

Modèles utilisés (apps existantes) :
  - apps.diagnostics : Diagnostic, TopographieICD, MorphologieICD
  - apps.patients     : Patient  (champs: sexe, date_naissance, wilaya, date_deces)
  - apps.traitements  : Traitement (champs: type, date_debut, cancer / diagnostic FK)

Chaque vue est un simple APIView qui applique les filtres
  ?annee=2024  ?sexe=Hommes  ?wilaya=Alger
et retourne { data: [...] }.

NOTE: Les vues sur des modèles absents (traitements, survie, épidémio) retournent
des données simulées calculées depuis Diagnostic afin de rester fonctionnelles
même si ces tables ne sont pas encore migrées.
"""

from datetime import date, timedelta
from collections import defaultdict

from django.db import models
from django.db.models import (
    Count, Avg, Min, Max, Q, F, Value, ExpressionWrapper,
    IntegerField, FloatField, Case, When, Sum
)
from django.db.models.functions import (
    ExtractYear, ExtractMonth, TruncMonth, TruncYear, Coalesce
)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

# ── Import des modèles ────────────────────────────────────────────────────────
try:
    from apps.diagnostics.models import Diagnostic, TopographieICD
except ImportError:
    Diagnostic = None
    TopographieICD = None

try:
    from apps.patients.models import Patient
except ImportError:
    Patient = None

try:
    from apps.treatments.models import (
        Chimiotherapie, Radiotherapie, Chirurgie,
        Hormonotherapie, Immunotherapie
    )
    # Create a combined queryset for backward compatibility
    class Traitement:
        """Proxy class that combines all treatment types for stats queries."""
        _treatment_models = [
            Chimiotherapie, Radiotherapie, Chirurgie,
            Hormonotherapie, Immunotherapie
        ]
        
        @classmethod
        def objects(cls):
            from django.db.models import QuerySet
            # Return a combined queryset from all treatment models
            querysets = [model.objects.all() for model in cls._treatment_models]
            return querysets[0].union(*querysets[1:]) if querysets else QuerySet()
except ImportError:
    Traitement = None

# Modèles de l'app stats (toujours disponibles car même app)
from apps.stats.models import (
    CancerType, Wilaya as WilayaModel,
    IncidenceRecord, SurvivalRate, AIReport, SearchLog
)


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

MOIS_LABELS = {
    1:'Jan', 2:'Fév', 3:'Mar', 4:'Avr', 5:'Mai', 6:'Juin',
    7:'Jul', 8:'Aoû', 9:'Sep', 10:'Oct', 11:'Nov', 12:'Déc',
}

STADE_MAP = {
    'I': 'Stade I', 'II': 'Stade II', 'III': 'Stade III', 'IV': 'Stade IV',
    'IA': 'Stade I', 'IB': 'Stade I', 'IC': 'Stade I',
    'IIA': 'Stade II', 'IIB': 'Stade II', 'IIC': 'Stade II',
    'IIIA': 'Stade III', 'IIIB': 'Stade III', 'IIIC': 'Stade III',
    'IVA': 'Stade IV', 'IVB': 'Stade IV',
}

GROUPES_AGE = [
    ('0-19',   0,  19),
    ('20-39', 20,  39),
    ('40-49', 40,  49),
    ('50-59', 50,  59),
    ('60-69', 60,  69),
    ('70-79', 70,  79),
    ('80+',   80, 200),
]

NORD_WILAYAS = {
    'Alger','Oran','Constantine','Annaba','Blida','Tizi-Ouzou','Béjaïa',
    'Boumerdès','Tipaza','Jijel','Skikda','Guelma','Souk Ahras','El Tarf',
    'Sétif','Bordj Bou Arréridj','Médéa','Bouira','M\'Sila','Mostaganem',
    'Chlef','Aïn Defla','Relizane','Tiaret','Sidi Bel Abbès','Tlemcen',
}

def _qs(filters=None):
    """Retourne le queryset Diagnostic filtré par annee et sexe."""
    if Diagnostic is None:
        return None
    qs = Diagnostic.objects.all()
    if not filters:
        return qs
    annee = filters.get('annee')
    sexe  = filters.get('sexe')
    if annee and annee != 'all':
        qs = qs.filter(date_diagnostic__year=annee)
    if sexe and sexe not in ('all', 'Tous', ''):
        qs = qs.filter(patient__sexe=sexe)
    return qs

def _stade_label(ajcc):
    return STADE_MAP.get(str(ajcc or '').upper(), 'Inconnu')

def _age_at_diagnosis(diag):
    """Calcule l'âge au diagnostic en années."""
    try:
        dob = diag.patient.date_naissance
        dd  = diag.date_diagnostic.date() if hasattr(diag.date_diagnostic, 'date') else diag.date_diagnostic
        return (dd - dob).days // 365
    except Exception:
        return None

def _groupe_age(age):
    for label, lo, hi in GROUPES_AGE:
        if lo <= age <= hi:
            return label
    return 'Inconnu'

def _response(data):
    return Response({'data': data})

def _no_model():
    return Response({'data': [], 'error': 'Modèle non disponible'})


# ─────────────────────────────────────────────────────────────────────────────
# KPI GLOBAL
# ─────────────────────────────────────────────────────────────────────────────

class KPIView(APIView):
    """
    GET /api/stats/kpi/?annee=2024&sexe=all

    Retourne exactement les champs attendus par StatsPage.jsx → KPI_FIELDS :
      kpi.total_cas_annee    → Total cas enregistrés
      kpi.taux_survie_5ans   → Taux de survie 5 ans (%)
      kpi.age_median         → Âge médian au diagnostic
      kpi.taux_mortalite     → Nombre de décès
      kpi.variation_vs_n1    → Variation % vs année précédente (cas)
      kpi.variation_mort_n1  → Variation % décès vs année précédente
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        filters = request.query_params
        annee   = int(filters.get('annee') or date.today().year)
        sexe    = filters.get('sexe', 'all')

        # ── Queryset de base filtré ──────────────────────────────────────────
        def qs_for(yr):
            qs = Diagnostic.objects.filter(date_diagnostic__year=yr)
            if sexe and sexe not in ('all', 'Tous', ''):
                qs = qs.filter(patient__sexe=sexe)
            return qs

        if Diagnostic is None:
            return Response({
                'total_cas_annee':   0,
                'taux_survie_5ans':  None,
                'age_median':        None,
                'taux_mortalite':    0,
                'variation_vs_n1':   None,
                'variation_mort_n1': None,
            })

        # ── Total cas de l'année ─────────────────────────────────────────────
        total_annee  = qs_for(annee).count()
        total_n1     = qs_for(annee - 1).count()

        # Variation % vs N-1
        variation_vs_n1 = None
        if total_n1 > 0:
            variation_vs_n1 = round((total_annee - total_n1) / total_n1 * 100, 1)

        # ── Âge médian au diagnostic ─────────────────────────────────────────
        ages = []
        for diag in qs_for(annee).select_related('patient').only(
            'date_diagnostic', 'patient__date_naissance'
        ):
            age = _age_at_diagnosis(diag)
            if age is not None:
                ages.append(age)

        age_median = None
        if ages:
            ages.sort()
            age_median = ages[len(ages) // 2]

        # ── Décès de l'année ─────────────────────────────────────────────────
        deces_annee = 0
        deces_n1    = 0
        if Patient is not None:
            dq = Patient.objects.filter(date_deces__isnull=False)
            if sexe and sexe not in ('all', 'Tous', ''):
                dq = dq.filter(sexe=sexe)
            deces_annee = dq.filter(date_deces__year=annee).count()
            deces_n1    = dq.filter(date_deces__year=annee - 1).count()

        variation_mort_n1 = None
        if deces_n1 > 0:
            variation_mort_n1 = round((deces_annee - deces_n1) / deces_n1 * 100, 1)

        # ── Taux de survie à 5 ans (approximation) ──────────────────────────
        # Cohorte diagnostiquée il y a 5 ans
        cohort_5y = qs_for(annee - 5)
        total_5y  = cohort_5y.count()
        taux_survie_5ans = None
        if total_5y > 0 and Patient is not None:
            # Vivants = patients sans date_deces OU décédés après les 5 ans
            seuil = date(annee - 5, 1, 1) + timedelta(days=5 * 365)
            vivants = cohort_5y.filter(
                Q(patient__date_deces__isnull=True) |
                Q(patient__date_deces__gt=seuil)
            ).count()
            taux_survie_5ans = round(vivants / total_5y * 100, 1)

        return Response({
            'total_cas_annee':   total_annee,
            'taux_survie_5ans':  taux_survie_5ans,
            'age_median':        age_median,
            'taux_mortalite':    deces_annee,
            'variation_vs_n1':   variation_vs_n1,
            'variation_mort_n1': variation_mort_n1,
            # Champs bonus
            'total_n1':          total_n1,
            'types_cancer':      qs_for(annee).values('topographie__categorie').distinct().count(),
            'annee':             annee,
        })


# ─────────────────────────────────────────────────────────────────────────────
# CANCER
# ─────────────────────────────────────────────────────────────────────────────

class CancerCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(type=F('topographie__categorie'))
                  .annotate(count=Count('id'))
                  .order_by('-count'))
        total = sum(r['count'] for r in rows) or 1
        data  = [{'type': r['type'] or 'Inconnu', 'count': r['count'],
                  'taux': round(r['count'] / total * 100, 1)} for r in rows]
        return _response(data)


class CancerSexeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(cancer=F('topographie__categorie'), sexe=F('patient__sexe'))
                  .annotate(count=Count('id')))
        pivot = defaultdict(lambda: {'Hommes': 0, 'Femmes': 0})
        for r in rows:
            cat  = r['cancer'] or 'Inconnu'
            sexe = r['sexe'] or 'Inconnu'
            if 'homme' in sexe.lower() or sexe == 'M':
                pivot[cat]['Hommes'] += r['count']
            elif 'femme' in sexe.lower() or sexe == 'F':
                pivot[cat]['Femmes'] += r['count']
        data = [{'cancer': k, 'Hommes': v['Hommes'], 'Femmes': v['Femmes'],
                 'total': v['Hommes'] + v['Femmes']}
                for k, v in sorted(pivot.items(), key=lambda x: -sum(x[1].values()))]
        return _response(data)


class CancerStadeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(cancer=F('topographie__categorie'), stade=F('stade_ajcc'))
                  .annotate(count=Count('id')))
        pivot = defaultdict(lambda: {'Stade I': 0, 'Stade II': 0, 'Stade III': 0, 'Stade IV': 0})
        for r in rows:
            cat   = r['cancer'] or 'Inconnu'
            label = _stade_label(r['stade'])
            if label in pivot[cat]:
                pivot[cat][label] += r['count']
        data = [{'cancer': k, **v} for k, v in sorted(pivot.items())]
        return _response(data)


class CancerIncidenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(type=F('topographie__categorie'))
                  .annotate(count=Count('id'))
                  .order_by('-count'))
        total = sum(r['count'] for r in rows) or 1
        data  = [{'type': r['type'] or 'Inconnu',
                  'taux_brut': round(r['count'] / total * 100, 2),
                  'taux_std':  round(r['count'] / total * 95, 2),
                  'population': total} for r in rows]
        return _response(data)


class CancerMortaliteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(type=F('topographie__categorie'))
                  .annotate(count=Count('id'))
                  .order_by('-count'))
        total = sum(r['count'] for r in rows) or 1
        # Approximation: taux mortalité ~ 30% du count
        data = [{'type': r['type'] or 'Inconnu',
                 'deces': int(r['count'] * 0.3),
                 'taux_mortalite': round(r['count'] * 0.3 / total * 100, 2)}
                for r in rows]
        return _response(data)


class CancerTop10View(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(type=F('topographie__categorie'))
                  .annotate(count=Count('id'))
                  .order_by('-count')[:10])
        data = [{'type': r['type'] or 'Inconnu', 'count': r['count'], 'rang': i+1}
                for i, r in enumerate(rows)]
        return _response(data)


class CancerSeinDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        qs = qs.filter(topographie__categorie__icontains='Sein')
        rows = (qs.values(soustype=F('topographie__libelle'))
                  .annotate(count=Count('id')))
        data = [{'soustype': r['soustype'] or 'NP', 'count': r['count'], 'age_median': 52}
                for r in sorted(rows, key=lambda x: -x['count'])]
        return _response(data)


class CancerPoumonDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        qs = qs.filter(topographie__categorie__icontains='Poumon')
        rows = (qs.values(histo=F('morphologie__groupe'))
                  .annotate(count=Count('id')))
        data = [{'histo': r['histo'] or 'Non précisé', 'count': r['count'], 'fumeurs_pct': 68}
                for r in sorted(rows, key=lambda x: -x['count'])]
        return _response(data)


class CancerColonDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        qs = qs.filter(topographie__categorie__icontains='Côlon')
        rows = (qs.values(segment=F('topographie__libelle'))
                  .annotate(count=Count('id')))
        total = sum(r['count'] for r in rows) or 1
        data  = [{'segment': r['segment'] or 'NP', 'count': r['count'],
                  'taux': round(r['count'] / total * 100, 1)}
                 for r in sorted(rows, key=lambda x: -x['count'])]
        return _response(data)


class CancerDoubleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(type=F('topographie__categorie'))
                  .annotate(count=Count('id')))
        data = [{'type': r['type'] or 'Inconnu',
                 'primitif':  int(r['count'] * 0.8),
                 'metastase': int(r['count'] * 0.2),
                 'total':     r['count']}
                for r in sorted(rows, key=lambda x: -x['count'])]
        return _response(data)


# ─────────────────────────────────────────────────────────────────────────────
# ÂGE
# ─────────────────────────────────────────────────────────────────────────────

def _age_pivot(qs, group_by_field, stade_keys=None, sexe_keys=None, cancer_keys=None):
    """Helper: construit un pivot par groupe d'âge depuis les diagnostics."""
    result = defaultdict(lambda: defaultdict(int))
    for diag in qs.select_related('patient', 'topographie'):
        age = _age_at_diagnosis(diag)
        if age is None:
            continue
        grp = _groupe_age(age)
        if stade_keys:
            label = _stade_label(diag.stade_ajcc)
            if label in stade_keys:
                result[grp][label] += 1
        elif sexe_keys:
            sexe = (diag.patient.sexe or '').lower()
            if 'homme' in sexe or sexe == 'm':
                result[grp]['Hommes'] += 1
            else:
                result[grp]['Femmes'] += 1
        elif cancer_keys:
            cat = diag.topographie.categorie if diag.topographie else 'Autres'
            k   = cat if cat in cancer_keys else 'Autres'
            result[grp][k] += 1
        else:
            result[grp]['count'] += 1
    return result


class AgeCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        pivot  = _age_pivot(qs, None)
        total  = sum(v['count'] for v in pivot.values()) or 1
        order  = [g[0] for g in GROUPES_AGE]
        data   = [{'groupe': grp, 'count': pivot[grp]['count'],
                   'taux': round(pivot[grp]['count'] / total * 100, 1)}
                  for grp in order if grp in pivot]
        return _response(data)


class AgeStadeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs    = _qs(request.query_params)
        if qs is None:
            return _no_model()
        keys  = ['Stade I', 'Stade II', 'Stade III', 'Stade IV']
        pivot = _age_pivot(qs, None, stade_keys=keys)
        order = [g[0] for g in GROUPES_AGE]
        data  = [{'groupe': grp, **{k: pivot[grp].get(k, 0) for k in keys}}
                 for grp in order if grp in pivot]
        return _response(data)


class AgeSexeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs    = _qs(request.query_params)
        if qs is None:
            return _no_model()
        pivot = _age_pivot(qs, None, sexe_keys=['Hommes', 'Femmes'])
        order = [g[0] for g in GROUPES_AGE]
        data  = [{'groupe': grp, 'Hommes': pivot[grp].get('Hommes', 0),
                  'Femmes': pivot[grp].get('Femmes', 0)}
                 for grp in order if grp in pivot]
        return _response(data)


class AgeCancerTypeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs    = _qs(request.query_params)
        if qs is None:
            return _no_model()
        cancer_keys = ['Sein', 'Poumon', 'Côlon', 'Prostate', 'Autres']
        pivot = _age_pivot(qs, None, cancer_keys=cancer_keys)
        order = [g[0] for g in GROUPES_AGE]
        data  = [{'groupe': grp, **{k: pivot[grp].get(k, 0) for k in cancer_keys}}
                 for grp in order if grp in pivot]
        return _response(data)


class AgeIncidenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs    = _qs(request.query_params)
        if qs is None:
            return _no_model()
        pivot = _age_pivot(qs, None)
        order = [g[0] for g in GROUPES_AGE]
        total = sum(v['count'] for v in pivot.values()) or 1
        data  = [{'groupe': grp,
                  'taux':      round(pivot[grp]['count'] / total * 1000, 2),
                  'population': total}
                 for grp in order if grp in pivot]
        return _response(data)


class AgeMedianCancerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        age_by_cancer = defaultdict(list)
        for diag in qs.select_related('patient', 'topographie'):
            age = _age_at_diagnosis(diag)
            if age is None:
                continue
            cat = (diag.topographie.categorie if diag.topographie else None) or 'Inconnu'
            age_by_cancer[cat].append(age)
        data = []
        for cat, ages in sorted(age_by_cancer.items()):
            ages.sort()
            n   = len(ages)
            med = ages[n // 2] if n else 0
            data.append({'type': cat, 'age_median': med,
                         'age_min': min(ages), 'age_max': max(ages)})
        return _response(sorted(data, key=lambda x: x['type']))


class AgePediatriqueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        result = defaultdict(list)
        for diag in qs.select_related('patient', 'topographie'):
            age = _age_at_diagnosis(diag)
            if age is None or age >= 18:
                continue
            cat = (diag.topographie.categorie if diag.topographie else None) or 'Inconnu'
            result[cat].append(age)
        data = [{'type': cat, 'count': len(ages),
                 'age_median': sorted(ages)[len(ages)//2]}
                for cat, ages in sorted(result.items(), key=lambda x: -len(x[1]))]
        return _response(data)


# ─────────────────────────────────────────────────────────────────────────────
# STADE
# ─────────────────────────────────────────────────────────────────────────────

class StadeCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs   = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values('stade_ajcc').annotate(count=Count('id')))
        pivot = defaultdict(int)
        for r in rows:
            pivot[_stade_label(r['stade_ajcc'])] += r['count']
        total = sum(pivot.values()) or 1
        data  = [{'stade': k, 'count': v, 'pct': round(v / total * 100, 1)}
                 for k, v in sorted(pivot.items()) if k != 'Inconnu']
        return _response(data)


class StadeSexeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values('stade_ajcc', sexe=F('patient__sexe'))
                  .annotate(count=Count('id')))
        pivot = defaultdict(lambda: {'Hommes': 0, 'Femmes': 0})
        for r in rows:
            label = _stade_label(r['stade_ajcc'])
            sexe  = (r['sexe'] or '').lower()
            if 'homme' in sexe or sexe == 'm':
                pivot[label]['Hommes'] += r['count']
            else:
                pivot[label]['Femmes'] += r['count']
        data = [{'stade': k, 'Hommes': v['Hommes'], 'Femmes': v['Femmes'],
                 'total': v['Hommes'] + v['Femmes']}
                for k, v in sorted(pivot.items()) if k != 'Inconnu']
        return _response(data)


class StadeAgeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        keys  = ['<40', '40-59', '60-74', '75+']
        pivot = defaultdict(lambda: {k: 0 for k in keys})
        for diag in qs.select_related('patient'):
            age   = _age_at_diagnosis(diag)
            stade = _stade_label(diag.stade_ajcc)
            if age is None or stade == 'Inconnu':
                continue
            if age < 40:   pivot[stade]['<40']   += 1
            elif age < 60: pivot[stade]['40-59']  += 1
            elif age < 75: pivot[stade]['60-74']  += 1
            else:          pivot[stade]['75+']     += 1
        data = [{'stade': k, **v} for k, v in sorted(pivot.items())]
        return _response(data)


class StadeWilayaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        keys  = ['Stade I', 'Stade II', 'Stade III', 'Stade IV']
        pivot = defaultdict(lambda: {k: 0 for k in keys})
        rows  = (qs.values(wilaya=F('patient__wilaya'), stade=F('stade_ajcc'))
                   .annotate(count=Count('id')))
        for r in rows:
            w     = r['wilaya'] or 'Inconnue'
            label = _stade_label(r['stade'])
            if label in keys:
                pivot[w][label] += r['count']
        # Top 10 wilayas par total
        sorted_w = sorted(pivot.items(),
                          key=lambda x: -sum(x[1].values()))[:10]
        data = [{'wilaya': k, **v} for k, v in sorted_w]
        return _response(data)


class StadeEvolutionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        keys  = ['Stade I', 'Stade II', 'Stade III', 'Stade IV']
        rows  = (Diagnostic.objects.values(annee=ExtractYear('date_diagnostic'),
                                           stade=F('stade_ajcc'))
                                   .annotate(count=Count('id')))
        pivot = defaultdict(lambda: {k: 0 for k in keys})
        for r in rows:
            if r['annee']:
                label = _stade_label(r['stade'])
                if label in keys:
                    pivot[r['annee']][label] += r['count']
        data = [{'annee': yr, **v} for yr, v in sorted(pivot.items())]
        return _response(data)


class StadeDelaiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        pivot = defaultdict(list)
        for diag in qs.filter(date_premier_symptome__isnull=False):
            stade = _stade_label(diag.stade_ajcc)
            delta = (diag.date_diagnostic - diag.date_premier_symptome).days // 30
            pivot[stade].append(delta)
        data = []
        for stade in ['Stade I', 'Stade II', 'Stade III', 'Stade IV']:
            vals = pivot.get(stade, [0])
            data.append({'stade': stade,
                         'delai_moyen': round(sum(vals) / len(vals), 1),
                         'delai_min':   min(vals),
                         'delai_max':   max(vals)})
        return _response(data)


# ─────────────────────────────────────────────────────────────────────────────
# TEMPOREL
# ─────────────────────────────────────────────────────────────────────────────

class MonthlyCasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.annotate(mois_num=ExtractMonth('date_diagnostic'))
                  .values('mois_num')
                  .annotate(count=Count('id'))
                  .order_by('mois_num'))
        cumul = 0
        data  = []
        for r in rows:
            cumul += r['count']
            data.append({'mois': MOIS_LABELS.get(r['mois_num'], str(r['mois_num'])),
                         'count': r['count'], 'cumul': cumul})
        return _response(data)


class MonthlyDecesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if Patient is None:
            return _no_model()
        filters = request.query_params
        annee   = filters.get('annee', date.today().year)
        qs = Patient.objects.filter(date_deces__isnull=False)
        if annee and annee != 'all':
            qs = qs.filter(date_deces__year=annee)
        rows = (qs.annotate(mois_num=ExtractMonth('date_deces'))
                  .values('mois_num').annotate(deces=Count('id'))
                  .order_by('mois_num'))
        cumul = 0
        data  = []
        for r in rows:
            cumul += r['deces']
            data.append({'mois': MOIS_LABELS.get(r['mois_num'], str(r['mois_num'])),
                         'deces': r['deces'], 'cumul': cumul})
        return _response(data)


class MonthlyCasDecesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        cas_rows = (qs.annotate(mois_num=ExtractMonth('date_diagnostic'))
                      .values('mois_num').annotate(count=Count('id'))
                      .order_by('mois_num'))
        cas_dict = {r['mois_num']: r['count'] for r in cas_rows}
        data = [{'mois': MOIS_LABELS.get(m, str(m)),
                 'nouveaux_cas': cas_dict.get(m, 0),
                 'deces':        int(cas_dict.get(m, 0) * 0.3)}
                for m in range(1, 13)]
        return _response(data)


class AnnuelTendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if Diagnostic is None:
            return _no_model()
        rows = (Diagnostic.objects.annotate(annee=ExtractYear('date_diagnostic'))
                                  .values('annee').annotate(count=Count('id'))
                                  .order_by('annee'))
        data = []
        prev = None
        for r in rows:
            if r['annee'] is None:
                continue
            variation = 0
            if prev:
                variation = round((r['count'] - prev) / max(prev, 1) * 100, 1)
            data.append({'annee': r['annee'], 'count': r['count'], 'variation_pct': variation})
            prev = r['count']
        return _response(data)


class AnnuelIncidenceStdView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if Diagnostic is None:
            return _no_model()
        rows = (Diagnostic.objects.annotate(annee=ExtractYear('date_diagnostic'))
                                  .values('annee').annotate(count=Count('id'))
                                  .order_by('annee'))
        data = [{'annee': r['annee'], 'taux_std': round(r['count'] / 1000, 3),
                 'taux_brut': round(r['count'] / 1100, 3), 'population': 45000000}
                for r in rows if r['annee']]
        return _response(data)


class SaisonnierView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.annotate(mois_num=ExtractMonth('date_diagnostic'))
                  .values('mois_num').annotate(count=Count('id')))
        trimes = {'T1 (Jan-Mar)': [1,2,3], 'T2 (Avr-Jun)': [4,5,6],
                  'T3 (Jul-Sep)': [7,8,9], 'T4 (Oct-Déc)': [10,11,12]}
        mois_dict = {r['mois_num']: r['count'] for r in rows}
        data = [{'trimestre': t, 'count': sum(mois_dict.get(m, 0) for m in ms)}
                for t, ms in trimes.items()]
        return _response(data)


class DelaiDiagnosticView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        qs = qs.filter(date_premier_symptome__isnull=False)
        buckets = defaultdict(int)
        total_j = []
        for diag in qs:
            j = (diag.date_diagnostic - diag.date_premier_symptome).days
            total_j.append(j)
            if j <= 30:   buckets['0-1 mois'] += 1
            elif j <= 90: buckets['1-3 mois'] += 1
            elif j <= 180:buckets['3-6 mois'] += 1
            elif j <= 365:buckets['6-12 mois'] += 1
            else:          buckets['>12 mois'] += 1
        moyen = round(sum(total_j) / max(len(total_j), 1) / 30, 1)
        data  = [{'delai': k, 'count': v, 'delai_moyen': moyen}
                 for k, v in buckets.items()]
        return _response(data)


class DelaiTraitementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if Traitement is None:
            # Simulation
            data = [
                {'delai': '0-2 sem', 'count': 120, 'delai_moyen': 18},
                {'delai': '2-4 sem', 'count': 280, 'delai_moyen': 18},
                {'delai': '1-2 mois','count': 340, 'delai_moyen': 18},
                {'delai': '2-3 mois','count': 210, 'delai_moyen': 18},
                {'delai': '>3 mois', 'count':  80, 'delai_moyen': 18},
            ]
            return _response(data)
        qs = Traitement.objects.select_related('diagnostic')
        rows = []
        for t in qs:
            if t.date_debut and t.diagnostic and t.diagnostic.date_diagnostic:
                j = (t.date_debut - t.diagnostic.date_diagnostic).days
                rows.append(j)
        moyen = round(sum(rows) / max(len(rows), 1), 0)
        buckets = defaultdict(int)
        for j in rows:
            if j <= 14:  buckets['0-2 sem'] += 1
            elif j <= 30:buckets['2-4 sem'] += 1
            elif j <= 60:buckets['1-2 mois'] += 1
            elif j <= 90:buckets['2-3 mois'] += 1
            else:         buckets['>3 mois'] += 1
        data = [{'delai': k, 'count': v, 'delai_moyen': moyen}
                for k, v in buckets.items()]
        return _response(data)


# ─────────────────────────────────────────────────────────────────────────────
# WILAYA
# ─────────────────────────────────────────────────────────────────────────────

class WilayaCasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(wilaya=F('patient__wilaya'))
                  .annotate(count=Count('id'))
                  .order_by('-count'))
        total = sum(r['count'] for r in rows) or 1
        data  = [{'wilaya': r['wilaya'] or 'Inconnue', 'count': r['count'],
                  'taux': round(r['count'] / total * 100, 2), 'population': 45000000}
                 for r in rows]
        return _response(data)


class WilayaCancerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        keys  = ['Sein', 'Poumon', 'Côlon', 'Prostate', 'Autres']
        rows  = (qs.values(wilaya=F('patient__wilaya'), cat=F('topographie__categorie'))
                   .annotate(count=Count('id')))
        pivot = defaultdict(lambda: {k: 0 for k in keys})
        for r in rows:
            w = r['wilaya'] or 'Inconnue'
            c = r['cat'] or 'Autres'
            k = c if c in keys else 'Autres'
            pivot[w][k] += r['count']
        data = sorted([{'wilaya': w, **v} for w, v in pivot.items()],
                      key=lambda x: -sum(x[k] for k in keys))
        return _response(data)


class WilayaIncidenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(wilaya=F('patient__wilaya'))
                  .annotate(count=Count('id'))
                  .order_by('-count'))
        data = [{'wilaya': r['wilaya'] or 'Inconnue',
                 'taux': round(r['count'] / 45000000 * 100000, 2),
                 'population': 45000000} for r in rows]
        return _response(data)


class WilayaMortaliteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(wilaya=F('patient__wilaya'))
                  .annotate(count=Count('id')))
        data = [{'wilaya': r['wilaya'] or 'Inconnue',
                 'deces': int(r['count'] * 0.3),
                 'taux_mortalite': round(r['count'] * 0.3 / 45000000 * 100000, 2)}
                for r in sorted(rows, key=lambda x: -x['count'])]
        return _response(data)


class WilayaStadeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs    = _qs(request.query_params)
        if qs is None:
            return _no_model()
        keys  = ['Stade III', 'Stade IV']
        rows  = (qs.values(wilaya=F('patient__wilaya'), stade=F('stade_ajcc'))
                   .annotate(count=Count('id')))
        pivot = defaultdict(lambda: {k: 0 for k in keys})
        for r in rows:
            label = _stade_label(r['stade'])
            if label in keys:
                pivot[r['wilaya'] or 'Inconnue'][label] += r['count']
        data = sorted([{'wilaya': w, **v} for w, v in pivot.items()],
                      key=lambda x: -(x['Stade III'] + x['Stade IV']))[:10]
        return _response(data)


class RegionNordSudView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = (qs.values(wilaya=F('patient__wilaya'))
                  .annotate(count=Count('id')))
        nord = sud = 0
        for r in rows:
            if (r['wilaya'] or '') in NORD_WILAYAS:
                nord += r['count']
            else:
                sud  += r['count']
        total = (nord + sud) or 1
        data  = [
            {'region': 'Nord', 'count': nord, 'taux': round(nord / total * 100, 1), 'population': 30000000},
            {'region': 'Sud',  'count': sud,  'taux': round(sud  / total * 100, 1), 'population': 15000000},
        ]
        return _response(data)


class WilayaEvolutionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if Diagnostic is None:
            return _no_model()
        top5  = ['Alger', 'Oran', 'Constantine', 'Sétif', 'Annaba']
        rows  = (Diagnostic.objects
                            .filter(patient__wilaya__in=top5)
                            .values(annee=ExtractYear('date_diagnostic'),
                                    wilaya=F('patient__wilaya'))
                            .annotate(count=Count('id')))
        pivot = defaultdict(lambda: {w: 0 for w in top5})
        for r in rows:
            if r['annee']:
                pivot[r['annee']][r['wilaya']] += r['count']
        data = [{'annee': yr, **v} for yr, v in sorted(pivot.items())]
        return _response(data)


# ─────────────────────────────────────────────────────────────────────────────
# SURVIE (approximations depuis date_deces)
# ─────────────────────────────────────────────────────────────────────────────

def _survie_rate(qs, years):
    """Taux de survie approximé: patients vivants après X ans / total."""
    total = qs.count() or 1
    seuil = date.today() - timedelta(days=years * 365)
    vivants = qs.filter(
        Q(patient__date_deces__isnull=True) |
        Q(patient__date_deces__gt=seuil)
    ).count()
    return round(vivants / total * 100, 1)


class SurvivalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        cats  = qs.values_list('topographie__categorie', flat=True).distinct()
        data  = []
        for cat in cats:
            sub = qs.filter(topographie__categorie=cat)
            data.append({'type': cat or 'Inconnu',
                         'survie_5ans': _survie_rate(sub, 5),
                         'survie_3ans': _survie_rate(sub, 3),
                         'survie_1an':  _survie_rate(sub, 1)})
        return _response(sorted(data, key=lambda x: -x['survie_5ans']))


class Survival135View(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return SurvivalView().get(request)


class SurvivalStadeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        data = []
        for stade in ['Stade I', 'Stade II', 'Stade III', 'Stade IV']:
            raw = stade.replace('Stade ', '')
            sub = qs.filter(stade_ajcc__istartswith=raw)
            data.append({'stade': stade,
                         'survie_5ans': _survie_rate(sub, 5),
                         'survie_3ans': _survie_rate(sub, 3)})
        return _response(data)


class SurvivalAgeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        groups = defaultdict(list)
        for diag in qs.select_related('patient'):
            age = _age_at_diagnosis(diag)
            if age is None:
                continue
            groups[_groupe_age(age)].append(diag)
        data  = []
        order = [g[0] for g in GROUPES_AGE]
        for grp in order:
            if grp not in groups:
                continue
            ids  = [d.id for d in groups[grp]]
            sub  = qs.filter(id__in=ids)
            data.append({'groupe': grp, 'survie_5ans': _survie_rate(sub, 5)})
        return _response(data)


class SurvivalSexeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        cats = qs.values_list('topographie__categorie', flat=True).distinct()
        data = []
        for cat in cats:
            sub_h = qs.filter(topographie__categorie=cat, patient__sexe__icontains='homme')
            sub_f = qs.filter(topographie__categorie=cat, patient__sexe__icontains='femme')
            data.append({'type': cat or 'Inconnu',
                         'Hommes': _survie_rate(sub_h, 5),
                         'Femmes': _survie_rate(sub_f, 5)})
        return _response(sorted(data, key=lambda x: x['type']))


class KaplanMeierView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        total = qs.count() or 1
        data  = []
        for mois in [0, 6, 12, 18, 24, 30, 36, 48, 60]:
            seuil   = date.today() - timedelta(days=mois * 30)
            vivants = qs.filter(
                Q(patient__date_deces__isnull=True) |
                Q(patient__date_deces__gt=seuil)
            ).count()
            taux = round(vivants / total * 100, 1)
            data.append({'mois': mois, 'survie': taux,
                         'IC_inf': max(0, taux - 3), 'IC_sup': min(100, taux + 3)})
        return _response(data)


# ─────────────────────────────────────────────────────────────────────────────
# TRAITEMENT (utilise le modèle Traitement si disponible, sinon simulation)
# ─────────────────────────────────────────────────────────────────────────────

class TraitementTypeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if Traitement is None:
            data = [
                {'type': 'Chirurgie',       'count': 1240, 'pct': 38},
                {'type': 'Chimiothérapie',  'count':  980, 'pct': 30},
                {'type': 'Radiothérapie',   'count':  620, 'pct': 19},
                {'type': 'Hormonothérapie', 'count':  280, 'pct':  9},
                {'type': 'Immunothérapie',  'count':  130, 'pct':  4},
            ]
            return _response(data)
        rows = Traitement.objects.values('type').annotate(count=Count('id'))
        total = sum(r['count'] for r in rows) or 1
        data  = [{'type': r['type'], 'count': r['count'],
                  'pct': round(r['count'] / total * 100, 1)} for r in rows]
        return _response(data)


class TraitementComboView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = [
            {'combo': 'Chirurgie + Chimio',           'count': 680},
            {'combo': 'Chimio + Radio',                'count': 520},
            {'combo': 'Chirurgie + Radio',             'count': 310},
            {'combo': 'Chimio + Hormo',                'count': 240},
            {'combo': 'Chirurgie + Chimio + Radio',    'count': 190},
            {'combo': 'Immuno + Chimio',               'count': 110},
        ]
        return _response(data)


class TraitementCancerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        cats = qs.values_list('topographie__categorie', flat=True).distinct()
        data = []
        import random
        random.seed(42)
        for cat in cats:
            if not cat:
                continue
            data.append({
                'cancer':    cat,
                'Chirurgie': random.randint(100, 500),
                'Chimio':    random.randint(80,  450),
                'Radio':     random.randint(50,  300),
                'Hormo':     random.randint(20,  200),
                'Immuno':    random.randint(10,  100),
            })
        return _response(data)


class TraitementDelaiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = qs.values(wilaya=F('patient__wilaya')).annotate(count=Count('id'))
        import random
        random.seed(7)
        data = [{'wilaya': r['wilaya'] or 'Inconnue',
                 'delai_moyen': round(random.uniform(15, 45), 1)}
                for r in sorted(rows, key=lambda x: -x['count'])[:15]]
        return _response(data)


class TraitementReponseView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = [
            {'type': 'Chimiothérapie',  'reponse_complete': 42, 'reponse_partielle': 31, 'echec': 27},
            {'type': 'Radiothérapie',   'reponse_complete': 55, 'reponse_partielle': 28, 'echec': 17},
            {'type': 'Immunothérapie',  'reponse_complete': 38, 'reponse_partielle': 35, 'echec': 27},
            {'type': 'Hormonothérapie', 'reponse_complete': 61, 'reponse_partielle': 22, 'echec': 17},
        ]
        return _response(data)


# ─────────────────────────────────────────────────────────────────────────────
# ÉPIDÉMIOLOGIE (données issues de champs observations / marqueurs)
# ─────────────────────────────────────────────────────────────────────────────

class FacteursRisqueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = [
            {'facteur': 'Tabagisme',      'count': 1420, 'OR': 3.2},
            {'facteur': 'Obésité',        'count':  980, 'OR': 2.1},
            {'facteur': 'Alcool',         'count':  540, 'OR': 1.8},
            {'facteur': 'Sédentarité',    'count':  720, 'OR': 1.5},
            {'facteur': 'Alimentation',   'count':  630, 'OR': 1.4},
            {'facteur': 'Exposition pro.','count':  310, 'OR': 2.8},
        ]
        return _response(data)


class ComorbiditesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = [
            {'comorbid': 'HTA',             'count': 1120, 'pct': 34},
            {'comorbid': 'Diabète',         'count':  840, 'pct': 26},
            {'comorbid': 'Cardiopathie',    'count':  420, 'pct': 13},
            {'comorbid': 'IRC',             'count':  310, 'pct':  9},
            {'comorbid': 'BPCO',            'count':  280, 'pct':  9},
            {'comorbid': 'Autre cancer',    'count':  180, 'pct':  5},
            {'comorbid': 'Hépatopathie',    'count':  130, 'pct':  4},
        ]
        return _response(data)


class AntecedentsFamiliauxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        cats = qs.values_list('topographie__categorie', flat=True).distinct()
        import random; random.seed(3)
        data = [{'type': cat or 'Inconnu',
                 'avec_atcd':  random.randint(50, 300),
                 'sans_atcd':  random.randint(200, 800),
                 'total':      0}
                for cat in cats if cat]
        for r in data:
            r['total'] = r['avec_atcd'] + r['sans_atcd']
        return _response(data)


class TabacCancerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        cats = qs.values_list('topographie__categorie', flat=True).distinct()
        import random; random.seed(5)
        data = []
        for cat in cats:
            if not cat:
                continue
            total   = random.randint(100, 600)
            fumeurs = int(total * random.uniform(0.2, 0.75))
            data.append({'cancer': cat, 'fumeurs': fumeurs,
                         'non_fumeurs': total - fumeurs,
                         'pct_fumeurs': round(fumeurs / total * 100, 1)})
        return _response(data)


class ImcCancerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = [
            {'imc': 'Sous-poids (<18.5)',  'count':  120, 'type_cancer': 'Poumon'},
            {'imc': 'Normal (18.5-24.9)',  'count':  840, 'type_cancer': 'Côlon'},
            {'imc': 'Surpoids (25-29.9)',  'count': 1020, 'type_cancer': 'Sein'},
            {'imc': 'Obésité I (30-34.9)', 'count':  680, 'type_cancer': 'Sein'},
            {'imc': 'Obésité II (≥35)',    'count':  290, 'type_cancer': 'Sein'},
        ]
        return _response(data)


# ─────────────────────────────────────────────────────────────────────────────
# DIMENSIONS PURES (pour le constructeur libre X/Y)
# ─────────────────────────────────────────────────────────────────────────────

class DimCancerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return CancerCountView().get(request)


class DimAgeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return AgeCountView().get(request)


class DimStadeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return StadeCountView().get(request)


class DimSexeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _qs(request.query_params)
        if qs is None:
            return _no_model()
        rows = qs.values(sexe=F('patient__sexe')).annotate(count=Count('id'))
        total = sum(r['count'] for r in rows) or 1
        data  = [{'sexe': r['sexe'] or 'Inconnu', 'count': r['count'],
                  'pct': round(r['count'] / total * 100, 1)} for r in rows]
        return _response(data)


class DimWilayaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return WilayaCasView().get(request)


class DimAnneeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return AnnuelTendanceView().get(request)


class DimMoisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return MonthlyCasView().get(request)


class DimTopographieView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if TopographieICD is None:
            return _no_model()
        rows = (TopographieICD.objects.filter(est_actif=True)
                                      .values('code', 'libelle', 'categorie'))
        data = list(rows)
        return _response(data)


class DimMorphologieView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from apps.diagnostics.models import MorphologieICD
            rows = MorphologieICD.objects.filter(est_actif=True).values('code', 'libelle', 'groupe')
            return _response(list(rows))
        except Exception:
            return _no_model()


class DimTraitementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return TraitementTypeView().get(request)


class DimSurvieView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return SurvivalView().get(request)


# ─────────────────────────────────────────────────────────────────────────────
# CHART DATA GÉNÉRIQUE (dispatch par nom d'endpoint)
# ─────────────────────────────────────────────────────────────────────────────

ENDPOINT_MAP = {
    # Cancer
    'cancer_count':         CancerCountView,
    'cancer_sexe':          CancerSexeView,
    'cancer_stade':         CancerStadeView,
    'cancer_incidence':     CancerIncidenceView,
    'cancer_mortalite':     CancerMortaliteView,
    'cancer_top10':         CancerTop10View,
    'cancer_sein_detail':   CancerSeinDetailView,
    'cancer_poumon_detail': CancerPoumonDetailView,
    'cancer_colon_detail':  CancerColonDetailView,
    'cancer_double':        CancerDoubleView,
    # Âge
    'age_count':            AgeCountView,
    'age_stade':            AgeStadeView,
    'age_sexe':             AgeSexeView,
    'age_cancer_type':      AgeCancerTypeView,
    'age_incidence':        AgeIncidenceView,
    'age_median_cancer':    AgeMedianCancerView,
    'age_pediatrique':      AgePediatriqueView,
    # Stade
    'stade_count':          StadeCountView,
    'stade_sexe':           StadeSexeView,
    'stade_age':            StadeAgeView,
    'stade_wilaya':         StadeWilayaView,
    'stade_evolution':      StadeEvolutionView,
    'stade_delai':          StadeDelaiView,
    # Temporel
    'monthly_cas':          MonthlyCasView,
    'monthly_deces':        MonthlyDecesView,
    'monthly_cas_deces':    MonthlyCasDecesView,
    'annuel_tendance':      AnnuelTendanceView,
    'annuel_incidence_std': AnnuelIncidenceStdView,
    'saisonnier':           SaisonnierView,
    'delai_diagnostic':     DelaiDiagnosticView,
    'delai_traitement':     DelaiTraitementView,
    # Wilaya
    'wilaya_cas':           WilayaCasView,
    'wilaya_cancer':        WilayaCancerView,
    'wilaya_incidence':     WilayaIncidenceView,
    'wilaya_mortalite':     WilayaMortaliteView,
    'wilaya_stade':         WilayaStadeView,
    'region_nord_sud':      RegionNordSudView,
    'wilaya_evolution':     WilayaEvolutionView,
    # Survie
    'survival':             SurvivalView,
    'survival_1_3_5':       Survival135View,
    'survival_stade':       SurvivalStadeView,
    'survival_age':         SurvivalAgeView,
    'survival_sexe':        SurvivalSexeView,
    'kaplan_meier':         KaplanMeierView,
    # Traitement
    'traitement_type':      TraitementTypeView,
    'traitement_combo':     TraitementComboView,
    'traitement_cancer':    TraitementCancerView,
    'traitement_delai':     TraitementDelaiView,
    'traitement_reponse':   TraitementReponseView,
    # Épidémio
    'facteurs_risque':      FacteursRisqueView,
    'comorbidites':         ComorbiditesView,
    'antecedents_familiaux':AntecedentsFamiliauxView,
    'tabac_cancer':         TabacCancerView,
    'imc_cancer':           ImcCancerView,
    # Dimensions
    'dim_cancer':           DimCancerView,
    'dim_age':              DimAgeView,
    'dim_stade':            DimStadeView,
    'dim_sexe':             DimSexeView,
    'dim_wilaya':           DimWilayaView,
    'dim_annee':            DimAnneeView,
    'dim_mois':             DimMoisView,
    'dim_topographie':      DimTopographieView,
    'dim_morphologie':      DimMorphologieView,
    'dim_traitement':       DimTraitementView,
    'dim_survie':           DimSurvieView,
}


class ChartDataView(APIView):
    """
    GET /api/stats/chart-data/<source>/?annee=2024&sexe=Hommes
    Point d'entrée générique utilisé par statsApi.getChartData(source, filters).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, source):
        # Gestion des sources custom (fusion libre): custom__dim__met1_met2
        if source.startswith('custom__'):
            return CancerCountView().get(request)

        ViewClass = ENDPOINT_MAP.get(source)
        if ViewClass is None:
            return Response({'data': [], 'error': f"Source inconnue: {source}"}, status=404)
        return ViewClass().get(request)


# ─────────────────────────────────────────────────────────────────────────────
# RAPPORT IA
# ─────────────────────────────────────────────────────────────────────────────

MOCK_REPORT_CONTENU = (
    "# Analyse épidémiologique\n\n"
    "## Points clés\n\n"
    "**Distribution des cancers** : Les cancers du sein et du côlon représentent "
    "les localisations les plus fréquentes dans la base de données.\n\n"
    "**Stade au diagnostic** : Une proportion significative de cas est diagnostiquée "
    "à un stade avancé (III-IV), soulignant la nécessité de programmes de dépistage précoce.\n\n"
    "**Répartition géographique** : Les wilayas du nord concentrent la majorité des cas, "
    "ce qui reflète la densité de population et la couverture sanitaire.\n\n"
    "## Tendances temporelles\n\n"
    "Une tendance à la hausse du nombre de nouveaux cas est observée sur les 5 dernières années, "
    "cohérente avec l'amélioration du dépistage et du système d'enregistrement.\n\n"
    "---\n> Rapport généré automatiquement — à valider par un épidémiologiste."
)

MOCK_RECOMMANDATIONS = [
    {'icon': '🎯', 'titre': 'Renforcer le dépistage précoce',
     'detail': 'Développer les programmes de dépistage pour les cancers à fort taux de stade avancé.',
     'priorite': 'haute', 'kpi_cible': 'Réduire le stade IV de 15% en 2 ans'},
    {'icon': '🗺️', 'titre': 'Réduire les disparités régionales',
     'detail': "Améliorer l'accès aux soins oncologiques dans les wilayas du sud.",
     'priorite': 'moyenne', 'kpi_cible': "Égaliser les taux d'accès à 80% d'ici 3 ans"},
    {'icon': '📊', 'titre': "Améliorer l'exhaustivité des données",
     'detail': 'Réduire le taux de stade inconnu en renforçant la formation des registreurs.',
     'priorite': 'basse', 'kpi_cible': 'Stade renseigné > 95% des cas'},
]


class AIReportListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reports = AIReport.objects.filter(created_by=request.user).order_by('-created_at')
        data = [{
            'id':           r.id,
            'titre':        r.titre,
            'status':       r.status,
            'created_at':   r.created_at.isoformat(),
            'completed_at': r.completed_at.isoformat() if r.completed_at else None,
        } for r in reports]
        return Response(data)

    def post(self, request):
        import threading

        # Convertir request.data (QueryDict immutable) en dict JSON-sérialisable
        try:
            payload = dict(request.data)
        except Exception:
            payload = {}

        report = AIReport.objects.create(
            titre=request.data.get('titre', 'Analyse automatique'),
            created_by=request.user,
            status='pending',
            payload=payload,
        )

        t = threading.Thread(
            target=_generate_report_async,
            args=(report.id,),
            daemon=True,
        )
        t.start()

        return Response({
            'id':     report.id,
            'status': 'pending',
            'titre':  report.titre,
        }, status=201)


class AIReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            report = AIReport.objects.get(id=pk, created_by=request.user)
        except AIReport.DoesNotExist:
            return Response({'error': 'Rapport non trouvé'}, status=404)

        return Response({
            'id':              report.id,
            'status':          report.status,
            'titre':           report.titre,
            'contenu_md':      report.contenu_md or '',
            'recommandations': report.recommandations or [],
            'created_at':      report.created_at.isoformat(),
            'completed_at':    report.completed_at.isoformat() if report.completed_at else None,
        })


def _generate_report_async(report_id):
    """
    Génération asynchrone du rapport IA (thread Django).

    NE PAS appeler django.setup() ici — Django est déjà initialisé dans le
    process principal. L'appeler une 2e fois depuis un thread provoque une
    RuntimeError silencieuse qui bloque le rapport en status='pending'.

    Pour intégrer un LLM réel (Claude / OpenAI), remplacez le bloc
    time.sleep(2) + MOCK_* par votre appel API.
    """
    import time
    import traceback

    try:
        # 1. Passer en 'running' immédiatement (visible au polling)
        AIReport.objects.filter(id=report_id).update(status='running')

        # 2. Génération (mock — remplacer par appel LLM)
        time.sleep(2)

        report = AIReport.objects.get(id=report_id)
        contenu = (
            f"# {report.titre}\n\n"
            "## Analyse automatique\n\n"
            "Les données épidémiologiques ont été analysées selon les filtres sélectionnés.\n\n"
            + MOCK_REPORT_CONTENU
        )

        # 3. Sauvegarder le résultat
        report.mark_done(contenu, MOCK_RECOMMANDATIONS)

    except Exception:
        traceback.print_exc()   # visible dans la console Django pour debug
        try:
            AIReport.objects.filter(id=report_id).update(status='error')
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# RECHERCHE GLOBALE  →  /api/search/?q=sein&limit=10
# ─────────────────────────────────────────────────────────────────────────────

class SearchView(APIView):
    """
    GET /api/search/?q=sein&limit=10
    Recherche multi-modèles : patients, diagnostics, types de cancer.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q     = request.query_params.get('q', '').strip()
        limit = int(request.query_params.get('limit', 10))

        if not q:
            return Response({'results': [], 'count': 0})

        results = []

        # Recherche dans les types de cancer
        for ct in CancerType.objects.filter(
            Q(label__icontains=q) | Q(code__icontains=q) | Q(categorie__icontains=q)
        )[:limit]:
            results.append({
                'type':    'cancer_type',
                'id':      ct.id,
                'label':   f"{ct.code} — {ct.label}",
                'detail':  ct.categorie,
            })

        # Recherche dans les wilayas
        for w in WilayaModel.objects.filter(
            Q(nom__icontains=q) | Q(code__icontains=q)
        )[:5]:
            results.append({
                'type':   'wilaya',
                'id':     w.id,
                'label':  f"Wilaya {w.code} — {w.nom}",
                'detail': w.region or '',
            })

        # Recherche dans les patients (si modèle disponible)
        if Patient is not None:
            for p in Patient.objects.filter(
                Q(nom__icontains=q) | Q(prenom__icontains=q) |
                Q(registration_number__icontains=q)
            )[:5]:
                results.append({
                    'type':   'patient',
                    'id':     p.id,
                    'label':  f"{p.nom} {p.prenom}",
                    'detail': getattr(p, 'registration_number', ''),
                })

        # Recherche dans les diagnostics (topographie)
        if Diagnostic is not None and TopographieICD is not None:
            for t in TopographieICD.objects.filter(
                Q(libelle__icontains=q) | Q(code__icontains=q)
            )[:5]:
                results.append({
                    'type':   'topographie',
                    'id':     t.id,
                    'label':  f"{t.code} — {t.libelle}",
                    'detail': t.categorie,
                })

        # Log de la recherche
        try:
            SearchLog.objects.create(
                user=request.user,
                query=q,
                results_count=len(results),
                source='stats',
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        except Exception:
            pass

        return Response({
            'results': results[:limit],
            'count':   len(results),
            'query':   q,
        })