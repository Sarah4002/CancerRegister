from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('examens', '0001_initial'),
        ('suivi', '0007_initial_consultation_workflow'),
    ]

    operations = [
        migrations.AlterField(
            model_name='examenmedical',
            name='statut',
            field=models.CharField(
                choices=[
                    ('prescrit', 'Prescrit'),
                    ('en_attente', 'En attente'),
                    ('realise', 'Réalisé'),
                    ('resultat_disponible', 'Résultat disponible'),
                    ('annule', 'Annulé'),
                ],
                default='prescrit',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='examenmedical',
            name='consultation',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='examens_demandes',
                to='suivi.consultationsuivi',
            ),
        ),
    ]
