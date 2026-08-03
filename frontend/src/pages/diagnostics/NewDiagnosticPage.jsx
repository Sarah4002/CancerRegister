import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { diagnosticService } from '../../services/diagnosticService';
import { patientService } from '../../services/patientService';
import { validationRulesService } from '../../services/validationRulesService';
import { AppLayout } from '../../components/layout/Sidebar';
import useCustomFields from '../../hooks/useCustomFields';
import CustomFieldsSection from '../../components/custom_fields/CustomFieldsSection';
import VoiceDictation from '../../components/voice/VoiceDictation';
import { CANCER_VALIDATION_RULES, runValidation, hasBlockingErrors } from './cancerValidationRules';

// ─────────────────────────────────────────────────────────────────────────────
//  HÉMOPATHIES
// ─────────────────────────────────────────────────────────────────────────────
const HEMATOLOGY_OPTIONS = [
  { value:'lymphome_non_hodgkinien', label:'Lymphome non Hodgkinien',
    examens:[{key:'siege_biopsie',label:'Siège Biopsie'},{key:'anapath',label:'Anapath'},{key:'immunohistochimie',label:'Immunohistochimie'}] },
  { value:'lymphome_hodgkin',        label:'Lymphome de Hodgkin',
    examens:[{key:'siege_biopsie',label:'Siège Biopsie'},{key:'anapath',label:'Anapath'},{key:'immunohistochimie',label:'Immunohistochimie'}] },
  { value:'myelome',                 label:'Myélome ou Maladie de Kahler',
    examens:[{key:'biopsie_osteomedulaire',label:'Biopsie ostéomédullaire'},{key:'myelogramme',label:'Myélogramme'},{key:'caryotype_fish_medullaire',label:'Caryotype / FISH médullaire'},{key:'electrophorese_proteines',label:'Électrophorèse des protéines'},{key:'immunofixation_sanguine',label:'Immunofixation sanguine'},{key:'free_light_chain',label:'Free Light Chain'},{key:'calcemie',label:'Calcémie'},{key:'hemoglobine',label:'Hémoglobine'},{key:'clairance_renale',label:'Clairance rénale'},{key:'radiologie_standard',label:'Radiologie standard'},{key:'irm',label:'IRM'},{key:'tdm_low_dose',label:'TDM low dose'}] },
  { value:'llc', label:'Leucémie Lymphoïde Chronique',
    examens:[{key:'taux_lymphocytes',label:'Taux de lymphocytes'},{key:'frottis_sang',label:'Frottis de sang'},{key:'cytometrie_flux',label:'Cytométrie en flux'}] },
  { value:'lmc', label:'Leucémie Myéloïde Chronique',
    examens:[{key:'taux_globules_blancs',label:'Taux de globules blancs'},{key:'frottis_sang',label:'Frottis de sang'},{key:'cytogenetique_medullaire',label:'Cytogénétique médullaire'},{key:'fish_medullaire',label:'FISH médullaire'},{key:'biologie_moleculaire',label:'Biologie moléculaire'}] },
  { value:'lam', label:'Leucémie Aiguë Myéloïde',
    examens:[{key:'nfs',label:'NFS'},{key:'frottis_sang',label:'Frottis de sang'},{key:'myelogramme',label:'Myélogramme'},{key:'cytochimie_medullaire',label:'Cytochimie médullaire'},{key:'cytometrie_flux',label:'Cytométrie en flux'},{key:'caryotype_medullaire',label:'Caryotype médullaire'},{key:'fish_medullaire',label:'FISH médullaire'},{key:'biologie_moleculaire',label:'Biologie moléculaire'}] },
  { value:'lal', label:'Leucémie Aiguë Lymphoïde',
    examens:[{key:'nfs',label:'NFS'},{key:'frottis_sang',label:'Frottis de sang'},{key:'myelogramme',label:'Myélogramme'},{key:'cytochimie_medullaire',label:'Cytochimie médullaire'},{key:'cytometrie_flux',label:'Cytométrie en flux'},{key:'caryotype_medullaire',label:'Caryotype médullaire'},{key:'fish_medullaire',label:'FISH médullaire'},{key:'biologie_moleculaire',label:'Biologie moléculaire'}] },
  { value:'polyglobulie_vaquez',       label:'Polyglobulie de Vaquez',
    examens:[{key:'nfs',label:'NFS'},{key:'biopsie_osteomedulaire',label:'Biopsie ostéomédullaire'},{key:'biologie_moleculaire',label:'Biologie moléculaire'},{key:'dosage_epo',label:"Dosage d'EPO"}] },
  { value:'thrombocytemie_essentielle',label:'Thrombocytémie essentielle',
    examens:[{key:'nfs',label:'NFS'},{key:'biopsie_osteomedulaire',label:'Biopsie ostéomédullaire'},{key:'biologie_moleculaire',label:'Biologie moléculaire'}] },
  { value:'myelofibrose_primitive',    label:'Myélofibrose primitive',
    examens:[{key:'nfs',label:'NFS'},{key:'biopsie_osteomedulaire',label:'Biopsie ostéomédullaire'},{key:'biologie_moleculaire',label:'Biologie moléculaire'}] },
  { value:'smp_inclassable',           label:'Syndrome myéloprolifératif inclassable',
    examens:[{key:'nfs',label:'NFS'},{key:'biopsie_osteomedulaire',label:'Biopsie ostéomédullaire'},{key:'biologie_moleculaire',label:'Biologie moléculaire'}] },
  { value:'smd',                       label:'Syndromes myélodysplasiques',
    examens:[{key:'nfs',label:'NFS'},{key:'myelogramme',label:'Myélogramme'},{key:'coloration_perls',label:'Coloration de Perls'},{key:'caryotype_medullaire',label:'Caryotype médullaire'}] },
  { value:'waldenstrom',               label:'Maladie de Waldenström',
    examens:[{key:'nfs',label:'NFS'},{key:'myelogramme',label:'Myélogramme'},{key:'biopsie_osteomedulaire',label:'Biopsie ostéomédullaire'},{key:'electrophorese_proteines',label:'Électrophorèse des protéines'},{key:'immunofixation_sanguine',label:'Immunofixation sanguine'}] },
  { value:'tricholeucocytes',          label:'Leucémie à Tricholeucocytes',
    examens:[{key:'nfs',label:'NFS'},{key:'frottis_sang',label:'Frottis de sang'},{key:'cytometrie_flux',label:'Cytométrie en flux'},{key:'biopsie_osteomedulaire',label:'Biopsie ostéomédullaire'},{key:'biologie_moleculaire',label:'Biologie moléculaire'}] },
];

