from rest_framework import serializers
from .models import ConsultationSuivi, QualiteVie, EffetIndesirable


class ConsultationSuiviListSerializer(serializers.ModelSerializer):
    patient_nom          = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero       = serializers.CharField(source='patient.registration_number', read_only=True)
    patient_num_dossier  = serializers.CharField(source='patient.registration_number', read_only=True)
    patient_statut_vital = serializers.CharField(source='patient.statut_vital', read_only=True)
    type_label      = serializers.CharField(source='get_type_consultation_display', read_only=True)
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    evolution_label = serializers.CharField(source='get_evolution_maladie_display', read_only=True)
    medecin_nom     = serializers.SerializerMethodField()

    class Meta:
        model  = ConsultationSuivi
        fields = [
            'id', 'patient', 'patient_nom', 'patient_numero',
            'type_consultation', 'type_label', 'statut', 'statut_label',
            'date_consultation', 'ps_ecog', 'poids_kg',
            'evolution_maladie', 'evolution_label',
            'rechute', 'nombre_rechutes',
            'date_dernier_rdv', 'prochaine_consultation',
            'medecin_nom', 'date_creation',
            'patient_num_dossier', 'patient_statut_vital',
        ]

    def get_medecin_nom(self, obj):
        if obj.medecin:
            return f"{obj.medecin.first_name} {obj.medecin.last_name}".strip() or obj.medecin.username
        return None


class ConsultationSuiviDetailSerializer(serializers.ModelSerializer):
    patient_nom          = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero       = serializers.CharField(source='patient.registration_number', read_only=True)
    patient_num_dossier  = serializers.CharField(source='patient.registration_number', read_only=True)
    patient_statut_vital = serializers.CharField(source='patient.statut_vital', read_only=True)
    type_label      = serializers.CharField(source='get_type_consultation_display', read_only=True)
    statut_label    = serializers.CharField(source='get_statut_display', read_only=True)
    evolution_label = serializers.CharField(source='get_evolution_maladie_display', read_only=True)
    ps_ecog_label   = serializers.CharField(source='get_ps_ecog_display', read_only=True)
    patient_statut_vital  = serializers.CharField(source='patient.statut_vital', read_only=True)
    patient_cause_deces   = serializers.CharField(source='patient.cause_deces', read_only=True)
    patient_num_dossier   = serializers.CharField(source='patient.registration_number', read_only=True)
    tabac_label     = serializers.CharField(source='get_tabac_display', read_only=True)
    alcool_label    = serializers.CharField(source='get_alcool_display', read_only=True)
    activite_label  = serializers.CharField(source='get_activite_physique_display', read_only=True)
    medecin_nom     = serializers.SerializerMethodField()
    qualite_vie_id  = serializers.SerializerMethodField()

    class Meta:
        model  = ConsultationSuivi
        fields = '__all__'
        read_only_fields = ['date_creation', 'date_modification', 'cree_par', 'imc']

    def get_medecin_nom(self, obj):
        if obj.medecin:
            return f"{obj.medecin.first_name} {obj.medecin.last_name}".strip() or obj.medecin.username
        return None

    def get_qualite_vie_id(self, obj):
        try:
            return obj.qualite_vie.id
        except Exception:
            return None


class ConsultationSuiviCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model   = ConsultationSuivi
        exclude = ['cree_par', 'date_creation', 'date_modification', 'imc']

    def create(self, validated_data):
        if self.context.get('request'):
            validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance


