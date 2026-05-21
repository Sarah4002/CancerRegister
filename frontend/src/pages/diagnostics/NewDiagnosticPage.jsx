import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { diagnosticService } from '../../services/diagnosticService';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import useCustomFields from '../../hooks/useCustomFields';
import CustomFieldsSection from '../../components/custom_fields/CustomFieldsSection';

// ── Hémopathies malignes (Dr. Bendahmane) ────────────────────────
// Chaque examen devient un champ libre obligatoire dans le formulaire.
// La clé `examens` est un tableau d'objets { key, label } :
//   - key   : nom du champ dans le payload (snake_case)
//   - label : libellé affiché dans le formulaire
const HEMATOLOGY_OPTIONS = [
  {
    value: 'lymphome_non_hodgkinien',
    label: 'Lymphome non Hodgkinien',
    examens: [
      { key: 'siege_biopsie',     label: 'Siège Biopsie' },
      { key: 'anapath',           label: 'Anapath' },
      { key: 'immunohistochimie', label: 'Immunohistochimie' },
    ],
  },
  {
    value: 'lymphome_hodgkin',
    label: 'Lymphome de Hodgkin',
    examens: [
      { key: 'siege_biopsie',     label: 'Siège Biopsie' },
      { key: 'anapath',           label: 'Anapath' },
      { key: 'immunohistochimie', label: 'Immunohistochimie' },
    ],
  },
  {
    value: 'myelome',
    label: 'Myélome ou Maladie de Kahler',
    examens: [
      { key: 'biopsie_osteomedulaire',       label: 'Biopsie ostéomédullaire' },
      { key: 'myelogramme',                  label: 'Myélogramme' },
      { key: 'caryotype_fish_medullaire',    label: 'Caryotype / FISH médullaire' },
      { key: 'electrophorese_proteines',     label: 'Électrophorèse des protéines' },
      { key: 'immunofixation_sanguine',      label: 'Immunofixation sanguine' },
      { key: 'free_light_chain',             label: 'Free Light Chain' },
      { key: 'calcemie',                     label: 'Calcémie' },
      { key: 'hemoglobine',                  label: 'Hémoglobine' },
      { key: 'clairance_renale',             label: 'Clairance rénale' },
      { key: 'radiologie_standard',          label: 'Radiologie standard' },
      { key: 'irm',                          label: 'IRM' },
      { key: 'tdm_low_dose',                 label: 'TDM low dose' },
    ],
  },
  {
    value: 'llc',
    label: 'Leucémie Lymphoïde Chronique',
    examens: [
      { key: 'taux_lymphocytes',   label: 'Taux de lymphocytes' },
      { key: 'frottis_sang',       label: 'Frottis de sang' },
      { key: 'cytometrie_flux',    label: 'Cytométrie en flux' },
    ],
  },
  {
    value: 'lmc',
    label: 'Leucémie Myéloïde Chronique',
    examens: [
      { key: 'taux_globules_blancs',       label: 'Taux de globules blancs' },
      { key: 'frottis_sang',               label: 'Frottis de sang' },
      { key: 'cytogenetique_medullaire',   label: 'Cytogénétique médullaire' },
      { key: 'fish_medullaire',            label: 'FISH médullaire' },
      { key: 'biologie_moleculaire',       label: 'Biologie moléculaire' },
    ],
  },
  {
    value: 'lam',
    label: 'Leucémie Aiguë Myéloïde',
    examens: [
      { key: 'nfs',                        label: 'NFS' },
      { key: 'frottis_sang',               label: 'Frottis de sang' },
      { key: 'myelogramme',                label: 'Myélogramme' },
      { key: 'cytochimie_medullaire',      label: 'Cytochimie médullaire' },
      { key: 'cytometrie_flux',            label: 'Cytométrie en flux' },
      { key: 'caryotype_medullaire',       label: 'Caryotype médullaire' },
      { key: 'fish_medullaire',            label: 'FISH médullaire' },
      { key: 'biologie_moleculaire',       label: 'Biologie moléculaire' },
    ],
  },
  {
    value: 'lal',
    label: 'Leucémie Aiguë Lymphoïde',
    examens: [
      { key: 'nfs',                        label: 'NFS' },
      { key: 'frottis_sang',               label: 'Frottis de sang' },
      { key: 'myelogramme',                label: 'Myélogramme' },
      { key: 'cytochimie_medullaire',      label: 'Cytochimie médullaire' },
      { key: 'cytometrie_flux',            label: 'Cytométrie en flux' },
      { key: 'caryotype_medullaire',       label: 'Caryotype médullaire' },
      { key: 'fish_medullaire',            label: 'FISH médullaire' },
      { key: 'biologie_moleculaire',       label: 'Biologie moléculaire' },
    ],
  },
  {
    value: 'polyglobulie_vaquez',
    label: 'Polyglobulie de Vaquez',
    examens: [
      { key: 'nfs',                        label: 'NFS' },
      { key: 'biopsie_osteomedulaire',     label: 'Biopsie ostéomédullaire' },
      { key: 'biologie_moleculaire',       label: 'Biologie moléculaire' },
      { key: 'dosage_epo',                 label: "Dosage d'EPO" },
    ],
  },
  {
    value: 'thrombocytemie_essentielle',
    label: 'Thrombocytémie essentielle',
    examens: [
      { key: 'nfs',                        label: 'NFS' },
      { key: 'biopsie_osteomedulaire',     label: 'Biopsie ostéomédullaire' },
      { key: 'biologie_moleculaire',       label: 'Biologie moléculaire' },
    ],
  },
  {
    value: 'myelofibrose_primitive',
    label: 'Myélofibrose primitive',
    examens: [
      { key: 'nfs',                        label: 'NFS' },
      { key: 'biopsie_osteomedulaire',     label: 'Biopsie ostéomédullaire' },
      { key: 'biologie_moleculaire',       label: 'Biologie moléculaire' },
    ],
  },
  {
    value: 'smp_inclassable',
    label: 'Syndrome myéloprolifératif inclassable',
    examens: [
      { key: 'nfs',                        label: 'NFS' },
      { key: 'biopsie_osteomedulaire',     label: 'Biopsie ostéomédullaire' },
      { key: 'biologie_moleculaire',       label: 'Biologie moléculaire' },
    ],
  },
  {
    value: 'smd',
    label: 'Syndromes myélodysplasiques',
    examens: [
      { key: 'nfs',                        label: 'NFS' },
      { key: 'myelogramme',                label: 'Myélogramme' },
      { key: 'coloration_perls',           label: 'Coloration de Perls' },
      { key: 'caryotype_medullaire',       label: 'Caryotype médullaire' },
    ],
  },
  {
    value: 'waldenstrom',
    label: 'Maladie de Waldenström',
    examens: [
      { key: 'nfs',                        label: 'NFS' },
      { key: 'myelogramme',                label: 'Myélogramme' },
      { key: 'biopsie_osteomedulaire',     label: 'Biopsie ostéomédullaire' },
      { key: 'electrophorese_proteines',   label: 'Électrophorèse des protéines' },
      { key: 'immunofixation_sanguine',    label: 'Immunofixation sanguine' },
    ],
  },
  {
    value: 'tricholeucocytes',
    label: 'Leucémie à Tricholeucocytes',
    examens: [
      { key: 'nfs',                        label: 'NFS' },
      { key: 'frottis_sang',               label: 'Frottis de sang' },
      { key: 'cytometrie_flux',            label: 'Cytométrie en flux' },
      { key: 'biopsie_osteomedulaire',     label: 'Biopsie ostéomédullaire' },
      { key: 'biologie_moleculaire',       label: 'Biologie moléculaire' },
    ],
  },
];

