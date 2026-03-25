from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q
from apps.patients.models import Patient
from apps.diagnostics.models import Diagnostic
from collections import Counter

@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_map_data(request):
    """Get geographic data for the SIG map with all cancer cases by wilaya."""
    wilayas = [
        {"code": "01", "name": "Adrar", "lat": 27.8742, "lon": -0.2875},
        {"code": "02", "name": "Chlef", "lat": 36.1690, "lon": 1.3345},
        {"code": "03", "name": "Laghouat", "lat": 33.8078, "lon": 2.8628},
        {"code": "04", "name": "Oum El Bouaghi", "lat": 35.8746, "lon": 7.1132},
        {"code": "05", "name": "Batna", "lat": 35.5589, "lon": 6.1744},
        {"code": "06", "name": "Bejaia", "lat": 36.7500, "lon": 5.0567},
        {"code": "07", "name": "Biskra", "lat": 34.8513, "lon": 5.7241},
        {"code": "08", "name": "Bechar", "lat": 31.6188, "lon": -2.2179},
        {"code": "09", "name": "Blida", "lat": 36.5657, "lon": 2.8500},
        {"code": "10", "name": "Bouira", "lat": 36.3764, "lon": 3.9008},
        {"code": "11", "name": "Tamanrasset", "lat": 22.7850, "lon": 5.5228},
        {"code": "12", "name": "Tebessa", "lat": 35.4082, "lon": 8.1257},
        {"code": "13", "name": "Tlemcen", "lat": 34.6783, "lon": -1.3616},
        {"code": "14", "name": "Tiaret", "lat": 35.3703, "lon": 1.3270},
        {"code": "15", "name": "Tizi Ouzou", "lat": 36.7719, "lon": 4.0458},
        {"code": "16", "name": "Alger", "lat": 36.7538, "lon": 3.0588},
        {"code": "17", "name": "Djelfa", "lat": 34.6709, "lon": 3.2216},
        {"code": "18", "name": "Jijel", "lat": 36.8204, "lon": 5.7645},
        {"code": "19", "name": "Setif", "lat": 36.1912, "lon": 5.4145},
        {"code": "20", "name": "Saida", "lat": 34.8413, "lon": 0.1519},
        {"code": "21", "name": "Skikda", "lat": 36.8796, "lon": 6.9092},
        {"code": "22", "name": "Sidi Bel Abbes", "lat": 35.1899, "lon": -0.6309},
        {"code": "23", "name": "Annaba", "lat": 36.8964, "lon": 7.7484},
        {"code": "24", "name": "Guelma", "lat": 36.4621, "lon": 7.4261},
        {"code": "25", "name": "Constantine", "lat": 36.3650, "lon": 6.6147},
        {"code": "26", "name": "Medea", "lat": 36.2642, "lon": 2.7536},
        {"code": "27", "name": "Mostaganem", "lat": 35.9312, "lon": 0.0892},
        {"code": "28", "name": "Msila", "lat": 35.7069, "lon": 4.5415},
        {"code": "29", "name": "Mascara", "lat": 35.3965, "lon": 0.0676},
        {"code": "30", "name": "Ouargla", "lat": 31.9529, "lon": 5.3332},
        {"code": "31", "name": "Oran", "lat": 35.6938, "lon": -0.6211},
        {"code": "32", "name": "El Bayadh", "lat": 33.6826, "lon": 1.0265},
        {"code": "33", "name": "Illizi", "lat": 26.5167, "lon": 8.4667},
        {"code": "34", "name": "Bordj Bou Arreridj", "lat": 36.0739, "lon": 4.7633},
        {"code": "35", "name": "Boumerdes", "lat": 36.7534, "lon": 3.4771},
        {"code": "36", "name": "El Tarf", "lat": 36.7645, "lon": 8.3137},
        {"code": "37", "name": "Tindouf", "lat": 27.6711, "lon": -7.9189},
        {"code": "38", "name": "Tissemsilt", "lat": 35.6074, "lon": 1.8105},
        {"code": "39", "name": "El Oued", "lat": 33.3678, "lon": 6.8498},
        {"code": "40", "name": "Khenchela", "lat": 35.4266, "lon": 7.1475},
        {"code": "41", "name": "Souk Ahras", "lat": 36.2861, "lon": 7.9511},
        {"code": "42", "name": "Tipaza", "lat": 36.5890, "lon": 2.4432},
        {"code": "43", "name": "Mila", "lat": 36.4500, "lon": 6.2667},
        {"code": "44", "name": "Ain Defla", "lat": 36.2632, "lon": 1.9516},
        {"code": "45", "name": "Naama", "lat": 33.2667, "lon": -0.3167},
        {"code": "46", "name": "Ain Temouchent", "lat": 35.3044, "lon": -1.1428},
        {"code": "47", "name": "Ghardaia", "lat": 32.4900, "lon": 3.6464},
        {"code": "48", "name": "Relizane", "lat": 35.7374, "lon": 0.7534},
    ]
    
    # Get patient and diagnostic counts by wilaya
    try:
        patient_counts = Patient.objects.values('wilaya').annotate(count=Count('id'))
        wilaya_data = {}
        for p in patient_counts:
            raw = p.get('wilaya') or ''
            key = raw.strip().title()
            if key:
                wilaya_data[key] = p['count']
        
        # Get diagnostic counts by wilaya (use same normalization)
        diagnostic_counts = Diagnostic.objects.values('patient__wilaya').annotate(count=Count('id'))
        diagnostic_data = {}
        for d in diagnostic_counts:
            raw = d.get('patient__wilaya') or ''
            key = raw.strip().title()
            if key:
                diagnostic_data[key] = d['count']
    except Exception:
        wilaya_data = {}
        diagnostic_data = {}
    
    # Build result with all wilayas and their cancer cases
    result = []
    for w in wilayas:
        cases = wilaya_data.get(w['name'], 0)
        diagnostics = diagnostic_data.get(w['name'], 0)
        
        result.append({
            'code': w['code'],
            'name': w['name'],
            'lat': w['lat'],
            'lon': w['lon'],
            'cases': cases,
            'patients': cases,
            'diagnostics': diagnostics,
        })
    
    # Sort by most cases first
    result = sorted(result, key=lambda x: x['cases'], reverse=True)
    
    return Response(result)


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_statistics(request):
    """Get cancer statistics for Algeria."""
    year = request.GET.get('year')
    
    # Filter by year if provided
    diagnostics = Diagnostic.objects.all()
    patients = Patient.objects.all()
    
    if year:
        try:
            diagnostics = diagnostics.filter(date_diagnostic__year=int(year))
            patients = patients.filter(date_creation__year=int(year))
        except (ValueError, TypeError):
            pass
    
    # Top cancers
    try:
        top_cancers = diagnostics.values('topographie__code', 'topographie__libelle')\
            .annotate(count=Count('id'))\
            .order_by('-count')[:10]
    except Exception:
        top_cancers = []
    
    # Top wilayas
    try:
        top_wilayas = patients.values('wilaya')\
            .annotate(count=Count('id'))\
            .order_by('-count')[:10]
    except Exception:
        top_wilayas = []
    
    # Age distribution
    age_groups = {
        '0-14': 0,
        '15-44': 0,
        '45-64': 0,
        '65+': 0
    }
    
    try:
        for p in patients:
            age = getattr(p, 'age', None)
            if age is not None:
                if age < 15:
                    age_groups['0-14'] += 1
                elif age < 45:
                    age_groups['15-44'] += 1
                elif age < 65:
                    age_groups['45-64'] += 1
                else:
                    age_groups['65+'] += 1
    except Exception:
        pass
    
    return Response({
        'total_patients': patients.count(),
        'total_diagnostics': diagnostics.count(),
        'top_cancers': list(top_cancers),
        'top_wilayas': list(top_wilayas),
        'age_distribution': age_groups,
    })


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_patient(request):
    """Create a new patient with geolocation data."""
    data = request.data
    
    patient = Patient.objects.create(
        nip=data.get('nip'),
        nom=data.get('nom'),
        prenom=data.get('prenom'),
        date_naissance=data.get('date_naissance'),
        sexe=data.get('sexe'),
        wilaya=data.get('wilaya'),
        commune=data.get('commune'),
        adresse=data.get('adresse'),
        telephone=data.get('telephone'),
    )
    
    return Response({
        'id': patient.id,
        'message': 'Patient cree avec succes'
    }, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint."""
    return Response({'status': 'ok'})


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_wilayas_data(request):
    """
    Récupère tous les cas de cancer par wilaya.
    Retourne tous les wilayas avec leurs cas, patients et top cancers.
    """
    try:
        # Get all unique wilayas with patient data
        wilayas_list = Patient.objects.exclude(wilaya__isnull=True).exclude(wilaya='').values('wilaya').distinct().order_by('wilaya')
        wilayas = [w['wilaya'] for w in wilayas_list]
        
        wilayas_data = {}
        total_patients = 0
        total_diagnostics = 0
        
        for wilaya in wilayas:
            patients_wilaya = Patient.objects.filter(wilaya=wilaya)
            diagnostics_wilaya = Diagnostic.objects.filter(patient__wilaya=wilaya)
            
            patients_count = patients_wilaya.count()
            diagnostics_count = diagnostics_wilaya.count()
            
            if patients_count > 0 or diagnostics_count > 0:
                # Top cancers in this wilaya
                top_cancers = diagnostics_wilaya.values('topographie__code', 'topographie__libelle') \
                    .annotate(count=Count('id')) \
                    .order_by('-count')[:5]
                
                wilayas_data[wilaya] = {
                    'patients': patients_count,
                    'diagnostics': diagnostics_count,
                    'top_cancers': list(top_cancers),
                }
                
                total_patients += patients_count
                total_diagnostics += diagnostics_count
        
        return Response({
            'total_patients': total_patients,
            'total_diagnostics': total_diagnostics,
            'wilayas_count': len(wilayas_data),
            'wilayas': wilayas_data,
        })
    except Exception as e:
        import traceback
        return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_tlemcen_data(request):
    """
    Récupère les données de cancer par wilaya/commune.
    Retourne les cas de cancer, les patients et les principales causes.
    """
    # Get wilaya from query parameter or default to the wilaya with most patients
    requested_wilaya = request.GET.get('wilaya')
    
    try:
        # If no wilaya specified, get the one with most patients
        if not requested_wilaya:
            wilaya_counts = Patient.objects.values('wilaya').annotate(count=Count('id')).order_by('-count').first()
            requested_wilaya = wilaya_counts['wilaya'] if wilaya_counts else 'Tlemcen'
        
        # Get all unique communes for this wilaya
        communes_list = Patient.objects.filter(
            wilaya=requested_wilaya
        ).values('commune').distinct().order_by('commune')
        communes = [c['commune'] for c in communes_list if c['commune']]
        
        # If no communes found, try to get all patients without commune filtering
        if not communes:
            communes = [None]
        
        # Count cases by commune
        communes_data = {}
        for commune in communes:
            if commune:
                patients_commune = Patient.objects.filter(wilaya=requested_wilaya, commune=commune)
            else:
                patients_commune = Patient.objects.filter(wilaya=requested_wilaya, commune__isnull=True)
            
            count = patients_commune.count()
            
            if count > 0:
                # Get diagnostics for this commune
                if commune:
                    diagnostics_commune = Diagnostic.objects.filter(
                        patient__wilaya=requested_wilaya,
                        patient__commune=commune
                    )
                else:
                    diagnostics_commune = Diagnostic.objects.filter(
                        patient__wilaya=requested_wilaya,
                        patient__commune__isnull=True
                    )
                
                # Top cancers in this commune
                top_cancers = diagnostics_commune.values('topographie__code', 'topographie__libelle') \
                    .annotate(count=Count('id')) \
                    .order_by('-count')[:3]
                
                commune_display = commune or "Non spécifié"
                communes_data[commune_display] = {
                    'patients': count,
                    'diagnostics': diagnostics_commune.count(),
                    'top_cancers': list(top_cancers),
                    'lat': 34.6783,  # Coordonnées par défaut
                    'lon': -1.3616,
                }
        
        # Get total diagnostics for the wilaya
        total_diagnostics = Diagnostic.objects.filter(patient__wilaya=requested_wilaya).count()
        
        return Response({
            'wilaya': requested_wilaya,
            'total_patients': Patient.objects.filter(wilaya=requested_wilaya).count(),
            'total_diagnostics': total_diagnostics,
            'communes': communes_data,
        })
    except Exception as e:
        import traceback
        return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_cancer_statistics(request):
    """
    Récupère les statistiques des cancers dominants avec causes.
    Filtre optionnel par wilaya ou commune.
    """
    wilaya = request.GET.get('wilaya')
    commune = request.GET.get('commune')
    
    # If no wilaya specified, get the one with most patients
    if not wilaya:
        wilaya_counts = Patient.objects.values('wilaya').annotate(count=Count('id')).order_by('-count').first()
        wilaya = wilaya_counts['wilaya'] if wilaya_counts else 'Oran'
    
    try:
        # Filter diagnostics
        diagnostics_query = Diagnostic.objects.filter(patient__wilaya=wilaya)
        if commune:
            diagnostics_query = diagnostics_query.filter(patient__commune=commune)
        
        # Top 10 cancers with percentage
        total_diagnostics = diagnostics_query.count()
        top_cancers = diagnostics_query.values('topographie__code', 'topographie__libelle') \
            .annotate(count=Count('id')) \
            .order_by('-count')
        
        cancer_stats = []
        for cancer in top_cancers:
            percentage = (cancer['count'] / total_diagnostics * 100) if total_diagnostics > 0 else 0
            cancer_stats.append({
                'code': cancer.get('topographie__code') or cancer.get('topographie__libelle'),
                'name': cancer.get('topographie__libelle') or cancer.get('topographie__code'),
                'count': cancer['count'],
                'percentage': round(percentage, 1),
            })
        
        # Count unique patients by cancer type
        patients_by_cancer = {}
        for cancer in cancer_stats:
            patients = diagnostics_query.filter(
                topographie__code=cancer['code']
            ).values('patient_id').distinct().count()
            cancer['unique_patients'] = patients
        
        # Cancer causes (enriched static data)
        cancer_causes = _get_cancer_causes(cancer_stats[:5])
        
        # Gender distribution
        patients_query = Patient.objects.filter(wilaya=wilaya)
        if commune:
            patients_query = patients_query.filter(commune=commune)
        
        gender_dist = patients_query.values('sexe').annotate(count=Count('id'))
        gender_data = {item['sexe'] or 'N/A': item['count'] for item in gender_dist}
        
        return Response({
            'wilaya': wilaya,
            'commune': commune,
            'total_diagnostics': total_diagnostics,
            'total_patients': patients_query.count(),
            'cancer_statistics': cancer_stats,
            'gender_distribution': gender_data,
            'cancer_causes': cancer_causes,
        })
    except Exception as e:
        import traceback
        return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)


def _get_cancer_causes(cancer_stats):
    """Retourne les causes des cancers les plus dominants."""
    causes_map = {
        'Sein': {
            'label': 'Cancer du Sein',
            'causes': [
                'Antécédents familiaux (mutations BRCA1/BRCA2)',
                'Hormonothérapie prolongée',
                'Obésité et sédentarité',
                'Consommation d\'alcool',
                'Nulliparité et ménopause tardive'
            ]
        },
        'Colon': {
            'label': 'Cancer Colorectal',
            'causes': [
                'Régime riche en viande rouge',
                'Antécédents familiaux de polypes',
                'Maladie inflammatoire intestinale',
                'Sédentarité et obésité',
                'Consommation d\'alcool'
            ]
        },
        'Poumon': {
            'label': 'Cancer du Poumon',
            'causes': [
                'Tabagisme (85% des cas)',
                'Exposition à l\'amiante',
                'Pollution de l\'air',
                'Prédisposition génétique',
                'Consommation d\'alcool'
            ]
        },
        'Prostate': {
            'label': 'Cancer de la Prostate',
            'causes': [
                'Âge avancé (> 50 ans)',
                'Antécédents familiaux',
                'Ethnie (plus fréquent chez les Afro-Américains)',
                'Facteurs hormonaux (testosterone)',
                'Régime riche en graisses'
            ]
        },
        'Col Utérin': {
            'label': 'Cancer du Col Utérin',
            'causes': [
                'Infection par HPV (90% des cas)',
                'Rapports sexuels précoces',
                'Multiplicité de partenaires',
                'Tabagisme',
                'Immunodépression'
            ]
        },
    }
    
    result = {}
    for cancer in cancer_stats:
        cancer_name = cancer['name']
        # Chercher une correspondance
        for key, value in causes_map.items():
            if key.lower() in cancer_name.lower():
                result[cancer_name] = {
                    'label': value['label'],
                    'count': cancer['count'],
                    'percentage': cancer['percentage'],
                    'causes': value['causes']
                }
                break
        else:
            # Si pas de correspondance
            result[cancer_name] = {
                'label': cancer_name,
                'count': cancer['count'],
                'percentage': cancer['percentage'],
                'causes': ['Causes non documentées']
            }
    
    return result


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_sig_stats(request):
    """
    GET /api/v1/sig/stats/
    Returns { wilayas: [{nom, nb_patients, nb_diagnostics, coords: [lat, lng], population, communes: [{nom, nb_patients}], top_cancers: [{code, libelle, count}]}], total_patients, total_diagnostics }
    """
    try:
        from apps.sig.wilayas_data import WILAYAS
        wilayas_dict = { w['name'].upper(): w for w in WILAYAS }
        
        # Obtenir tous les patients avec wilaya non nulle
        patients_qs = Patient.objects.exclude(wilaya__isnull=True).exclude(wilaya='')
        total_patients = patients_qs.count()
        
        # Obtenir tous les diagnostics avec patient_wilaya non nul
        diag_qs = Diagnostic.objects.exclude(patient__wilaya__isnull=True).exclude(patient__wilaya='')
        total_diagnostics = diag_qs.count()
        
        # Group by wilaya pour les patients
        pat_by_w = patients_qs.values('wilaya').annotate(count=Count('id'))
        pat_map = { p['wilaya'].strip().upper(): p['count'] for p in pat_by_w if p.get('wilaya') }
        
        # Group by wilaya pour les diagnostics
        diag_by_w = diag_qs.values('patient__wilaya').annotate(count=Count('id'))
        diag_map = { d['patient__wilaya'].strip().upper(): d['count'] for d in diag_by_w if d.get('patient__wilaya') }
        
        # Constuire la reponse detaillee par wilaya (seulement celles ayant des cas)
        wilayas_response = []
        for w_caps, p_count in pat_map.items():
            # Chercher metadata
            meta = wilayas_dict.get(w_caps, None)
            nom_propre = meta['name'] if meta else w_caps.title()
            lat = meta['lat'] if meta else 36.7538
            lon = meta['lon'] if meta else 3.0588
            pop = meta['population'] if meta else 1000000
            
            # Communes
            communes_qs = Patient.objects.filter(wilaya__iexact=w_caps).values('commune').annotate(count=Count('id'))
            communes_list = [
                {'nom': c['commune'] or 'Non spécifié', 'nb_patients': c['count']}
                for c in communes_qs if c.get('count', 0) > 0
            ]
            
            # Top cancers
            tc_qs = Diagnostic.objects.filter(patient__wilaya__iexact=w_caps)\
                .values('topographie__code', 'topographie__libelle')\
                .annotate(count=Count('id')).order_by('-count')[:5]
                
            top_cancers = [
                {'code': tc['topographie__code'], 'libelle': tc['topographie__libelle'], 'count': tc['count']}
                for tc in tc_qs
            ]
            
            d_count = diag_map.get(w_caps, 0)
            
            wilayas_response.append({
                'nom': nom_propre,
                'nb_patients': p_count,
                'nb_diagnostics': d_count,
                'coords': [lat, lon],
                'population': pop,
                'communes': communes_list,
                'top_cancers': top_cancers
            })
            
        return Response({
            'wilayas': wilayas_response,
            'total_patients': total_patients,
            'total_diagnostics': total_diagnostics
        })
    except Exception as e:
        import traceback
        return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def get_wilaya_details(request, nom):
    """
    GET /api/v1/sig/wilaya/{nom}/
    détail complet d'une wilaya avec communes et types de cancers
    """
    try:
        from apps.sig.wilayas_data import WILAYAS
        w_caps = nom.strip().upper()
        wilayas_dict = { w['name'].upper(): w for w in WILAYAS }
        meta = wilayas_dict.get(w_caps, None)
        
        patients_qs = Patient.objects.filter(wilaya__iexact=nom)
        nb_patients = patients_qs.count()
        
        diag_qs = Diagnostic.objects.filter(patient__wilaya__iexact=nom)
        nb_diagnostics = diag_qs.count()
        
        # Communes
        communes_qs = patients_qs.values('commune').annotate(count=Count('id'))
        communes_list = []
        for c in communes_qs:
            c_name = c['commune'] or 'Non spécifié'
            d_count = Diagnostic.objects.filter(patient__wilaya__iexact=nom, patient__commune=c['commune']).count()
            communes_list.append({
                'nom': c_name,
                'nb_patients': c['count'],
                'nb_diagnostics': d_count
            })
        
        # Top cancers (all)
        tc_qs = diag_qs.values('topographie__code', 'topographie__libelle').annotate(count=Count('id')).order_by('-count')
        cancers_list = [
            {'code': tc['topographie__code'], 'libelle': tc['topographie__libelle'], 'count': tc['count']}
            for tc in tc_qs
        ]
        
        return Response({
            'nom': meta['name'] if meta else nom.title(),
            'population': meta['population'] if meta else 1000000,
            'coords': [meta['lat'], meta['lon']] if meta else [36.7538, 3.0588],
            'nb_patients': nb_patients,
            'nb_diagnostics': nb_diagnostics,
            'communes': communes_list,
            'cancers': cancers_list
        })
    except Exception as e:
        import traceback
        return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)