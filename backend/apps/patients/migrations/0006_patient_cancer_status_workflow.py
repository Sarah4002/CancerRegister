from django.db import migrations, models


def map_legacy_cancer_status(apps, schema_editor):
    Patient = apps.get_model('patients', 'Patient')
    Patient.objects.filter(statut_confirmation='en_attente').update(statut_confirmation='PENDING')
    Patient.objects.filter(statut_confirmation='confirme').update(statut_confirmation='CANCER_CONFIRMED')
    Patient.objects.filter(statut_confirmation='refuse').update(statut_confirmation='CANCER_REJECTED')


def restore_legacy_cancer_status(apps, schema_editor):
    Patient = apps.get_model('patients', 'Patient')
    Patient.objects.filter(statut_confirmation='PENDING').update(statut_confirmation='en_attente')
    Patient.objects.filter(statut_confirmation='CANCER_CONFIRMED').update(statut_confirmation='confirme')
    Patient.objects.filter(statut_confirmation='CANCER_REJECTED').update(statut_confirmation='refuse')


class Migration(migrations.Migration):
    dependencies = [('patients', '0005_patient_confirmation_fields')]

    operations = [
        migrations.AlterField(
            model_name='patient',
            name='statut_confirmation',
            field=models.CharField(
                choices=[
                    ('PENDING', 'En cours de vérification — cancer non confirmé'),
                    ('CANCER_CONFIRMED', 'Cancer confirmé'),
                    ('CANCER_REJECTED', 'Cancer écarté'),
                ],
                default='PENDING',
                help_text='Statut de confirmation médicale du cancer, distinct du statut administratif du dossier.',
                max_length=20,
            ),
        ),
        # Les nouvelles valeurs CANCER_CONFIRMED et CANCER_REJECTED dépassent
        # la limite historique de 12 caractères : élargir le champ avant la copie.
        migrations.RunPython(map_legacy_cancer_status, restore_legacy_cancer_status),
    ]
