// cancerValidationRules.js
// Exports: CANCER_VALIDATION_RULES, runValidation, hasBlockingErrors

export const CANCER_VALIDATION_RULES = [
  {
    id: "BREAST_MALE",
    label: "Cancer du sein chez un homme",
    severity: "error",
    description: "Le cancer du sein est extremement rare chez les hommes (< 1 %). Verifiez la topographie et le sexe du patient.",
  },
  {
    id: "GYNAECO_MALE",
    label: "Tumeur gynecologique chez un homme",
    severity: "error",
    description: "Les cancers du col, de l'uterus et des ovaires ne peuvent pas concerner un patient de sexe masculin.",
  },
  {
    id: "PROSTATE_FEMALE",
    label: "Cancer de la prostate chez une femme",
    severity: "error",
    description: "Le cancer de la prostate ne peut pas concerner une patiente de sexe feminin.",
  },
  {
    id: "TESTIS_FEMALE",
    label: "Cancer du testicule chez une femme",
    severity: "error",
    description: "Le cancer du testicule ne peut pas concerner une patiente de sexe feminin.",
  },
  {
    id: "METASTASIS_WITHOUT_STAGE_IV",
    label: "Metastase sans stade IV",
    severity: "error",
    description: "La presence de metastases a distance (M1) impose un stade AJCC IV.",
  },
  {
    id: "STAGE_IV_WITHOUT_METASTASIS",
    label: "Stade IV sans M1",
    severity: "warning",
    description: "Un stade AJCC IV est declare sans metastase a distance (M1). Verifiez la coherence TNM / stade.",
  },
  {
    id: "LATERALITY_MISSING",
    label: "Lateralite non renseignee",
    severity: "warning",
    description: "Cette localisation est typiquement pairee. Precisez la lateralite (Droite / Gauche / Bilaterale).",
  },
  {
    id: "HER2_WITHOUT_BREAST",
    label: "HER2 hors contexte sein / gastrique",
    severity: "info",
    description: "Le marqueur HER2 est principalement pertinent pour les cancers du sein et de l'estomac.",
  },
  {
    id: "ER_WITHOUT_BREAST",
    label: "Recepteur ER hors contexte sein / endometre",
    severity: "info",
    description: "Le recepteur aux oestrogenes (ER) est principalement teste dans les cancers du sein et de l'endometre.",
  },
  {
    id: "PSA_WITHOUT_PROSTATE",
    label: "PSA hors contexte prostatique",
    severity: "warning",
    description: "Le PSA est un marqueur specifique du cancer de la prostate. Verifiez la topographie saisie.",
  },
  {
    id: "FUTURE_DATE",
    label: "Date de diagnostic dans le futur",
    severity: "error",
    description: "La date du diagnostic ne peut pas etre posterieure a aujourd'hui.",
  },
  {
    id: "SYMPTOM_BEFORE_BIRTH",
    label: "Symptomes anterieurs a la naissance",
    severity: "error",
    description: "La date des premiers symptomes est anterieure a la date de naissance du patient.",
  },
  {
    id: "SYMPTOM_AFTER_DIAGNOSIS",
    label: "Symptomes apres le diagnostic",
    severity: "warning",
    description: "La date des premiers symptomes est posterieure a la date du diagnostic.",
  },
  {
    id: "PEDIATRIC_ADULT_CANCER",
    label: "Localisation inhabituelle chez l'enfant",
    severity: "warning",
    description: "Cette topographie est tres rare avant 18 ans. Verifiez la concordance clinique.",
  },
  {
    id: "ELDERLY_AGGRESSIVE",
    label: "Stade avance chez un patient age",
    severity: "info",
    description: "Patient de plus de 80 ans avec un cancer de stade IV. Pensez a documenter le statut fonctionnel (PS/OMS).",
  },
];

// Paired organ C-code prefixes that require laterality
const PAIRED_ORGAN_PREFIXES = [
  "C34", "C38.4", "C40", "C41", "C50", "C56",
  "C57.0", "C57.1", "C62", "C63.0", "C63.1",
  "C64", "C65", "C66", "C69", "C70", "C71", "C72", "C74",
];

