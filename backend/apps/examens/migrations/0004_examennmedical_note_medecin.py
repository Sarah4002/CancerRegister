from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('examens', '0003_exam_routing_and_result_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='examenmedical',
            name='note_medecin',
            field=models.TextField(blank=True),
        ),
    ]
