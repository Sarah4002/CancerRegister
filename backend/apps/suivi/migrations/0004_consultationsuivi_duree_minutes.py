from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('suivi', '0003_consultationsuivi_heure')]
    operations = [migrations.AddField(
        model_name='consultationsuivi', name='duree_minutes',
        field=models.PositiveSmallIntegerField(default=30),
    )]