const matchesPrefix = (code, prefixes) =>
  prefixes.some((p) => code && (code === p || code.startsWith(p + ".")));

const isBreast          = (c) => c && c.startsWith("C50");
const isProstate        = (c) => c && c.startsWith("C61");
const isTestis          = (c) => c && c.startsWith("C62");
const isGynae           = (c) => c && ["C51","C52","C53","C54","C55","C56","C57","C58"].some((p) => c.startsWith(p));
const isGastric         = (c) => c && c.startsWith("C16");
const isBreastOrGastric = (c) => isBreast(c) || isGastric(c);
const isBreastOrUterus  = (c) => isBreast(c) || (c && ["C54","C55"].some((p) => c.startsWith(p)));
const isPaired          = (c) => matchesPrefix(c, PAIRED_ORGAN_PREFIXES);

const ADULT_TOPO_PREFIXES = ["C16","C18","C19","C20","C22","C25","C34","C50","C53","C61","C62"];

function getFieldValue(obj, field) {
  if (!obj || !field) return undefined;
  const parts = field.split('.');
  if (parts[0] === 'patient' || parts[0] === 'diagnostic') {
    parts.shift();
  }
  return parts.reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), obj);
}

function compareValue(actual, operator, expected) {
  const value = actual == null ? '' : String(actual);
  const target = expected == null ? '' : String(expected);
  switch (operator) {
    case 'equals': return value === target;
    case 'not_equals': return value !== target;
    case 'contains': return value.includes(target);
    case 'not_contains': return !value.includes(target);
    case 'present': return value !== '';
    case 'blank': return value === '';
    case 'greater_than': return parseFloat(value) > parseFloat(target);
    case 'less_than': return parseFloat(value) < parseFloat(target);
    default: return false;
  }
}

function evaluateRule(rule, diag, patient) {
  if (!rule.active || !Array.isArray(rule.conditions) || rule.conditions.length === 0) {
    return false;
  }
  return rule.conditions.every((condition) => {
    const field = condition.field || rule.field_name;
    if (!field) return false;
    const explicitSource = condition.source || (field.startsWith('patient.') ? 'patient' : field.startsWith('diagnostic.') ? 'diagnostic' : null);
    const source = explicitSource === 'patient'
      ? patient
      : explicitSource === 'diagnostic'
        ? diag
        : rule.module === 'patient'
          ? patient
          : diag;
    const actual = getFieldValue(source, field);
    return compareValue(actual, condition.operator || 'equals', condition.value);
  });
}

