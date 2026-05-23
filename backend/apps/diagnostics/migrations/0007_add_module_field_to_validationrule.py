from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('diagnostics', '0006_diagnosticvalidationrule_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='diagnosticvalidationrule',
            name='module',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('patient', 'Dossier patient'),
                    ('diagnostic', 'Diagnostic'),
                    ('traitement', 'Traitement'),
                    ('suivi', 'Suivi / Consultation'),
                ],
                default='diagnostic',
            ),
        ),
        migrations.AddField(
            model_name='diagnosticvalidationrule',
            name='field_name',
            field=models.CharField(max_length=100, blank=True, default=''),
            preserve_default=False,
        ),
    ]
