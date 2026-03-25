"""
apps/exports/canreg_import_export.py
Mapping CanReg5 ↔ modèles Patient + Diagnostic
"""

import csv
import io
from datetime import datetime, date

# ── Mapping CanReg5 → Patient ─────────────────────────────────
CANREG_TO_PATIENT = {
    'FAMN':   'nom',
    'FIRSTN': 'prenom',
    'SEX':    'sexe',
    'BIRTHD': 'date_naissance',
    'ADDR':   'adresse',
    'OCCU':   'profession',
    'STAT':   'statut_vital',
    'TRIB':   'wilaya',
    'REGNO':  'registration_number',
    'PERS':   'id_national',
}

SEX_MAP  = {'1': 'M', '2': 'F', 'M': 'M', 'F': 'F'}
STAT_MAP = {'1': 'vivant', '2': 'decede', '9': 'inconnu', '0': 'inconnu'}

# BAS CanReg5 → Diagnostic.BaseDiagnostic choices ('0'..'9')
BAS_MAP = {
    '0': '0', '1': '1', '2': '2', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '7', '9': '9',
}

EXPORT_COLUMNS = [
    'REGNO', 'FAMN', 'FIRSTN', 'SEX', 'BIRTHD', 'AGE',
    'ADDR', 'TRIB', 'OCCU', 'STAT', 'DLC',
    'TOP', 'MOR', 'BEH', 'BAS', 'INCID', 'I10',
    'MPCODE', 'MPSEQ', 'MPTOT',
]


def parse_canreg_date(value):
    if not value or str(value).strip() in ('', '0', '99999999', '9999'):
        return None
    v = str(value).strip()
    for fmt in ('%Y%m%d', '%Y-%m-%d', '%d/%m/%Y', '%Y'):
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    return None


def format_date_canreg(d):
    if not d:
        return '99999999'
    if isinstance(d, str):
        try:
            d = date.fromisoformat(d)
        except ValueError:
            return '99999999'
    return d.strftime('%Y%m%d')


def parse_canreg_row(row):
    """
    Parse une ligne CSV CanReg5.
    Retourne { 'patient': {...}, 'diagnostic': {...} | None }
    """
    patient    = {}
    diagnostic = {}

    # ── Patient ──────────────────────────────────────────────
    for col, field in CANREG_TO_PATIENT.items():
        val = row.get(col, '').strip()
        if not val or val in ('9999', '99999999', 'UNKNOWN'):
            continue

        if col == 'SEX':
            val = SEX_MAP.get(val.upper())
            if not val:
                continue
        elif col == 'BIRTHD':
            val = parse_canreg_date(val)
            if val:
                val = val.isoformat()
            else:
                continue
        elif col == 'STAT':
            val = STAT_MAP.get(val, 'inconnu')

        patient[field] = val

    # ── Diagnostic ───────────────────────────────────────────
    top   = row.get('TOP',   '').strip()
    mor   = row.get('MOR',   '').strip()
    beh   = row.get('BEH',   '3').strip() or '3'
    incid = row.get('INCID', '').strip()
    bas   = row.get('BAS',   '').strip()
    i10   = row.get('I10',   '').strip()
    age   = row.get('AGE',   '').strip()

    has_diag = bool(top or mor or incid)

    if has_diag:
        # date_diagnostic obligatoire dans le modèle
        date_diag = parse_canreg_date(incid)
        if date_diag:
            diagnostic['date_diagnostic'] = date_diag.isoformat()
        # sinon on laisse vide → views.py mettra la date du jour

        # topographie_code : ex "C50" ou "C504"
        if top:
            diagnostic['topographie_code'] = top

        # morphologie_code : "8500" + "/" + BEH → "8500/3"
        if mor:
            diagnostic['morphologie_code'] = f"{mor}/{beh}" if '/' not in mor else mor

        # base_diagnostic : choice '0'..'9'
        if bas:
            diagnostic['base_diagnostic'] = BAS_MAP.get(bas, '9')

        # cim10_code
        if i10 and i10 not in ('9999', ''):
            diagnostic['cim10_code'] = i10

        # age → aussi stocké dans patient.age_diagnostic
        if age:
            try:
                age_int = int(age)
                if 0 < age_int < 120:
                    patient['age_diagnostic'] = age_int
            except ValueError:
                pass

    return {
        'patient':    patient,
        'diagnostic': diagnostic if has_diag else None,
    }


