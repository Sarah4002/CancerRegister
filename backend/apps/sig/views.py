from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q
from django.conf import settings
from apps.patients.models import Patient
from apps.diagnostics.models import Diagnostic
from collections import Counter
from django.shortcuts import get_object_or_404
from apps.sig.serializers import MapCardSerializer
from .models import MapCard, PopulationCommune
from apps.accounts.permissions import CanViewMap, can_manage_sig_configuration
from apps.sig.wilayas_data import WILAYAS
import unicodedata
import json
import math

def normalize_geo_name(s):
    """Normalise les noms (MAJ, sans accents) pour faciliter la correspondance."""
    if not s: return ""
    # Enlève les accents, met en majuscules, remplace les tirets par des espaces et nettoie les blancs
    s = "".join(c for c in unicodedata.normalize('NFD', str(s).strip().upper())
                  if unicodedata.category(c) != 'Mn')
    s = s.replace('-', ' ')
    return " ".join(s.split()) # Enlève les espaces doubles


TLEM_CEN_ENVIRONMENT = {
    'industrial_zones': [
        {
            'nom': 'Zone Industrielle Ouled Bendamou',
            'commune': 'Maghnia',
            'coords': [34.8833, -1.7333],
            'superficie': '104 hectares',
            'secteurs': ['Sidérurgie', 'Agroalimentaire'],
            'polluants': ['Fumées métallurgiques', 'CO2', 'Particules fines PM2.5'],
            'cancers_associes': ['Poumon', 'Larynx', 'Peau'],
            'niveau_risque': 'Critique',
            'proximite_barrage': '11 km du barrage Hammam Boughrara',
            'influence_km': 12,
        },
        {
            'nom': 'Zone Industrielle Chetouane',
            'commune': 'Chetouane',
            'coords': [34.9167, -1.2833],
            'secteurs': ['Industrie légère', 'Textile', 'Chimie'],
            'polluants': ['COV', 'Poussières industrielles'],
            'cancers_associes': ['Poumon', 'Vessie', 'Lymphome'],
            'niveau_risque': 'Élevé',
            'influence_km': 10,
        },
        {
            'nom': 'Zone Portuaire Ghazaouet',
            'commune': 'Ghazaouet',
            'coords': [35.1, -1.8667],
            'secteurs': ['Import/Export', 'Hydrocarbures', 'Ciment'],
            'polluants': ['Hydrocarbures', 'Poussières de ciment', 'Gaz d\'échappement'],
            'cancers_associes': ['Poumon', 'Mésothéliome', 'Peau'],
            'niveau_risque': 'Élevé',
            'influence_km': 12,
        },
    ],
    'dams': [
        {
            'nom': 'Barrage Hammam Boughrara',
            'commune': 'Maghnia',
            'coords': [34.95, -1.8],
            'capacite': '177 millions m³',
            'usage': 'AEP + Irrigation',
            'risques': ['Risque d\'infiltration eaux industrielles', 'Développement cyanobactéries', 'Accumulation pesticides agricoles'],
            'cancers_associes': ['Foie', 'Reins', 'Colorectal'],
            'niveau_risque': 'Critique',
            'influence_km': 5,
        },
        {
            'nom': 'Barrage El Mefrouch',
            'commune': 'Tlemcen',
            'coords': [34.9333, -1.2667],
            'capacite': '12 millions m³',
            'usage': 'AEP + Irrigation',
            'risques': ['Contamination pesticides zones agricoles proches', 'Nitrates élevés', 'Proximité zone urbaine dense'],
            'cancers_associes': ['Colorectal', 'Estomac'],
            'niveau_risque': 'Modéré',
            'influence_km': 3,
        },
        {
            'nom': 'Barrage Sekkak',
            'commune': 'Nord Tlemcen',
            'coords': [35.1333, -1.35],
            'capacite': '25 millions m³',
            'usage': 'AEP + Irrigation',
            'risques': ['Prolifération cyanobactéries', 'Hépatotoxines', 'Ruissellement agricole'],
            'cancers_associes': ['Foie', 'Reins'],
            'niveau_risque': 'Modéré',
            'influence_km': 4,
        },
        {
            'nom': 'Barrage Beni Bahdel',
            'commune': 'Beni Bahdel',
            'coords': [34.7833, -1.9333],
            'capacite': '63 millions m³',
            'usage': 'AEP + Irrigation',
            'risques': ['Accumulation métaux lourds', 'Sédiments contaminés'],
            'cancers_associes': ['Foie', 'Poumon'],
            'niveau_risque': 'Faible',
            'influence_km': 2,
        },
        {
            'nom': 'Barrage El Izdihar',
            'commune': 'Sidi Abdelli',
            'coords': [34.9667, -1.0833],
            'capacite': 'Variable',
            'usage': 'Irrigation',
            'risques': ['Nitrates agricoles élevés', 'Engrais chimiques'],
            'cancers_associes': ['Colorectal', 'Estomac'],
            'niveau_risque': 'Faible',
            'influence_km': 3,
        },
    ],
    'agricultural_zones': [
        {
            'nom': 'Plaine de Maghnia',
            'commune': 'Maghnia',
            'coords': [34.8667, -1.75],
            'cultures': ['Céréales', 'Maraîchage', 'Betterave'],
            'pesticides': ['Glyphosate', 'Organophosphorés', 'Fongicides'],
            'risques': ['Contamination nappe phréatique', 'Résidus dans aliments'],
            'cancers_associes': ['Sang/Lymphome', 'Foie', 'Sein'],
            'niveau_risque': 'Élevé',
        },
        {
            'nom': 'Zone Agricole Hennaya',
            'commune': 'Hennaya',
            'coords': [34.9667, -1.4667],
            'cultures': ['Agrumes', 'Vignes', 'Olives'],
            'pesticides': ['Fongicides', 'Insecticides', 'Herbicides'],
            'risques': ['Fongicides cancérigènes', 'Exposition cutanée agriculteurs'],
            'cancers_associes': ['Sein', 'Poumon', 'Peau'],
            'niveau_risque': 'Modéré',
        },
        {
            'nom': 'Zone Agricole Remchi',
            'commune': 'Remchi',
            'coords': [35.0667, -1.4333],
            'cultures': ['Cultures irriguées', 'Maraîchage'],
            'pesticides': ['Nitrates', 'Engrais azotés'],
            'risques': ['Nitrates dans eau potable', 'Contamination sols'],
            'cancers_associes': ['Colorectal', 'Estomac', 'Thyroïde'],
            'niveau_risque': 'Modéré',
        },
        {
            'nom': 'Zone Agricole Sebdou',
            'commune': 'Sebdou',
            'coords': [34.6333, -1.3333],
            'cultures': ['Élevage', 'Céréales'],
            'pesticides': ['Antiparasitaires vétérinaires', 'Herbicides'],
            'risques': ['UV index élevé', 'Altitude exposée'],
            'cancers_associes': ['Peau', 'Mélanome'],
            'niveau_risque': 'Faible',
        },
    ],
}