class RendezVousSerializer(serializers.ModelSerializer):
    """Vue limitée au secrétariat : aucune donnée clinique n'est exposée ou modifiable."""
    patient_nom = serializers.CharField(source='patient.get_full_name', read_only=True)
    medecin_nom = serializers.SerializerMethodField()

    class Meta:
        model = ConsultationSuivi
        fields = [
            'id', 'patient', 'patient_nom', 'type_consultation', 'statut',
            'date_consultation', 'heure', 'duree_minutes', 'medecin', 'medecin_nom', 'etablissement',
        ]

    def validate(self, attrs):
        from rest_framework.exceptions import ValidationError
        from datetime import datetime
        from django.db.models import Q
        if attrs.get('statut') == 'annulee':
            return attrs
        doctor = attrs.get('medecin', getattr(self.instance, 'medecin', None))
        selected_date = attrs.get('date_consultation', getattr(self.instance, 'date_consultation', None))
        selected_time = attrs.get('heure', getattr(self.instance, 'heure', None))
        duration = int(attrs.get('duree_minutes', getattr(self.instance, 'duree_minutes', 30)))
        room = attrs.get('etablissement', getattr(self.instance, 'etablissement', '')).strip()
        if not selected_date or not selected_time:
            return attrs
        start_minutes = selected_time.hour * 60 + selected_time.minute
        if doctor:
            day = str(selected_date.isoweekday())
            schedule = doctor.consultation_schedule or {
                str(index): {'active': index in range(1, 6), 'start': '08:00', 'end': '17:00'}
                for index in range(1, 8)
            }
            hours = schedule.get(day, {})
            if not hours.get('active'):
                raise ValidationError({'date_consultation': 'Ce médecin ne consulte pas ce jour-là.'})
            if str(selected_date) in (doctor.consultation_leave_days or []):
                raise ValidationError({'date_consultation': 'Ce médecin est en congé à cette date.'})
            start_limit = datetime.strptime(hours.get('start', '08:00'), '%H:%M').hour * 60 + datetime.strptime(hours.get('start', '08:00'), '%H:%M').minute
            end_limit = datetime.strptime(hours.get('end', '17:00'), '%H:%M').hour * 60 + datetime.strptime(hours.get('end', '17:00'), '%H:%M').minute
            if start_minutes < start_limit or start_minutes + duration > end_limit:
                raise ValidationError({'heure': f"Créneau hors des horaires de consultation ({hours.get('start', '08:00')}–{hours.get('end', '17:00')})."})
        if not doctor and not room:
            return attrs
        bookings = ConsultationSuivi.objects.filter(date_consultation=selected_date).exclude(statut__in=['annulee', 'reportee']).exclude(heure__isnull=True)
        collision = Q(medecin=doctor) if doctor else Q(pk__in=[])
        if room:
            collision |= Q(etablissement__iexact=room)
        bookings = bookings.filter(collision)
        if self.instance:
            bookings = bookings.exclude(pk=self.instance.pk)
        for booked_doctor, booked_room, booked_time, booked_duration in bookings.values_list('medecin_id', 'etablissement', 'heure', 'duree_minutes'):
            booked_start = booked_time.hour * 60 + booked_time.minute
            if start_minutes < booked_start + booked_duration and booked_start < start_minutes + duration:
                same_doctor = bool(doctor and booked_doctor == doctor.pk)
                same_room = bool(room and booked_room.casefold() == room.casefold())
                message = 'Ce créneau chevauche un rendez-vous déjà pris pour ce médecin.' if same_doctor else 'Cette salle est déjà réservée à cette heure.'
                raise ValidationError({'heure': message if same_doctor or same_room else 'Ce créneau est déjà occupé.'})
        return attrs

    def get_medecin_nom(self, obj):
        if obj.medecin:
            return f"{obj.medecin.first_name} {obj.medecin.last_name}".strip() or obj.medecin.username
        return None


class QualiteVieSerializer(serializers.ModelSerializer):
    patient_nom       = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero    = serializers.CharField(source='patient.registration_number', read_only=True)
    score_fonctionnel = serializers.FloatField(read_only=True)
    score_symptomes   = serializers.FloatField(read_only=True)

    class Meta:
        model  = QualiteVie
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']

    def create(self, validated_data):
        if self.context.get('request'):
            validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)



class EffetIndesirableSerializer(serializers.ModelSerializer):
    patient_nom           = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_numero        = serializers.CharField(source='patient.registration_number', read_only=True)
    type_label            = serializers.CharField(source='get_type_effet_display', read_only=True)
    severite_label        = serializers.CharField(source='get_severite_display', read_only=True)
    impact_traitement_label = serializers.CharField(source='get_impact_traitement_display', read_only=True)

    class Meta:
        model  = EffetIndesirable
        fields = '__all__'
        read_only_fields = ['date_creation', 'cree_par']

    def create(self, validated_data):
        if self.context.get('request'):
            validated_data['cree_par'] = self.context['request'].user
        return super().create(validated_data)
