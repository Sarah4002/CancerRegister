from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('suivi', '0002_consultationsuivi_activite_physique_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='consultationsuivi',
            name='heure',
            field=models.TimeField(blank=True, null=True),
        ),
    ]