COMUNE_COORDS = {
    'maghnia': [34.8833, -1.7333],
    'tlemcen': [34.8828, -1.3167],
    'chetouane': [34.9167, -1.2833],
    'ghazaouet': [35.1, -1.8667],
    'remchi': [35.0667, -1.4333],
    'hennaya': [34.9667, -1.4667],
    'sebdou': [34.6333, -1.3333],
    'sidi abdelli': [34.9667, -1.0833],
    'beni saf': [35.3, -1.3833],
    'nedroma': [35.0167, -1.8333],
}


def haversine_distance(lat1, lon1, lat2, lon2):
    r = 6371
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_wilaya_population(wilaya):
    for entry in WILAYAS:
        if normalize_geo_name(entry.get('name')) == normalize_geo_name(wilaya):
            return int(entry.get('population') or 0)
    return 0


def get_population_for_scope(wilaya, commune=None):
    population = get_wilaya_population(wilaya)
    if commune:
        row = PopulationCommune.objects.filter(wilaya__iexact=wilaya, commune__iexact=commune).order_by('-annee').first()
        if row and row.population:
            return int(row.population)
    return population


def determine_risk_level(incidence, diagnostics_count, industrial_count, dam_count, agri_count):
    score = 0
    if incidence is not None and incidence >= 50:
        score += 4
    elif incidence is not None and incidence >= 20:
        score += 2
    elif incidence is not None and incidence >= 10:
        score += 1

    score += min(industrial_count, 2)
    score += min(dam_count, 2)
    score += min(agri_count, 1)

    if score >= 6:
        return 'Critique'
    if score >= 4:
        return 'Élevé'
    if score >= 2:
        return 'Modéré'
    return 'Faible'


