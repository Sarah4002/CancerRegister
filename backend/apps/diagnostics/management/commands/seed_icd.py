from django.core.management.base import BaseCommand
from apps.diagnostics.models import TopographieICD, MorphologieICD
from apps.diagnostics.icd_data import TOPOGRAPHIES, MORPHOLOGIES


class Command(BaseCommand):
    help = 'Charge les référentiels ICD-O-3 (topographies et morphologies)'

    def handle(self, *args, **options):
        topographies = TOPOGRAPHIES
        morphologies = MORPHOLOGIES
        dictionary_path = None

        if dictionary_path:
            self.stdout.write(f'⏳ Lecture du dictionnaire CanReg: {dictionary_path}')
            parsed_topos, parsed_morphos = extract_topographies_and_morphologies(dictionary_path)
            if parsed_topos:
                topographies = parsed_topos
            if parsed_morphos:
                morphologies = parsed_morphos
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✓ Dictionnaire chargé ({len(topographies)} topographies, {len(morphologies)} morphologies)'
                )
            )

        self.stdout.write('⏳ Chargement des topographies ICD-O-3...')
        created_t = 0
        updated_t = 0
        for item in topographies:
            _, created = TopographieICD.objects.update_or_create(
                code=item['code'],
                defaults={
                    'libelle':   item['libelle'],
                    'categorie': item.get('categorie', ''),
                }
            )
            if created:
                created_t += 1
            else:
                updated_t += 1
        self.stdout.write(
            self.style.SUCCESS(
                f'  ✓ {created_t} topographies créées, {updated_t} mises à jour ({len(topographies)} total)'
            )
        )

        self.stdout.write('⏳ Chargement des morphologies ICD-O-3...')
        created_m = 0
        updated_m = 0
        for item in morphologies:
            _, created = MorphologieICD.objects.update_or_create(
                code=item['code'],
                defaults={
                    'libelle':      item['libelle'],
                    'groupe':       item.get('groupe', ''),
                    'comportement': item.get('comportement', '3'),
                }
            )
            if created:
                created_m += 1
            else:
                updated_m += 1
        self.stdout.write(
            self.style.SUCCESS(
                f'  ✓ {created_m} morphologies créées, {updated_m} mises à jour ({len(morphologies)} total)'
            )
        )
        self.stdout.write(self.style.SUCCESS('✅ Référentiels ICD-O-3 chargés avec succès !'))
