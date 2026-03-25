from django.db import models
from django.contrib.auth import get_user_model
from apps.patients.models import Patient

User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# Référentiels ICD-O-3
# ─────────────────────────────────────────────────────────────────────────────

class TopographieICD(models.Model):
    code        = models.CharField(max_length=10, unique=True)
    libelle     = models.CharField(max_length=200)
    libelle_ar  = models.CharField(max_length=200, blank=True)
    categorie   = models.CharField(max_length=100, blank=True)
    est_actif   = models.BooleanField(default=True)

    class Meta:
        db_table = 'topographie_icd'
        ordering = ['code']
        verbose_name = 'Topographie ICD-O-3'

    def __str__(self):
        return f"{self.code} – {self.libelle}"


class MorphologieICD(models.Model):
    code        = models.CharField(max_length=10, unique=True)
    libelle     = models.CharField(max_length=200)
    libelle_ar  = models.CharField(max_length=200, blank=True)
    comportement = models.CharField(max_length=1, choices=[
        ('0','Bénin'),('1','Incertain'),('2','In situ'),
        ('3','Malin primitif'),('6','Malin métastatique'),
    ], default='3')
    groupe    = models.CharField(max_length=100, blank=True)
    est_actif = models.BooleanField(default=True)

    class Meta:
        db_table = 'morphologie_icd'
        ordering = ['code']
        verbose_name = 'Morphologie ICD-O-3'

    def __str__(self):
        return f"{self.code} – {self.libelle}"


# ─────────────────────────────────────────────────────────────────────────────
# Diagnostic principal
# ─────────────────────────────────────────────────────────────────────────────