export function runValidation(diag, patient, backendRules = []) {
  const violations = [];

  const push = (id, overrideMsg) => {
    const def = CANCER_VALIDATION_RULES.find((r) => r.id === id);
    if (!def) return;
    violations.push({
      id:       def.id,
      label:    def.label,
      severity: def.severity,
      message:  overrideMsg || def.description,
    });
  };

  const topoCode = diag.topographie_code || "";
  const sexe     = patient?.sexe || "";
  const age      = patient?.age  || null;
  const stade    = diag.stade_ajcc || "";
  const tnmM     = diag.tnm_m || "";
  const lat      = diag.lateralite || "0";
  const her2     = diag.her2 || "";
  const erRe     = diag.recepteur_re || "";
  const psa      = diag.psa || "";

  // Date checks
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const dateDiag = diag.date_diagnostic      ? new Date(diag.date_diagnostic)      : null;
  const dateSymp = diag.date_premier_symptome ? new Date(diag.date_premier_symptome) : null;
  const dateNais = patient?.date_naissance    ? new Date(patient.date_naissance)    : null;

  if (dateDiag && dateDiag > today) {
    push("FUTURE_DATE", "La date du diagnostic est dans le futur (" + diag.date_diagnostic + ").");
  }
  if (dateDiag && dateSymp) {
    if (dateNais && dateSymp < dateNais) {
      push("SYMPTOM_BEFORE_BIRTH", "La date des premiers symptomes (" + diag.date_premier_symptome + ") est anterieure a la date de naissance du patient.");
    }
    if (dateSymp > dateDiag) {
      push("SYMPTOM_AFTER_DIAGNOSIS", "La date des premiers symptomes (" + diag.date_premier_symptome + ") est posterieure a la date du diagnostic.");
    }
  }

  // Sex / topography coherence (solid tumours only)
  if (diag.categorie_cancer === "solide" && topoCode && sexe) {
    if (sexe === "M" && isBreast(topoCode)) {
      push("BREAST_MALE", "Cancer du sein (C50) diagnostique chez un patient masculin. Verifiez la topographie ou le sexe du patient.");
    }
    if (sexe === "M" && isGynae(topoCode)) {
      push("GYNAECO_MALE", "Tumeur gynecologique (" + topoCode + ") diagnostiquee chez un patient masculin.");
    }
    if (sexe === "F" && isProstate(topoCode)) {
      push("PROSTATE_FEMALE", "Cancer de la prostate (C61) diagnostique chez une patiente de sexe feminin.");
    }
    if (sexe === "F" && isTestis(topoCode)) {
      push("TESTIS_FEMALE", "Cancer du testicule (C62) diagnostique chez une patiente de sexe feminin.");
    }
  }

  // TNM M1 vs stade IV coherence
  const hasM1     = tnmM && tnmM.startsWith("M1");
  const isStageIV = stade && stade.startsWith("IV");

  if (hasM1 && !isStageIV && stade && stade !== "U") {
    push("METASTASIS_WITHOUT_STAGE_IV", "La classification TNM indique " + tnmM + " (metastases a distance) mais le stade AJCC est " + stade + " - le stade devrait etre IV.");
  }
  if (isStageIV && !hasM1 && tnmM && tnmM !== "MX") {
    push("STAGE_IV_WITHOUT_METASTASIS", "Le stade AJCC est IV mais aucune metastase a distance n'est indiquee (" + (tnmM || "M non renseigne") + ").");
  }

  // Laterality for paired organs
  if (diag.categorie_cancer === "solide" && topoCode && isPaired(topoCode) && lat === "0") {
    push("LATERALITY_MISSING", "La localisation " + topoCode + " est un organe paire. Precisez la lateralite (Droite / Gauche / Bilaterale).");
  }

  // Biological markers coherence
  if (diag.categorie_cancer === "solide" && topoCode) {
    if (her2 && !isBreastOrGastric(topoCode)) {
      push("HER2_WITHOUT_BREAST", "Le marqueur HER2 est renseigne pour " + topoCode + ". Ce marqueur est principalement pertinent pour les cancers du sein (C50) et de l'estomac (C16).");
    }
    if (erRe && !isBreastOrUterus(topoCode)) {
      push("ER_WITHOUT_BREAST", "Le recepteur ER est renseigne pour " + topoCode + ". Ce marqueur est principalement pertinent pour les cancers du sein (C50) et de l'endometre (C54-C55).");
    }
    if (psa && !isProstate(topoCode)) {
      push("PSA_WITHOUT_PROSTATE", "Le PSA est renseigne pour " + topoCode + ". Ce marqueur est specifique du cancer de la prostate (C61).");
    }
  }

  // Age-related checks
  if (age !== null) {
    if (age < 18 && diag.categorie_cancer === "solide" && topoCode &&
        ADULT_TOPO_PREFIXES.some((p) => topoCode.startsWith(p))) {
      push("PEDIATRIC_ADULT_CANCER", "Le patient a " + age + " ans. La topographie " + topoCode + " est inhabituelle en pediatrie - verifiez la concordance clinique.");
    }
    if (age > 80 && isStageIV) {
      push("ELDERLY_AGGRESSIVE", "Patient de " + age + " ans avec un cancer de stade IV. Pensez a documenter le statut fonctionnel (PS/OMS) dans les observations.");
    }
  }

  backendRules.forEach((rule) => {
    if (!rule || !rule.active) return;
    if (evaluateRule(rule, diag, patient)) {
      violations.push({
        id:       rule.code,
        label:    rule.label || rule.code,
        severity: rule.severity || 'warning',
        message:  rule.description || `Règle ${rule.code} activée.`,
      });
    }
  });

  return violations;
}

export function hasBlockingErrors(violations) {
  return Array.isArray(violations) && violations.some((v) => v.severity === "error");
}