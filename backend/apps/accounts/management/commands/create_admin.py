from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(email='admin@rnc.dz').exists():
            User.objects.create_superuser(
                email='admin@rnc.dz',
                username='admin',
                password='adminRNC',
                first_name='Admin',
                last_name='RNC',
                role='admin',
                is_active=True,
                is_staff=True,
            )
            self.stdout.write('Superuser créé ✅')
        else:
            self.stdout.write('Superuser existe déjà.')