class Diagnostic(models.Model):

    class Lateralite(models.TextChoices):
        NON_APPLICABLE = '0', 'Non applicable'
        DROIT          = '1', 'Droit'
        GAUCHE         = '2', 'Gauche'
        BILATERAL      = '3', 'Bilatéral'
        INCONNU        = '9', 'Inconnu'

    class BaseDiagnostic(models.TextChoices):
        CLINIQUE_SEUL    = '0', 'Clinique seul'
        CLINIQUE_EXAMENS = '1', 'Clinique + examens paracliniques'
        CHIRURGIE        = '2', 'Chirurgie / autopsie sans histologie'
        BIOCHIMIE        = '4', 'Marqueurs biochimiques / immunologiques'
        CYTOLOGIE        = '5', 'Cytologie'
        HISTOLOGIE_META  = '6', 'Histologie de métastase'
        HISTOLOGIE_PRIM  = '7', 'Histologie de tumeur primitive'
        INCONNU          = '9', 'Inconnu'

    class GradeHistologique(models.TextChoices):
        GRADE_I   = 'I',   'Grade I – bien différencié'
        GRADE_II  = 'II',  'Grade II – moyennement différencié'
        GRADE_III = 'III', 'Grade III – peu différencié'
        GRADE_IV  = 'IV',  'Grade IV – indifférencié'
        INCONNU   = 'U',   'Inconnu / non applicable'

    class StadeAJCC(models.TextChoices):
        STADE_0    = '0',    'Stade 0 – In situ'
        STADE_I    = 'I',    'Stade I'
        STADE_IA   = 'IA',   'Stade IA'
        STADE_IB   = 'IB',   'Stade IB'
        STADE_II   = 'II',   'Stade II'
        STADE_IIA  = 'IIA',  'Stade IIA'
        STADE_IIB  = 'IIB',  'Stade IIB'
        STADE_IIC  = 'IIC',  'Stade IIC'
        STADE_III  = 'III',  'Stade III'
        STADE_IIIA = 'IIIA', 'Stade IIIA'
        STADE_IIIB = 'IIIB', 'Stade IIIB'
        STADE_IIIC = 'IIIC', 'Stade IIIC'
        STADE_IV   = 'IV',   'Stade IV'
        INCONNU    = 'U',    'Inconnu'

    class TypeDiagnostic(models.TextChoices):
        INITIAL          = 'initial',         'Diagnostic initial'
        RECIDIVE         = 'recidive',         'Récidive'
        NOUVEAU_PRIMITIF = 'nouveau_primitif', 'Nouveau primitif'
        METASTASE        = 'metastase',        'Métastase'

    class CategorieCancer(models.TextChoices):
        SOLIDE  = 'solide',  'Tumeur solide'
        LIQUIDE = 'liquide', 'Tumeur liquide (hématologique)'

    class EtatCancer(models.TextChoices):
        LOCALISE            = 'localise',            'Localisé'
        EXTENSION_REGIONALE = 'extension_regionale', 'Extension régionale'
        METASTATIQUE        = 'metastatique',        'Métastatique'
        NON_DETERMINE       = 'non_determine',       'Non déterminé'

    class PerformanceStatus(models.TextChoices):
        PS0     = '0', 'PS 0 – Activité normale'
        PS1     = '1', 'PS 1 – Symptômes, ambulatoire'
        PS2     = '2', 'PS 2 – Alité <50% du temps'
        PS3     = '3', 'PS 3 – Alité >50% du temps'
        PS4     = '4', 'PS 4 – Invalide, alité'
        INCONNU = 'U', 'Inconnu'

    class StatutDossier(models.TextChoices):
        EN_COURS = 'en_cours', 'En cours'
        VALIDE   = 'valide',   'Validé'
        ARCHIVE  = 'archive',  'Archivé'

    class TechniquePrelevement(models.TextChoices):
        BIOPSIE            = 'biopsie',             'Biopsie'
        EXERESE            = 'exerese_chirurgicale', 'Exérèse chirurgicale'
        CYTOPONCTION       = 'cytoponction',         'Cytoponction'
        LIQUIDE_BIOLOGIQUE = 'liquide_biologique',   'Liquide biologique'
        AUTOPSIE           = 'autopsie',             'Autopsie'

    class QualitePrelevement(models.TextChoices):
        ADEQUATE  = 'adequate',  'Adéquate'
        LIMITE    = 'limite',    'Limitée'
        INADEQUAT = 'inadequat', 'Inadéquate'

    class MargesChirurgicales(models.TextChoices):
        R0             = 'r0',             'Saines (R0)'
        R1             = 'r1',             'Microscopiques (R1)'
        R2             = 'r2',             'Macroscopiques (R2)'
        NON_EVALUABLES = 'non_evaluables', 'Non évaluables'

    class MmrStatus(models.TextChoices):
        DEFICIENT  = 'deficient',  'Déficient (dMMR)'
        PROFICIENT = 'proficient', 'Proficient (pMMR)'
        INCONNU    = 'inconnu',    'Inconnu'

    class Her2Fish(models.TextChoices):
        AMPLIFIE     = 'amplifie',     'Amplifié'
        NON_AMPLIFIE = 'non_amplifie', 'Non amplifié'
        NON_FAIT     = 'non_fait',     'Non fait'

    class PronosticEvaluation(models.TextChoices):
        FAVORABLE     = 'favorable',     'Favorable'
        INTERMEDIAIRE = 'intermediaire', 'Intermédiaire'
        DEFAVORABLE   = 'defavorable',   'Défavorable'
        INCONNU       = 'inconnu',       'Inconnu'

    # 1. Identification
    patient                = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='diagnostics')
    numero_dossier         = models.CharField(max_length=50, blank=True)
    medecin_referent       = models.CharField(max_length=150, blank=True)
    medecin_diagnostiqueur = models.CharField(max_length=150, blank=True)
    statut_dossier         = models.CharField(max_length=20, choices=StatutDossier.choices, default='en_cours')

    # 2. Dates & Type
    date_diagnostic       = models.DateField()
    date_premier_symptome = models.DateField(null=True, blank=True)
    type_diagnostic       = models.CharField(max_length=20, choices=TypeDiagnostic.choices, default='initial')
    base_diagnostic       = models.CharField(max_length=1, choices=BaseDiagnostic.choices, default='9')

    # 3. Topographie ICD-O-3
    categorie_cancer    = models.CharField(max_length=10, choices=CategorieCancer.choices, default='solide')
    topographie         = models.ForeignKey(TopographieICD, on_delete=models.PROTECT, null=True, blank=True, related_name='diagnostics')
    topographie_code    = models.CharField(max_length=10, blank=True)
    topographie_libelle = models.CharField(max_length=200, blank=True)
    lateralite          = models.CharField(max_length=1, choices=Lateralite.choices, default='0')

    # 4. Morphologie ICD-O-3
    morphologie           = models.ForeignKey(MorphologieICD, on_delete=models.PROTECT, null=True, blank=True, related_name='diagnostics')
    morphologie_code      = models.CharField(max_length=10, blank=True)
    morphologie_libelle   = models.CharField(max_length=200, blank=True)
    grade_histologique    = models.CharField(max_length=3, choices=GradeHistologique.choices, default='U')
    differentiation       = models.TextField(blank=True)
    variante_histologique = models.CharField(max_length=100, blank=True)

    # 5. TNM 8e édition
    tnm_t = models.CharField(max_length=5, blank=True, choices=[
        ('TX','TX – Non évaluable'),('T0','T0 – Pas de tumeur'),('Tis','Tis – In situ'),
        ('T1','T1'),('T1a','T1a'),('T1b','T1b'),('T1c','T1c'),
        ('T2','T2'),('T2a','T2a'),('T2b','T2b'),
        ('T3','T3'),('T3a','T3a'),
        ('T4','T4'),('T4a','T4a'),('T4b','T4b'),('T4c','T4c'),('T4d','T4d'),
    ])
    tnm_n = models.CharField(max_length=5, blank=True, choices=[
        ('NX','NX – Non évaluable'),('N0','N0 – Pas de métastase'),
        ('N1','N1'),('N1a','N1a'),('N1b','N1b'),('N1c','N1c'),
        ('N2','N2'),('N2a','N2a'),('N2b','N2b'),('N2c','N2c'),
        ('N3','N3'),('N3a','N3a'),('N3b','N3b'),('N3c','N3c'),
    ])
    tnm_m = models.CharField(max_length=5, blank=True, choices=[
        ('MX','MX – Non évaluable'),('M0','M0 – Pas de métastase'),
        ('M1','M1 – Métastase à distance'),('M1a','M1a'),('M1b','M1b'),('M1c','M1c'),
    ])
    tnm_edition         = models.CharField(max_length=5, default='8', blank=True)
    tnm_type            = models.CharField(max_length=1, choices=[('c','cTNM – Clinique'),('p','pTNM – Pathologique'),('y','yTNM – Post-thérapeutique')], default='c')
    tnm_descripteurs    = models.CharField(max_length=100, blank=True)
    tnm_certitude       = models.CharField(max_length=20, blank=True, choices=[('certain','Certain'),('probable','Probable'),('suppose','Supposé')])
    tnm_date_evaluation = models.DateField(null=True, blank=True)
    tnm_commentaire     = models.TextField(blank=True)

    # 6. Stade & État
    stade_ajcc           = models.CharField(max_length=5, choices=StadeAJCC.choices, default='U')
    etat_cancer          = models.CharField(max_length=25, choices=EtatCancer.choices, default='non_determine')
    performance_status   = models.CharField(max_length=1, choices=PerformanceStatus.choices, blank=True)
    pronostic_evaluation = models.CharField(max_length=20, choices=PronosticEvaluation.choices, blank=True)

    # 7. Méthodes de confirmation
    methodes_confirmation_text  = models.CharField(max_length=300, blank=True)
    conf_histologie_tumeur      = models.BooleanField(default=False)
    conf_cytologie              = models.BooleanField(default=False)
    conf_microscopie_sans_histo = models.BooleanField(default=False)
    conf_marqueurs_biologiques  = models.BooleanField(default=False)
    conf_imagerie               = models.BooleanField(default=False)
    conf_biopsie_medullaire     = models.BooleanField(default=False)

    # 8. Marqueurs biologiques
    recepteur_re             = models.CharField(max_length=10, blank=True, choices=[('positif','Positif'),('negatif','Négatif'),('inconnu','Inconnu')])
    recepteur_re_pourcentage = models.PositiveSmallIntegerField(null=True, blank=True)
    recepteur_rp             = models.CharField(max_length=10, blank=True, choices=[('positif','Positif'),('negatif','Négatif'),('inconnu','Inconnu')])
    recepteur_rp_pourcentage = models.PositiveSmallIntegerField(null=True, blank=True)
    her2       = models.CharField(max_length=10, blank=True, choices=[('positif','Positif (3+)'),('equivoque','Équivoque (2+)'),('negatif','Négatif (0/1+)'),('inconnu','Inconnu')])
    her2_fish  = models.CharField(max_length=15, blank=True, choices=Her2Fish.choices)
    ki67       = models.CharField(max_length=20, blank=True)
    psa        = models.CharField(max_length=20, blank=True)
    cea        = models.CharField(max_length=20, blank=True)
    ca_19_9    = models.CharField(max_length=20, blank=True)
    ca_125     = models.CharField(max_length=20, blank=True)
    afp        = models.CharField(max_length=20, blank=True)
    pdl1       = models.CharField(max_length=20, blank=True)
    mmr_status = models.CharField(max_length=15, blank=True, choices=MmrStatus.choices)
    autres_marqueurs = models.TextField(blank=True)

    # 9. Imagerie & Mesures
    taille_tumeur             = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    taille_tumeur_axe_max     = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    taille_tumeur_3d          = models.CharField(max_length=50, blank=True)
    nombre_ganglions          = models.PositiveSmallIntegerField(null=True, blank=True)
    nombre_ganglions_preleves = models.PositiveSmallIntegerField(null=True, blank=True)
    metastases_sites          = models.CharField(max_length=300, blank=True)
    nombre_metastases         = models.PositiveSmallIntegerField(null=True, blank=True)
    volume_tumoral            = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    invasion_vasculaire       = models.BooleanField(null=True, blank=True)
    invasion_perineurale      = models.BooleanField(null=True, blank=True)
    img_scanner               = models.BooleanField(default=False)
    img_irm_cerebrale         = models.BooleanField(default=False)
    img_pet_scan              = models.BooleanField(default=False)
    img_echographie           = models.BooleanField(default=False)
    img_radiographie          = models.BooleanField(default=False)
    img_scintigraphie         = models.BooleanField(default=False)

    # 10. Rapport anatomopathologique
    numero_bloc_anapath         = models.CharField(max_length=50, blank=True)
    medecin_anatomopathologiste = models.CharField(max_length=150, blank=True)
    laboratoire_anapath         = models.CharField(max_length=200, blank=True)
    date_analyse_anapath        = models.DateField(null=True, blank=True)
    technique_prelevement       = models.CharField(max_length=25, choices=TechniquePrelevement.choices, blank=True)
    qualite_prelevement         = models.CharField(max_length=15, choices=QualitePrelevement.choices, blank=True)
    immunohistochimie           = models.TextField(blank=True)
    rapport_complet             = models.TextField(blank=True)
    marges_chirurgicales        = models.CharField(max_length=20, choices=MargesChirurgicales.choices, blank=True)
    distance_marge_minimale     = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    emboles_lymphatiques        = models.BooleanField(null=True, blank=True)
    emboles_vasculaires         = models.BooleanField(null=True, blank=True)

    # 11. Établissement & CIM-10
    etablissement_diagnostic = models.CharField(max_length=200, blank=True)
    cim10_code               = models.CharField(max_length=10, blank=True)
    cim10_libelle            = models.CharField(max_length=200, blank=True)

    # 12. Statut & Métadonnées
    est_principal     = models.BooleanField(default=True)
    observations      = models.TextField(blank=True)
    date_creation     = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    cree_par          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='diagnostics_crees')
    modifie_par       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='diagnostics_modifies')

    class Meta:
        db_table = 'diagnostics'
        ordering = ['-date_diagnostic']
        verbose_name = 'Diagnostic'
        verbose_name_plural = 'Diagnostics'

    def __str__(self):
        return f"[{self.patient.registration_number}] {self.topographie_code} – {self.date_diagnostic}"

    def get_tnm_display_full(self):
        parts = []
        if self.tnm_t: parts.append(self.tnm_t)
        if self.tnm_n: parts.append(self.tnm_n)
        if self.tnm_m: parts.append(self.tnm_m)
        prefix = self.tnm_type if self.tnm_type else ''
        return prefix + ''.join(parts) if parts else '—'

    def save(self, *args, **kwargs):
        if self.topographie:
            self.topographie_code    = self.topographie.code
            self.topographie_libelle = self.topographie.libelle
        if self.morphologie:
            self.morphologie_code    = self.morphologie.code
            self.morphologie_libelle = self.morphologie.libelle
        super().save(*args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# Style de Vie (OneToOne → Diagnostic)
# ─────────────────────────────────────────────────────────────────────────────

class StyleVie(models.Model):

    class StatutTabagique(models.TextChoices):
        NON_FUMEUR    = 'non_fumeur',    'Non-fumeur'
        FUMEUR_ACTIF  = 'fumeur_actif',  'Fumeur actif'
        ANCIEN_FUMEUR = 'ancien_fumeur', 'Ancien fumeur'
        FUMEUR_PASSIF = 'fumeur_passif', 'Fumeur passif'
        INCONNU       = 'inconnu',       'Inconnu'

    class ConsommationAlcool(models.TextChoices):
        JAMAIS        = 'jamais',        'Jamais'
        OCCASIONNEL   = 'occasionnel',   'Occasionnel (<1/semaine)'
        MODERE        = 'modere',        'Modéré (1-7/semaine)'
        ELEVE         = 'eleve',         'Élevé (>7/semaine)'
        ANCIEN_BUVEUR = 'ancien_buveur', 'Ancien buveur'
        INCONNU       = 'inconnu',       'Inconnu'

    class NiveauActivite(models.TextChoices):
        SEDENTAIRE = 'sedentaire', 'Sédentaire'
        LEGER      = 'leger',      'Léger (<2h/sem)'
        MODERE     = 'modere',     'Modéré (2-5h/sem)'
        INTENSE    = 'intense',    'Intense (>5h/sem)'
        INCONNU    = 'inconnu',    'Inconnu'

    class QualiteSommeil(models.TextChoices):
        BONNE        = 'bonne',        'Bonne (7-9h)'
        INSUFFISANTE = 'insuffisante', 'Insuffisante (<6h)'
        EXCESSIVE    = 'excessive',    'Excessive (>10h)'
        TROUBLES     = 'troubles',     'Troubles du sommeil'
        INCONNU      = 'inconnu',      'Inconnu'

    diagnostic = models.OneToOneField(Diagnostic, on_delete=models.CASCADE, related_name='style_vie')

    # Tabagisme
    statut_tabagique       = models.CharField(max_length=20, choices=StatutTabagique.choices, blank=True)
    paquets_annees         = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    age_debut_tabac        = models.PositiveSmallIntegerField(null=True, blank=True)
    age_arret_tabac        = models.PositiveSmallIntegerField(null=True, blank=True)
    type_tabac             = models.CharField(max_length=100, blank=True)
    nombre_cigarettes_jour = models.PositiveSmallIntegerField(null=True, blank=True)

    # Alcool
    consommation_alcool       = models.CharField(max_length=20, choices=ConsommationAlcool.choices, blank=True)
    unites_par_semaine        = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    type_alcool               = models.CharField(max_length=100, blank=True)
    duree_consommation_annees = models.PositiveSmallIntegerField(null=True, blank=True)

    # Activité physique
    niveau_activite    = models.CharField(max_length=15, choices=NiveauActivite.choices, blank=True)
    heures_par_semaine = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    type_activite      = models.CharField(max_length=200, blank=True)
    frequence_activite = models.CharField(max_length=50, blank=True)

    # Alimentation & IMC
    poids                    = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    taille                   = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    imc                      = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    fruits_legumes_quotidien = models.PositiveSmallIntegerField(null=True, blank=True)
    alimentation_desc        = models.TextField(blank=True)
    regime_particulier       = models.CharField(max_length=100, blank=True)

    # Expositions
    exposition_professionnelle = models.TextField(blank=True)
    duree_exposition_annees    = models.PositiveSmallIntegerField(null=True, blank=True)
    profession                 = models.CharField(max_length=150, blank=True)

    # Autres facteurs
    stress_chronique        = models.BooleanField(null=True, blank=True)
    qualite_sommeil         = models.CharField(max_length=15, choices=QualiteSommeil.choices, blank=True)
    heures_sommeil          = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    contraception_hormonale = models.CharField(max_length=100, blank=True)
    allaitement_duree_mois  = models.PositiveSmallIntegerField(null=True, blank=True)

    # Score calculé
    score_risque_global = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'style_vie'
        verbose_name = 'Style de vie'

    def __str__(self):
        return f"Style de vie – Diag#{self.diagnostic_id}"

    def calculer_score_risque(self):
        score = 0
        if self.statut_tabagique == 'fumeur_actif':   score += 3
        elif self.statut_tabagique == 'ancien_fumeur': score += 1
        if self.consommation_alcool == 'eleve':   score += 2
        elif self.consommation_alcool == 'modere': score += 1
        if self.niveau_activite == 'sedentaire': score += 1
        if self.imc:
            if self.imc >= 30:   score += 2
            elif self.imc >= 25: score += 1
        if self.exposition_professionnelle: score += 2
        self.score_risque_global = min(score, 10)
        return self.score_risque_global

    def save(self, *args, **kwargs):
        if self.poids and self.taille and float(self.taille) > 0:
            self.imc = round(float(self.poids) / (float(self.taille) ** 2), 1)
        self.calculer_score_risque()
        super().save(*args, **kwargs)