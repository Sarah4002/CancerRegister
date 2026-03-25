"""
Management command to seed the stats app with realistic test data.
Usage: python manage.py seed_stats
"""
import random
from django.core.management.base import BaseCommand
from apps.stats.models import CancerType, Wilaya, IncidenceRecord, SurvivalRate

CANCERS = [
    ('C50', 'Sein',      'Solide'),
    ('C34', 'Poumon',    'Solide'),
    ('C18', 'Côlon',     'Solide'),
    ('C61', 'Prostate',  'Solide'),
    ('C91', 'Leucémie',  'Liquide'),
    ('C85', 'Lymphome',  'Liquide'),
    ('C44', 'Peau',      'Solide'),
    ('C80', 'Autres',    'Solide'),
]
WILAYAS = [
    ('31', 'Oran',        35.6969, -0.6331),
    ('16', 'Alger',       36.7538,  3.0588),
    ('25', 'Constantine', 36.3650,  6.6147),
    ('13', 'Tlemcen',     34.8784, -1.3151),
    ('23', 'Annaba',      36.9000,  7.7667),
    ('09', 'Blida',       36.4700,  2.8200),
    ('19', 'Sétif',       36.1900,  5.4100),
    ('06', 'Béjaïa',      36.7500,  5.0800),
    ('26', 'Médéa',       36.2600,  2.7500),
    ('22', 'Sidi Bel Abbès', 35.2000, -0.6300),
]
TRANCHES_AGE = ['< 25', '25–34', '35–44', '45–54', '55–64', '65–74', '≥ 75']
STADES       = ['I', 'II', 'III', 'IV']
CANCER_WEIGHTS = {
    'Sein':     (0.05, 0.95), 'Poumon':   (0.55, 0.45),
    'Côlon':    (0.52, 0.48), 'Prostate': (1.00, 0.00),
    'Leucémie': (0.55, 0.45), 'Lymphome': (0.52, 0.48),
    'Peau':     (0.58, 0.42), 'Autres':   (0.50, 0.50),
}
AGE_WEIGHTS   = [0.023, 0.051, 0.107, 0.191, 0.266, 0.233, 0.128]
STADE_WEIGHTS = [0.211, 0.323, 0.283, 0.182]
CANCER_FREQS  = [29.3, 22.0, 16.5, 13.3, 7.5, 5.2, 5.2, 3.6]
SURVIE_5ANS = {
    'Sein':     {'I': 98, 'II': 82, 'III': 60, 'IV': 27},
    'Poumon':   {'I': 56, 'II': 33, 'III': 16, 'IV': 5},
    'Côlon':    {'I': 92, 'II': 72, 'III': 42, 'IV': 12},
    'Prostate': {'I': 99, 'II': 96, 'III': 76, 'IV': 31},
    'Leucémie': {'I': 80, 'II': 65, 'III': 40, 'IV': 15},
    'Lymphome': {'I': 90, 'II': 75, 'III': 55, 'IV': 25},
    'Peau':     {'I': 99, 'II': 95, 'III': 71, 'IV': 20},
    'Autres':   {'I': 85, 'II': 68, 'III': 45, 'IV': 18},
}


class Command(BaseCommand):
    help = 'Seed the stats app with realistic Algerian cancer registry data'

    def add_arguments(self, parser):
        parser.add_argument('--years', nargs='+', type=int, default=[2022, 2023, 2024])
        parser.add_argument('--total', type=int, default=4000)
        parser.add_argument('--clear', action='store_true')

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            IncidenceRecord.objects.all().delete()
            SurvivalRate.objects.all().delete()
            CancerType.objects.all().delete()
            Wilaya.objects.all().delete()

        self.stdout.write('Creating cancer types...')
        ct_map = {}
        for code, label, categorie in CANCERS:
            ct, _ = CancerType.objects.get_or_create(code=code, defaults={'label': label, 'categorie': categorie})
            ct_map[label] = ct

        self.stdout.write('Creating wilayas...')
        w_list = []
        for code, nom, lat, lng in WILAYAS:
            w, _ = Wilaya.objects.get_or_create(code=code, defaults={'nom': nom, 'latitude': lat, 'longitude': lng})
            w_list.append(w)

        self.stdout.write('Creating survival rates...')
        for year in options['years']:
            for label, stade_survie in SURVIE_5ANS.items():
                ct = ct_map.get(label)
                if not ct:
                    continue
                for stade, s5 in stade_survie.items():
                    SurvivalRate.objects.get_or_create(
                        cancer_type=ct, stade=stade, annee_ref=year,
                        defaults={'survie_1an': min(100, s5+10), 'survie_3ans': min(100, s5+5), 'survie_5ans': s5}
                    )

        self.stdout.write('Creating incidence records...')
        cancer_list = list(ct_map.items())
        batch = []
        for year in options['years']:
            for month in range(1, 13):
                for i, (ct_label, ct_obj) in enumerate(cancer_list):
                    freq = CANCER_FREQS[i] / 100
                    monthly = int(options['total'] * freq / 12)
                    mf = CANCER_WEIGHTS.get(ct_label, (0.5, 0.5))
                    for j, tranche in enumerate(TRANCHES_AGE):
                        age_cases = max(1, int(monthly * AGE_WEIGHTS[j]))
                        for k, stade in enumerate(STADES):
                            stade_cases = max(0, int(age_cases * STADE_WEIGHTS[k]))
                            if stade_cases == 0:
                                continue
                            for si, sexe in enumerate(['M', 'F']):
                                cas = max(0, int(stade_cases * mf[si]))
                                if cas == 0:
                                    continue
                                mort_rate = SURVIE_5ANS.get(ct_label, {}).get(stade, 50) / 100
                                deces = int(cas * (1 - mort_rate) * 0.2)
                                batch.append(IncidenceRecord(
                                    cancer_type=ct_obj, wilaya=random.choice(w_list),
                                    annee=year, mois=month, sexe=sexe,
                                    tranche_age=tranche, stade=stade,
                                    nb_cas=cas + random.randint(-1, 2),
                                    nb_deces=max(0, deces + random.randint(-1, 1)),
                                ))
                                if len(batch) >= 500:
                                    IncidenceRecord.objects.bulk_create(
                                        batch, update_conflicts=True,
                                        update_fields=['nb_cas', 'nb_deces'],
                                        unique_fields=['cancer_type', 'wilaya', 'annee', 'mois', 'sexe', 'tranche_age', 'stade'],
                                    )
                                    batch = []
        if batch:
            IncidenceRecord.objects.bulk_create(
                batch, update_conflicts=True,
                update_fields=['nb_cas', 'nb_deces'],
                unique_fields=['cancer_type', 'wilaya', 'annee', 'mois', 'sexe', 'tranche_age', 'stade'],
            )
        self.stdout.write(self.style.SUCCESS(
            f'Done! {IncidenceRecord.objects.count()} incidence records created.'
        ))