def build_environment_context(wilaya, commune=None, center=None):
    if normalize_geo_name(wilaya) != normalize_geo_name('Tlemcen'):
        return {
            'available': False,
            'industrial_zones': [],
            'dams': [],
            'agricultural_zones': [],
            'note': 'Aucune couche environnementale Tlemcen enrichie n\'est disponible pour cette wilaya.',
        }

    point = center
    if not point and commune:
        point = COMUNE_COORDS.get(normalize_geo_name(commune))

    industrial = []
    dams = []
    agri = []

    if point:
        lat, lon = point
        for zone in TLEM_CEN_ENVIRONMENT['industrial_zones']:
            distance = haversine_distance(lat, lon, zone['coords'][0], zone['coords'][1])
            if distance <= 20:
                industrial.append({**zone, 'distance_km': round(distance, 1)})
        for zone in TLEM_CEN_ENVIRONMENT['dams']:
            distance = haversine_distance(lat, lon, zone['coords'][0], zone['coords'][1])
            if distance <= 25:
                dams.append({**zone, 'distance_km': round(distance, 1)})
        for zone in TLEM_CEN_ENVIRONMENT['agricultural_zones']:
            distance = haversine_distance(lat, lon, zone['coords'][0], zone['coords'][1])
            if distance <= 15:
                agri.append({**zone, 'distance_km': round(distance, 1)})
    else:
        industrial = TLEM_CEN_ENVIRONMENT['industrial_zones']
        dams = TLEM_CEN_ENVIRONMENT['dams']
        agri = TLEM_CEN_ENVIRONMENT['agricultural_zones']

    return {
        'available': True,
        'industrial_zones': industrial,
        'dams': dams,
        'agricultural_zones': agri,
        'note': 'Contexte environnemental enrichi calculé à partir des zones industrielles, barrages et zones agricoles reconnues pour la wilaya de Tlemcen.' if point else 'Aucun point de focalisation fourni ; retour de l\'ensemble des zones environnementales Tlemcen.',
    }


