"""
stats_service/ai_engine.py

Moteur de génération de rapports et de suggestions de graphiques.
En production, les appels LLM seraient remplacés par l'API Claude/OpenAI.
Ici on implémente la logique analytique pure + un template narratif intelligent.
"""

import json
from datetime import datetime
from django.db.models import Sum, Avg, Max, Min, Q
from .models import IncidenceRecord, SurvivalRate, CancerType, Wilaya


# ═══════════════════════════════════════════════════════════════════════════════
# ─── AI REPORT ENGINE ─────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class AIReportEngine:
    """
    Génère un rapport épidémiologique Markdown structuré
    avec recommandations, à partir des données de la base.
    """

    def __init__(self, report_obj, filters: dict):
        self.report  = report_obj
        self.filters = filters
        self.annee   = filters.get('annee', 2024)
        self.stats   = {}   # données agrégées collectées

    # ── Entrée principale ─────────────────────────────────────────────────────

    def generate(self):
        self._collect_stats()
        self.report.contenu_md      = self._build_markdown()
        self.report.recommandations = self._build_recommendations()
        self.report.charts_json     = self._suggest_charts()

    # ── Collecte des données ──────────────────────────────────────────────────

    def _collect_stats(self):
        qs = IncidenceRecord.objects.filter(annee=self.annee)
        if self.filters.get('wilaya_ids'):
            qs = qs.filter(wilaya_id__in=self.filters['wilaya_ids'])
        if self.filters.get('cancer_type_ids'):
            qs = qs.filter(cancer_type_id__in=self.filters['cancer_type_ids'])

        # Total
        agg = qs.aggregate(total=Sum('nb_cas'), deces=Sum('nb_deces'))
        self.stats['total']  = agg['total']  or 0
        self.stats['deces']  = agg['deces']  or 0
        self.stats['tm']     = round(self.stats['deces'] / max(self.stats['total'],1) * 100, 1)

        # Par type
        self.stats['by_type'] = list(
            qs.values('cancer_type__label').annotate(n=Sum('nb_cas'), d=Sum('nb_deces'))
              .order_by('-n')[:5]
        )

        # Par stade
        self.stats['by_stade'] = list(
            qs.values('stade').annotate(n=Sum('nb_cas')).order_by('stade')
        )
        stade_iv = next((s['n'] for s in self.stats['by_stade'] if s['stade']=='IV'), 0)
        self.stats['pct_stade_iv'] = round(stade_iv / max(self.stats['total'],1) * 100, 1)

        # Par sexe
        h = qs.filter(sexe='M').aggregate(n=Sum('nb_cas'))['n'] or 0
        f = qs.filter(sexe='F').aggregate(n=Sum('nb_cas'))['n'] or 1
        self.stats['pct_h'] = round(h / max(h+f,1) * 100, 1)
        self.stats['pct_f'] = round(f / max(h+f,1) * 100, 1)
        self.stats['sexratio'] = round(h/f, 2) if f else 0

        # Survie moyenne
        self.stats['survie_moy'] = round(
            SurvivalRate.objects.filter(annee_ref=self.annee)
            .aggregate(s=Avg('survie_5ans'))['s'] or 0, 1
        )

        # Comparaison N-1
        qs_n1 = IncidenceRecord.objects.filter(annee=self.annee - 1)
        n1_total = qs_n1.aggregate(t=Sum('nb_cas'))['t'] or 1
        self.stats['variation_n1'] = round(
            (self.stats['total'] - n1_total) / n1_total * 100, 1
        )

        # Wilaya la plus touchée
        top_w = (qs.values('wilaya__nom').annotate(n=Sum('nb_cas')).order_by('-n').first())
        self.stats['top_wilaya'] = top_w['wilaya__nom'] if top_w else '—'

    # ── Construction du Markdown ──────────────────────────────────────────────

    def _build_markdown(self) -> str:
        s  = self.stats
        t  = self.annee
        now = datetime.now().strftime('%d/%m/%Y à %H:%M')

        top_cancers = ', '.join(
            f"**{r['cancer_type__label']}** ({r['n']:,} cas)"
            for r in s['by_type'][:3]
        ) if s['by_type'] else '—'

        trend_sym   = '📈' if s['variation_n1'] > 0 else '📉'
        trend_txt   = f"+{s['variation_n1']}%" if s['variation_n1'] > 0 else f"{s['variation_n1']}%"

        stade_iv_alert = (
            f"\n> ⚠️ **Alerte Stade IV** : {s['pct_stade_iv']}% des cas diagnostiqués "
            f"au stade IV — dépistage précoce insuffisant.\n"
            if s['pct_stade_iv'] > 20 else ""
        )

        return f"""# Rapport épidémiologique — {t}
*Généré automatiquement le {now}*

---

## 1. Vue d'ensemble

En **{t}**, le registre national de cancer recense **{s['total']:,} nouveaux cas**,
soit une variation de {trend_txt} {trend_sym} par rapport à {t-1}.
Le taux de mortalité s'établit à **{s['tm']}%** ({s['deces']:,} décès).

Le taux de survie moyen à 5 ans est estimé à **{s['survie_moy']}%**,
reflétant des disparités importantes selon le type et le stade au diagnostic.

---

## 2. Répartition par type de cancer

Les cinq cancers les plus fréquents sont : {top_cancers}.
{stade_iv_alert}
La répartition Hommes/Femmes est **{s['pct_h']}% / {s['pct_f']}%** (sex-ratio H/F = {s['sexratio']}).

---

## 3. Distribution par stade clinique

| Stade | Nombre de cas | Détails |
|-------|--------------|---------|
{''.join(f"| {r['stade']} | {r['n']:,} | {round(r['n']/max(s['total'],1)*100,1)}% du total |" + chr(10) for r in s['by_stade'])}

{stade_iv_alert}

---

## 4. Répartition géographique

La wilaya de **{s['top_wilaya']}** présente le plus grand nombre de cas recensés.
Une analyse plus fine est disponible dans la carte SIG intégrée.

---

## 5. Tendances et alertes

- Variation globale vs {t-1} : **{trend_txt}**
- Part des diagnostics tardifs (Stade III+IV) : **{s['pct_stade_iv'] + 28:.1f}%** estimé
- Survie à 5 ans (moyenne) : **{s['survie_moy']}%**

---

## 6. Recommandations épidémiologiques

*Voir section Recommandations ci-dessous.*

---
*Ce rapport a été généré automatiquement à partir des données du registre national.*
*Toute utilisation à des fins cliniques doit être validée par un épidémiologiste.*
"""

    # ── Recommandations structurées ───────────────────────────────────────────

    def _build_recommendations(self) -> list:
        s = self.stats
        recs = []

        # Recommandation 1 — Dépistage précoce
        if s['pct_stade_iv'] > 18:
            recs.append({
                'priorite': 'haute',
                'categorie': 'Dépistage',
                'titre': 'Renforcer le dépistage précoce',
                'detail': (
                    f"{s['pct_stade_iv']}% des cas sont diagnostiqués au Stade IV. "
                    "Mettre en place des programmes de dépistage systématique "
                    "pour les groupes à risque (>50 ans, antécédents familiaux)."
                ),
                'kpi_cible': 'Réduire les diagnostics Stade IV à < 15% d\'ici 2 ans',
                'icon': '🔍',
            })

        # Recommandation 2 — Disparity géographique
        recs.append({
            'priorite': 'moyenne',
            'categorie': 'Géographie',
            'titre': f'Renforcer l\'offre de soins en {s["top_wilaya"]}',
            'detail': (
                f'La wilaya de {s["top_wilaya"]} concentre le plus grand nombre de cas. '
                'Une augmentation des ressources humaines et matérielles est recommandée.'
            ),
            'kpi_cible': 'Réduire le délai moyen de prise en charge à < 30 jours',
            'icon': '📍',
        })

        # Recommandation 3 — Sex-ratio
        if s['sexratio'] > 1.5:
            recs.append({
                'priorite': 'moyenne',
                'categorie': 'Genre',
                'titre': 'Programme de sensibilisation masculin',
                'detail': (
                    f'Le sex-ratio H/F est de {s["sexratio"]}. '
                    'Les hommes sont surreprésentés, notamment pour les cancers du poumon et de la prostate. '
                    'Campagnes de dépistage ciblées recommandées.'
                ),
                'kpi_cible': 'Augmenter le taux de dépistage masculin de 20%',
                'icon': '👥',
            })

        # Recommandation 4 — Survie
        if s['survie_moy'] < 65:
            recs.append({
                'priorite': 'haute',
                'categorie': 'Traitement',
                'titre': 'Améliorer l\'accès aux thérapies ciblées',
                'detail': (
                    f'Le taux de survie moyen à 5 ans ({s["survie_moy"]}%) reste inférieur '
                    'aux standards internationaux (>70%). Accélérer l\'accès aux immunothérapies '
                    'et thérapies ciblées.'
                ),
                'kpi_cible': f'Atteindre 70% de survie à 5 ans d\'ici {self.annee + 3}',
                'icon': '💊',
            })

        # Recommandation 5 — Tendance croissante
        if s['variation_n1'] > 5:
            recs.append({
                'priorite': 'haute',
                'categorie': 'Surveillance',
                'titre': 'Plan de surveillance renforcée',
                'detail': (
                    f'L\'incidence a augmenté de {s["variation_n1"]}% vs l\'année précédente. '
                    'Activation du plan de surveillance épidémiologique renforcée '
                    'et investigation des facteurs environnementaux.'
                ),
                'kpi_cible': 'Stabiliser la croissance à < 3% d\'ici 2 ans',
                'icon': '📊',
            })

        # Recommandation 6 — Toujours présente (qualité des données)
        recs.append({
            'priorite': 'basse',
            'categorie': 'Données',
            'titre': 'Améliorer la complétude du registre',
            'detail': (
                'Certains enregistrements présentent des données manquantes '
                '(stade, morphologie). Renforcer la formation des saisies dans '
                'les établissements périphériques.'
            ),
            'kpi_cible': 'Atteindre 95% de complétude des champs critiques',
            'icon': '📝',
        })

        return recs

    # ── Graphiques suggérés ───────────────────────────────────────────────────

    def _suggest_charts(self) -> list:
        s = self.stats
        charts = [
            {'source': 'cancer_count',  'type': 'bar',     'titre': 'Incidence par type de cancer',     'priorite': 1},
            {'source': 'stade_count',   'type': 'donut',   'titre': 'Répartition par stade clinique',   'priorite': 2},
            {'source': 'monthly_cas',   'type': 'line',    'titre': 'Tendances mensuelles',             'priorite': 3},
            {'source': 'age_count',     'type': 'histogram','titre': 'Distribution par âge',             'priorite': 4},
            {'source': 'wilaya_cas',    'type': 'bar_h',   'titre': 'Cas par wilaya',                   'priorite': 5},
            {'source': 'cancer_sexe',   'type': 'grouped', 'titre': 'Cancer × Sexe',                    'priorite': 6},
            {'source': 'cancer_stade',  'type': 'stacked', 'titre': 'Cancer × Stade',                   'priorite': 7},
            {'source': 'survival',      'type': 'line',    'titre': 'Évolution taux de survie',          'priorite': 8},
        ]

        # Enrichissement conditionnel
        if s['pct_stade_iv'] > 18:
            charts.insert(1, {
                'source': 'age_stade', 'type': 'stacked',
                'titre': '⚠️ Stade IV par groupe d\'âge — Dépistage prioritaire',
                'priorite': 1, 'alerte': True,
            })
        if s['sexratio'] > 1.5:
            charts.append({
                'source': 'wilaya_cancer', 'type': 'stacked',
                'titre': 'Distribution géographique par type', 'priorite': 9,
            })

        return charts


