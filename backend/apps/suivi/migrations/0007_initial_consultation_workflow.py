from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('suivi', '0006_delete_rendezvouswaitlist')]

    operations = [
        migrations.AlterField(
            model_name='consultationsuivi',
            name='type_consultation',
            field=models.CharField(
                choices=[
                    ('initiale', 'Consultation initiale'),
                    ('suivi', 'Suivi standard'),
                    ('post_trt', 'Post-traitement'),
                    ('urgence', 'Urgence'),
                    ('bilan', "Bilan d'extension"),
                    ('annonce', "Consultation d'annonce"),
                    ('palliative', 'Soins palliatifs'),
                    ('psycho', 'Psycho-oncologie'),
                    ('dietet', 'Diététique'),
                ],
                default='suivi',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='consultationsuivi',
            name='symptomes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='consultationsuivi',
            name='antecedents',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='consultationsuivi',
            name='hypothese_medicale',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='consultationsuivi',
            name='suspicion_cancer',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='consultationsuivi',
            name='commentaires',
            field=models.TextField(blank=True),
        ),
    ]
