"""
apps/exports/views.py — Import / Export CanReg5
"""

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone

from apps.patients.models import Patient
from apps.diagnostics.models import Diagnostic

from .canreg_import_export import import_canreg_csv, export_patients_to_canreg

# ── Champs autorisés Patient (selon models.py) ────────────────
CHAMPS_PATIENT = {
    'nom', 'prenom', 'sexe', 'date_naissance', 'age_diagnostic',
    'lieu_naissance', 'nationalite', 'adresse', 'commune', 'wilaya',
    'code_postal', 'telephone', 'telephone2', 'email',
    'niveau_instruction', 'situation_familiale', 'nombre_enfants',
    'antecedents_personnels', 'antecedents_familiaux',
    'statut_dossier', 'statut_vital', 'notes', 'id_national',
    'registration_number', 'etablissement_pec',
}

# ── Champs autorisés Diagnostic (selon models.py) ─────────────
CHAMPS_DIAGNOSTIC = {
    # Dates & Type
    'date_diagnostic', 'date_premier_symptome', 'type_diagnostic', 'base_diagnostic',
    # Topographie
    'topographie_code', 'topographie_libelle', 'lateralite', 'categorie_cancer',
    # Morphologie
    'morphologie_code', 'morphologie_libelle', 'grade_histologique',
    # TNM
    'tnm_t', 'tnm_n', 'tnm_m', 'tnm_edition', 'tnm_type',
    # Stade
    'stade_ajcc', 'etat_cancer',
    # CIM-10
    'cim10_code', 'cim10_libelle',
    # Admin
    'statut_dossier', 'observations',
    'medecin_referent', 'medecin_diagnostiqueur', 'etablissement_diagnostic',
    'numero_dossier', 'est_principal',
}

PROF_MAP = {
    'agriculteur': 'AGR', 'fonctionnaire': 'FON', 'commercant': 'COM',
    'commerçant': 'COM',  'artisan': 'ART',        'etudiant': 'ETU',
    'étudiant': 'ETU',    'retraite': 'RET',        'retraité': 'RET',
    'sans emploi': 'SEM', 'femme au foyer': 'FFO',  'médecin': 'PSA',
    'infirmier': 'PSA',   'pharmacien': 'PSA',
}


def nettoyer_patient(data):
    clean = {k: v for k, v in data.items() if k in CHAMPS_PATIENT and v is not None and v != ''}
    if 'profession' in data:
        clean['profession'] = PROF_MAP.get(str(data['profession']).lower().strip(), 'INC')
    return clean


def nettoyer_diagnostic(data):
    return {
        k: v for k, v in data.items()
        if k in CHAMPS_DIAGNOSTIC and v is not None and v != ''
    }


# ── APERÇU ────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def canreg_preview(request):
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'Fichier manquant.'}, status=400)
    if not file.name.endswith('.csv'):
        return Response({'error': 'Format invalide — fichier .csv requis.'}, status=400)

    rows      = import_canreg_csv(file.read())
    valides   = [r for r in rows if r['valide']]
    invalides = [r for r in rows if not r['valide']]

    return Response({
        'total':         len(rows),
        'valides':       len(valides),
        'invalides':     len(invalides),
        'apercu':        [{
            'ligne':      r['ligne'],
            'valide':     r['valide'],
            'erreurs':    r['erreurs'],
            'patient':    r['patient'],
            'diagnostic': r['diagnostic'],
        } for r in rows[:50]],
        'apercu_limite': min(50, len(rows)),
    })


# ── IMPORT CONFIRMÉ ───────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def canreg_import(request):
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'Fichier manquant.'}, status=400)

    rows    = import_canreg_csv(file.read())
    valides = [r for r in rows if r['valide']]

    crees    = []
    doublons = []
    erreurs  = []

    for row in valides:
        patient_data = row['patient']
        diag_data    = row['diagnostic']

        try:
            # Doublon par registration_number
            regno = patient_data.get('registration_number')
            if regno and Patient.objects.filter(registration_number=regno).exists():
                doublons.append({
                    'registration_number': regno,
                    'nom':    patient_data.get('nom', ''),
                    'prenom': patient_data.get('prenom', ''),
                })
                continue

            # Créer le patient
            patient = Patient.objects.create(**nettoyer_patient(patient_data))

            # Créer le diagnostic si infos tumeur présentes
            diag_cree = False
            if diag_data:
                try:
                    clean_diag = nettoyer_diagnostic(diag_data)

                    # date_diagnostic est obligatoire (NOT NULL dans le modèle)
                    if 'date_diagnostic' not in clean_diag:
                        clean_diag['date_diagnostic'] = timezone.now().date()

                    Diagnostic.objects.create(
                        patient=patient,
                        cree_par=request.user,
                        **clean_diag
                    )
                    diag_cree = True
                except Exception as e_diag:
                    # Diagnostic optionnel — ne bloque pas la création du patient
                    pass

            crees.append({
                'id':                  patient.id,
                'nom':                 patient.nom,
                'prenom':              patient.prenom,
                'registration_number': patient.registration_number,
                'avec_diagnostic':     diag_cree,
            })

        except Exception as e:
            erreurs.append({
                'ligne':  row['ligne'],
                'nom':    patient_data.get('nom', ''),
                'erreur': str(e),
            })

    avec_diag = sum(1 for c in crees if c['avec_diagnostic'])

    return Response({
        'success':       True,
        'crees':         len(crees),
        'avec_diagnostic': avec_diag,
        'doublons':      len(doublons),
        'erreurs':       len(erreurs),
        'details': {
            'crees':    crees[:20],
            'doublons': doublons[:20],
            'erreurs':  erreurs[:20],
        }
    })


# ── EXPORT ────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def canreg_export(request):
    qs = Patient.objects.all().order_by('id')

    ids = request.query_params.get('ids')
    if ids:
        try:
            qs = qs.filter(id__in=[int(i) for i in ids.split(',')])
        except ValueError:
            pass

    wilaya = request.query_params.get('wilaya')
    if wilaya:
        qs = qs.filter(wilaya=wilaya)

    diagnostics_dict = {}
    for diag in Diagnostic.objects.filter(patient__in=qs).order_by('date_diagnostic'):
        diagnostics_dict.setdefault(diag.patient_id, []).append(diag)

    csv_content = export_patients_to_canreg(qs, diagnostics_dict)
    response = HttpResponse(csv_content, content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="canreg5_export.csv"'
    response['Access-Control-Expose-Headers'] = 'Content-Disposition'
    return response