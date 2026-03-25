"""
Commande de management Django pour le microservice SIG.

Usage :
    # Peupler les 58 wilayas (à faire une seule fois)
    python manage.py update_sig_stats --seed-wilayas

    # Recalculer les stats de toutes les wilayas (à planifier en cron)
    python manage.py update_sig_stats

    # Recalculer une wilaya spécifique
    python manage.py update_sig_stats --wilaya 31

    # Recalculer pour une année donnée
    python manage.py update_sig_stats --annee 2024
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


WILAYAS_DATA = [
    # (code, nom, nom_ar, region, chef_lieu, latitude, longitude, superficie_km2, population)
    (1,  "Adrar",               "أدرار",           "sud",            "Adrar",              27.874, -0.294,  427968, 450000),
    (2,  "Chlef",               "الشلف",           "nord",           "Chlef",              36.165,  1.329,   4791,  1200000),
    (3,  "Laghouat",            "الأغواط",         "hauts_plateaux", "Laghouat",           33.800,  2.865,  25052,  500000),
    (4,  "Oum El Bouaghi",      "أم البواقي",      "est",            "Oum El Bouaghi",     35.869,  7.113,   6768,  700000),
    (5,  "Batna",               "باتنة",           "est",            "Batna",              35.556,  6.174,  12038, 1250000),
    (6,  "Béjaïa",              "بجاية",           "nord",           "Béjaïa",             36.752,  5.084,   3261,  1000000),
    (7,  "Biskra",              "بسكرة",           "hauts_plateaux", "Biskra",             34.850,  5.728,  21671,  800000),
    (8,  "Béchar",              "بشار",            "sud",            "Béchar",             31.617, -2.217, 161400,  300000),
    (9,  "Blida",               "البليدة",         "nord",           "Blida",              36.470,  2.830,   1696, 1100000),
    (10, "Bouira",              "البويرة",         "nord",           "Bouira",             36.375,  3.900,   4439,  750000),
    (11, "Tamanrasset",         "تمنراست",         "sud",            "Tamanrasset",        22.785,  5.523, 556000,  200000),
    (12, "Tébessa",             "تبسة",            "est",            "Tébessa",            35.405,  8.121,  13878,  700000),
    (13, "Tlemcen",             "تلمسان",          "ouest",          "Tlemcen",            34.879, -1.315,   9017,  1000000),
    (14, "Tiaret",              "تيارت",           "hauts_plateaux", "Tiaret",             35.371,  1.317,  20086,  900000),
    (15, "Tizi Ouzou",          "تيزي وزو",        "nord",           "Tizi Ouzou",         36.717,  4.050,   2958, 1250000),
    (16, "Alger",               "الجزائر",         "nord",           "Alger",              36.738,  3.086,    273, 3500000),
    (17, "Djelfa",              "الجلفة",          "hauts_plateaux", "Djelfa",             34.673,  3.263,  66415, 1200000),
    (18, "Jijel",               "جيجل",            "nord",           "Jijel",              36.820,  5.765,   2577,  700000),
    (19, "Sétif",               "سطيف",            "est",            "Sétif",              36.191,  5.412,   6504, 1600000),
    (20, "Saïda",               "سعيدة",           "ouest",          "Saïda",              34.836,  0.150,   6764,  400000),
    (21, "Skikda",              "سكيكدة",          "est",            "Skikda",             36.876,  6.906,   4026,  900000),
    (22, "Sidi Bel Abbès",      "سيدي بلعباس",     "ouest",          "Sidi Bel Abbès",     35.189, -0.631,   9150,  700000),
    (23, "Annaba",              "عنابة",           "est",            "Annaba",             36.900,  7.767,   1439,  700000),
    (24, "Guelma",              "قالمة",           "est",            "Guelma",             36.463,  7.429,   3686,  500000),
    (25, "Constantine",         "قسنطينة",         "est",            "Constantine",        36.365,  6.615,   2187,  1000000),
    (26, "Médéa",               "المدية",          "hauts_plateaux", "Médéa",              36.264,  2.750,   8866,  850000),
    (27, "Mostaganem",          "مستغانم",         "ouest",          "Mostaganem",         35.931,  0.088,   2269,  800000),
    (28, "M'Sila",              "المسيلة",         "hauts_plateaux", "M'Sila",             35.706,  4.543,  18175, 1100000),
    (29, "Mascara",             "معسكر",           "ouest",          "Mascara",            35.395,  0.140,   5941,  800000),
    (30, "Ouargla",             "ورقلة",           "sud",            "Ouargla",            31.952,  5.326, 211980,  600000),
    (31, "Oran",                "وهران",           "ouest",          "Oran",               35.697, -0.633,   2114, 1600000),
    (32, "El Bayadh",           "البيض",           "hauts_plateaux", "El Bayadh",          33.682,  1.022,  78870,  300000),
    (33, "Illizi",              "إليزي",           "sud",            "Illizi",             26.484,  8.482, 284618,   60000),
    (34, "Bordj Bou Arréridj",  "برج بوعريريج",    "est",            "Bordj Bou Arréridj", 36.073,  4.763,   3975,  700000),
    (35, "Boumerdès",           "بومرداس",         "nord",           "Boumerdès",          36.765,  3.460,   1456,  900000),
    (36, "El Tarf",             "الطارف",          "est",            "El Tarf",            36.767,  8.313,   3339,  500000),
    (37, "Tindouf",             "تندوف",           "sud",            "Tindouf",            27.674, -8.149, 159000,   50000),
    (38, "Tissemsilt",          "تيسمسيلت",        "hauts_plateaux", "Tissemsilt",         35.607,  1.810,   3152,  350000),
    (39, "El Oued",             "الوادي",          "sud",            "El Oued",            33.367,  6.863,  44586,  700000),
    (40, "Khenchela",           "خنشلة",           "est",            "Khenchela",          35.436,  7.143,   9811,  400000),
    (41, "Souk Ahras",          "سوق أهراس",       "est",            "Souk Ahras",         36.280,  7.952,   4541,  500000),
    (42, "Tipaza",              "تيبازة",          "nord",           "Tipaza",             36.589,  2.448,   2166,  700000),
    (43, "Mila",                "ميلة",            "est",            "Mila",               36.450,  6.263,   3475,  800000),
    (44, "Aïn Defla",           "عين الدفلى",      "nord",           "Aïn Defla",          36.264,  1.967,   4897,  800000),
    (45, "Naâma",               "النعامة",         "hauts_plateaux", "Naâma",              33.267, -0.317,  29514,  200000),
    (46, "Aïn Témouchent",      "عين تموشنت",      "ouest",          "Aïn Témouchent",     35.297, -1.140,   2376,  400000),
    (47, "Ghardaïa",            "غرداية",          "sud",            "Ghardaïa",           32.490,  3.674,  86105,  400000),
    (48, "Relizane",            "غليزان",          "ouest",          "Relizane",           35.740,  0.556,   4870,  800000),
    (49, "El M'Ghair",          "المغير",          "sud",            "El M'Ghair",         33.954,  5.924,  44706,  200000),
    (50, "El Menia",            "المنيعة",         "sud",            "El Menia",           30.583,  2.883,  40300,  100000),
    (51, "Ouled Djellal",       "أولاد جلال",      "hauts_plateaux", "Ouled Djellal",      34.418,  5.067,  10090,  200000),
    (52, "Bordj Badji Mokhtar", "برج باجي مختار",  "sud",            "Bordj Badji Mokhtar",21.327,  0.942, 115000,   30000),
    (53, "Béni Abbès",          "بني عباس",        "sud",            "Béni Abbès",         30.130, -2.168,  85000,   80000),
    (54, "Timimoun",            "تيميمون",         "sud",            "Timimoun",           29.263,  0.241,  64000,  100000),
    (55, "Touggourt",           "تقرت",            "sud",            "Touggourt",          33.100,  6.067,  20000,  300000),
    (56, "Djanet",              "جانت",            "sud",            "Djanet",             24.552,  9.488,  87000,   15000),
    (57, "In Salah",            "عين صالح",        "sud",            "In Salah",           27.196,  2.464,  65000,   40000),
    (58, "In Guezzam",          "عين قزام",        "sud",            "In Guezzam",         19.567,  5.767,  95000,   10000),
]


class Command(BaseCommand):
    help = 'Peupler les wilayas de référence et recalculer les stats SIG'

    def add_arguments(self, parser):
        parser.add_argument('--seed-wilayas', action='store_true', help='Créer/mettre à jour les 58 wilayas')
        parser.add_argument('--wilaya', type=int, default=None, help='Code wilaya spécifique (défaut: toutes)')
        parser.add_argument('--annee', type=int, default=None, help='Année (défaut: année courante)')

    def handle(self, *args, **options):
        from apps.sig.models import Wilaya, StatCancerWilaya

        annee = options['annee'] or timezone.now().year

        if options['seed_wilayas']:
            self._seed_wilayas()

        wilaya_code = options['wilaya']
        if wilaya_code:
            wilayas = Wilaya.objects.filter(code=wilaya_code)
        else:
            wilayas = Wilaya.objects.all()

        self.stdout.write(f"\n📊 Recalcul des stats SIG – Année {annee}")
        self.stdout.write(f"   Wilayas à traiter : {wilayas.count()}\n")

        ok = 0
        errors = 0
        for w in wilayas:
            try:
                stat = StatCancerWilaya.calculer_et_sauvegarder(w.code, annee)
                if stat:
                    self.stdout.write(
                        self.style.SUCCESS(f"  ✓ W{w.code:02d} {w.nom:<30} → {stat.total_patients} patients")
                    )
                    ok += 1
                else:
                    self.stdout.write(self.style.WARNING(f"  ? W{w.code:02d} {w.nom} → aucune donnée"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ W{w.code:02d} {w.nom} → ERREUR: {e}"))
                errors += 1

        self.stdout.write(f"\n{'─'*50}")
        self.stdout.write(self.style.SUCCESS(f"  ✓ {ok} wilayas recalculées avec succès"))
        if errors:
            self.stdout.write(self.style.ERROR(f"  ✗ {errors} erreurs"))

    def _seed_wilayas(self):
        from apps.sig.models import Wilaya
        self.stdout.write("\n🌍 Peuplement des 58 wilayas d'Algérie…")
        created = 0
        updated = 0
        for row in WILAYAS_DATA:
            code, nom, nom_ar, region, chef_lieu, lat, lng, superficie, pop = row
            obj, is_new = Wilaya.objects.update_or_create(
                code=code,
                defaults={
                    'nom':           nom,
                    'nom_ar':        nom_ar,
                    'region':        region,
                    'chef_lieu':     chef_lieu,
                    'latitude':      lat,
                    'longitude':     lng,
                    'superficie_km2': superficie,
                    'population':    pop,
                }
            )
            if is_new:
                created += 1
            else:
                updated += 1
        self.stdout.write(self.style.SUCCESS(
            f"  Wilayas : {created} créées, {updated} mises à jour"
        ))