def import_canreg_csv(file_content, encoding='utf-8'):
    if isinstance(file_content, bytes):
        try:
            text = file_content.decode(encoding)
        except UnicodeDecodeError:
            text = file_content.decode('latin-1')
    else:
        text = file_content

    sample = text[:2000]
    sep = '\t' if '\t' in sample else (';' if sample.count(';') > sample.count(',') else ',')

    reader  = csv.DictReader(io.StringIO(text), delimiter=sep)
    results = []

    for i, row in enumerate(reader):
        clean_row = {k.strip(): v.strip() for k, v in row.items() if k}
        parsed    = parse_canreg_row(clean_row)
        parsed['raw']   = clean_row
        parsed['ligne'] = i + 2

        parsed['valide'] = bool(
            parsed['patient'].get('nom') or
            parsed['patient'].get('prenom') or
            parsed['patient'].get('registration_number')
        )
        parsed['erreurs'] = []
        if not parsed['patient'].get('nom') and not parsed['patient'].get('prenom'):
            parsed['erreurs'].append('Nom et prénom manquants')

        results.append(parsed)

    return results


def export_patients_to_canreg(patients_qs, diagnostics_dict=None):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=EXPORT_COLUMNS, extrasaction='ignore')
    writer.writeheader()

    SEX_INV  = {'M': '1', 'F': '2'}
    STAT_INV = {'vivant': '1', 'decede': '2', 'inconnu': '9', 'perdu': '9'}
    BAS_INV  = {v: k for k, v in BAS_MAP.items()}

    for patient in patients_qs:
        diags = (diagnostics_dict or {}).get(patient.id, [])
        diag  = diags[0] if diags else None

        row = {
            'REGNO':  getattr(patient, 'registration_number', '') or '',
            'FAMN':   (getattr(patient, 'nom', '') or '').upper(),
            'FIRSTN': getattr(patient, 'prenom', '') or '',
            'SEX':    SEX_INV.get(getattr(patient, 'sexe', ''), '9'),
            'BIRTHD': format_date_canreg(getattr(patient, 'date_naissance', None)),
            'AGE':    getattr(patient, 'age_diagnostic', '') or '',
            'ADDR':   getattr(patient, 'adresse', '') or '',
            'TRIB':   getattr(patient, 'wilaya', '') or '',
            'OCCU':   getattr(patient, 'profession', '') or '',
            'STAT':   STAT_INV.get(getattr(patient, 'statut_vital', 'inconnu'), '9'),
            'DLC':    format_date_canreg(getattr(patient, 'date_modification', None)),
            'MPCODE': '1', 'MPSEQ': '1', 'MPTOT': '1',
        }

        if diag:
            morph = getattr(diag, 'morphologie_code', '') or ''
            if '/' in morph:
                parts      = morph.split('/')
                row['MOR'] = parts[0]
                row['BEH'] = parts[1] if len(parts) > 1 else '3'
            else:
                row['MOR'] = morph
                row['BEH'] = '3'

            row['TOP']   = getattr(diag, 'topographie_code', '') or ''
            row['BAS']   = BAS_INV.get(getattr(diag, 'base_diagnostic', '9'), '9')
            row['INCID'] = format_date_canreg(getattr(diag, 'date_diagnostic', None))
            row['I10']   = getattr(diag, 'cim10_code', '') or ''
        else:
            row.update({'TOP': '', 'MOR': '', 'BEH': '', 'BAS': '9', 'INCID': '99999999', 'I10': ''})

        writer.writerow(row)

    return output.getvalue()