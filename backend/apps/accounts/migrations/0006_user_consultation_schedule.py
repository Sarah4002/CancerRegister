from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('accounts', '0005_user_must_change_password')]
    operations = [
        migrations.AddField(model_name='user', name='consultation_schedule', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='user', name='consultation_leave_days', field=models.JSONField(blank=True, default=list)),
    ]
