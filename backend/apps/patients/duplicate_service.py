"""
apps/patients/duplicate_service.py

Service de détection et fusion des dossiers patients en doublon.

Critères de détection :
  1. Même N° identité nationale (certitude absolue)
  2. Même nom + prénom + date de naissance (certitude forte)
  3. Score de similarité sur nom+prénom (noms approchants)

Résolution des conflits : le dossier le plus récent (date_modification) prime.
"""

from __future__ import annotations
import unicodedata
import re
from difflib import SequenceMatcher
from dataclasses import dataclass, field
from typing import List, Tuple, Optional
from django.db.models import Q
from django.utils import timezone


# ── Normalisation des chaînes ──────────────────────────────────────

def normalize(text: str) -> str:
    """Minuscule, sans accents, sans tirets/espaces multiples."""
    if not text:
        return ''
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = text.lower()
    text = re.sub(r'[\s\-_]+', ' ', text).strip()
    return text


def similarity(a: str, b: str) -> float:
    """Score de similarité entre deux chaînes (0.0 → 1.0)."""
    a, b = normalize(a), normalize(b)
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


# ── Résultat d'une paire de doublons ──────────────────────────────

@dataclass
class DuplicatePair:
    patient_a_id: int
    patient_b_id: int
    score: float                  # 0.0 → 1.0
    raisons: List[str]            # explications lisibles
    certitude: str                # 'haute' | 'moyenne' | 'faible'
    apercu_a: dict
    apercu_b: dict
    fusion_preview: dict          # dossier fusionné prévisualisé


# ── Détection ─────────────────────────────────────────────────────

def detecter_doublons(seuil_similarite: float = 0.82) -> List[DuplicatePair]:
    """
    Parcourt tous les patients actifs et retourne les paires suspectes.
    Complexité O(n²) — acceptable pour quelques milliers de dossiers.
    Pour de très grands volumes, utiliser un index phonétique.
    """
    from apps.patients.models import Patient

    patients = list(
        Patient.objects.filter(est_actif=True)
        .values(
            'id', 'nom', 'prenom', 'date_naissance',
            'id_national', 'telephone', 'registration_number',
            'date_modification', 'sexe', 'wilaya', 'statut_dossier',
        )
        .order_by('id')
    )

    paires_vues = set()
    resultats: List[DuplicatePair] = []

    for i, a in enumerate(patients):
        for b in patients[i + 1:]:
            cle = (a['id'], b['id'])
            if cle in paires_vues:
                continue
            paires_vues.add(cle)

            score, raisons = _calculer_score(a, b, seuil_similarite)
            if score == 0.0:
                continue

            if score >= 0.95:
                certitude = 'haute'
            elif score >= 0.85:
                certitude = 'moyenne'
            else:
                certitude = 'faible'

            # Déterminer quel dossier est le plus récent
            a_recent = (a['date_modification'] or timezone.now()) >= (b['date_modification'] or timezone.now())
            principal = a if a_recent else b
            secondaire = b if a_recent else a

            fusion = _previsualiser_fusion(principal['id'], secondaire['id'])

            resultats.append(DuplicatePair(
                patient_a_id=a['id'],
                patient_b_id=b['id'],
                score=round(score, 3),
                raisons=raisons,
                certitude=certitude,
                apercu_a=_apercu(a),
                apercu_b=_apercu(b),
                fusion_preview=fusion,
            ))

    resultats.sort(key=lambda p: p.score, reverse=True)
    return resultats


def _calculer_score(
    a: dict, b: dict, seuil: float
) -> Tuple[float, List[str]]:
    raisons = []
    score = 0.0

    # ── Critère 1 : N° identité nationale identique ──────────────
    if (a['id_national'] and b['id_national']
            and normalize(a['id_national']) == normalize(b['id_national'])):
        raisons.append('Meme numero d\'identite nationale')
        score = max(score, 1.0)

    # ── Critère 2 : Nom + prénom + date de naissance identiques ──
    if (a['date_naissance'] and b['date_naissance']
            and a['date_naissance'] == b['date_naissance']):
        nom_score = similarity(
            f"{a['nom']} {a['prenom']}",
            f"{b['nom']} {b['prenom']}"
        )
        if nom_score >= 0.95:
            raisons.append('Meme nom, prenom et date de naissance')
            score = max(score, 0.97)
        elif nom_score >= seuil:
            raisons.append(f'Noms tres similaires + meme date de naissance ({int(nom_score*100)}%)')
            score = max(score, 0.90)

    # ── Critère 3 : Score de similarité nom+prénom seul ──────────
    nom_sim = similarity(
        f"{a['nom']} {a['prenom']}",
        f"{b['nom']} {b['prenom']}"
    )
    if nom_sim >= seuil and not raisons:
        raisons.append(f'Noms similaires ({int(nom_sim*100)}% de correspondance)')
        score = max(score, nom_sim * 0.88)

    # Bonus : même sexe et même wilaya
    if score > 0 and a.get('sexe') == b.get('sexe'):
        score = min(1.0, score + 0.02)
    if score > 0 and a.get('wilaya') and a.get('wilaya') == b.get('wilaya'):
        score = min(1.0, score + 0.02)

    if not raisons:
        return 0.0, []

    return score, raisons