// ── ICD Autocomplete ──────────────────────────────────────────────
function ICDSearch({ label, onSelect, selectedCode, selectedLabel, searchFn, placeholder, accentColor = '#2563eb' }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchFn(query);
        setResults(data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ marginBottom: 18 }} ref={ref}>
      <label style={labelSt}>{label}</label>
      {selectedCode ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: `${accentColor}15`, border: `1px solid ${accentColor}30`, borderRadius: '12px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: accentColor }}>{selectedCode}</span>
          <span style={{ fontSize: 13, color: '#0f172a', flex: 1 }}>{selectedLabel}</span>
          <button type="button" onClick={() => onSelect(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            placeholder={placeholder}
            style={{ ...inputSt, paddingLeft: 36 }}
            onFocus={() => query.length >= 2 && setOpen(true)}
          />
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
            {loading
              ? <div style={{ width: 14, height: 14, border: '2px solid rgba(37,99,235,0.12)', borderTopColor: accentColor, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            }
          </div>
          {open && results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', marginTop: 4, maxHeight: 240, overflow: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              {results.map(r => (
                <button key={r.id} type="button"
                  onClick={() => { onSelect(r); setQuery(''); setOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(37,99,235,0.12)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: accentColor, minWidth: 60 }}>{r.code}</span>
                  <span style={{ fontSize: 12.5, color: '#0f172a' }}>{r.libelle}</span>
                  {r.categorie && <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>{r.categorie}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TNM Selector ──────────────────────────────────────────────────
function TNMSelector({ register, watch }) {
  const t = watch('tnm_t') || '';
  const n = watch('tnm_n') || '';
  const m = watch('tnm_m') || '';
  const type = watch('tnm_type') || 'c';
  const tnmDisplay = [t, n, m].filter(Boolean).join('');
  const fullTNM = tnmDisplay ? `${type}${tnmDisplay}` : '—';

  return (
    <div style={{ background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>TNM 8e édition</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#2563eb', padding: '3px 10px', background: 'rgba(37,99,235,0.08)', borderRadius: 6, border: '1px solid rgba(37,99,235,0.16)' }}>{fullTNM}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ ...labelSt, fontSize: 10 }}>Type</label>
          <select {...register('tnm_type')} style={selectSt}>
            <option value="c">cTNM</option>
            <option value="p">pTNM</option>
            <option value="y">yTNM</option>
          </select>
        </div>
        <div>
          <label style={{ ...labelSt, fontSize: 10 }}>T – Tumeur</label>
          <select {...register('tnm_t')} style={selectSt}>
            <option value="">—</option>
            {['TX','T0','Tis','T1','T1a','T1b','T1c','T2','T2a','T2b','T3','T3a','T4','T4a','T4b','T4c','T4d'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelSt, fontSize: 10 }}>N – Ganglions</label>
          <select {...register('tnm_n')} style={selectSt}>
            <option value="">—</option>
            {['NX','N0','N1','N1a','N1b','N1c','N2','N2a','N2b','N2c','N3','N3a','N3b','N3c'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelSt, fontSize: 10 }}>M – Métastases</label>
          <select {...register('tnm_m')} style={selectSt}>
            <option value="">—</option>
            {['MX','M0','M1','M1a','M1b','M1c'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Examens hématologiques (champs libres obligatoires) ───────────
// Affiche un textarea par examen recommandé pour l'hémopathie sélectionnée.
function ExamensHematologiques({ hemopathie, register, errors, watch }) {
  const option = HEMATOLOGY_OPTIONS.find(o => o.value === hemopathie);
  if (!option) return null;

  return (
    <div style={{ marginTop: 16 }}>
      {/* Bandeau récapitulatif des examens attendus */}
      <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: '12px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.16)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Examens requis — {option.label}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {option.examens.map(ex => (
            <span key={ex.key} style={{ padding: '4px 10px', borderRadius: 999, background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', fontSize: 11.5, color: '#334155' }}>
              {ex.label}
            </span>
          ))}
        </div>
      </div>

      {/* Un champ libre obligatoire par examen */}
      {option.examens.map((ex) => {
        const fieldName = `examen_${ex.key}`;
        const currentValue = watch(fieldName) || '';
        const hasError = errors[fieldName];

        return (
          <div key={ex.key} style={{ marginBottom: 14 }}>
            <label style={labelSt}>
              {ex.label}
              <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>
            </label>
            <textarea
              {...register(fieldName, {
                required: `Le champ "${ex.label}" est obligatoire`,
                validate: v => v.trim().length >= 2 || `Veuillez renseigner le résultat de "${ex.label}"`,
              })}
              rows={2}
              placeholder={`Résultat / description : ${ex.label}...`}
              style={{
                ...inputSt,
                resize: 'vertical',
                lineHeight: 1.6,
                borderColor: hasError ? '#dc2626' : currentValue.trim() ? '#22c55e' : undefined,
              }}
            />
            {hasError && (
              <p style={{ marginTop: 3, fontSize: 11, color: '#dc2626' }}>⚠ {hasError.message}</p>
            )}
          </div>
        );
      })}

      {/* Champ libre optionnel pour remarques supplémentaires */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelSt}>Remarques complémentaires <span style={{ color: '#64748b', fontWeight: 400 }}>(optionnel)</span></label>
        <textarea
          {...register('examens_complementaires')}
          rows={3}
          placeholder="Autres précisions, résultats annexes, contexte clinique..."
          style={{ ...inputSt, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────
export default function NewDiagnosticPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting]   = useState(false);
  const [topoSelected,  setTopoSelected]  = useState(null);
  const [morphSelected, setMorphSelected] = useState(null);
  const [patients, setPatients]           = useState([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      categorie_cancer: 'solide',
      tnm_type: 'c', stade_ajcc: 'U', base_diagnostic: '9',
      lateralite: '0', grade_histologique: 'U',
      patient: searchParams.get('patient') || '',
    },
  });

  const categorieCancer        = watch('categorie_cancer');
  const hemopathieValue        = watch('hemopathie_maligne');
  const hemopathieSelectionnee = HEMATOLOGY_OPTIONS.find(o => o.value === hemopathieValue);

  const {
    champs: champsCustom, valeurs: valeursCustom,
    setValeur, sauvegarder: sauvegarderCustom, loading: loadingCustom,
  } = useCustomFields({ module: 'diagnostic', objectId: null });

  useEffect(() => {
    patientService.list({ page_size: 100 }).then(({ data }) => {
      setPatients(data.results || data);
    }).catch(() => {});
  }, []);

  // Réinitialiser les champs hémato quand on revient aux tumeurs solides
  useEffect(() => {
    if (categorieCancer === 'liquide') {
      setTopoSelected(null);
      setMorphSelected(null);
      setValue('lateralite', '0');
      setValue('stade_ajcc', 'U');
      setValue('tnm_t', '');
      setValue('tnm_n', '');
      setValue('tnm_m', '');
    }
  }, [categorieCancer, setValue]);

  // Réinitialiser les champs d'examens quand on change d'hémopathie
  useEffect(() => {
    if (hemopathieSelectionnee) {
      // Effacer les anciens champs d'examens pour forcer une nouvelle saisie
      HEMATOLOGY_OPTIONS.forEach(opt =>
        opt.examens.forEach(ex => setValue(`examen_${ex.key}`, ''))
      );
    }
  }, [hemopathieValue, setValue]);

  const buildExamensPayload = (data) => {
    // Rassemble tous les champs examen_* dans un objet structuré
    const examens = {};
    if (hemopathieSelectionnee) {
      hemopathieSelectionnee.examens.forEach(ex => {
        examens[ex.key] = data[`examen_${ex.key}`] || '';
        delete data[`examen_${ex.key}`];
      });
    }
    return examens;
  };

  const onSubmit = async (data) => {
    // Validation manuelle côté front en complément de react-hook-form
    if (categorieCancer === 'solide' && !topoSelected && !data.topographie_code) {
      toast.error('Veuillez sélectionner une topographie ICD-O-3');
      return;
    }
    if (categorieCancer === 'liquide' && !data.hemopathie_maligne) {
      toast.error('Veuillez sélectionner une hémopathie maligne');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...data };

      if (categorieCancer === 'solide') {
        if (topoSelected)  payload.topographie = topoSelected.id;
        if (morphSelected) payload.morphologie  = morphSelected.id;
      }

      if (categorieCancer === 'liquide') {
        // Structurer les examens dans un champ JSON dédié
        const examensObj = buildExamensPayload(payload);
        // Sérialiser en JSON pour le champ texte `examens_complementaires`
        // (ou utiliser un champ dédié si le backend évolue)
        payload.examens_hemato = examensObj;
      }

      // Supprimer les clés vides
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

      const { data: diag } = await diagnosticService.create(payload);

      if (Object.keys(valeursCustom).length > 0) {
        await sauvegarderCustom(diag.id);
      }

      toast.success('Diagnostic enregistré avec succès !');
      navigate(`/diagnostics/${diag.id}`);
    } catch (err) {
      const errs = err.response?.data;
      toast.error(errs ? Object.values(errs).flat().join(' ') : 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="Nouveau Diagnostic">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '16px', padding: '28px 32px' }}>
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* Patient & date */}
            <Section title="Patient & Date de diagnostic">
              <Row2>
                <Field label="Catégorie de cancer *">
                  <select {...register('categorie_cancer')} style={selectSt}>
                    <option value="solide">Tumeur solide</option>
                    <option value="liquide">Cancer liquide / hématologique</option>
                  </select>
                </Field>
                <Field label="Type du diagnostic">
                  <select {...register('type_diagnostic')} style={selectSt}>
                    <option value="initial">Diagnostic initial</option>
                    <option value="recidive">Récidive</option>
                    <option value="nouveau_primitif">Nouveau primitif</option>
                    <option value="metastase">Métastase</option>
                  </select>
                </Field>
              </Row2>
              <Row2>
                <Field label="Patient *" error={errors.patient?.message}>
                  <select {...register('patient', { required: 'Patient requis' })} style={selectSt}>
                    <option value="">Sélectionner un patient</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.registration_number} – {p.full_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date du diagnostic *" error={errors.date_diagnostic?.message}>
                  <input type="date" {...register('date_diagnostic', { required: 'Date requise' })} style={inputSt} />
                </Field>
              </Row2>
              <Row2>
                <Field label="Date des premiers symptômes">
                  <input type="date" {...register('date_premier_symptome')} style={inputSt} />
                </Field>
                <Field label="Base du diagnostic">
                  <select {...register('base_diagnostic')} style={selectSt}>
                    <option value="9">Inconnu</option>
                    <option value="0">Clinique seul</option>
                    <option value="1">Clinique + examens paracliniques</option>
                    <option value="2">Chirurgie / autopsie sans histologie</option>
                    <option value="4">Marqueurs biochimiques</option>
                    <option value="5">Cytologie</option>
                    <option value="6">Histologie de métastase</option>
                    <option value="7">Histologie de tumeur primitive</option>
                  </select>
                </Field>
              </Row2>
            </Section>

            {/* ── Tumeur solide ── */}
            {categorieCancer === 'solide' && (
              <Section title="Topographie ICD-O-3">
                <ICDSearch
                  label="Localisation anatomique *"
                  onSelect={setTopoSelected}
                  selectedCode={topoSelected?.code}
                  selectedLabel={topoSelected?.libelle}
                  searchFn={diagnosticService.searchTopographies}
                  placeholder="Rechercher par code ou libellé (ex: C50, sein...)"
                  accentColor="#2563eb"
                />
                <Row2>
                  <Field label="Latéralité">
                    <select {...register('lateralite')} style={selectSt}>
                      <option value="0">Non applicable</option>
                      <option value="1">Droit</option>
                      <option value="2">Gauche</option>
                      <option value="3">Bilatéral</option>
                      <option value="9">Inconnu</option>
                    </select>
                  </Field>
                  <Field label="Code CIM-10 (optionnel)">
                    <input {...register('cim10_code')} placeholder="ex: C50.1" style={inputSt} />
                  </Field>
                </Row2>
              </Section>
            )}

            {categorieCancer === 'solide' && (
              <Section title="Morphologie ICD-O-3">
                <ICDSearch
                  label="Type histologique"
                  onSelect={setMorphSelected}
                  selectedCode={morphSelected?.code}
                  selectedLabel={morphSelected?.libelle}
                  searchFn={diagnosticService.searchMorphologies}
                  placeholder="Rechercher par code ou type histologique (ex: 8500, carcinome...)"
                  accentColor="#2563eb"
                />
                <Row2>
                  <Field label="Grade histologique">
                    <select {...register('grade_histologique')} style={selectSt}>
                      <option value="U">Inconnu / non applicable</option>
                      <option value="I">Grade I – bien différencié</option>
                      <option value="II">Grade II – moyennement différencié</option>
                      <option value="III">Grade III – peu différencié</option>
                      <option value="IV">Grade IV – indifférencié</option>
                    </select>
                  </Field>
                  <Field label="N° bloc anatomopathologique">
                    <input {...register('numero_bloc_anapath')} placeholder="ex: A2025-0123" style={inputSt} />
                  </Field>
                </Row2>
              </Section>
            )}

            {categorieCancer === 'solide' && (
              <Section title="Classification TNM & Stade">
                <TNMSelector register={register} watch={watch} />
                <div style={{ marginTop: 14 }}>
                  <Field label="Stade AJCC / UICC">
                    <select {...register('stade_ajcc')} style={selectSt}>
                      <option value="U">Inconnu</option>
                      <option value="0">Stade 0 – In situ</option>
                      {[['I','I'],['IA','IA'],['IB','IB'],['II','II'],['IIA','IIA'],['IIB','IIB'],['IIC','IIC'],
                        ['III','III'],['IIIA','IIIA'],['IIIB','IIIB'],['IIIC','IIIC'],['IV','IV']].map(([v,l]) => (
                        <option key={v} value={v}>Stade {l}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Section>
            )}

            {categorieCancer === 'solide' && (
              <Section title="Marqueurs biologiques (optionnel)">
                <Row3>
                  <Field label="Récepteur ER">
                    <select {...register('recepteur_re')} style={selectSt}>
                      <option value="">—</option>
                      <option value="positif">Positif</option>
                      <option value="negatif">Négatif</option>
                      <option value="inconnu">Inconnu</option>
                    </select>
                  </Field>
                  <Field label="Récepteur PR">
                    <select {...register('recepteur_rp')} style={selectSt}>
                      <option value="">—</option>
                      <option value="positif">Positif</option>
                      <option value="negatif">Négatif</option>
                      <option value="inconnu">Inconnu</option>
                    </select>
                  </Field>
                  <Field label="HER2">
                    <select {...register('her2')} style={selectSt}>
                      <option value="">—</option>
                      <option value="positif">Positif (3+)</option>
                      <option value="equivoque">Équivoque (2+)</option>
                      <option value="negatif">Négatif (0/1+)</option>
                      <option value="inconnu">Inconnu</option>
                    </select>
                  </Field>
                </Row3>
                <Row2>
                  <Field label="Ki67 (%)"><input {...register('ki67')} placeholder="ex: 25%" style={inputSt} /></Field>
                  <Field label="PSA (ng/mL)"><input {...register('psa')} placeholder="ex: 8.5" style={inputSt} /></Field>
                </Row2>
                <Row2>
                  <Field label="Taille tumorale (mm)"><input type="number" {...register('taille_tumeur')} placeholder="mm" style={inputSt} /></Field>
                  <Field label="Nb ganglions envahis"><input type="number" {...register('nombre_ganglions')} placeholder="ex: 3" style={inputSt} /></Field>
                </Row2>
                <Field label="Sites métastatiques">
                  <input {...register('metastases_sites')} placeholder="ex: Foie, Poumon, Os" style={inputSt} />
                </Field>
              </Section>
            )}

            {/* ── Cancer liquide / Hémopathie maligne ── */}
            {categorieCancer === 'liquide' && (
              <Section title="Diagnostic hématologique">
                {/* Liste déroulante (demande Dr. Bendahmane) */}
                <Field label="Hémopathie maligne *" error={errors.hemopathie_maligne?.message}>
                  <select
                    {...register('hemopathie_maligne', { required: 'Veuillez sélectionner une hémopathie maligne' })}
                    style={selectSt}
                  >
                    <option value="">— Sélectionner un diagnostic —</option>
                    {HEMATOLOGY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>

                {/* Champs libres obligatoires par examen (demande Dr. Bendahmane) */}
                {hemopathieValue && (
                  <ExamensHematologiques
                    hemopathie={hemopathieValue}
                    register={register}
                    errors={errors}
                    watch={watch}
                  />
                )}
              </Section>
            )}

            {/* Établissement */}
            <Section title="Établissement & Médecin">
              <Row2>
                <Field label="Établissement diagnostiqueur">
                  <input {...register('etablissement_diagnostic')} placeholder="CHU Tlemcen" style={inputSt} />
                </Field>
                <Field label="Médecin diagnostiqueur">
                  <input {...register('medecin_diagnostiqueur')} placeholder="Dr. Bendahmane" style={inputSt} />
                </Field>
              </Row2>
              <Field label="Observations">
                <textarea {...register('observations')} rows={3}
                  placeholder="Notes cliniques supplémentaires..."
                  style={{ ...inputSt, resize: 'vertical', lineHeight: 1.6 }} />
              </Field>
            </Section>

            {/* Champs personnalisés */}
            <CustomFieldsSection
              module="diagnostic"
              champs={champsCustom}
              valeurs={valeursCustom}
              onChange={setValeur}
              loading={loadingCustom}
              topographieCode={categorieCancer === 'solide' ? topoSelected?.code : ''}
            />

            {/* Boutons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 20, borderTop: '1px solid rgba(37,99,235,0.12)' }}>
              <button type="button" onClick={() => navigate('/diagnostics')}
                style={{ flex: '0 0 110px', padding: '12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px', color: '#334155', fontSize: 13, cursor: 'pointer' }}>
                ← Annuler
              </button>
              <button type="submit" disabled={submitting}
                style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-display)', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? <><Spinner /> Enregistrement...</> : '✓ Enregistrer le diagnostic'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid rgba(37,99,235,0.12)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function Row2({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>{children}</div>; }
function Row3({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>{children}</div>; }
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelSt}>{label}</label>
      {children}
      {error && <p style={{ marginTop: 3, fontSize: 11, color: '#dc2626' }}>⚠ {error}</p>}
    </div>
  );
}
function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

const labelSt  = { display: 'block', fontSize: 11.5, fontWeight: 500, color: '#334155', marginBottom: 6, letterSpacing: 0.3 };
const inputSt  = { width: '100%', padding: '10px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', color: '#0f172a', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' };
const selectSt = { ...inputSt, cursor: 'pointer' };
