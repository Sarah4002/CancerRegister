from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Avg
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from calendar import monthrange
from datetime import date

from .models import ConsultationSuivi, QualiteVie, EffetIndesirable, RendezVousWaitlist
from .serializers import (
    ConsultationSuiviListSerializer, ConsultationSuiviDetailSerializer,
    ConsultationSuiviCreateSerializer,
    QualiteVieSerializer,     EffetIndesirableSerializer,
)
from apps.accounts.models import AccessLog
from apps.accounts.permissions import (
    CanAccessClinicalFollowup,
    CanManageAppointmentsOrClinicalFollowup,
)

User = get_user_model()


@transaction.atomic
def offer_next_waiting_patient(cancelled_rdv):
    """Assign a released slot to the next eligible waitlist entry and notify staff."""
    from django.db.models import Q
    from apps.notifications.models import Notification
    if not cancelled_rdv.medecin or not cancelled_rdv.date_consultation or not cancelled_rdv.heure:
        return None
    queue = RendezVousWaitlist.objects.filter(statut=RendezVousWaitlist.Status.WAITING)
    queue = queue.filter(Q(medecin=cancelled_rdv.medecin) | Q(medecin__isnull=True))
    if cancelled_rdv.etablissement:
        queue = queue.filter(Q(etablissement__iexact=cancelled_rdv.etablissement) | Q(etablissement=''))
    else:
        queue = queue.filter(etablissement='')
    candidates = list(queue.select_for_update().select_related('patient').order_by('date_creation', 'id'))
    candidates.sort(key=lambda item: (
        item.medecin_id != cancelled_rdv.medecin_id,
        bool(cancelled_rdv.etablissement) and item.etablissement.casefold() != cancelled_rdv.etablissement.casefold(),
        item.date_creation,
    ))
    entry = candidates[0] if candidates else None
    if not entry:
        return None
    entry.statut = RendezVousWaitlist.Status.OFFERED
    entry.medecin = cancelled_rdv.medecin
    if not entry.etablissement:
        entry.etablissement = cancelled_rdv.etablissement
    entry.date_proposee = cancelled_rdv.date_consultation
    entry.heure_proposee = cancelled_rdv.heure
    entry.date_proposition = timezone.now()
    entry.save(update_fields=['statut', 'medecin', 'etablissement', 'date_proposee', 'heure_proposee', 'date_proposition'])
    patient_name = entry.patient.get_full_name() or entry.patient.registration_number
    message = f"Un créneau s'est libéré le {cancelled_rdv.date_consultation} à {cancelled_rdv.heure.strftime('%H:%M')} avec Dr. {cancelled_rdv.medecin.get_full_name()}. Patient à contacter : {patient_name}."
    Notification.objects.bulk_create([
        Notification(destinataire=user, type='rdv_waitlist', titre='Créneau proposé à la liste d’attente', message=message)
        for user in User.objects.filter(role='secretaire', is_active=True)
    ])
    return entry


