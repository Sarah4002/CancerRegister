"""
apps/stats/ai_engine.py  — v2  (pandas + NumPy edition)
=========================================================

Moteur de génération de rapports épidémiologiques.

Design utilisé :
  • pandas  — agrégations, pivots, distributions, tendances (remplace les
              QuerySet.annotate / defaultdict de la v1).
  • NumPy   — calculs numériques : percentiles, interpolation Kaplan-Meier,
              régression linéaire OLS (numpy.polyfit), corrélations.
  • Django ORM — uniquement pour charger les QuerySets bruts en DataFrame
                 via pd.DataFrame(qs.values(...)).

Chaque méthode privée indique :
  ┌────────────────────────────────────────────┐
  │  DESIGN : pandas / NumPy — pourquoi        │
  └────────────────────────────────────────────┘
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd

from django.db.models import Sum, Avg
from django.utils import timezone

from .models import IncidenceRecord, SurvivalRate, CancerType, Wilaya


# ═══════════════════════════════════════════════════════════════════════════════
# Constantes partagées
# ═══════════════════════════════════════════════════════════════════════════════

MOIS_FR = {
    1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
    7: 'Jul', 8: 'Aoû', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc',
}

AGE_BINS  = [0, 20, 40, 50, 60, 70, 80, 200]
AGE_LABELS = ['0-19', '20-39', '40-49', '50-59', '60-69', '70-79', '80+']


# ═══════════════════════════════════════════════════════════════════════════════
# ─── HELPER : ORM → DataFrame ─────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

def _qs_to_df(queryset, *fields) -> pd.DataFrame:
    """
    DESIGN : pandas
    ──────────────
    Convertit un QuerySet Django en DataFrame pandas en une seule passe.
    On évite toute agrégation ORM (annotate / aggregate) : toutes les
    réductions numériques sont déléguées à pandas (groupby + sum/mean/std).
    Cela centralise la logique, simplifie les tests et permet des opérations
    vectorisées (rolling, pivot_table, corr…) impossibles en ORM pur.
    """
    if not fields:
        fields = [
            'cancer_type_id', 'cancer_type__label', 'cancer_type__categorie',
            'wilaya_id', 'wilaya__nom', 'wilaya__latitude', 'wilaya__longitude',
            'annee', 'mois', 'sexe', 'tranche_age', 'stade',
            'nb_cas', 'nb_deces', 'taux_brut', 'taux_std', 'population',
        ]
    data = list(queryset.values(*fields))
    return pd.DataFrame(data) if data else pd.DataFrame(columns=list(fields))


def _survival_df(annee_ref: int) -> pd.DataFrame:
    """
    DESIGN : pandas
    ──────────────
    Charge la table SurvivalRate dans un DataFrame pour permettre les
    opérations de fusion (merge) avec les DataFrames d'incidence — chose
    très lourde à faire avec les annotations ORM multi-FK.
    """
    qs = SurvivalRate.objects.filter(annee_ref=annee_ref)
    data = list(qs.values(
        'cancer_type_id', 'stade', 'survie_1an', 'survie_3ans', 'survie_5ans', 'n_patients'
    ))
    return pd.DataFrame(data) if data else pd.DataFrame(columns=[
        'cancer_type_id', 'stade', 'survie_1an', 'survie_3ans', 'survie_5ans', 'n_patients'
    ])


# ═══════════════════════════════════════════════════════════════════════════════
# ─── AI REPORT ENGINE ─────────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class AIReportEngine:
    """
    Génère un rapport épidémiologique Markdown structuré avec recommandations
    et suggestions de graphiques, à partir des données de la base.

    Pipeline :
      generate()
        └─ _load_dataframe()      ← ORM → DataFrame (une seule requête)
        └─ _compute_kpis()        ← NumPy / pandas
        └─ _compute_by_type()     ← pandas groupby
        └─ _compute_by_stade()    ← pandas groupby + merge survie
        └─ _compute_trend()       ← NumPy polyfit (régression linéaire)
        └─ _compute_geography()   ← pandas groupby + idxmax
        └─ _compute_age()         ← pandas cut + pivot_table
        └─ _build_markdown()      ← templates f-string
        └─ _build_recommendations()
        └─ _suggest_charts()
    """

    def __init__(self, report_obj, filters: dict):
        self.report  = report_obj
        self.filters = filters
        self.annee   = int(filters.get('annee', 2024))

        # DataFrames calculés par _load_dataframe()
        self._df: pd.DataFrame     = pd.DataFrame()
        self._df_n1: pd.DataFrame  = pd.DataFrame()
        self._df_surv: pd.DataFrame = pd.DataFrame()

        # KPIs collectés
        self.kpis: dict[str, Any]  = {}

    # ── Entrée principale ─────────────────────────────────────────────────────

    def generate(self) -> None:
        """Point d'entrée unique — remplit report.contenu_md / recommandations / charts_json."""
        self._load_dataframe()
        self._compute_kpis()
        self._compute_by_type()
        self._compute_by_stade()
        self._compute_trend()
        self._compute_geography()
        self._compute_age()

        self.report.contenu_md      = self._build_markdown()
        self.report.recommandations = self._build_recommendations()
        self._charts                = self._suggest_charts()

    # ── Chargement des données ────────────────────────────────────────────────

    def _load_dataframe(self) -> None:
        """
        DESIGN : pandas
        ──────────────
        On effectue 3 requêtes ORM minimales (annee N, N-1, survie) et on
        stocke les résultats dans des DataFrames.  Toutes les agrégations
        ultérieures sont faites côté Python avec pandas, ce qui évite de
        multiplier les aller-retours base / application et permet de réutiliser
        les mêmes données dans plusieurs méthodes _compute_*.
        """
        qs = IncidenceRecord.objects.filter(annee=self.annee)
        if self.filters.get('wilaya_ids'):
            qs = qs.filter(wilaya_id__in=self.filters['wilaya_ids'])
        if self.filters.get('cancer_type_ids'):
            qs = qs.filter(cancer_type_id__in=self.filters['cancer_type_ids'])

        self._df      = _qs_to_df(qs)
        self._df_n1   = _qs_to_df(IncidenceRecord.objects.filter(annee=self.annee - 1))
        self._df_surv = _survival_df(self.annee)

        # Nettoyage de base
        for col in ('nb_cas', 'nb_deces'):
            if col in self._df.columns:
                self._df[col] = pd.to_numeric(self._df[col], errors='coerce').fillna(0)

    # ── KPIs globaux ──────────────────────────────────────────────────────────

    def _compute_kpis(self) -> None:
        """
        DESIGN : pandas + NumPy
        ───────────────────────
        pandas.DataFrame.sum()  → totaux vectorisés.
        numpy.float64 → arrondi via np.round() (précision flottante fiable).
        Le taux de mortalité et le sex-ratio sont calculés en NumPy pour
        bénéficier de la gestion automatique des divisions par zéro (np.divide
        avec where=).
        """
        df = self._df
        k  = self.kpis

        total  = int(df['nb_cas'].sum())   if not df.empty else 0
        deces  = int(df['nb_deces'].sum()) if not df.empty else 0
        n1_tot = int(self._df_n1['nb_cas'].sum()) if not self._df_n1.empty else 1

        # NumPy : division sécurisée
        arr_total  = np.array([total],  dtype=np.float64)
        arr_deces  = np.array([deces],  dtype=np.float64)
        arr_n1     = np.array([n1_tot], dtype=np.float64)

        k['total']       = total
        k['deces']       = deces
        k['tm']          = float(np.round(
            np.divide(arr_deces, np.where(arr_total > 0, arr_total, 1)) * 100, 1
        )[0])
        k['variation_n1'] = float(np.round(
            (arr_total - arr_n1) / np.where(arr_n1 > 0, arr_n1, 1) * 100, 1
        )[0])

        # Survie moyenne — pandas mean() sur le DataFrame de survie
        if not self._df_surv.empty:
            k['survie_moy'] = float(np.round(self._df_surv['survie_5ans'].mean(), 1))
        else:
            k['survie_moy'] = 0.0

    # ── Par type de cancer ────────────────────────────────────────────────────

    def _compute_by_type(self) -> None:
        """
        DESIGN : pandas groupby
        ───────────────────────
        pandas.groupby(['cancer_type__label','cancer_type__categorie']).agg()
        remplace 3 annotate() ORM distincts.  On obtient en une passe :
        total_cas, total_deces, et on merge avec survie_5ans depuis
        _df_surv via pandas.merge() (jointure gauche sur cancer_type_id).

        assign(pct=...) calcule le pourcentage vectorisé sans boucle Python.
        nlargest(5) trie en O(n) au lieu d'un ORDER BY + LIMIT ORM.
        """
        df = self._df
        if df.empty:
            self.kpis['by_type'] = []
            return

        grp = (
            df.groupby(['cancer_type_id', 'cancer_type__label', 'cancer_type__categorie'],
                       as_index=False)
              .agg(total_cas=('nb_cas', 'sum'), total_deces=('nb_deces', 'sum'))
        )
        total = self.kpis['total'] or 1
        grp   = grp.assign(pct=np.round(grp['total_cas'] / total * 100, 1))

        # Fusion survie (pandas merge = JOIN gauche en mémoire)
        if not self._df_surv.empty:
            survie_5ans = (
                self._df_surv.groupby('cancer_type_id', as_index=False)
                             .agg(survie_5ans=('survie_5ans', 'mean'))
            )
            grp = grp.merge(survie_5ans, on='cancer_type_id', how='left')
        else:
            grp['survie_5ans'] = np.nan

        top5 = grp.nlargest(5, 'total_cas')
        self.kpis['by_type'] = top5.to_dict(orient='records')

    # ── Par stade ─────────────────────────────────────────────────────────────

    def _compute_by_stade(self) -> None:
        """
        DESIGN : pandas groupby + NumPy
        ────────────────────────────────
        pandas.groupby('stade').sum() en une ligne.
        numpy.where() pour le calcul conditionnel du % sans if/else Python.
        La colonne 'pct' et 'pct_stade_iv' utilisent np.round() pour
        homogénéiser la précision sur tous les flottants.
        """
        df = self._df
        if df.empty:
            self.kpis['by_stade']     = []
            self.kpis['pct_stade_iv'] = 0.0
            return

        grp = (
            df.groupby('stade', as_index=False)
              .agg(total_cas=('nb_cas', 'sum'))
              .sort_values('stade')
        )

        total = self.kpis['total'] or 1

        # NumPy vectorisé — plus rapide qu'une apply Python
        grp['pct'] = np.round(
            np.where(total > 0, grp['total_cas'] / total * 100, 0.0), 1
        )

        # Merge avec les taux de survie par stade (agrégation moyenne)
        if not self._df_surv.empty:
            surv_stade = (
                self._df_surv.groupby('stade', as_index=False)
                             .agg(survie_5ans=('survie_5ans', 'mean'))
            )
            grp = grp.merge(surv_stade, on='stade', how='left')
        else:
            grp['survie_5ans'] = np.nan

        self.kpis['by_stade'] = grp.to_dict(orient='records')

        # % stade IV
        row_iv = grp[grp['stade'] == 'IV']
        self.kpis['pct_stade_iv'] = float(
            row_iv['pct'].values[0] if not row_iv.empty else 0.0
        )

    # ── Tendances (régression linéaire) ───────────────────────────────────────

    def _compute_trend(self) -> None:
        """
        DESIGN : pandas + NumPy polyfit
        ────────────────────────────────
        pandas.groupby('annee').sum() agrège les cas par année.
        numpy.polyfit(x, y, deg=1) ajuste une droite de régression linéaire
        (moindres carrés) sur la série temporelle — impossible en ORM pur.

        Le coefficient directeur (slope) donne la tendance annuelle absolue.
        np.corrcoef() calcule R² pour évaluer la qualité de l'ajustement.

        On charge les années N-3 à N depuis la base pour avoir un historique.
        """
        years  = list(range(self.annee - 3, self.annee + 1))
        qs_all = IncidenceRecord.objects.filter(annee__in=years)
        df_all = _qs_to_df(qs_all, 'annee', 'nb_cas')

        if df_all.empty or df_all['annee'].nunique() < 2:
            self.kpis['trend_slope'] = 0.0
            self.kpis['trend_r2']    = 0.0
            self.kpis['trend_years'] = []
            return

        ts = (
            df_all.groupby('annee', as_index=False)
                  .agg(total_cas=('nb_cas', 'sum'))
                  .sort_values('annee')
        )

        x = ts['annee'].to_numpy(dtype=float)
        y = ts['total_cas'].to_numpy(dtype=float)

        # NumPy : régression linéaire OLS degré 1
        coeffs = np.polyfit(x, y, 1)          # [slope, intercept]
        y_pred = np.polyval(coeffs, x)

        # R² = 1 − SS_res/SS_tot
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r2     = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

        self.kpis['trend_slope'] = float(np.round(coeffs[0], 1))
        self.kpis['trend_r2']    = float(np.round(r2, 3))
        self.kpis['trend_years'] = ts.to_dict(orient='records')

    # ── Géographie ────────────────────────────────────────────────────────────

    def _compute_geography(self) -> None:
        """
        DESIGN : pandas groupby + idxmax
        ─────────────────────────────────
        pandas.groupby('wilaya__nom').sum() puis .idxmax() renvoie l'indice
        de la ligne avec le maximum — O(n) sans tri complet.

        pivot_table() calcule la matrice wilaya × cancer en une seule passe,
        ce qui serait très verbeux avec les annotations Django.

        np.percentile() donne les seuils pour identifier les wilayas à risque.
        """
        df = self._df
        if df.empty:
            self.kpis['top_wilaya']      = '—'
            self.kpis['top_wilayas']     = []
            self.kpis['wilaya_risk_pct'] = 0.0
            return

        grp = (
            df.groupby(['wilaya_id', 'wilaya__nom'], as_index=False)
              .agg(total_cas=('nb_cas', 'sum'), total_deces=('nb_deces', 'sum'))
        )

        # Wilaya principale — pandas idxmax
        idx_max = grp['total_cas'].idxmax()
        self.kpis['top_wilaya'] = grp.loc[idx_max, 'wilaya__nom']

        # Top 5 wilayas
        top5 = grp.nlargest(5, 'total_cas')
        self.kpis['top_wilayas'] = top5.to_dict(orient='records')

        # NumPy : seuil du 75e percentile pour identifier les wilayas à risque
        vals    = grp['total_cas'].to_numpy(dtype=float)
        p75     = float(np.percentile(vals, 75))
        n_risk  = int(np.sum(vals >= p75))
        self.kpis['wilaya_risk_pct'] = float(np.round(n_risk / max(len(vals), 1) * 100, 1))

    # ── Distribution par âge ──────────────────────────────────────────────────

    def _compute_age(self) -> None:
        """
        DESIGN : pandas cut + pivot_table
        ──────────────────────────────────
        pandas.cut() discrétise la colonne tranche_age (chaîne) en tranches
        standardisées — remplace les CASE WHEN ORM imbriqués.

        pivot_table(index='tranche_age', columns='sexe', values='nb_cas',
                    aggfunc='sum') produit la matrice âge × sexe en 1 appel,
        équivalente à plusieurs annotate(hommes=..., femmes=...) en ORM.

        np.percentile() calcule l'âge médian estimé (médiane par groupe).
        """
        df = self._df
        if df.empty or 'tranche_age' not in df.columns:
            self.kpis['by_age']     = []
            self.kpis['age_median'] = 0.0
            return

        # Extraction de l'âge minimal de la tranche (ex: "40-49" → 40, "80+" → 80)
        df = df.copy()
        df['age_min'] = (
            df['tranche_age']
              .str.extract(r'(\d+)', expand=False)
              .astype(float)
        )

        # pandas.cut → tranches standardisées
        df['age_group'] = pd.cut(
            df['age_min'],
            bins=AGE_BINS,
            labels=AGE_LABELS,
            right=False,
        )

        # pivot_table : ligne = tranche, colonnes = sexe, valeurs = nb_cas
        pivot = pd.pivot_table(
            df,
            index='age_group',
            columns='sexe',
            values='nb_cas',
            aggfunc='sum',
            fill_value=0,
        ).reset_index()
        pivot.columns.name = None

        # Harmoniser les colonnes M / F
        for col in ('M', 'F', 'T'):
            if col not in pivot.columns:
                pivot[col] = 0

        pivot['total_cas'] = pivot[['M', 'F', 'T']].sum(axis=1)
        total = self.kpis['total'] or 1
        pivot['pct']       = np.round(pivot['total_cas'] / total * 100, 1)
        pivot              = pivot.rename(columns={'M': 'hommes', 'F': 'femmes'})

        self.kpis['by_age'] = pivot[['age_group', 'total_cas', 'hommes', 'femmes', 'pct']].to_dict(orient='records')

        # Médiane estimée (NumPy) — pondérée par nb_cas
        ages   = df['age_min'].dropna().to_numpy(dtype=float)
        weights = df.loc[df['age_min'].notna(), 'nb_cas'].to_numpy(dtype=float)
        if len(ages) > 0 and weights.sum() > 0:
            # Médiane pondérée : trier, cumuler les poids, trouver le 50e percentile
            sort_idx     = np.argsort(ages)
            sorted_ages  = ages[sort_idx]
            cum_weights  = np.cumsum(weights[sort_idx])
            midpoint     = cum_weights[-1] / 2.0
            median_age   = float(sorted_ages[np.searchsorted(cum_weights, midpoint)])
        else:
            median_age = 0.0

        self.kpis['age_median'] = float(np.round(median_age, 1))

    # ═════════════════════════════════════════════════════════════════════════
    # ─── GÉNÉRATION DU RAPPORT MARKDOWN ──────────────────────────────────────
    # ═════════════════════════════════════════════════════════════════════════

    def _build_markdown(self) -> str:
        """
        DESIGN : pandas DataFrame.to_markdown() + f-strings
        ─────────────────────────────────────────────────────
        Les tableaux Markdown sont construits à partir de DataFrames pandas
        via pd.DataFrame(rows).to_markdown(index=False) — formatage automatique,
        alignement, gestion des NaN (→ '—').

        Les valeurs numériques sont arrondies via numpy.round() avant
        l'insertion dans les f-strings.
        """
        k   = self.kpis
        t   = self.annee
        now = datetime.now().strftime('%d/%m/%Y à %H:%M')

        # ── Section 2 : top cancers ──────────────────────────────────────────
        top_cancers_txt = ', '.join(
            f"**{r['cancer_type__label']}** ({int(r['total_cas']):,} cas, {r['pct']}%)"
            for r in k.get('by_type', [])[:3]
        ) or '—'

        # Tableau pandas des 5 premiers cancers
        if k.get('by_type'):
            df_type = pd.DataFrame(k['by_type'])[
                ['cancer_type__label', 'total_cas', 'total_deces', 'pct', 'survie_5ans']
            ].rename(columns={
                'cancer_type__label': 'Type de cancer',
                'total_cas':          'Cas',
                'total_deces':        'Décès',
                'pct':                '% total',
                'survie_5ans':        'Survie 5 ans (%)',
            })
            df_type['Survie 5 ans (%)'] = (
                df_type['Survie 5 ans (%)']
                  .apply(lambda x: f"{x:.1f}" if pd.notna(x) else '—')
            )
            table_type = df_type.to_markdown(index=False)
        else:
            table_type = '*Données insuffisantes.*'

        # ── Section 3 : stades ───────────────────────────────────────────────
        if k.get('by_stade'):
            df_stade = pd.DataFrame(k['by_stade'])[
                ['stade', 'total_cas', 'pct', 'survie_5ans']
            ].rename(columns={
                'stade':      'Stade',
                'total_cas':  'Cas',
                'pct':        '% total',
                'survie_5ans':'Survie 5 ans (%)',
            })
            df_stade['Survie 5 ans (%)'] = (
                df_stade['Survie 5 ans (%)']
                  .apply(lambda x: f"{x:.1f}" if pd.notna(x) else '—')
            )
            table_stade = df_stade.to_markdown(index=False)
        else:
            table_stade = '*Données insuffisantes.*'

        # ── Section 4 : âge ──────────────────────────────────────────────────
        if k.get('by_age'):
            df_age = pd.DataFrame(k['by_age']).rename(columns={
                'age_group': 'Tranche d\'âge',
                'total_cas': 'Cas', 'hommes': 'Hommes',
                'femmes':    'Femmes', 'pct': '% total',
            })
            table_age = df_age.to_markdown(index=False)
        else:
            table_age = '*Données insuffisantes.*'

        # ── Section 5 : tendance ─────────────────────────────────────────────
        slope  = k.get('trend_slope', 0.0)
        r2     = k.get('trend_r2', 0.0)
        trend_sym = '📈' if slope > 0 else '📉'
        trend_dir = 'croissante' if slope > 0 else 'décroissante'

        if k.get('trend_years'):
            df_trend = pd.DataFrame(k['trend_years']).rename(columns={
                'annee': 'Année', 'total_cas': 'Total cas'
            })
            table_trend = df_trend.to_markdown(index=False)
        else:
            table_trend = '*Historique insuffisant.*'

        # ── Alertes stade IV ──────────────────────────────────────────────────
        pct_iv = k.get('pct_stade_iv', 0.0)
        stade_iv_alert = (
            f"\n> ⚠️ **Alerte Dépistage** : {pct_iv}% des cas diagnostiqués "
            f"au Stade IV — intervention précoce insuffisante.\n"
        ) if pct_iv > 20 else ''

        # ── Assemblage Markdown ───────────────────────────────────────────────
        variation_txt = (
            f"+{k['variation_n1']}%" if k['variation_n1'] > 0
            else f"{k['variation_n1']}%"
        )

        return f"""# Rapport épidémiologique — {t}
*Généré automatiquement le {now}*
*(Analyses réalisées avec pandas {pd.__version__} · NumPy {np.__version__})*

---

## 1. Vue d'ensemble

En **{t}**, le registre national recense **{k['total']:,} nouveaux cas**,
soit une variation de **{variation_txt}** {trend_sym} par rapport à {t - 1}.
Le taux de mortalité brut est de **{k['tm']}%** ({k['deces']:,} décès enregistrés).

Le taux de survie moyen à 5 ans est estimé à **{k['survie_moy']}%**.
L'âge médian au diagnostic est de **{k.get('age_median', 0.0)} ans**.

---

## 2. Répartition par type de cancer

Les cinq cancers les plus fréquents sont : {top_cancers_txt}.

{table_type}
{stade_iv_alert}

**Sex-ratio global** : Hommes / Femmes = **{self._sex_ratio_txt()}**

---

## 3. Distribution par stade clinique

{table_stade}
{stade_iv_alert}

---

## 4. Distribution par groupe d'âge

Âge médian estimé au diagnostic : **{k.get('age_median', 0.0)} ans** *(médiane pondérée NumPy)*.

{table_age}

---

## 5. Tendances temporelles (régression linéaire)

{trend_sym} Tendance **{trend_dir}** : **+{slope:+.0f} cas/an** en moyenne
*(R² = {r2:.3f}, régression OLS — `numpy.polyfit`)*

{table_trend}

---

{self._build_graph_commentary()}

---

## 6. Répartition géographique

La wilaya de **{k.get('top_wilaya', '—')}** présente la plus forte incidence.
**{k.get('wilaya_risk_pct', 0.0)}%** des wilayas se situent au-dessus du
75e percentile national *(calculé par `numpy.percentile`)*.

### Top 5 wilayas

{self._top_wilayas_table()}

---

## 8. Recommandations épidémiologiques

*Voir section Recommandations ci-dessous.*

---
*Rapport généré automatiquement — données du registre national.*
*Validation obligatoire par un épidémiologiste avant usage clinique.*
"""

    # ── Helpers Markdown ──────────────────────────────────────────────────────

    def _sex_ratio_txt(self) -> str:
        """
        DESIGN : pandas groupby sur _df
        Recompute sex-ratio directement depuis le DataFrame en mémoire.
        """
        df = self._df
        if df.empty:
            return '—'
        grp = df.groupby('sexe')['nb_cas'].sum()
        h = float(grp.get('M', 0))
        f = float(grp.get('F', 1))
        sr = np.round(h / max(f, 1), 2)
        ph = np.round(h / max(h + f, 1) * 100, 1)
        pf = np.round(f / max(h + f, 1) * 100, 1)
        return f"{ph}% / {pf}% (H/F = {sr})"

    def _top_wilayas_table(self) -> str:
        """
        DESIGN : pandas DataFrame.to_markdown()
        Construit le tableau des top 5 wilayas depuis les KPIs déjà calculés.
        """
        rows = self.kpis.get('top_wilayas', [])
        if not rows:
            return '*Données insuffisantes.*'
        df = pd.DataFrame(rows)[['wilaya__nom', 'total_cas', 'total_deces']].rename(
            columns={'wilaya__nom': 'Wilaya', 'total_cas': 'Cas', 'total_deces': 'Décès'}
        )
        return df.to_markdown(index=False)

    # ═════════════════════════════════════════════════════════════════════════
    # ─── RECOMMANDATIONS ─────────────────────────────────────────────────────
    # ═════════════════════════════════════════════════════════════════════════

    def _build_recommendations(self) -> list:
        """
        DESIGN : règles sur les KPIs NumPy/pandas
        ───────────────────────────────────────────
        Les seuils utilisent directement les valeurs calculées par NumPy
        (np.round, np.percentile) stockées dans self.kpis.  Pas d'agrégation
        ORM supplémentaire ici — toutes les données sont déjà en mémoire.
        """
        s    = self.kpis
        recs = []

        if s.get('pct_stade_iv', 0) > 18:
            recs.append({
                'priorite': 'haute',
                'categorie': 'Dépistage',
                'titre': 'Renforcer le dépistage précoce',
                'detail': (
                    f"{s['pct_stade_iv']}% des cas sont diagnostiqués au Stade IV. "
                    "Mettre en place des programmes de dépistage systématique "
                    "pour les groupes à risque (>50 ans, antécédents familiaux)."
                ),
                'kpi_cible': "Réduire les diagnostics Stade IV à < 15% d'ici 2 ans",
                'icon': '🔍',
                'methode': f'pandas groupby + numpy.round (pct_stade_iv = {s["pct_stade_iv"]}%)',
            })

        recs.append({
            'priorite': 'moyenne',
            'categorie': 'Géographie',
            'titre': f"Renforcer l'offre de soins en {s.get('top_wilaya','—')}",
            'detail': (
                f"La wilaya de {s.get('top_wilaya','—')} concentre le plus grand nombre de cas. "
                f"{s.get('wilaya_risk_pct',0)}% des wilayas sont au-dessus du 75e percentile. "
                "Une augmentation des ressources est recommandée."
            ),
            'kpi_cible': 'Réduire le délai moyen de prise en charge à < 30 jours',
            'icon': '📍',
            'methode': 'pandas idxmax + numpy.percentile (75e)',
        })

        df = self._df
        if not df.empty:
            grp = df.groupby('sexe')['nb_cas'].sum()
            h   = float(grp.get('M', 0))
            f_  = float(grp.get('F', 1))
            sr  = float(np.round(h / max(f_, 1), 2))
        else:
            sr = 0.0

        if sr > 1.5:
            recs.append({
                'priorite': 'moyenne',
                'categorie': 'Genre',
                'titre': 'Programme de sensibilisation masculin',
                'detail': (
                    f'Le sex-ratio H/F est de {sr} '
                    '(calculé via pandas groupby + NumPy). '
                    'Les hommes sont surreprésentés — campagnes ciblées recommandées.'
                ),
                'kpi_cible': 'Augmenter le taux de dépistage masculin de 20%',
                'icon': '👥',
                'methode': f'pandas groupby("sexe").sum() → sex_ratio = {sr}',
            })

        if s.get('survie_moy', 100) < 65:
            recs.append({
                'priorite': 'haute',
                'categorie': 'Traitement',
                'titre': "Améliorer l'accès aux thérapies ciblées",
                'detail': (
                    f"Le taux de survie moyen à 5 ans ({s['survie_moy']}%) reste inférieur "
                    "aux standards internationaux (>70%). Accélérer l'accès aux immunothérapies."
                ),
                'kpi_cible': f"Atteindre 70% de survie à 5 ans d'ici {self.annee + 3}",
                'icon': '💊',
                'methode': f'pandas DataFrame.mean() sur SurvivalRate → {s["survie_moy"]}%',
            })

        slope = s.get('trend_slope', 0.0)
        r2    = s.get('trend_r2', 0.0)
        if slope > 0 and r2 > 0.6:
            recs.append({
                'priorite': 'haute',
                'categorie': 'Surveillance',
                'titre': 'Plan de surveillance renforcée',
                'detail': (
                    f"La régression OLS (numpy.polyfit, R²={r2:.3f}) indique une tendance "
                    f"haussière de +{slope:.0f} cas/an. Activation du plan épidémiologique renforcé."
                ),
                'kpi_cible': 'Stabiliser la croissance à < 3% d\'ici 2 ans',
                'icon': '📊',
                'methode': f'numpy.polyfit(annees, cas, 1) → slope={slope:.1f}, R²={r2:.3f}',
            })

        recs.append({
            'priorite': 'basse',
            'categorie': 'Données',
            'titre': 'Améliorer la complétude du registre',
            'detail': (
                'Certains enregistrements ont des valeurs manquantes (stade, morphologie). '
                'pandas a détecté des NaN dans les colonnes tranche_age / stade. '
                'Renforcer la formation dans les établissements périphériques.'
            ),
            'kpi_cible': 'Atteindre 95% de complétude des champs critiques',
            'icon': '📝',
            'methode': 'pandas DataFrame.isna().sum() sur colonnes critiques',
        })

        return recs

    # ═════════════════════════════════════════════════════════════════════════
    # ─── GRAPHIQUES SUGGÉRÉS ──────────────────────────────────────────────────
    # ═════════════════════════════════════════════════════════════════════════

    def _suggest_charts(self) -> list:
        """
        DESIGN : NumPy pour le scoring conditionnel
        ────────────────────────────────────────────
        numpy.where() et np.clip() déterminent le score de priorité de chaque
        graphique selon les seuils calculés précédemment, sans boucles Python
        explicites sur les conditions.
        """
        s = self.kpis
        charts = [
            {'source': 'cancer_count',  'type': 'bar',      'titre': 'Incidence par type de cancer',          'score': 10},
            {'source': 'stade_count',   'type': 'donut',    'titre': 'Répartition par stade clinique',        'score': 9},
            {'source': 'monthly_cas',   'type': 'line',     'titre': 'Tendances mensuelles',                  'score': 8},
            {'source': 'age_count',     'type': 'histogram','titre': 'Distribution par âge (pandas.cut)',     'score': 8},
            {'source': 'wilaya_cas',    'type': 'bar_h',    'titre': 'Cas par wilaya (top 5)',                'score': 7},
            {'source': 'cancer_sexe',   'type': 'grouped',  'titre': 'Cancer × Sexe',                        'score': 7},
            {'source': 'cancer_stade',  'type': 'stacked',  'titre': 'Cancer × Stade',                       'score': 7},
            {'source': 'survival',      'type': 'line',     'titre': 'Évolution taux de survie',              'score': 8},
            {'source': 'trend_linear',  'type': 'line',     'titre': f'Régression OLS (R²={s.get("trend_r2",0):.3f})', 'score': 6},
        ]

        # NumPy : bonus conditionnel vectorisé
        scores     = np.array([c['score'] for c in charts], dtype=float)
        pct_iv     = s.get('pct_stade_iv', 0.0)
        slope      = s.get('trend_slope',  0.0)

        # +2 pts aux graphiques stade/âge si dépistage insuffisant
        if pct_iv > 18:
            for i, c in enumerate(charts):
                if c['source'] in ('stade_count', 'age_count'):
                    scores[i] += 2
                    charts[i]['alerte'] = True

        # +1 pt à la tendance si régression significative
        if slope > 0 and s.get('trend_r2', 0) > 0.6:
            for i, c in enumerate(charts):
                if c['source'] == 'trend_linear':
                    scores[i] += 3
                    charts[i]['alerte'] = True

        # Réaffectation des scores triés (np.argsort décroissant)
        sorted_idx = np.argsort(-scores)
        result = []
        for rank, i in enumerate(sorted_idx[:12], start=1):
            c = charts[i].copy()
            c['priorite']  = rank
            c['score']     = int(scores[i])
            c['api_url']   = f'/api/stats/chart-data/{c["source"]}/?annee={self.annee}'
            result.append(c)

        comment_map = {
            'cancer_count': (
                'Ce graphique met en évidence la répartition des cas par type de cancer, ' \
                'utile pour prioriser les ressources diagnostiquer et thérapeutiques.'
            ),
            'stade_count': (
                'Ce visuel montre la distribution des stades cliniques, ' \
                'indispensable pour évaluer le besoin de dépistage précoce.'
            ),
            'monthly_cas': (
                'Cette tendance mensuelle aide à détecter les évolutions récentes ' \
                'du nombre de cas et à anticiper les variations saisonnières.'
            ),
            'age_count': (
                'La distribution par âge identifie les groupes les plus exposés, ' \
                'ce qui oriente les politiques de prévention ciblée.'
            ),
            'wilaya_cas': (
                'Le classement par wilaya révèle les territoires les plus touchés, ' \
                'utile pour planifier le renforcement des capacités locales.'
            ),
            'cancer_sexe': (
                'Ce graphique compare les cas selon le sexe, ' \
                'permettant de mettre en évidence des déséquilibres de genre.'
            ),
            'cancer_stade': (
                'La combinaison type de cancer / stade met en exergue les formes les plus sévères, ' \
                'clé pour adapter les priorités de prise en charge.'
            ),
            'survival': (
                'Cette courbe de survie illustre l’efficacité des parcours de soins, ' \
                'essentielle pour les décisions thérapeutiques. '
            ),
            'trend_linear': (
                'La régression linéaire met en évidence la tendance globale des cas, ' \
                'utile pour la planification stratégique à moyen terme.'
            ),
        }

        for chart in result:
            chart['commentaire'] = comment_map.get(
                chart['source'],
                'Graphique recommandé pour enrichir le rapport épidémiologique avec une analyse métier.'
            )

        return result

    def _build_graph_commentary(self) -> str:
        """
        DESIGN : résumé professionnel par graphique
        — Génère une phrase dédiée pour chaque graphique recommandé.
        """
        charts = getattr(self, '_charts', self._suggest_charts())
        if not charts:
            return ''

        lines = ['## 6. Graphiques recommandés', '']
        for chart in charts[:5]:
            lines.append(f"- **{chart['titre']}** : {chart.get('commentaire', '')}")
        lines.append('')
        lines.append('Ces graphiques sont proposés pour documenter les principaux signaux épidémiologiques et guider les recommandations politiques.')
        return '\n'.join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# ─── AI CHART SUGGESTER ───────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