def build_ai_analysis_context(wilaya, analysis_type='wilaya', commune=None, center=None, radius_m=None, filters=None):
    filters = filters or {}
    patients_qs = Patient.objects.filter(wilaya__iexact=wilaya)
    diagnostics_qs = Diagnostic.objects.filter(patient__wilaya__iexact=wilaya)

    if commune:
        patients_qs = patients_qs.filter(commune__iexact=commune)
        diagnostics_qs = diagnostics_qs.filter(patient__commune__iexact=commune)

    if filters.get('type_cancer'):
        diagnostics_qs = diagnostics_qs.filter(topographie__libelle__icontains=filters['type_cancer'])
        patients_qs = patients_qs.filter(diagnostics__topographie__libelle__icontains=filters['type_cancer']).distinct()

    if filters.get('age_min'):
        try:
            patients_qs = patients_qs.filter(age_diagnostic__gte=int(filters['age_min']))
            diagnostics_qs = diagnostics_qs.filter(patient__age_diagnostic__gte=int(filters['age_min']))
        except (TypeError, ValueError):
            pass

    if filters.get('age_max'):
        try:
            patients_qs = patients_qs.filter(age_diagnostic__lte=int(filters['age_max']))
            diagnostics_qs = diagnostics_qs.filter(patient__age_diagnostic__lte=int(filters['age_max']))
        except (TypeError, ValueError):
            pass

    total_patients = patients_qs.count()
    total_diagnostics = diagnostics_qs.count()
    population = get_population_for_scope(wilaya, commune)

    top_cancers = list(diagnostics_qs.values('topographie_code', 'topographie_libelle').annotate(count=Count('id')).order_by('-count')[:5])
    cancer_stats = []
    for item in top_cancers:
        fraction = (item['count'] / total_diagnostics * 100) if total_diagnostics else 0
        cancer_stats.append({
            'code': item.get('topographie_code') or item.get('topographie_libelle'),
            'libelle': item.get('topographie_libelle') or item.get('topographie_code'),
            'count': item['count'],
            'percentage': round(fraction, 1),
        })

    communes = list(patients_qs.values('commune').annotate(count=Count('id')).order_by('-count')[:10])
    age_distribution = patients_qs.aggregate(
        group_0_14=Count('id', filter=Q(age_diagnostic__lt=15)),
        group_15_44=Count('id', filter=Q(age_diagnostic__gte=15, age_diagnostic__lt=45)),
        group_45_64=Count('id', filter=Q(age_diagnostic__gte=45, age_diagnostic__lt=65)),
        group_65_plus=Count('id', filter=Q(age_diagnostic__gte=65)),
    )
    gender_distribution = list(patients_qs.values('sexe').annotate(count=Count('id')))
    env_context = build_environment_context(wilaya, commune=commune, center=center)
    incidence = round((total_diagnostics / population) * 100000, 2) if population else None
    risk_level = determine_risk_level(incidence, total_diagnostics, len(env_context['industrial_zones']), len(env_context['dams']), len(env_context['agricultural_zones']))

    return {
        'analysis_type': analysis_type,
        'wilaya': wilaya,
        'commune': commune,
        'zone_scope': {
            'center': center,
            'radius_m': radius_m,
            'mode': 'zone' if analysis_type == 'zone' else 'wilaya',
        },
        'population': population,
        'total_patients': total_patients,
        'total_diagnostics': total_diagnostics,
        'incidence_per_100k': incidence,
        'top_cancers': cancer_stats,
        'gender_distribution': gender_distribution,
        'age_distribution': age_distribution,
        'affected_communes': communes,
        'environment': env_context,
        'risk_level': risk_level,
        'filters': filters,
    }


def build_ai_prompt(context):
    return f"""Tu es un expert épidémiologue géospatial en Algérie, spécialisé dans l’analyse des cancers et des facteurs environnementaux. Tu dois produire un rapport structuré, scientifique et actionnable. Tu utilises uniquement les données fournies. Si une donnée est absente, tu l’indiques explicitement et tu n’inventes rien.

Analyse demandée : {context['analysis_type']} pour la wilaya de {context['wilaya']}.

Données structurées :
{json.dumps(context, ensure_ascii=False, indent=2)}

Règles de sortie :
- Réponds toujours en français.
- Respecte strictement les 4 sections suivantes, dans cet ordre.
- N’ajoute aucune autre section.
- Ne mentionne pas la présence d’un fallback sauf si c’est nécessaire.

## 🔬 ANALYSE DES FACTEURS DE RISQUE
Explique le lien entre les données médicales, géographiques et environnementales.

## 🧩 HYPOTHÈSES CAUSALES
Liste 3 hypothèses principales ordonnées par probabilité, avec pourcentage estimé de contribution.

## ⚠️ NIVEAU DE RISQUE GLOBAL
Évalue : Faible / Modéré / Élevé / Critique.
Justifie avec des indicateurs chiffrés.

## ✅ RECOMMANDATIONS
Donne 3 actions concrètes prioritaires pour l’épidémiologue et les autorités de santé publique.
"""


