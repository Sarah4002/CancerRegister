"""
Management command: seed_patients  [VERSION FINALE STABLE]
Cree 20 patients de test realistes pour le registre national du cancer algerien.
"""

import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand

from apps.patients.models import Patient, ContactUrgence
from apps.diagnostics.models import Diagnostic, TopographieICD, MorphologieICD


ETABLISSEMENTS = [
    'CHU Oran', 'CHU Mustapha Pacha Alger', 'CAC Blida',
    'CHU Constantine', 'EHU Oran', 'Clinique des specialites Tlemcen',
]

MEDECINS = [
    'Dr. Bennacer', 'Dr. Bouras', 'Dr. Rahmoun',
    'Dr. Meziane', 'Dr. Cherif', 'Dr. Boudissa',
]

RUES = [
    'de la Paix', 'des Martyrs', 'du 1er Novembre',
    'Ben Badis', 'Larbi Ben Mhidi', 'Didouche Mourad',
]

# (code_topo, libelle_topo, categorie, code_morpho, libelle_morpho, stade_ajcc, tnm_t, tnm_n, tnm_m)
CANCERS_DATA = [
    ('C50.1','Quadrant supero-externe du sein','Sein','8500/3','Carcinome canalaire infiltrant','II','T2','N1','M0'),
    ('C50.4','Quadrant supero-interne du sein','Sein','8520/3','Carcinome lobulaire infiltrant','I','T1','N0','M0'),
    ('C34.1','Lobe superieur du poumon','Poumon','8070/3','Carcinome epidermoide','III','T3','N2','M0'),
    ('C34.3','Lobe inferieur du poumon','Poumon','8140/3','Adenocarcinome pulmonaire','IV','T4','N3','M1'),
    ('C18.2','Colon ascendant','Colon','8140/3','Adenocarcinome colique','II','T2','N0','M0'),
    ('C18.7','Colon sigmoide','Colon','8480/3','Adenocarcinome mucineux','III','T3','N2','M0'),
    ('C61','Prostate','Prostate','8140/3','Adenocarcinome acineux prostatique','II','T2','N0','M0'),
    ('C61','Prostate','Prostate','8141/3','Adenocarcinome prostatique grade 3','III','T3','N1','M0'),
    ('C91.0','Leucemie lymphoblastique aigue','Leucemie','9835/3','Leucemie lymphoblastique B','IV','T4','N3','M1'),
    ('C83.3','Lymphome diffus grandes cellules B','Lymphome','9680/3','LDGCB','III','T3','N2','M0'),
    ('C44.3','Peau du visage','Peau','8071/3','Carcinome epidermoide cutane','I','T1','N0','M0'),
    ('C53.0','Exocol de l uterus','Col','8072/3','Carcinome epidermoide cervical','II','T2','N1','M0'),
    ('C56','Ovaire','Ovaire','8441/3','Cystadenocarcinome sereux','III','T3','N2','M0'),
    ('C16.3','Antre de l estomac','Estomac','8142/3','Adenocarcinome gastrique','III','T3','N2','M0'),
    ('C22.0','Foie','Foie','8170/3','Carcinome hepatocellulaire','III','T3','N1','M0'),
    ('C25.0','Tete du pancreas','Pancreas','8143/3','Adenocarcinome pancreatique','IV','T4','N3','M1'),
    ('C67.1','Dome vesical','Vessie','8120/3','Carcinome urothelial','II','T2','N0','M0'),
    ('C73','Glande thyroide','Thyroide','8260/3','Carcinome papillaire','I','T1','N0','M0'),
    ('C71.1','Lobe frontal du cerveau','Cerveau','9440/3','Glioblastome','IV','T4','N3','M1'),
    ('C64','Rein','Rein','8312/3','Carcinome a cellules claires','II','T2','N0','M0'),
]


class Command(BaseCommand):
    help = 'Cree 20 patients de test realistes'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true')

    def handle(self, *args, **options):

        if options['clear']:
            Patient.objects.filter(notes__startswith='[TEST]').delete()

        topo_cache = {}
        morpho_cache = {}

        for (code_t, lib_t, cat, code_m, lib_m, *_) in CANCERS_DATA:
            topo_cache[code_t], _ = TopographieICD.objects.get_or_create(
                code=code_t,
                defaults={'libelle': lib_t, 'categorie': cat}
            )

            morpho_cache[code_m], _ = MorphologieICD.objects.get_or_create(
                code=code_m,
                defaults={'libelle': lib_m, 'comportement': '3'}
            )

        today = date.today()

        for i, row in enumerate(CANCERS_DATA):
            code_t, lib_t, cat_c, code_m, lib_m, stade, t_val, n_val, m_val = row

            # Patient minimaliste (pour exemple)
            patient = Patient.objects.create(
                nom=f'Patient{i}',
                prenom='Test',
                sexe=random.choice(['M','F']),
                date_naissance=date(1970,1,1),
                wilaya='Oran',
                statut_vital='vivant',
                statut_dossier='traitement',
                notes=f'[TEST] {cat_c}',
                est_actif=True,
            )

            # Champs obligatoires sécurisés
            psa_val = round(random.uniform(4.5,120.0),1) if cat_c=='Prostate' else 0.0

            if cat_c=='Sein':
                re_val=random.choice(['positif','negatif'])
                rp_val=random.choice(['positif','negatif'])
                her_val=random.choice(['positif','negatif','equivoque'])
                ki_val=random.randint(5,90)
            else:
                re_val='negatif'
                rp_val='negatif'
                her_val='negatif'
                ki_val=0

            Diagnostic.objects.create(
                patient=patient,
                topographie=topo_cache[code_t],
                morphologie=morpho_cache[code_m],
                date_diagnostic=today - timedelta(days=random.randint(90,1000)),
                stade_ajcc=stade,
                tnm_t=t_val,
                tnm_n=n_val,
                tnm_m=m_val,
                tnm_edition='8',
                tnm_type='c',
                base_diagnostic='5',
                grade_histologique='2',
                psa=psa_val,
                recepteur_re=re_val,
                recepteur_rp=rp_val,
                her2=her_val,
                ki67=ki_val,
                taille_tumeur=round(random.uniform(0.5,8.0),1),
                nombre_ganglions=0 if n_val=='N0' else random.randint(1,20),
                est_principal=True,
            )

        self.stdout.write(self.style.SUCCESS("20 patients crees avec succes"))