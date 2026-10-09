from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('notifications', '0004_examen_notification_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='examen_id',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