def build_fallback_report(context):
    commune_label = context['commune'] or 'choix de zone / wilaya'
    env_count = len(context['environment']['industrial_zones']) + len(context['environment']['dams']) + len(context['environment']['agricultural_zones'])
    return f"""## 🔬 ANALYSE DES FACTEURS DE RISQUE
La zone analysée est {commune_label} dans la wilaya de {context['wilaya']}. Les données réelles disponibles montrent {context['total_diagnostics']} diagnostics et {context['total_patients']} patients, avec une incidence de {context['incidence_per_100k'] if context['incidence_per_100k'] is not None else 'non disponible'} pour 100 000 habitants. Les cancers dominants sont : {', '.join([item['libelle'] for item in context['top_cancers'][:3]]) or 'non disponibles'}. Le contexte environnemental disponible couvre {env_count} éléments pertinents pour la wilaya de Tlemcen.

## 🧩 HYPOTHÈSES CAUSALES
1. Exposition environnementale locale probable sur la zone ciblée, avec impact sur les cancers dominants observés.
2. Concentration de cas dans les communes les plus touchées, cohérente avec les diagnostics enregistrés.
3. Effets combinés de pollution, agriculture-intensive et densité socio-sanitaire locale.

## ⚠️ NIVEAU DE RISQUE GLOBAL
Niveau : {context['risk_level']}
Justification : présence de {context['total_diagnostics']} diagnostics, {context['total_patients']} patients, incidence {context['incidence_per_100k'] if context['incidence_per_100k'] is not None else 'non disponible'} et {env_count} facteurs environnementaux sélectionnés.

## ✅ RECOMMANDATIONS
1. Prioriser le contrôle ciblé des communes les plus touchées et des zones d’exposition.
2. Renforcer la surveillance épidémiologique et la traçabilité des diagnostics par commune.
3. Piloter des actions de prévention environnementale avec les services de santé publique et de l’environnement.
"""