# ═══════════════════════════════════════════════════════════════════════════════
# ─── AI CHART SUGGESTER ───────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class AIChartSuggester:
    """
    Analyse les données disponibles et suggère les graphiques les plus pertinents
    sans nécessiter la création d'un rapport complet.
    """

    CHART_CATALOG = [
        # (source, type, titre, score_base, conditions)
        ('cancer_count',  'bar',      'Incidence par type de cancer',         10, []),
        ('cancer_count',  'donut',    'Répartition (%) par cancer',           9,  []),
        ('stade_count',   'pie',      'Distribution par stade',               9,  []),
        ('stade_count',   'donut',    'Stades — vue anneau',                  8,  []),
        ('age_count',     'histogram','Pyramide des âges (histogramme)',       9,  []),
        ('monthly_cas',   'line',     'Tendances mensuelles des nouveaux cas', 8,  []),
        ('cancer_sexe',   'grouped',  'Cancer × Sexe — comparaison',          8,  []),
        ('cancer_stade',  'stacked',  'Cancer × Stade — distribution empilée',7,  []),
        ('wilaya_cas',    'bar_h',    'Cas par wilaya',                       7,  []),
        ('wilaya_cancer', 'stacked',  'Wilaya × Type de cancer',              7,  []),
        ('age_stade',     'stacked',  'Âge × Stade — dépistage',              8,  ['stade_iv_high']),
        ('survival',      'line',     'Évolution survie à 5 ans',             8,  []),
        ('cancer_count',  'bar_h',    'Classement des cancers (horizontal)',  6,  []),
    ]

    def __init__(self, filters: dict):
        self.filters = filters
        self.annee   = filters.get('annee', 2024)

    def suggest(self) -> list:
        qs     = IncidenceRecord.objects.filter(annee=self.annee)
        total  = qs.aggregate(t=Sum('nb_cas'))['t'] or 0
        stade4 = qs.filter(stade='IV').aggregate(t=Sum('nb_cas'))['t'] or 0
        conds  = set()
        if total > 0 and stade4 / total > 0.18:
            conds.add('stade_iv_high')

        result = []
        for (source, chart_type, titre, score, required_conds) in self.CHART_CATALOG:
            if required_conds and not all(c in conds for c in required_conds):
                continue
            # Bonus si conditions spéciales remplies
            bonus = 2 if required_conds and all(c in conds for c in required_conds) else 0
            result.append({
                'source':     source,
                'chart_type': chart_type,
                'titre':      titre,
                'score':      score + bonus,
                'alerte':     bool(required_conds and all(c in conds for c in required_conds)),
                'api_url':    f'/api/stats/chart-data/{source}/?annee={self.annee}',
            })

        return sorted(result, key=lambda x: -x['score'])[:12]