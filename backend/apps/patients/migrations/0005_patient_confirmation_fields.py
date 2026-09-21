from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0004_documentadministratif'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='patient',
            name='statut_confirmation',
            field=models.CharField(
                choices=[('en_attente', 'En attente de confirmation'), ('confirme', 'Confirmé (cancer)'), ('refuse', 'Refusé (pas de cancer)')],
                default='en_attente',
                help_text="En attente tant qu'un médecin n'a pas confirmé le diagnostic de cancer.",
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name='patient',
            name='motif_refus',
            field=models.TextField(blank=True, help_text="Renseigné uniquement si le médecin a refusé le dossier (pas de cancer)."),
        ),
        migrations.AddField(
            model_name='patient',
            name='confirme_par',
            field=models.ForeignKey(
                blank=True,
                help_text='Médecin ou médecin chef ayant confirmé ou refusé le dossier.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='patients_confirmes',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='patient',
            name='date_confirmation',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