def _apercu(p: dict) -> dict:
    return {
        'id':                  p['id'],
        'registration_number': p['registration_number'],
        'nom':                 p['nom'],
        'prenom':              p['prenom'],
        'date_naissance':      str(p['date_naissance']) if p['date_naissance'] else None,
        'id_national':         p['id_national'],
        'telephone':           p['telephone'],
        'wilaya':              p['wilaya'],
        'statut_dossier':      p['statut_dossier'],
        'date_modification':   p['date_modification'].isoformat() if p['date_modification'] else None,
    }


def _previsualiser_fusion(id_principal: int, id_secondaire: int) -> dict:
    """
    Construit un aperçu du dossier fusionné sans rien écrire en base.
    Règle : le dossier principal (plus récent) prime sur les champs renseignés.
    Si un champ est vide dans le principal, on prend celui du secondaire.
    """
    from apps.patients.models import Patient
    from apps.patients.serializers import PatientDetailSerializer

    try:
        principal  = Patient.objects.get(id=id_principal)
        secondaire = Patient.objects.get(id=id_secondaire)
    except Patient.DoesNotExist:
        return {}

    CHAMPS_FUSIONNABLES = [
        'nom', 'prenom', 'date_naissance', 'sexe', 'id_national',
        'num_securite_sociale', 'telephone', 'telephone2', 'email',
        'adresse', 'commune', 'wilaya', 'code_postal',
        'niveau_instruction', 'profession', 'situation_familiale',
        'nombre_enfants', 'lieu_naissance', 'nationalite',
        'tabagisme', 'alcool', 'activite_physique', 'alimentation',
        'antecedents_familiaux', 'antecedents_personnels',
        'etablissement_pec', 'medecin_referent', 'notes',
    ]

    fusion = {}
    conflits = []

    for champ in CHAMPS_FUSIONNABLES:
        val_p = getattr(principal, champ, None)
        val_s = getattr(secondaire, champ, None)

        val_p_vide = val_p in (None, '', 'inconnu')
        val_s_vide = val_s in (None, '', 'inconnu')

        if not val_p_vide:
            fusion[champ] = str(val_p) if val_p is not None else None
            if not val_s_vide and str(val_p) != str(val_s):
                conflits.append({
                    'champ':      champ,
                    'principal':  str(val_p),
                    'secondaire': str(val_s),
                    'retenu':     str(val_p),
                })
        elif not val_s_vide:
            fusion[champ] = str(val_s) if val_s is not None else None
        else:
            fusion[champ] = None

    fusion['_meta'] = {
        'id_conserve':   id_principal,
        'id_supprime':   id_secondaire,
        'nb_conflits':   len(conflits),
        'conflits':      conflits,
        'registration_number': principal.registration_number,
    }

    return fusion


# ── Fusion réelle (écriture en base) ──────────────────────────────

def fusionner_patients(
    id_principal: int,
    id_secondaire: int,
    user=None,
) -> dict:
    """
    Fusionne le dossier secondaire dans le principal.
    - Transfère les données manquantes du secondaire vers le principal
    - Archive le dossier secondaire (est_actif=False)
    - Journalise l'opération
    Retourne un résumé de l'opération.
    """
    from apps.patients.models import Patient
    from apps.accounts.models import AccessLog

    principal  = Patient.objects.get(id=id_principal,  est_actif=True)
    secondaire = Patient.objects.get(id=id_secondaire, est_actif=True)

    CHAMPS_FUSIONNABLES = [
        'num_securite_sociale', 'telephone', 'telephone2', 'email',
        'adresse', 'commune', 'wilaya', 'code_postal',
        'niveau_instruction', 'profession', 'situation_familiale',
        'nombre_enfants', 'lieu_naissance', 'nationalite',
        'tabagisme', 'alcool', 'activite_physique', 'alimentation',
        'antecedents_familiaux', 'antecedents_personnels',
        'etablissement_pec', 'notes',
    ]

    champs_mis_a_jour = []

    for champ in CHAMPS_FUSIONNABLES:
        val_p = getattr(principal, champ, None)
        val_s = getattr(secondaire, champ, None)
        if val_p in (None, '', 'inconnu') and val_s not in (None, '', 'inconnu'):
            setattr(principal, champ, val_s)
            champs_mis_a_jour.append(champ)
    if champs_mis_a_jour:
        for champ, valeur in champs_mis_a_jour.items():
            if hasattr(principal, champ) and champ not in ('id', 'registration_number'):
                setattr(principal, champ, valeur or None)

    # Archiver le secondaire
    secondaire.est_actif = False
    secondaire.notes = (
        f"{secondaire.notes or ''}\n"
        f"[FUSION] Dossier fusionné dans {principal.registration_number} "
        f"le {timezone.now().strftime('%d/%m/%Y %H:%M')}."
    ).strip()

    principal.save()
    secondaire.save()

    # Journaliser
    if user:
        AccessLog.objects.create(
            user=user,
            action=AccessLog.Action.UPDATE,
            resource='patient_fusion',
            resource_id=str(principal.id),
            ip_address=None,
        )

    return {
        'succes':              True,
        'id_conserve':         principal.id,
        'registration_number': principal.registration_number,
        'id_archive':          secondaire.id,
        'champs_mis_a_jour':   champs_mis_a_jour,
        'message': (
            f"Dossier {secondaire.registration_number} fusionné dans "
            f"{principal.registration_number}. "
            f"{len(champs_mis_a_jour)} champ(s) complété(s)."
        ),
    }