import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { diagnosticService } from '../../services/diagnosticService';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import useCustomFields from '../../hooks/useCustomFields';
import CustomFieldsSection from '../../components/custom_fields/CustomFieldsSection';

// ── ICD Autocomplete ──────────────────────────────────────────────
function ICDSearch({ label, onSelect, selectedCode, selectedLabel, searchFn, placeholder, accentColor = '#00a8ff' }) {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: `${accentColor}15`, border: `1px solid ${accentColor}30`, borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: accentColor }}>{selectedCode}</span>
          <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{selectedLabel}</span>
          <button type="button" onClick={() => onSelect(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>×</button>
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
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            {loading
              ? <div style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: accentColor, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            }
          </div>
          {open && results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', marginTop: 4, maxHeight: 240, overflow: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              {results.map(r => (
                <button key={r.id} type="button"
                  onClick={() => { onSelect(r); setQuery(''); setOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: accentColor, minWidth: 60 }}>{r.code}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{r.libelle}</span>
                  {r.categorie && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{r.categorie}</span>}
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
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          TNM 8e édition
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#00a8ff', padding: '3px 10px', background: 'rgba(0,168,255,0.1)', borderRadius: 6, border: '1px solid rgba(0,168,255,0.2)' }}>
          {fullTNM}
        </span>
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

// ── Main Form ─────────────────────────────────────────────────────
export default function NewDiagnosticPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [topoSelected,  setTopoSelected]  = useState(null);
  const [morphSelected, setMorphSelected] = useState(null);
  const [patients,      setPatients]      = useState([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      tnm_type: 'c', stade_ajcc: 'U', base_diagnostic: '9',
      lateralite: '0', grade_histologique: 'U',
      patient: searchParams.get('patient') || '',
    }
  });

  // ── Champs personnalisés ────────────────────────────────────────
  const {
    champs:    champsCustom,
    valeurs:   valeursCustom,
    setValeur,
    sauvegarder: sauvegarderCustom,
    loading:   loadingCustom,
  } = useCustomFields({ module: 'diagnostic', objectId: null });

  useEffect(() => {
    patientService.list({ page_size: 100 }).then(({ data }) => {
      setPatients(data.results || data);
    }).catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    if (!topoSelected && !data.topographie_code) {
      toast.error('Veuillez sélectionner une topographie ICD-O-3');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...data };
      if (topoSelected)  payload.topographie = topoSelected.id;
      if (morphSelected) payload.morphologie  = morphSelected.id;
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

      const { data: diag } = await diagnosticService.create(payload);
      
      // Sauvegarder les champs personnalisés après création
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
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '28px 32px' }}>
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* Patient & date */}
            <Section title="Patient & Date de diagnostic">
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

            {/* Topographie ICD-O-3 */}
            <Section title="Topographie ICD-O-3">
              <ICDSearch
                label="Localisation anatomique *"
                onSelect={setTopoSelected}
                selectedCode={topoSelected?.code}
                selectedLabel={topoSelected?.libelle}
                searchFn={diagnosticService.searchTopographies}
                placeholder="Rechercher par code ou libellé (ex: C50, sein...)"
                accentColor="#00a8ff"
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

            {/* Morphologie ICD-O-3 */}
            <Section title="Morphologie ICD-O-3">
              <ICDSearch
                label="Type histologique"
                onSelect={setMorphSelected}
                selectedCode={morphSelected?.code}
                selectedLabel={morphSelected?.libelle}
                searchFn={diagnosticService.searchMorphologies}
                placeholder="Rechercher par code ou type histologique (ex: 8500, carcinome...)"
                accentColor="#9b8afb"
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

            {/* Classification TNM */}
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

            {/* Marqueurs biologiques */}
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

            {/* Établissement */}
            <Section title="Établissement & Médecin">
              <Row2>
                <Field label="Établissement diagnostiqueur">
                  <input {...register('etablissement_diagnostic')} placeholder="CHU Oran" style={inputSt} />
                </Field>
                <Field label="Médecin diagnostiqueur">
                  <input {...register('medecin_diagnostiqueur')} placeholder="Dr. Benali" style={inputSt} />
                </Field>
              </Row2>
              <Field label="Observations">
                <textarea {...register('observations')} rows={3} placeholder="Notes cliniques supplémentaires..."
                  style={{ ...inputSt, resize: 'vertical', lineHeight: 1.6 }} />
              </Field>
            </Section>

            {/* ✅ CHAMPS PERSONNALISÉS */}
            <CustomFieldsSection
              module="diagnostic"
              champs={champsCustom}
              valeurs={valeursCustom}
              onChange={setValeur}
              loading={loadingCustom}
            />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button type="button" onClick={() => navigate('/diagnostics')} style={{ flex: '0 0 110px', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                ← Annuler
              </button>
              <button type="submit" disabled={submitting} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #9b8afb, #7c6fcd)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-display)', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? <><Spinner /> Enregistrement...</> : ' Enregistrer le diagnostic'}
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
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
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
      {error && <p style={{ marginTop: 3, fontSize: 11, color: 'var(--danger)' }}>⚠ {error}</p>}
    </div>
  );
}
function Spinner() { return <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }

const labelSt = { display: 'block', fontSize: 11.5, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: 0.3 };
const inputSt  = { width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' };
const selectSt = { ...inputSt, cursor: 'pointer' };