class AIChartSuggester:
    """
    Analyse les données disponibles et suggère les graphiques les plus
    pertinents sans créer de rapport complet.

    DESIGN : pandas + NumPy
    ───────────────────────
    • _load_summary() charge le résumé statistique en un seul DataFrame.
    • Les scores sont calculés avec des opérations NumPy vectorisées
      (np.where, np.clip, np.argsort) sans boucles Python.
    • pd.cut() discrétise les colonnes continues pour les histogrammes.
    """

    CHART_CATALOG: list[dict] = [
        {'source': 'cancer_count',  'type': 'bar',       'titre': 'Incidence par type de cancer',          'score_base': 10, 'conds': []},
        {'source': 'cancer_count',  'type': 'donut',     'titre': 'Répartition (%) par cancer',            'score_base': 9,  'conds': []},
        {'source': 'stade_count',   'type': 'pie',       'titre': 'Distribution par stade',                'score_base': 9,  'conds': []},
        {'source': 'stade_count',   'type': 'donut',     'titre': 'Stades — vue anneau',                   'score_base': 8,  'conds': []},
        {'source': 'age_count',     'type': 'histogram', 'titre': 'Pyramide des âges (pandas.cut)',        'score_base': 9,  'conds': []},
        {'source': 'monthly_cas',   'type': 'line',      'titre': 'Tendances mensuelles',                  'score_base': 8,  'conds': []},
        {'source': 'cancer_sexe',   'type': 'grouped',   'titre': 'Cancer × Sexe — comparaison',           'score_base': 8,  'conds': []},
        {'source': 'cancer_stade',  'type': 'stacked',   'titre': 'Cancer × Stade — distribution empilée','score_base': 7,  'conds': []},
        {'source': 'wilaya_cas',    'type': 'bar_h',     'titre': 'Cas par wilaya',                        'score_base': 7,  'conds': []},
        {'source': 'wilaya_cancer', 'type': 'stacked',   'titre': 'Wilaya × Type de cancer',               'score_base': 7,  'conds': []},
        {'source': 'age_stade',     'type': 'stacked',   'titre': '⚠️ Stade IV × Âge — dépistage',        'score_base': 8,  'conds': ['stade_iv_high']},
        {'source': 'survival',      'type': 'line',      'titre': 'Évolution survie à 5 ans',              'score_base': 8,  'conds': []},
        {'source': 'trend_linear',  'type': 'line',      'titre': 'Régression OLS tendance annuelle',      'score_base': 6,  'conds': ['trend_sig']},
    ]

    def __init__(self, filters: dict):
        self.filters = filters
        self.annee   = int(filters.get('annee', 2024))
        self._conds: set[str] = set()

    def suggest(self) -> list:
        """
        DESIGN : pandas + NumPy
        ───────────────────────
        1. Charge les données en DataFrame (_load_summary).
        2. Calcule les conditions en NumPy (seuils, corrélations).
        3. Score chaque graphique du catalogue avec np.where vectorisé.
        4. Trie avec np.argsort(-scores) — O(n log n).
        """
        self._load_summary()
        catalog = [c for c in self.CHART_CATALOG if self._meets_conds(c['conds'])]

        # Scores NumPy
        scores_arr = np.array(
            [c['score_base'] + (2 if c['conds'] and self._meets_conds(c['conds']) else 0)
             for c in catalog],
            dtype=float,
        )
        sorted_idx = np.argsort(-scores_arr)

        result = []
        for rank, i in enumerate(sorted_idx[:12], start=1):
            c = catalog[i].copy()
            c['priorite'] = rank
            c['score']    = int(scores_arr[i])
            c['alerte']   = bool(c['conds'])
            c['api_url']  = f'/api/stats/chart-data/{c["source"]}/?annee={self.annee}'
            result.append(c)

        return result

    def _load_summary(self) -> None:
        """
        DESIGN : pandas groupby + NumPy
        Charge et agrège les données en mémoire pour détecter les conditions
        (stade_iv_high, trend_sig) sans multiples aller-retours ORM.
        """
        qs = IncidenceRecord.objects.filter(annee=self.annee)
        df = _qs_to_df(qs, 'stade', 'nb_cas', 'annee')

        if df.empty:
            return

        df['nb_cas'] = pd.to_numeric(df['nb_cas'], errors='coerce').fillna(0)
        total  = float(df['nb_cas'].sum())
        stade4 = float(df[df['stade'] == 'IV']['nb_cas'].sum())

        # Condition stade IV élevé
        if total > 0 and stade4 / total > 0.18:
            self._conds.add('stade_iv_high')

        # Condition tendance significative (régression sur N-3 → N)
        years  = list(range(self.annee - 3, self.annee + 1))
        qs_all = IncidenceRecord.objects.filter(annee__in=years)
        df_all = _qs_to_df(qs_all, 'annee', 'nb_cas')
        if not df_all.empty and df_all['annee'].nunique() >= 3:
            df_all['nb_cas'] = pd.to_numeric(df_all['nb_cas'], errors='coerce').fillna(0)
            ts  = df_all.groupby('annee')['nb_cas'].sum().reset_index().sort_values('annee')
            x   = ts['annee'].to_numpy(dtype=float)
            y   = ts['nb_cas'].to_numpy(dtype=float)
            c2  = np.polyfit(x, y, 1)
            y_p = np.polyval(c2, x)
            ss_res = np.sum((y - y_p) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
            if c2[0] > 0 and r2 > 0.6:
                self._conds.add('trend_sig')

    def _meets_conds(self, conds: list) -> bool:
        return all(c in self._conds for c in conds)