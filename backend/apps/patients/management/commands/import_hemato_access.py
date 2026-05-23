from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.diagnostics.models import Diagnostic
from apps.patients.models import Patient


PROFESSION_MAP = {
    "agric": "AGR",
    "fonction": "FON",
    "commer": "COM",
    "artisan": "ART",
    "etud": "ETU",
    "retrait": "RET",
    "foyer": "FFO",
    "medec": "PSA",
    "infirm": "PSA",
    "pharmac": "PSA",
}


def safe_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def safe_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        v = value.strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(v, fmt).date()
            except ValueError:
                continue
    return None


def map_sexe(raw: str) -> str:
    val = safe_str(raw).lower()
    if val.startswith(("m", "h")):
        return "M"
    if val.startswith("f"):
        return "F"
    return "M"


def map_profession(raw: str) -> str:
    value = safe_str(raw).lower()
    if not value:
        return "INC"
    for key, mapped in PROFESSION_MAP.items():
        if key in value:
            return mapped
    return "AUT"


def normalize_stage(raw: str) -> str:
    value = safe_str(raw).upper()
    if value in {"0", "I", "IA", "IB", "II", "IIA", "IIB", "IIC", "III", "IIIA", "IIIB", "IIIC", "IV"}:
        return value
    if "IV" in value:
        return "IV"
    if "III" in value:
        return "III"
    if "II" in value:
        return "II"
    if "I" in value:
        return "I"
    return "U"


class Command(BaseCommand):
    help = "Importe la table Access hématologie vers Patient/Diagnostic."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            required=True,
            type=str,
            help="Chemin du fichier .accdb",
        )
        parser.add_argument(
            "--table",
            default="BASE GENERALE HEMATO EHU",
            type=str,
            help="Nom de table Access à importer.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limiter le nombre de lignes (0 = toutes).",
        )
        parser.add_argument(
            "--preview",
            action="store_true",
            help="N'écrit rien en base, affiche uniquement le résultat attendu.",
        )

    def _get_rows(self, path: str, table: str, limit: int) -> list[Dict[str, Any]]:
        try:
            import pyodbc  # type: ignore
        except ImportError as exc:
            raise CommandError(
                "pyodbc non installé. Installez-le avec `pip install pyodbc` (Windows + driver Access requis)."
            ) from exc

        conn_str = (
            r"Driver={Microsoft Access Driver (*.mdb, *.accdb)};"
            f"DBQ={path};"
        )
        try:
            conn = pyodbc.connect(conn_str)
        except Exception as exc:
            raise CommandError(
                f"Connexion Access impossible: {exc}. Vérifiez le driver ODBC Access."
            ) from exc

        try:
            cursor = conn.cursor()
            sql = f"SELECT * FROM [{table}]"
            if limit and limit > 0:
                sql = f"SELECT TOP {limit} * FROM [{table}]"
            cursor.execute(sql)
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return rows
        finally:
            conn.close()

    def _patient_payload(self, row: Dict[str, Any]) -> Dict[str, Any]:
        reg_num = safe_str(row.get("DOSSIER")) or f"HEM-{safe_str(row.get('NUMID'))}"
        return {
            "registration_number": reg_num[:20],
            "nom": safe_str(row.get("NOM"))[:100] or "INCONNU",
            "prenom": safe_str(row.get("PRENOM"))[:100] or "INCONNU",
            "sexe": map_sexe(safe_str(row.get("SEXE"))),
            "date_naissance": safe_date(row.get("DATE NAIS")) or safe_date(row.get("DDN")),
            "age_diagnostic": row.get("ÂGE") if isinstance(row.get("ÂGE"), int) else None,
            "telephone": safe_str(row.get("TEL M"))[:20],
            "telephone2": safe_str(row.get("TEL F"))[:20],
            "adresse": safe_str(row.get("ADRESSE")),
            "wilaya": safe_str(row.get("WILAYA"))[:100],
            "profession": map_profession(row.get("PROFESSION")),
            "antecedents_personnels": safe_str(row.get("ANTECEDENTS")),
            "date_deces": safe_date(row.get("DATE DECES")),
            "notes": f"[IMPORT HEMATO] NUMID={safe_str(row.get('NUMID'))} | TYPE={safe_str(row.get('TYPE'))}",
        }

    def _diagnostic_payload(self, row: Dict[str, Any], patient: Patient) -> Dict[str, Any]:
        return {
            "patient": patient,
            "date_diagnostic": (
                safe_date(row.get("DATE DEBUT"))
                or safe_date(row.get("DATE RECRUT"))
                or date.today()
            ),
            "type_diagnostic": "initial",
            "base_diagnostic": "1",
            "topographie_code": "",
            "topographie_libelle": safe_str(row.get("SIEGE"))[:200],
            "morphologie_code": "",
            "morphologie_libelle": safe_str(row.get("DIAGNOSTIC"))[:200],
            "stade_ajcc": normalize_stage(safe_str(row.get("STADE"))),
            "observations": safe_str(row.get("ANAPATH"))[:1000],
            "numero_dossier": safe_str(row.get("DOSSIER"))[:50],
            "etat_cancer": "non_determine",
            "statut_dossier": "en_cours",
            "grade_histologique": "U",
            "tnm_type": "c",
            "tnm_edition": "8",
        }

    def handle(self, *args, **options):
        path = options["path"]
        table = options["table"]
        limit = options["limit"]
        preview = options["preview"]

        rows = self._get_rows(path=path, table=table, limit=limit)
        if not rows:
            self.stdout.write(self.style.WARNING("Aucune ligne trouvée dans la table Access."))
            return

        created_patients = 0
        created_diagnostics = 0
        skipped_duplicates = 0
        skipped_invalid = 0

        with transaction.atomic():
            for row in rows:
                payload = self._patient_payload(row)
                reg_num = payload["registration_number"]
                if not reg_num:
                    skipped_invalid += 1
                    continue

                if Patient.objects.filter(registration_number=reg_num).exists():
                    skipped_duplicates += 1
                    continue

                if preview:
                    created_patients += 1
                    if safe_str(row.get("DIAGNOSTIC")) or safe_str(row.get("SIEGE")):
                        created_diagnostics += 1
                    continue

                patient = Patient.objects.create(**payload)
                created_patients += 1

                if safe_str(row.get("DIAGNOSTIC")) or safe_str(row.get("SIEGE")):
                    Diagnostic.objects.create(**self._diagnostic_payload(row, patient))
                    created_diagnostics += 1

            if preview:
                transaction.set_rollback(True)

        mode = "PREVIEW" if preview else "IMPORT"
        self.stdout.write(self.style.SUCCESS(f"[{mode}] Lignes lues: {len(rows)}"))
        self.stdout.write(self.style.SUCCESS(f"[{mode}] Patients créés: {created_patients}"))
        self.stdout.write(self.style.SUCCESS(f"[{mode}] Diagnostics créés: {created_diagnostics}"))
        self.stdout.write(self.style.WARNING(f"[{mode}] Doublons ignorés: {skipped_duplicates}"))
        self.stdout.write(self.style.WARNING(f"[{mode}] Lignes invalides ignorées: {skipped_invalid}"))