// ─────────────────────────────────────────────────────────────────────────────
//  VALIDATION ALERT BANNER
// ─────────────────────────────────────────────────────────────────────────────
const SEV_STYLES = {
  error:   { bg:'#fef2f2', border:'#fca5a5', icon:'🚫', title:'#dc2626', text:'#7f1d1d', badge:'rgba(220,38,38,0.12)', badgeText:'#dc2626' },
  warning: { bg:'#fffbeb', border:'#fcd34d', icon:'⚠️', title:'#d97706', text:'#78350f', badge:'rgba(217,119,6,0.12)',  badgeText:'#d97706' },
  info:    { bg:'#eff6ff', border:'#93c5fd', icon:'ℹ️', title:'#2563eb', text:'#1e3a8a', badge:'rgba(37,99,235,0.12)',  badgeText:'#2563eb' },
};

function ValidationBanner({ violations, onDismiss }) {
  const [dismissed, setDismissed] = useState([]);
  if (!violations?.length) return null;

  const visible = violations.filter(v => !dismissed.includes(v.id));
  if (!visible.length) return null;

  const errors   = visible.filter(v => v.severity === 'error');
  const warnings = visible.filter(v => v.severity === 'warning');
  const infos    = visible.filter(v => v.severity === 'info');

  const dismiss = (id) => {
    setDismissed(d => [...d, id]);
    onDismiss?.(id);
  };

  const groups = [
    { items: errors,   ...SEV_STYLES.error   },
    { items: warnings, ...SEV_STYLES.warning  },
    { items: infos,    ...SEV_STYLES.info     },
  ].filter(g => g.items.length > 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20, animation:'fadeUp .25s ease' }}>
      {groups.map((group, gi) => (
        <div key={gi} style={{
          background: group.bg, border: `1px solid ${group.border}`,
          borderRadius:12, overflow:'hidden',
        }}>
          <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:8,
            borderBottom: group.items.length > 1 ? `1px solid ${group.border}` : 'none' }}>
            <span style={{ fontSize:16, lineHeight:1 }}>{group.icon}</span>
            <span style={{ fontSize:12.5, fontWeight:700, color:group.title, flex:1 }}>
              {group.items.length === 1 ? group.items[0].label : `${group.items.length} alerte${group.items.length>1?'s':''}`}
            </span>
            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:99,
              background:group.badge, color:group.badgeText, fontWeight:700, textTransform:'uppercase' }}>
              {group.items[0].severity}
            </span>
          </div>
          {group.items.map((v, i) => (
            <div key={v.id} style={{
              padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:10,
              borderTop: i > 0 ? `1px solid ${group.border}` : 'none',
              background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
            }}>
              <div style={{ flex:1 }}>
                {group.items.length > 1 && (
                  <div style={{ fontSize:11.5, fontWeight:700, color:group.title, marginBottom:3 }}>
                    {v.label}
                  </div>
                )}
                <div style={{ fontSize:12.5, color:group.text, lineHeight:1.6 }}>{v.message}</div>
              </div>
              {v.severity !== 'error' && (
                <button onClick={() => dismiss(v.id)} style={{
                  background:'none', border:'none', cursor:'pointer',
                  color: group.title, fontSize:16, lineHeight:1, padding:'0 4px', flexShrink:0, opacity:.6,
                }} title="Ignorer cette alerte">×</button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  VALIDATION OVERRIDE MODAL (forcer enregistrement malgré erreur)
// ─────────────────────────────────────────────────────────────────────────────
function OverrideModal({ violations, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const errors = violations.filter(v => v.severity === 'error');

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(4px)',
      zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:520,
        boxShadow:'0 24px 64px rgba(15,23,42,0.22)', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid #fee2e2',
          background:'#fef2f2', display:'flex', gap:12, alignItems:'flex-start' }}>
          <span style={{ fontSize:24, lineHeight:1 }}>🚫</span>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'#dc2626', marginBottom:4 }}>
              Validation bloquante — Forcer l'enregistrement ?
            </div>
            <div style={{ fontSize:12, color:'#7f1d1d' }}>
              {errors.length} erreur{errors.length>1?'s':''} critique{errors.length>1?'s':''} détectée{errors.length>1?'s':''}. Un motif de dérogation est obligatoire.
            </div>
          </div>
        </div>

        <div style={{ padding:'16px 24px' }}>
          <div style={{ marginBottom:14, display:'flex', flexDirection:'column', gap:8 }}>
            {errors.map(v => (
              <div key={v.id} style={{ padding:'8px 12px', background:'#fef2f2',
                border:'1px solid #fca5a5', borderRadius:8, fontSize:12.5, color:'#7f1d1d',
                display:'flex', alignItems:'flex-start', gap:8 }}>
                <span style={{ flexShrink:0, color:'#dc2626', fontWeight:700 }}>!</span>
                {v.message}
              </div>
            ))}
          </div>

          <label style={{ display:'block', fontSize:11.5, fontWeight:600, color:'#334155', marginBottom:6 }}>
            Motif de dérogation <span style={{ color:'#dc2626' }}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex: Cancer du sein masculin confirmé par histologie (lame N° xxx). Accord du Dr. ..."
            rows={3}
            style={{ width:'100%', padding:'10px 12px', background:'#f8fafc',
              border:`1px solid ${reason.trim().length >= 10 ? '#22c55e' : '#e2e8f0'}`,
              borderRadius:10, fontSize:12.5, resize:'vertical', lineHeight:1.6,
              outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
          />
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
            {reason.trim().length}/10 caractères minimum
          </div>
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9',
          display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{ padding:'9px 18px', borderRadius:9,
            border:'1px solid #e2e8f0', background:'transparent', color:'#64748b',
            fontSize:13, cursor:'pointer' }}>
            Annuler — corriger le diagnostic
          </button>
          <button
            onClick={() => reason.trim().length >= 10 && onConfirm(reason)}
            disabled={reason.trim().length < 10}
            style={{ padding:'9px 18px', borderRadius:9, border:'none',
              background: reason.trim().length >= 10 ? '#dc2626' : '#fca5a5',
              color:'#fff', fontSize:13, fontWeight:600,
              cursor: reason.trim().length >= 10 ? 'pointer' : 'not-allowed' }}>
            Forcer l'enregistrement
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ICD AUTOCOMPLETE
// ─────────────────────────────────────────────────────────────────────────────
function ICDSearch({ label, onSelect, selectedCode, selectedLabel, searchFn, placeholder, accentColor='#2563eb' }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { const { data } = await searchFn(query); setResults(data || []); setOpen(true); }
      catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchFn]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div style={{ marginBottom:18 }} ref={ref}>
      <label style={labelSt}>{label}</label>
      {selectedCode ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
          background:`${accentColor}15`, border:`1px solid ${accentColor}30`, borderRadius:12 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, color:accentColor }}>{selectedCode}</span>
          <span style={{ fontSize:13, color:'#0f172a', flex:1 }}>{selectedLabel}</span>
          <button type="button" onClick={() => onSelect(null)}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:16, lineHeight:1 }}>×</button>
        </div>
      ) : (
        <div style={{ position:'relative' }}>
          <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
            placeholder={placeholder} style={{ ...inputSt, paddingLeft:36 }}
            onFocus={() => query.length >= 2 && setOpen(true)} />
          <div style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#64748b' }}>
            {loading
              ? <div style={{ width:14, height:14, border:'2px solid rgba(37,99,235,0.12)', borderTopColor:accentColor, borderRadius:'50%', animation:'spin .7s linear infinite' }} />
              : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            }
          </div>
          {open && results.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200,
              background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.08)', borderRadius:12,
              marginTop:4, maxHeight:240, overflow:'auto', boxShadow:'0 8px 24px rgba(0,0,0,.4)' }}>
              {results.map(r => (
                <button key={r.id} type="button"
                  onClick={() => { onSelect(r); setQuery(''); setOpen(false); }}
                  style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 12px',
                    background:'none', border:'none', cursor:'pointer', textAlign:'left',
                    borderBottom:'1px solid rgba(37,99,235,0.12)' }}
                  onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
                  onMouseLeave={e => e.currentTarget.style.background='none'}
                >
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, color:accentColor, minWidth:60 }}>{r.code}</span>
                  <span style={{ fontSize:12.5, color:'#0f172a' }}>{r.libelle}</span>
                  {r.categorie && <span style={{ fontSize:10, color:'#64748b', marginLeft:'auto' }}>{r.categorie}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TNM SELECTOR
// ─────────────────────────────────────────────────────────────────────────────
function TNMSelector({ register, watch }) {
  const t = watch('tnm_t') || '';
  const n = watch('tnm_n') || '';
  const m = watch('tnm_m') || '';
  const type = watch('tnm_type') || 'c';
  const fullTNM = [t,n,m].filter(Boolean).length ? `${type}${[t,n,m].filter(Boolean).join('')}` : '—';

  return (
    <div style={{ background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:12, padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:12, fontWeight:600, color:'#334155', textTransform:'uppercase', letterSpacing:.5 }}>TNM 8e édition</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:14, fontWeight:700, color:'#2563eb',
          padding:'3px 10px', background:'rgba(37,99,235,0.08)', borderRadius:6, border:'1px solid rgba(37,99,235,0.16)' }}>{fullTNM}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:10 }}>
        <div>
          <label style={{ ...labelSt, fontSize:10 }}>Type</label>
          <select {...register('tnm_type')} style={selectSt}><option value="c">cTNM</option><option value="p">pTNM</option><option value="y">yTNM</option></select>
        </div>
        <div>
          <label style={{ ...labelSt, fontSize:10 }}>T – Tumeur</label>
          <select {...register('tnm_t')} style={selectSt}>
            <option value="">—</option>
            {['TX','T0','Tis','T1','T1a','T1b','T1c','T2','T2a','T2b','T3','T3a','T4','T4a','T4b','T4c','T4d'].map(v=><option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelSt, fontSize:10 }}>N – Ganglions</label>
          <select {...register('tnm_n')} style={selectSt}>
            <option value="">—</option>
            {['NX','N0','N1','N1a','N1b','N1c','N2','N2a','N2b','N2c','N3','N3a','N3b','N3c'].map(v=><option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...labelSt, fontSize:10 }}>M – Métastases</label>
          <select {...register('tnm_m')} style={selectSt}>
            <option value="">—</option>
            {['MX','M0','M1','M1a','M1b','M1c'].map(v=><option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXAMENS HÉMATOLOGIQUES
// ─────────────────────────────────────────────────────────────────────────────
function ExamensHematologiques({ hemopathie, register, errors, watch }) {
  const option = HEMATOLOGY_OPTIONS.find(o => o.value === hemopathie);
  if (!option) return null;
  return (
    <div style={{ marginTop:16 }}>
      <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:12,
        background:'rgba(37,99,235,0.06)', border:'1px solid rgba(37,99,235,0.16)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#2563eb', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
          Examens requis — {option.label}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {option.examens.map(ex => (
            <span key={ex.key} style={{ padding:'4px 10px', borderRadius:999,
              background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', fontSize:11.5, color:'#334155' }}>
              {ex.label}
            </span>
          ))}
        </div>
      </div>
      {option.examens.map(ex => {
        const fieldName = `examen_${ex.key}`;
        const hasError  = errors[fieldName];
        const val       = watch(fieldName) || '';
        return (
          <div key={ex.key} style={{ marginBottom:14 }}>
            <label style={labelSt}>{ex.label} <span style={{ color:'#dc2626' }}>*</span></label>
            <textarea
              {...register(fieldName, {
                required: `Le champ "${ex.label}" est obligatoire`,
                validate: v => v.trim().length >= 2 || `Veuillez renseigner le résultat de "${ex.label}"`,
              })}
              rows={2} placeholder={`Résultat / description : ${ex.label}...`}
              style={{ ...inputSt, resize:'vertical', lineHeight:1.6,
                borderColor: hasError ? '#dc2626' : val.trim() ? '#22c55e' : undefined }}
            />
            {hasError && <p style={{ marginTop:3, fontSize:11, color:'#dc2626' }}>⚠ {hasError.message}</p>}
          </div>
        );
      })}
      <div style={{ marginBottom:14 }}>
        <label style={labelSt}>Remarques complémentaires <span style={{ color:'#64748b', fontWeight:400 }}>(optionnel)</span></label>
        <textarea {...register('examens_complementaires')} rows={3}
          placeholder="Autres précisions, résultats annexes, contexte clinique..."
          style={{ ...inputSt, resize:'vertical', lineHeight:1.6 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MINI VALIDATION STATUS (dans le formulaire, en temps réel)
// ─────────────────────────────────────────────────────────────────────────────
function ValidationStatusBar({ violations }) {
  if (!violations?.length) return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
      background:'rgba(22,163,74,0.06)', border:'1px solid rgba(22,163,74,0.2)',
      borderRadius:9, marginBottom:16 }}>
      <span style={{ color:'#16a34a', fontSize:13 }}>✓</span>
      <span style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>Aucune alerte de validation</span>
    </div>
  );
  const errCount  = violations.filter(v=>v.severity==='error').length;
  const warnCount = violations.filter(v=>v.severity==='warning').length;
  const infoCount = violations.filter(v=>v.severity==='info').length;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
      background: errCount ? '#fef2f2' : warnCount ? '#fffbeb' : '#eff6ff',
      border: `1px solid ${errCount ? '#fca5a5' : warnCount ? '#fcd34d' : '#93c5fd'}`,
      borderRadius:9, marginBottom:16, flexWrap:'wrap' }}>
      <span style={{ fontSize:13 }}>{errCount ? '🚫' : warnCount ? '⚠️' : 'ℹ️'}</span>
      <span style={{ fontSize:12, fontWeight:700, color: errCount ? '#dc2626' : warnCount ? '#d97706' : '#2563eb' }}>
        {errCount ? `${errCount} erreur${errCount>1?'s':''} bloquante${errCount>1?'s':''}` : 'Alertes de validation'}
      </span>
      <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
        {errCount>0  && <span style={{ fontSize:10.5, padding:'2px 7px', borderRadius:99, background:'rgba(220,38,38,0.12)', color:'#dc2626', fontWeight:700 }}>{errCount} erreur{errCount>1?'s':''}</span>}
        {warnCount>0 && <span style={{ fontSize:10.5, padding:'2px 7px', borderRadius:99, background:'rgba(217,119,6,0.12)',  color:'#d97706', fontWeight:700 }}>{warnCount} alerte{warnCount>1?'s':''}</span>}
        {infoCount>0 && <span style={{ fontSize:10.5, padding:'2px 7px', borderRadius:99, background:'rgba(37,99,235,0.12)',  color:'#2563eb', fontWeight:700 }}>{infoCount} info{infoCount>1?'s':''}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN FORM
// ─────────────────────────────────────────────────────────────────────────────
export default function NewDiagnosticPage() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const [searchParams] = useSearchParams();
  const initialPatient = searchParams.get('patient') || location.state?.patientContext?.id || '';

  const [submitting,    setSubmitting]    = useState(false);
  const [topoSelected,  setTopoSelected]  = useState(null);
  const [morphSelected, setMorphSelected] = useState(null);
  const [patients,      setPatients]      = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Validation state
  const [validationRules, setValidationRules] = useState([]);
  const [violations,        setViolations]    = useState([]);
  const [showOverride,      setShowOverride]  = useState(false);
  const [pendingPayload,    setPendingPayload]= useState(null);

  const { register, handleSubmit, watch, setValue, formState:{ errors } } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      categorie_cancer:'solide', tnm_type:'c', stade_ajcc:'U',
      base_diagnostic:'9', lateralite:'0', grade_histologique:'U',
      patient: initialPatient,
    },
  });

  const categorieCancer = watch('categorie_cancer');
  const hemopathieValue = watch('hemopathie_maligne');
  const patientId       = watch('patient');
  const dateDiag        = watch('date_diagnostic');
  const stadeAjcc       = watch('stade_ajcc');
  const tnmM            = watch('tnm_m');
  const lateralite      = watch('lateralite');
  const her2            = watch('her2');
  const recepteurRe     = watch('recepteur_re');
  const psa             = watch('psa');

  const { champs:champsCustom, valeurs:valeursCustom, setValeur,
          sauvegarder:sauvegarderCustom, loading:loadingCustom } =
    useCustomFields({ module:'diagnostic', objectId:null });

  // Load patients and active validation rules
  useEffect(() => {
    patientService.list({ page_size:200 }).then(({ data }) => {
      const list = data.results || data;
      setPatients(list);
      const pid = initialPatient;
      if (pid) setSelectedPatient(list.find(p => String(p.id) === String(pid)) || null);
    }).catch(()=>{});

    validationRulesService.list({ active: true, page_size: 200 })
      .then(({ data }) => setValidationRules(data.results || data))
      .catch(() => setValidationRules([]));
  }, [searchParams]);

  // Update selectedPatient when selector changes
  useEffect(() => {
    if (!patientId) { setSelectedPatient(null); return; }

    const existing = patients.find(p => String(p.id) === String(patientId)) || null;
    if (!existing) {
      setSelectedPatient(null);
      return;
    }

    if (existing.date_naissance) {
      setSelectedPatient(existing);
      return;
    }

    // Load full patient details when available, for rules depending on date_naissance
    patientService.get(existing.id)
      .then(({ data }) => setSelectedPatient(data))
      .catch(() => setSelectedPatient(existing));
  }, [patientId, patients]);

  // Run validation in real-time whenever key fields change
  const buildDiagSnapshot = useCallback(() => ({
    topographie_code:   topoSelected?.code || '',
    topographie_libelle:topoSelected?.libelle || '',
    hemopathie_maligne: hemopathieValue || '',
    categorie_cancer:   categorieCancer,
    stade_ajcc:         stadeAjcc,
    tnm_m:              tnmM,
    lateralite:         lateralite,
    her2:               her2,
    recepteur_re:       recepteurRe,
    psa:                psa,
    date_diagnostic:    dateDiag,
    date_premier_symptome: watch('date_premier_symptome'),
  }), [topoSelected, hemopathieValue, categorieCancer, stadeAjcc, tnmM, lateralite,
       her2, recepteurRe, psa, dateDiag, watch]);

  useEffect(() => {
    const diag    = buildDiagSnapshot();
    const patient = selectedPatient;
    const v       = runValidation(diag, patient, validationRules);
    setViolations(v);
  }, [buildDiagSnapshot, selectedPatient, validationRules]);

  // Reset hemato when switching category
  useEffect(() => {
    if (categorieCancer === 'liquide') {
      setTopoSelected(null); setMorphSelected(null);
      setValue('lateralite','0'); setValue('stade_ajcc','U');
      setValue('tnm_t',''); setValue('tnm_n',''); setValue('tnm_m','');
    }
  }, [categorieCancer, setValue]);

  useEffect(() => {
    if (hemopathieValue)
      HEMATOLOGY_OPTIONS.forEach(opt => opt.examens.forEach(ex => setValue(`examen_${ex.key}`,'')));
  }, [hemopathieValue, setValue]);

  // ── Build payload ──
  const buildPayload = (data) => {
    const payload = { ...data };
    if (categorieCancer === 'solide') {
      if (topoSelected)  payload.topographie = topoSelected.id;
      if (morphSelected) payload.morphologie  = morphSelected.id;
    }
    if (categorieCancer === 'liquide') {
      const hemOpt = HEMATOLOGY_OPTIONS.find(o => o.value === payload.hemopathie_maligne);
      if (hemOpt) {
        const examens = {};
        hemOpt.examens.forEach(ex => { examens[ex.key] = payload[`examen_${ex.key}`]||''; delete payload[`examen_${ex.key}`]; });
        payload.examens_hemato = examens;
      }
    }
    Object.keys(payload).forEach(k => { if (payload[k]==='') delete payload[k]; });
    return payload;
  };

  // ── Submit ──
  const onSubmit = async (data) => {
    if (categorieCancer === 'solide' && !topoSelected && !data.topographie_code) {
      toast.error('Veuillez sélectionner une topographie ICD-O-3'); return;
    }
    if (categorieCancer === 'liquide' && !data.hemopathie_maligne) {
      toast.error('Veuillez sélectionner une hémopathie maligne'); return;
    }

    const payload = buildPayload(data);
    const viols   = runValidation(buildDiagSnapshot(), selectedPatient);

    if (hasBlockingErrors(viols)) {
      setPendingPayload(payload);
      setShowOverride(true);
      return;
    }

    await doCreate(payload);
  };

  const doCreate = async (payload, overrideReason = null) => {
    setSubmitting(true);
    try {
      if (overrideReason) payload._validation_override = overrideReason;
      const { data:diag } = await diagnosticService.create(payload);
      if (Object.keys(valeursCustom).length > 0) await sauvegarderCustom(diag.id);
      toast.success('Diagnostic enregistré avec succès !');
      navigate(`/diagnostics/${diag.id}`);
    } catch (err) {
      const errs = err.response?.data;
      toast.error(errs ? Object.values(errs).flat().join(' ') : 'Erreur lors de la création.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverrideConfirm = (reason) => {
    setShowOverride(false);
    doCreate(pendingPayload, reason);
  };

  return (
    <AppLayout title="Nouveau Diagnostic">
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ maxWidth:800, margin:'0 auto' }}>

        {/* ── Validation banner (always visible, above form) ── */}
        <ValidationBanner violations={violations} />

        <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:16, padding:'28px 32px' }}>
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* Dictée vocale */}
            <VoiceDictation
              formType="diagnostic"
              onFieldsExtracted={(fields) => {
                Object.entries(fields).forEach(([key, value]) => {
                  setValue(key, value, { shouldValidate: true });
                });
              }}
            />
            <div style={{ margin:'12px 0', height:1, background:'rgba(37,99,235,0.12)' }} />

            {/* Real-time status bar */}
            <ValidationStatusBar violations={violations} />

            {/* ── Patient & Date ── */}
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
                  <select {...register('patient', { required:'Patient requis' })} style={selectSt}>
                    <option value="">Sélectionner un patient</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.registration_number} – {p.full_name}
                        {p.sexe ? ` (${p.sexe === 'M' ? 'H' : p.sexe === 'F' ? 'F' : '?'})` : ''}
                        {p.age ? `, ${p.age} ans` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date du diagnostic *" error={errors.date_diagnostic?.message}>
                  <input type="date" {...register('date_diagnostic',{required:'Date requise'})} style={inputSt} />
                </Field>
              </Row2>

              {/* Patient info chip — affiche sexe + âge après sélection */}
              {selectedPatient && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                  background:'rgba(37,99,235,0.06)', border:'1px solid rgba(37,99,235,0.15)',
                  borderRadius:9, marginBottom:14, flexWrap:'wrap' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#2563eb' }}>
                    {selectedPatient.full_name}
                  </span>
                  {selectedPatient.sexe && (
                    <span style={{ fontSize:11.5, padding:'2px 8px', borderRadius:99, fontWeight:600,
                      background: selectedPatient.sexe==='F' ? 'rgba(232,121,249,0.12)' : 'rgba(37,99,235,0.1)',
                      color: selectedPatient.sexe==='F' ? '#d946ef' : '#2563eb' }}>
                      {selectedPatient.sexe==='F' ? 'Femme' : selectedPatient.sexe==='M' ? 'Homme' : 'Inconnu'}
                    </span>
                  )}
                  {selectedPatient.age && (
                    <span style={{ fontSize:11.5, color:'#64748b' }}>{selectedPatient.age} ans</span>
                  )}
                  {violations.filter(v=>v.severity==='error').length > 0 && (
                    <span style={{ marginLeft:'auto', fontSize:11.5, fontWeight:700, color:'#dc2626',
                      display:'flex', alignItems:'center', gap:4 }}>
                      🚫 {violations.filter(v=>v.severity==='error').length} erreur(s) critique(s)
                    </span>
                  )}
                </div>
              )}

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
              <>
                <Section title="Topographie ICD-O-3">
                  <ICDSearch
                    label="Localisation anatomique *"
                    onSelect={setTopoSelected}
                    selectedCode={topoSelected?.code}
                    selectedLabel={topoSelected?.libelle}
                    searchFn={diagnosticService.searchTopographies}
                    placeholder="Rechercher par code ou libellé (ex: C50, sein...)"
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

                <Section title="Morphologie ICD-O-3">
                  <ICDSearch
                    label="Type histologique"
                    onSelect={setMorphSelected}
                    selectedCode={morphSelected?.code}
                    selectedLabel={morphSelected?.libelle}
                    searchFn={diagnosticService.searchMorphologies}
                    placeholder="Rechercher par code ou type histologique (ex: 8500, carcinome...)"
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

                <Section title="Classification TNM & Stade">
                  <TNMSelector register={register} watch={watch} />
                  <div style={{ marginTop:14 }}>
                    <Field label="Stade AJCC / UICC">
                      <select {...register('stade_ajcc')} style={selectSt}>
                        <option value="U">Inconnu</option>
                        <option value="0">Stade 0 – In situ</option>
                        {[['I','I'],['IA','IA'],['IB','IB'],['II','II'],['IIA','IIA'],['IIB','IIB'],['IIC','IIC'],
                          ['III','III'],['IIIA','IIIA'],['IIIB','IIIB'],['IIIC','IIIC'],['IV','IV']].map(([v,l])=>(
                          <option key={v} value={v}>Stade {l}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                <Section title="Marqueurs biologiques (optionnel)">
                  <Row3>
                    <Field label="Récepteur ER">
                      <select {...register('recepteur_re')} style={selectSt}>
                        <option value="">—</option><option value="positif">Positif</option>
                        <option value="negatif">Négatif</option><option value="inconnu">Inconnu</option>
                      </select>
                    </Field>
                    <Field label="Récepteur PR">
                      <select {...register('recepteur_rp')} style={selectSt}>
                        <option value="">—</option><option value="positif">Positif</option>
                        <option value="negatif">Négatif</option><option value="inconnu">Inconnu</option>
                      </select>
                    </Field>
                    <Field label="HER2">
                      <select {...register('her2')} style={selectSt}>
                        <option value="">—</option><option value="positif">Positif (3+)</option>
                        <option value="equivoque">Équivoque (2+)</option><option value="negatif">Négatif (0/1+)</option>
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
              </>
            )}

            {/* ── Cancer liquide ── */}
            {categorieCancer === 'liquide' && (
              <Section title="Diagnostic hématologique">
                <Field label="Hémopathie maligne *" error={errors.hemopathie_maligne?.message}>
                  <select {...register('hemopathie_maligne',{required:'Veuillez sélectionner une hémopathie maligne'})} style={selectSt}>
                    <option value="">— Sélectionner un diagnostic —</option>
                    {HEMATOLOGY_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                {hemopathieValue && (
                  <ExamensHematologiques hemopathie={hemopathieValue} register={register} errors={errors} watch={watch} />
                )}
              </Section>
            )}

            {/* ── Établissement ── */}
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
                  style={{ ...inputSt, resize:'vertical', lineHeight:1.6 }} />
              </Field>
            </Section>

            {/* Champs personnalisés */}
            <CustomFieldsSection
              module="diagnostic" champs={champsCustom} valeurs={valeursCustom}
              onChange={setValeur} loading={loadingCustom}
              topographieCode={categorieCancer==='solide' ? topoSelected?.code : ''}
            />

            {/* ── Résumé de validation avant soumission ── */}
            {violations.length > 0 && (
              <div style={{ marginBottom:20, padding:'12px 14px',
                background: hasBlockingErrors(violations) ? '#fef2f2' : '#fffbeb',
                border:`1px solid ${hasBlockingErrors(violations) ? '#fca5a5' : '#fcd34d'}`,
                borderRadius:10, fontSize:12, lineHeight:1.7,
                color: hasBlockingErrors(violations) ? '#7f1d1d' : '#78350f' }}>
                <strong>{hasBlockingErrors(violations) ? ' Validation bloquée' : 'Alertes actives'} :</strong>
                {' '}L'enregistrement {hasBlockingErrors(violations) ? 'nécessite une dérogation motivée' : 'est possible malgré les alertes'}.
                Vérifiez les alertes affichées en haut du formulaire.
              </div>
            )}

            {/* ── Boutons ── */}
            <div style={{ display:'flex', gap:10, marginTop:8, paddingTop:20, borderTop:'1px solid rgba(37,99,235,0.12)' }}>
              <button type="button" onClick={() => navigate('/diagnostics')}
                style={{ flex:'0 0 110px', padding:12, background:'#f1f5f9',
                  border:'1px solid rgba(37,99,235,0.12)', borderRadius:12,
                  color:'#334155', fontSize:13, cursor:'pointer' }}>
                ← Annuler
              </button>
              <button type="submit" disabled={submitting}
                style={{ flex:1, padding:12,
                  background: hasBlockingErrors(violations)
                    ? 'linear-gradient(135deg,#dc2626,#b91c1c)'
                    : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                  border:'none', borderRadius:12, color:'#fff', fontSize:13.5, fontWeight:600,
                  fontFamily:'var(--font-display)', cursor:submitting?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  opacity:submitting?0.7:1 }}>
                {submitting
                  ? <><Spinner /> Enregistrement...</>
                  : hasBlockingErrors(violations)
                    ? ' Enregistrer avec dérogation'
                    : ' Enregistrer le diagnostic'}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Override modal */}
      {showOverride && pendingPayload && (
        <OverrideModal
          violations={violations}
          onConfirm={handleOverrideConfirm}
          onCancel={() => { setShowOverride(false); setPendingPayload(null); }}
        />
      )}
    </AppLayout>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase',
        letterSpacing:.8, marginBottom:14, paddingBottom:8, borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function Row2({ children }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>{children}</div>; }
function Row3({ children }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 12px' }}>{children}</div>; }
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={labelSt}>{label}</label>
      {children}
      {error && <p style={{ marginTop:3, fontSize:11, color:'#dc2626' }}>⚠ {error}</p>}
    </div>
  );
}
function Spinner() {
  return <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite' }} />;
}
const labelSt  = { display:'block', fontSize:11.5, fontWeight:500, color:'#334155', marginBottom:6, letterSpacing:.3 };
const inputSt  = { width:'100%', padding:'10px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.08)', borderRadius:12, color:'#0f172a', fontSize:13, outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' };
const selectSt = { ...inputSt, cursor:'pointer' };