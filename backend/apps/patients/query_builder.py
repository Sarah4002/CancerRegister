import re
from datetime import datetime

from django.db.models import Q

from .models import Patient


class PatientQueryBuilder:
    """Construit progressivement le queryset patient selon la requête HTTP."""

    def __init__(self, request, action):
        self.request = request
        self.action = action
        self.queryset = (
            Patient.objects
            .select_related('medecin_referent', 'cree_par')
            .prefetch_related('contacts_urgence')
        )
        self.uses_exact_search = False

    def with_registry_scope(self):
        """Applique la visibilité registre, archives et dossiers à confirmer."""
        if self.action in ('retrieve', 'confirmer'):
            return self

        archive_filter = Q(est_actif=False) | Q(statut_vital='decede') | Q(
            statut_dossier__in=['remission', 'decede', 'archive']
        )
        waiting_filter = Q(statut_confirmation=Patient.StatutConfirmation.EN_ATTENTE)
        refused_filter = Q(statut_confirmation=Patient.StatutConfirmation.REFUSE)

        if self.request.query_params.get('archives') == '1':
            self.queryset = self.queryset.filter(archive_filter).exclude(waiting_filter)
        else:
            self.queryset = (
                self.queryset.exclude(archive_filter)
                .exclude(waiting_filter)
                .exclude(refused_filter)
            )
        return self

    def with_age_range(self):
        age_min = self.request.query_params.get('age_min')
        age_max = self.request.query_params.get('age_max')
        if age_min:
            self.queryset = self.queryset.filter(age_diagnostic__gte=age_min)
        if age_max:
            self.queryset = self.queryset.filter(age_diagnostic__lte=age_max)
        return self

    def with_birth_date_search(self):
        """Interprète les formats date et période déjà acceptés par la liste."""
        query = self.request.query_params.get('search', '').strip()
        if not query:
            return self

        period = re.match(r'^(\d{4})[\-/](\d{4})$', query)
        date_fr = re.match(r'^(\d{2})[\-/](\d{2})[\-/](\d{4})$', query)
        date_iso = re.match(r'^(\d{4})[\-/](\d{2})[\-/](\d{2})$', query)

        if period:
            first, last = sorted((int(period.group(1)), int(period.group(2))))
            self.queryset = self.queryset.filter(
                date_naissance__year__gte=first,
                date_naissance__year__lte=last,
            )
            self.uses_exact_search = True
        elif date_fr:
            parsed = self._parse_date(
                f'{date_fr.group(3)}-{date_fr.group(2)}-{date_fr.group(1)}'
            )
            if parsed:
                self.queryset = self.queryset.filter(date_naissance=parsed)
                self.uses_exact_search = True
        elif date_iso:
            parsed = self._parse_date(
                f'{date_iso.group(1)}-{date_iso.group(2)}-{date_iso.group(3)}'
            )
            if parsed:
                self.queryset = self.queryset.filter(date_naissance=parsed)
                self.uses_exact_search = True
        return self

    def build(self):
        """Retourne le queryset final après composition des étapes choisies."""
        return self.queryset

    @staticmethod
    def _parse_date(value):
        try:
            return datetime.strptime(value, '%Y-%m-%d').date()
        except ValueError:
            return None
