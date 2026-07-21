from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_alter_user_is_active'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='accesslog',
            index=models.Index(fields=['-timestamp'], name='access_log_timestamp_idx'),
        ),
        migrations.AddIndex(
            model_name='accesslog',
            index=models.Index(fields=['action', '-timestamp'], name='access_log_action_time_idx'),
        ),
    ]