def ensure_rdv_slot_is_free(values, instance=None):
    from rest_framework.exceptions import ValidationError
    from django.db.models import Q
    doctor = values.get('medecin', getattr(instance, 'medecin', None))
    selected_date = values.get('date_consultation', getattr(instance, 'date_consultation', None))
    selected_time = values.get('heure', getattr(instance, 'heure', None))
    duration = int(values.get('duree_minutes', getattr(instance, 'duree_minutes', 30)))
    room = (values.get('etablissement', getattr(instance, 'etablissement', '')) or '').strip()
    if values.get('statut') == 'annulee' or not selected_date or not selected_time or (not doctor and not room):
        return
    start = selected_time.hour * 60 + selected_time.minute
    if doctor:
        schedule = doctor.consultation_schedule or {str(i): {'active': i in range(1, 6), 'start': '08:00', 'end': '17:00'} for i in range(1, 8)}
        hours = schedule.get(str(selected_date.isoweekday()), {})
        if not hours.get('active'):
            raise ValidationError({'date_consultation': 'Ce médecin ne consulte pas ce jour-là.'})
        if str(selected_date) in (doctor.consultation_leave_days or []):
            raise ValidationError({'date_consultation': 'Ce médecin est en congé à cette date.'})
        start_limit = int(hours.get('start', '08:00')[:2]) * 60 + int(hours.get('start', '08:00')[3:])
        end_limit = int(hours.get('end', '17:00')[:2]) * 60 + int(hours.get('end', '17:00')[3:])
        if start < start_limit or start + duration > end_limit:
            raise ValidationError({'heure': f"Créneau hors des horaires de consultation ({hours.get('start', '08:00')}–{hours.get('end', '17:00')})."})
    conflicts = ConsultationSuivi.objects.filter(date_consultation=selected_date).exclude(statut__in=['annulee', 'reportee']).exclude(heure__isnull=True)
    criterion = Q(medecin=doctor) if doctor else Q(pk__in=[])
    if room:
        criterion |= Q(etablissement__iexact=room)
    conflicts = conflicts.filter(criterion)
    if instance:
        conflicts = conflicts.exclude(pk=instance.pk)
    for booked_doctor, booked_room, booked_time, booked_duration in conflicts.values_list('medecin_id', 'etablissement', 'heure', 'duree_minutes'):
        booked_start = booked_time.hour * 60 + booked_time.minute
        if start < booked_start + booked_duration and booked_start < start + duration:
            if doctor and booked_doctor == doctor.pk:
                raise ValidationError({'heure': 'Ce médecin a déjà un rendez-vous sur ce créneau.'})
            if room and booked_room.casefold() == room.casefold():
                raise ValidationError({'heure': 'Cette salle est déjà réservée sur ce créneau.'})


class ConsultationSuiviViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanManageAppointmentsOrClinicalFollowup]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['patient', 'statut', 'type_consultation', 'medecin']
    search_fields      = ['patient__nom', 'patient__registration_number', 'motif', 'conclusion']
    ordering           = ['-date_consultation']

    def get_queryset(self):
        qs = ConsultationSuivi.objects.select_related('patient', 'medecin', 'diagnostic')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs

    def get_serializer_class(self):
        if self.request.user.role == 'secretaire':
            from .serializers import RendezVousSerializer
            return RendezVousSerializer
        if self.action == 'list':
            return ConsultationSuiviListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ConsultationSuiviCreateSerializer
        return ConsultationSuiviDetailSerializer

    def perform_create(self, serializer):
        ensure_rdv_slot_is_free(serializer.validated_data)
        obj = serializer.save(cree_par=self.request.user)
        AccessLog.objects.create(
            user=self.request.user, action=AccessLog.Action.CREATE,
            resource='consultation_suivi', resource_id=str(obj.id),
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def perform_update(self, serializer):
        ensure_rdv_slot_is_free(serializer.validated_data, serializer.instance)
        was_cancelled = serializer.instance.statut == 'annulee'
        obj = serializer.save()
        if not was_cancelled and obj.statut == 'annulee':
            offer_next_waiting_patient(obj)

    def perform_destroy(self, instance):
        was_active = instance.statut != 'annulee'
        super().perform_destroy(instance)
        if was_active:
            offer_next_waiting_patient(instance)

    @action(detail=False, methods=['post'], url_path='series')
    def create_series(self, request):
        """Create a monthly/periodic set of appointments atomically."""
        if request.user.role != 'secretaire' and not request.user.is_superuser:
            return Response({'detail': 'La création de séries est réservée au secrétariat.'}, status=403)
        try:
            count = int(request.data.get('recurrence_count', 1))
            interval = int(request.data.get('recurrence_interval', 1))
        except (TypeError, ValueError):
            return Response({'detail': 'Paramètres de récurrence invalides.'}, status=400)
        if not 2 <= count <= 24 or not 1 <= interval <= 12:
            return Response({'detail': 'La série doit contenir de 2 à 24 rendez-vous, espacés de 1 à 12 mois.'}, status=400)
        start_date = request.data.get('date_consultation')
        try:
            start_date = date.fromisoformat(start_date)
        except (TypeError, ValueError):
            return Response({'date_consultation': 'Date de départ invalide.'}, status=400)
        base = request.data.copy()
        base.pop('recurrence_count', None)
        base.pop('recurrence_interval', None)
        created = []
        with transaction.atomic():
            for offset in range(count):
                month_index = start_date.year * 12 + start_date.month - 1 + offset * interval
                year, month = divmod(month_index, 12)
                month += 1
                payload = base.copy()
                payload['date_consultation'] = date(year, month, min(start_date.day, monthrange(year, month)[1])).isoformat()
                serializer = self.get_serializer(data=payload)
                serializer.is_valid(raise_exception=True)
                obj = serializer.save(cree_par=request.user)
                created.append(obj)
            AccessLog.objects.create(user=request.user, action=AccessLog.Action.CREATE,
                resource='consultation_series', resource_id=','.join(str(item.pk) for item in created),
                ip_address=request.META.get('REMOTE_ADDR'), details={'count': len(created), 'interval_months': interval})
        from .serializers import RendezVousSerializer
        return Response({'count': len(created), 'results': [RendezVousSerializer(item).data for item in created]}, status=201)

    @action(detail=False, methods=['get', 'post'], url_path='liste-attente')
    def waitlist(self, request):
        if request.user.role != 'secretaire' and not request.user.is_superuser:
            return Response({'detail': 'Accès réservé au secrétariat.'}, status=403)
        if request.method == 'GET':
            entries = RendezVousWaitlist.objects.exclude(statut__in=['cancelled', 'booked']).select_related('patient', 'medecin')
            return Response({'results': [{
                'id': item.id, 'patient': item.patient_id,
                'patient_nom': item.patient.get_full_name(),
                'medecin': item.medecin_id,
                'medecin_nom': item.medecin.get_display_name() if item.medecin else 'Premier médecin disponible',
                'etablissement': item.etablissement, 'statut': item.statut,
                'date_proposee': item.date_proposee,
                'heure_proposee': item.heure_proposee.strftime('%H:%M') if item.heure_proposee else None,
                'date_creation': item.date_creation,
            } for item in entries]})
        from apps.patients.models import Patient
        try:
            patient = Patient.objects.get(pk=request.data.get('patient'))
            doctor_id = request.data.get('medecin') or None
            doctor = User.objects.get(pk=doctor_id, is_active=True, role__in=['doctor', 'doctor_chef']) if doctor_id else None
        except (Patient.DoesNotExist, User.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Patient ou médecin invalide.'}, status=400)
        entry = RendezVousWaitlist.objects.create(patient=patient, medecin=doctor,
            etablissement=str(request.data.get('etablissement', '')).strip()[:200],
            type_consultation=request.data.get('type_consultation') or 'suivi', cree_par=request.user)
        return Response({'id': entry.id, 'statut': entry.statut}, status=201)

    @action(detail=False, methods=['post'], url_path=r'liste-attente/(?P<entry_id>[^/.]+)/clore')
    def close_waitlist_entry(self, request, entry_id=None):
        if request.user.role != 'secretaire' and not request.user.is_superuser:
            return Response({'detail': 'Accès réservé au secrétariat.'}, status=403)
        try:
            entry = RendezVousWaitlist.objects.get(pk=entry_id, statut__in=['waiting', 'offered'])
        except RendezVousWaitlist.DoesNotExist:
            return Response({'detail': 'Entrée de liste d’attente introuvable.'}, status=404)
        next_status = 'booked' if request.data.get('status') == 'booked' else 'cancelled'
        entry.statut = next_status
        entry.save(update_fields=['statut'])
        return Response({'id': entry.pk, 'statut': entry.statut})

    @action(detail=False, methods=['get'])
    def par_patient(self, request):
        pid = request.query_params.get('patient_id')
        if not pid:
            return Response({'error': 'patient_id requis'}, status=400)
        qs = self.get_queryset().filter(patient_id=pid)
        return Response(ConsultationSuiviListSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def a_venir(self, request):
        from django.utils import timezone
        qs = ConsultationSuivi.objects.filter(
            statut='planifiee',
            date_consultation__gte=timezone.now().date()
        ).select_related('patient', 'medecin').order_by('date_consultation')[:20]
        return Response(ConsultationSuiviListSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        from apps.patients.models import Patient
        from apps.suivi.models import EffetIndesirable
        return Response({
            # Nouveaux cas (patients enregistrés)
            'nouveaux_cas':        Patient.objects.count(),
            # Consultations à venir
            'a_venir':             ConsultationSuivi.objects.filter(statut='planifiee').count(),
            # Rechutes
            'total_rechutes':      ConsultationSuivi.objects.filter(rechute=True).values('patient').distinct().count(),
            # Décès
            'total_deces':         Patient.objects.filter(statut_vital='decede').count(),
            # Effets indésirables non résolus
            'effets_non_resolus':  EffetIndesirable.objects.filter(resolu=False).count(),
            # Gardé pour usage interne
            'total':               ConsultationSuivi.objects.count(),
            'par_evolution':       list(ConsultationSuivi.objects.exclude(evolution_maladie='').values('evolution_maladie').annotate(n=Count('id'))),
        })


class QualiteVieViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanAccessClinicalFollowup]
    serializer_class   = QualiteVieSerializer
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['patient']
    ordering           = ['-date_evaluation']

    def get_queryset(self):
        qs = QualiteVie.objects.select_related('patient', 'consultation')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs

    @action(detail=False, methods=['get'])
    def evolution_patient(self, request):
        pid = request.query_params.get('patient_id')
        if not pid:
            return Response({'error': 'patient_id requis'}, status=400)
        qs = QualiteVie.objects.filter(patient_id=pid).order_by('date_evaluation')
        return Response([{
            'date':              str(q.date_evaluation),
            'score_global':      q.score_global_sante,
            'score_fonctionnel': q.score_fonctionnel,
            'score_symptomes':   q.score_symptomes,
            'score_fatigue':     q.score_fatigue,
            'score_douleur':     q.score_douleur,
            'score_anxiete':     q.score_anxiete,
        } for q in qs])



class EffetIndesirableViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanAccessClinicalFollowup]
    serializer_class   = EffetIndesirableSerializer
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['patient', 'type_effet', 'severite', 'resolu', 'impact_traitement']
    search_fields      = ['medicament_cause', 'description', 'patient__nom', 'patient__registration_number']
    ordering           = ['-date_apparition']

    def get_queryset(self):
        qs = EffetIndesirable.objects.select_related('patient', 'consultation')
        pid = self.request.query_params.get('patient_id')
        if pid:
            qs = qs.filter(patient_id=pid)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(cree_par=self.request.user)
        AccessLog.objects.create(
            user=self.request.user, action=AccessLog.Action.CREATE,
            resource='effet_indesirable', resource_id=str(obj.id),
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    @action(detail=False, methods=['get'])
    def non_resolus(self, request):
        qs = EffetIndesirable.objects.filter(resolu=False).select_related('patient').order_by('-date_apparition')[:30]
        return Response(EffetIndesirableSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        return Response({
            'total':       EffetIndesirable.objects.count(),
            'non_resolus': EffetIndesirable.objects.filter(resolu=False).count(),
            'par_type':    list(EffetIndesirable.objects.values('type_effet').annotate(n=Count('id')).order_by('-n')),
            'par_severite':list(EffetIndesirable.objects.values('severite').annotate(n=Count('id'))),
            'par_medicament': list(EffetIndesirable.objects.values('medicament_cause').annotate(n=Count('id')).order_by('-n')[:10]),
        })