@csrf_exempt
@api_view(['POST'])
@permission_classes([CanViewMap])
def analyze_sig_scope(request):
    payload = request.data or {}
    wilaya = str(payload.get('wilaya', '')).strip()
    analysis_type = str(payload.get('analysis_type', 'wilaya')).strip().lower() or 'wilaya'
    commune = str(payload.get('commune', '')).strip() or None
    center = payload.get('center')
    radius_m = payload.get('radius_m')
    filters = payload.get('filters') or {}

    if not wilaya:
        return Response({'error': 'Le champ wilaya est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

    context = build_ai_analysis_context(
        wilaya=wilaya,
        analysis_type=analysis_type,
        commune=commune,
        center=center,
        radius_m=radius_m,
        filters=filters,
    )

    source_label = commune or wilaya

    try:
        import groq
        import httpx
        api_key = settings.GROQ_API_KEY
        if not api_key or not api_key.strip():
            raise ValueError("GROQ_API_KEY non configurée ou vide")
            
        client = groq.Groq(api_key=api_key, http_client=httpx.Client())
        completion = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[
                {'role': 'system', 'content': 'Tu es un assistant IA dédié à l’analyse SIG du registre national du cancer en Algérie.'},
                {'role': 'user', 'content': build_ai_prompt(context)},
            ],
            temperature=0.2,
            max_tokens=1200,
        )
        text = completion.choices[0].message.content.strip()
        backtick = chr(96) * 3
        cleaned = text.replace(backtick + 'json', '').replace(backtick, '').strip()
        response_payload = {
            'report': cleaned,
            'provider': 'groq',
            'risk_level': context['risk_level'],
            'source_type': analysis_type,
            'source_label': source_label,
            'indicators': {
                'total_patients': context['total_patients'],
                'total_diagnostics': context['total_diagnostics'],
                'incidence_per_100k': context['incidence_per_100k'],
                'affected_communes': context['affected_communes'],
                'industrial_zones_count': len(context['environment']['industrial_zones']),
                'dams_count': len(context['environment']['dams']),
                'agricultural_zones_count': len(context['environment']['agricultural_zones']),
            },
        }
        return Response(response_payload)
    except Exception as exc:
        fallback = build_fallback_report(context)
        return Response({
            'report': fallback,
            'provider': 'fallback',
            'warning': f'Analyse IA indisponible, rapport de secours utilisé. {str(exc)}',
            'risk_level': context['risk_level'],
            'source_type': analysis_type,
            'source_label': source_label,
            'indicators': {
                'total_patients': context['total_patients'],
                'total_diagnostics': context['total_diagnostics'],
                'incidence_per_100k': context['incidence_per_100k'],
                'affected_communes': context['affected_communes'],
                'industrial_zones_count': len(context['environment']['industrial_zones']),
                'dams_count': len(context['environment']['dams']),
                'agricultural_zones_count': len(context['environment']['agricultural_zones']),
            },
        })


@csrf_exempt
@api_view(['GET'])
@permission_classes([CanViewMap])
def get_map_data(request):
    """Get geographic data for the SIG map with all cancer cases by wilaya."""
    # Utilisation de la liste centralisée WILAYAS pour éviter les doublons
    wilayas_list = [{"code": w['code'], "name": w['name'], "lat": w['lat'], "lon": w['lon']} for w in WILAYAS]
    
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
    for w in wilayas_list:
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
@permission_classes([CanViewMap])
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
    
    # Optimized Age distribution using Database Aggregation
    # Note: Assuming 'age' is a field. If it's a property, 
    # this needs to be calculated via date_naissance.
    try:
        age_stats = patients.aggregate(
            group_0_14=Count('id', filter=Q(age_diagnostic__lt=15)),
            group_15_44=Count('id', filter=Q(age_diagnostic__gte=15, age_diagnostic__lt=45)),
            group_45_64=Count('id', filter=Q(age_diagnostic__gte=45, age_diagnostic__lt=65)),
            group_65_plus=Count('id', filter=Q(age_diagnostic__gte=65))
        )
        age_groups = {
            '0-14': age_stats['group_0_14'],
            '15-44': age_stats['group_15_44'],
            '45-64': age_stats['group_45_64'],
            '65+': age_stats['group_65_plus']
        }
    except Exception:
        age_groups = {'0-14': 0, '15-44': 0, '45-64': 0, '65+': 0}
    
    return Response({
        'total_patients': patients.count(),
        'total_diagnostics': diagnostics.count(),
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
@permission_classes([IsAuthenticated])
def health_check(request):
    """Health check endpoint."""
    return Response({'status': 'ok'})


@csrf_exempt
@api_view(['GET'])
@permission_classes([CanViewMap])
def get_all_wilayas_data(request):
    """
    Récupère tous les cas de cancer par wilaya.
    Version optimisée sans boucles N+1.
    """
    try:
        # Aggregation en deux requêtes au lieu de N boucles
        pat_counts = Patient.objects.exclude(wilaya__isnull=True).exclude(wilaya='') \
            .values('wilaya').annotate(count=Count('id'))
        diag_counts = Diagnostic.objects.exclude(patient__wilaya__isnull=True).exclude(patient__wilaya='') \
            .values('patient__wilaya').annotate(count=Count('id'))
        
        diag_map = {d['patient__wilaya']: d['count'] for d in diag_counts}
        wilayas_data = {}
        
        for p in pat_counts:
            w_name = p['wilaya']
            wilayas_data[w_name] = {
                'patients': p['count'],
                'diagnostics': diag_map.get(w_name, 0),
                'top_cancers': [] # Top cancers can be fetched per wilaya on demand
            }
        
        return Response({
            'total_patients': sum(w['patients'] for w in wilayas_data.values()),
            'total_diagnostics': sum(w['diagnostics'] for w in wilayas_data.values()),
            'wilayas_count': len(wilayas_data),
            'wilayas': wilayas_data,
        })
    except Exception as e:
        import traceback
        return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['GET'])
@permission_classes([CanViewMap])
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
@permission_classes([CanViewMap])
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
@permission_classes([CanViewMap])
def get_sig_stats(request):
    """
    GET /api/v1/sig/stats/
    Version robuste avec filtrage et normalisation géographique.
    """
    try:
        # Extraction des filtres
        type_cancer = request.GET.get('type_cancer', '').strip()
        age_min = request.GET.get('age_min', '').strip()
        age_max = request.GET.get('age_max', '').strip()
        wilaya_filter = request.GET.get('wilaya', '').strip()
        commune_filter = request.GET.get('commune', '').strip()

        # Dictionnaire de référence des wilayas (normalisé)
        wilayas_ref = {normalize_geo_name(w['name']): w for w in WILAYAS}
        
        # 2. Querysets de base (On prend tout pour le compte global)
        patients_qs = Patient.objects.all()
        diag_qs = Diagnostic.objects.all()
        
        # Application des filtres thématiques (Cancers et Âge)
        if type_cancer:
            diag_qs = diag_qs.filter(topographie__libelle__icontains=type_cancer)
            # Filtrage robuste supportant plusieurs noms de relation possibles
            try:
                patients_qs = patients_qs.filter(
                    Q(diagnostics__topographie__libelle__icontains=type_cancer) |
                    Q(diagnostic__topographie__libelle__icontains=type_cancer)
                ).distinct()
            except Exception:
                patients_qs = patients_qs.filter(diagnostic__topographie__libelle__icontains=type_cancer).distinct()

        if age_min and age_min.isdigit():
            patients_qs = patients_qs.filter(age_diagnostic__gte=int(age_min))
            diag_qs = diag_qs.filter(patient__age_diagnostic__gte=int(age_min))

        if age_max and age_max.isdigit():
            patients_qs = patients_qs.filter(age_diagnostic__lte=int(age_max))
            diag_qs = diag_qs.filter(patient__age_diagnostic__lte=int(age_max))
            
        # Préparation des statistiques de l'en-tête (Total filtré par Wilaya/Commune)
        total_patients_qs = patients_qs
        total_diag_qs = diag_qs
        
        if wilaya_filter:
            total_patients_qs = total_patients_qs.filter(wilaya__iexact=wilaya_filter)
            total_diag_qs = total_diag_qs.filter(patient__wilaya__iexact=wilaya_filter)
            if commune_filter:
                total_patients_qs = total_patients_qs.filter(commune__iexact=commune_filter)
                total_diag_qs = total_diag_qs.filter(patient__commune__iexact=commune_filter)

        # Le TOTAL affiché dans l'en-tête doit inclure tous les patients filtrés (même sans wilaya)
        total_p = total_patients_qs.count()
        total_d = total_diag_qs.count()

        # Pour la distribution sur la CARTE, on exclut ceux qui n'ont pas de wilaya
        map_patients_qs = patients_qs.exclude(wilaya__isnull=True).exclude(wilaya='')

        # 3. Pré-calcul des totaux par wilaya
        pat_counts = map_patients_qs.values('wilaya').annotate(count=Count('id'))
        diag_counts = diag_qs.exclude(patient__wilaya__isnull=True).exclude(patient__wilaya='').values('patient__wilaya').annotate(count=Count('id'))
        
        # 4. Agrégation robuste (cherche par NOM normalisé et par CODE)
        pat_map = {}
        for p in pat_counts:
            w_val = str(p.get('wilaya') or '').strip()
            name_key = normalize_geo_name(w_val)
            pat_map[name_key] = pat_map.get(name_key, 0) + p['count']
            
        diag_map = {}
        for d in diag_counts:
            w_val = str(d.get('patient__wilaya') or '').strip()
            name_key = normalize_geo_name(w_val)
            diag_map[name_key] = diag_map.get(name_key, 0) + d['count']

        communes_data = map_patients_qs.values('wilaya', 'commune').annotate(count=Count('id'))
        communes_by_wilaya = {}
        for c in communes_data:
            w_key = normalize_geo_name(c['wilaya'])
            communes_by_wilaya.setdefault(w_key, []).append({'nom': c['commune'] or 'Non spécifié', 'nb_patients': c['count']})

        wilayas_response = []
        for w_ref in WILAYAS:
            raw_name = w_ref['name']
            w_code = str(w_ref['code']).zfill(2) # '01', '13', etc.
            w_norm = normalize_geo_name(raw_name)
            
            # Récupère par nom normalisé OU par code wilaya
            nb_p = pat_map.get(w_norm, 0) or pat_map.get(w_code, 0)
            nb_d = diag_map.get(w_norm, 0) or diag_map.get(w_code, 0)

            wilayas_response.append({
                'nom': raw_name,
                'nb_patients': nb_p,
                'nb_diagnostics': nb_d,
                'coords': [w_ref['lat'], w_ref['lon']],
                'population': w_ref.get('population', 0),
                'communes': communes_by_wilaya.get(w_norm, []),
                'top_cancers': [] # On peut charger les détails au clic pour plus de fluidité
            })

        return Response({
            'wilayas': sorted(wilayas_response, key=lambda x: x['nb_patients'], reverse=True),
            'total_patients': total_p,
            'total_diagnostics': total_d
        })
    except Exception as e:
        import traceback
        return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['GET'])
@permission_classes([CanViewMap])
def get_wilaya_details(request, nom):
    """
    GET /api/v1/sig/wilaya/{nom}/
    détail complet d'une wilaya avec communes et types de cancers
    """
    try:
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
        
        return Response({
            'nom': meta['name'] if meta else nom.title(),
            'population': meta['population'] if meta else 1000000,
            'coords': [meta['lat'], meta['lon']] if meta else [36.7538, 3.0588],
            'nb_patients': nb_patients,
            'nb_diagnostics': nb_diagnostics,
            'communes': communes_list,
        })
    except Exception as e:
        import traceback
        return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@api_view(['GET', 'POST'])
@permission_classes([CanViewMap])
def mapcards(request):
    """GET: liste des cartes partagées (actives). POST: créer une nouvelle carte."""
    try:
        if request.method == 'GET':
            # On s'assure que les champs existent bien dans le modèle
            qs = MapCard.objects.filter(est_actif=True).order_by('-id')
            serializer = MapCardSerializer(qs, many=True)
            return Response(serializer.data)

        if not can_manage_sig_configuration(request.user):
            return Response({'detail': 'Configuration SIG réservée au médecin chef.'}, status=status.HTTP_403_FORBIDDEN)

        # POST -> create
        data = request.data
        serializer = MapCardSerializer(data=data)
        if serializer.is_valid():
            # Le champ 'cree_par' doit exister dans le modèle MapCard
            obj = serializer.save(cree_par=request.user)
            return Response(MapCardSerializer(obj).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([CanViewMap])
def mapcard_detail(request, pk):
    obj = get_object_or_404(MapCard, pk=pk)
    if request.method == 'GET':
        return Response(MapCardSerializer(obj).data)

    # update
    if request.method in ['PUT', 'PATCH']:
        if not can_manage_sig_configuration(request.user):
            return Response({'detail': 'Non autorise.'}, status=403)
        serializer = MapCardSerializer(obj, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    # delete -> soft-delete
    if request.method == 'DELETE':
        if not can_manage_sig_configuration(request.user):
            return Response({'detail': 'Non autorise.'}, status=403)
        obj.est_actif = False
        obj.save()
        return Response({'detail': 'Carte desactivee.'})
