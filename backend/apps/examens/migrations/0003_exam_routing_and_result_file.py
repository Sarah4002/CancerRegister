from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('examens', '0002_exam_results_and_consultation'),
    ]

    operations = [
        migrations.AddField(
            model_name='examenmedical',
            name='fichier_resultat',
            field=models.FileField(blank=True, null=True, upload_to='examens/resultats/'),
        ),
        migrations.AddField(
            model_name='examenmedical',
            name='service_destinataire',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
