import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { statsService } from '../../services/statsService';
import { AppLayout } from '../../components/layout/Sidebar';
import AlgeriaMap from './AlgeriaMap';
import AlgeriaHeatmap from '../../components/dashboard/AlgeriaHeatmap';
import { WILAYAS } from './wilayasData';

// ── Couleurs ──────────────────────────────────────────────────────
const C = ['#2563eb','#7c3aed','#16a34a','#d97706','#dc2626','#9333ea','#0891b2','#10b981','#ea580c','#a78bfa'];
const STADE_C = { '0':'#16a34a','I':'#22c55e','IA':'#86efac','IB':'#bbf7d0','II':'#d97706','IIA':'#fbbf24','IIB':'#fcd34d','III':'#ff7832','IIIA':'#ea580c','IIIB':'#fdba74','IV':'#dc2626','U':'#6b7280' };
const REPONSE_C = { RC:'#16a34a', RP:'#2563eb', SD:'#d97706', PD:'#dc2626', NE:'#9ca3af' };
const MARGES_C  = { R0:'#16a34a', R1:'#d97706', R2:'#dc2626', RX:'#9ca3af' };
const DEFAULT_FILTERS = { annee:'', sexe:'', statut:'', wilaya:'', stade:'', dateFrom:'', dateTo:'' };
const STATUT_OPTIONS = [
  ['vivant', 'Vivant'],
  ['decede', 'Decede'],
  ['perdu_de_vue', 'Perdu de vue'],
  ['remission', 'Remission'],
];
const STADE_OPTIONS = [
  ['0', 'Stade 0'],
  ['I', 'Stade I'],
  ['II', 'Stade II'],
  ['III', 'Stade III'],
  ['IV', 'Stade IV'],
  ['U', 'Non precise'],
];
const FILTER_TAG_LABELS = {
  annee:    v => `Année : ${v}`,
  sexe:     v => ({ M: 'Sexe : Homme', F: 'Sexe : Femme' }[v]),
  statut:   v => `Statut : ${STATUT_OPTIONS.find(([k]) => k === v)?.[1] || v}`,
  wilaya:   v => `Wilaya : ${v}`,
  stade:    v => `Stade : ${v === 'U' ? 'Non précisé' : v}`,
  cancer:   v => `Cancer : ${v}`,   // ← NOUVEAU
  dateFrom: v => `Du : ${v}`,
  dateTo:   v => `Au : ${v}`,
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#ffffff', border:'1px solid #f1f5f9', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      {label && <div style={{ color:'#64748b', marginBottom:6, fontWeight:600 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color||'#e2e8f0', marginBottom:2 }}>{p.name} : <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

// ── Composants ─────────────────────────────────────────────────────
function Card({ title, sub, children, accent = '#2563eb' }) {
  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', background:'#f1f5f9', borderBottom:'1px solid rgba(37,99,235,0.12)', borderLeft:`3px solid ${accent}`, fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5 }}>
        {title}{sub && <span style={{ fontWeight:400, marginLeft:6, textTransform:'none', fontSize:10 }}>{sub}</span>}
      </div>
      <div style={{ padding:'14px 16px' }}>{children}</div>
    </div>
  );
}

function ChartCard({ title, sub, children, span = 1 }) {
  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:14, padding:'20px 22px', gridColumn: span === 2 ? '1 / -1' : 'auto' }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', fontFamily:'var(--font-display)' }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function HBar({ label, value, max, color, rank }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11.5, color:'#334155', display:'flex', alignItems:'center', gap:6 }}>
          {rank && <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'#64748b', minWidth:16 }}>{rank}.</span>}
          <span style={{ maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
        </span>
        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color, fontWeight:700 }}>{value}</span>
      </div>
      <div style={{ height:5, background:'#f1f5f9', borderRadius:3 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${color}99,${color})`, borderRadius:3, transition:'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function FilterBar({ filters, draft, setDraft, onApply, onReset }) {
  const [open, setOpen] = useState(false);

  const activeTags = Object.entries(filters).filter(([key, value]) => {
    if (!value || value === 'all') return false;
    return true;
  });
  const totalActive = activeTags.length;

  const set = (key, val) => setDraft(d => ({ ...d, [key]: val }));

  return (
    <div style={{ marginBottom: 0 }}>

      {/* ── Toggle row ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        marginBottom: (open || totalActive > 0) ? 12 : 0,
      }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px',
            background: open ? '#eff6ff' : '#fff',
            border: '1px solid rgba(37,99,235,0.2)',
            borderRadius: 10, color: '#2563eb',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(15,23,42,0.06)', transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="10" y1="18" x2="14" y2="18"/>
          </svg>
          Filtres
          {totalActive > 0 && (
            <span style={{
              background: '#2563eb', color: '#fff', borderRadius: 99,
              fontSize: 10, fontWeight: 700, padding: '1px 7px', lineHeight: '16px',
            }}>{totalActive}</span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Tags actifs (panel fermé) */}
        {!open && totalActive > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {activeTags.map(([key, value]) => (
              <span key={key} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, padding: '3px 10px',
                background: 'rgba(37,99,235,0.07)',
                color: '#2563eb', borderRadius: 99,
                border: '1px solid rgba(37,99,235,0.18)', fontWeight: 500,
              }}>
                {FILTER_TAG_LABELS[key]?.(value) ?? value}
              </span>
            ))}
            <button
              onClick={onReset}
              style={{
                fontSize: 11, padding: '3px 10px',
                background: 'transparent', color: '#94a3b8',
                border: '1px solid rgba(148,163,184,0.3)',
                borderRadius: 99, cursor: 'pointer',
              }}
            >Effacer tout</button>
          </div>
        )}
      </div>

      {/* ── Panel étendu ── */}
      {open && (
        <div style={{
          background: '#fff',
          border: '1px solid rgba(37,99,235,0.1)',
          borderRadius: 14, padding: '18px 20px',
          boxShadow: '0 4px 20px rgba(15,23,42,0.08)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12, marginBottom: 16,
          }}>

            {/* Année */}
            <FilterGroup label="Année">
              <select value={draft.annee}
                onChange={e => set('annee', e.target.value)}
                style={selectStyle}>
                <option value="">Toutes les années</option>
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </FilterGroup>

            {/* Du */}
            <FilterGroup label="Du">
              <input type="date" value={draft.dateFrom}
                onChange={e => set('dateFrom', e.target.value)}
                style={selectStyle} />
            </FilterGroup>

            {/* Au */}
            <FilterGroup label="Au">
              <input type="date" value={draft.dateTo}
                onChange={e => set('dateTo', e.target.value)}
                style={selectStyle} />
            </FilterGroup>

            {/* Sexe */}
            <FilterGroup label="Sexe">
              <select value={draft.sexe}
                onChange={e => set('sexe', e.target.value)}
                style={selectStyle}>
                <option value="all">Tous sexes</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </select>
            </FilterGroup>

            {/* Statut */}
            <FilterGroup label="Statut">
              <select value={draft.statut}
                onChange={e => set('statut', e.target.value)}
                style={selectStyle}>
                <option value="">Tous statuts</option>
                {STATUT_OPTIONS.map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </FilterGroup>

            {/* Wilaya */}
            <FilterGroup label="Wilaya">
              <select value={draft.wilaya}
                onChange={e => set('wilaya', e.target.value)}
                style={selectStyle}>
                <option value="">Toutes</option>
                {WILAYAS.map(w =>
                  <option key={w.code} value={w.nom}>{w.nom}</option>
                )}
              </select>
            </FilterGroup>

            {/* Stade */}
            <FilterGroup label="Stade">
              <select value={draft.stade}
                onChange={e => set('stade', e.target.value)}
                style={selectStyle}>
                <option value="">Tous stades</option>
                {STADE_OPTIONS.map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </FilterGroup>

            {/* ← NOUVEAU : Type de cancer */}
            <FilterGroup label="Type de cancer">
              <select
                value={draft.cancer}
                onChange={e => set('cancer', e.target.value)}
                style={{
                  ...selectStyle,
                  background:   draft.cancer ? '#eff6ff' : '#fff',
                  borderColor:  draft.cancer ? 'rgba(37,99,235,0.45)' : 'rgba(37,99,235,0.18)',
                  color:        draft.cancer ? '#2563eb' : '#334155',
                  fontWeight:   draft.cancer ? 600 : 400,
                }}
              >
                <option value="">Tous types</option>
                {CANCER_TYPES.map(c =>
                  <option key={c} value={c}>{c}</option>
                )}
              </select>
            </FilterGroup>

          </div>

          {/* ── Actions ── */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            borderTop: '1px solid rgba(37,99,235,0.08)', paddingTop: 14,
          }}>
            <button
              onClick={() => { onApply(); setOpen(false); }}
              style={{
                padding: '9px 22px',
                background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                border: 'none', borderRadius: 10, color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >Appliquer les filtres</button>
            <button
              onClick={() => { onReset(); setOpen(false); }}
              style={{
                padding: '9px 18px', background: 'transparent',
                border: '1px solid rgba(37,99,235,0.2)',
                borderRadius: 10, color: '#64748b',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >Réinitialiser</button>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
              {Object.values(draft).filter(v => v && v !== 'all').length} filtre(s) actif(s)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const CANCER_TYPES = [
  'Sein', 'Poumon', 'Colorectal', 'Prostate', 'Col utérin',
  'Lymphome', 'Leucémie', 'Estomac', 'Foie', 'Rein',
  'Thyroïde', 'Mélanome', 'Ovaire', 'Pancréas', 'Vessie',
];

// ── PAGE PRINCIPALE ───────────────────────────────────────────────
const TABS = [
  { key:'sig',          label:' Carte SIG',       color:'#2563eb' },
  { key:'cancers',      label:'Cancers',           color:'#7c3aed' },
  { key:'patients',     label:'Patients',          color:'#16a34a' },
  { key:'traitements',  label:'Traitements',       color:'#d97706' },
];

export default function StatistiquesPage() {
  const [tab, setTab]       = useState('sig');
  const [annee, setAnnee]   = useState('');
  const [sexe,  setSexe]    = useState('');
  const [wilaya,setWilaya]  = useState('');
  const [annees, setAnnees] = useState([]);

  const [incData,  setIncData]  = useState(null);
  const [canData,  setCanData]  = useState(null);
  const [patData,  setPatData]  = useState(null);
  const [trtData,  setTrtData]  = useState(null);
  const [loading,  setLoading]  = useState({});

  const load = useCallback(async (key, fn) => {
    setLoading(p => ({...p, [key]: true}));
    try {
      const { data } = await fn();
      return data;
    } catch { return null; }
    finally { setLoading(p => ({...p, [key]: false})); }
  }, []);

  // Load incidence (always)
  useEffect(() => {
    load('sig', () => statsService.incidence({ annee, sexe })).then(d => {
      if (d) {
        setIncData(d);
        if (d.annees_dispo?.length && !annees.length) setAnnees(d.annees_dispo);
      }
    });
  }, [annee, sexe]);

  useEffect(() => {
    if (tab === 'cancers')
      load('can', () => statsService.cancers({ annee, sexe, wilaya })).then(setCanData);
  }, [tab, annee, sexe, wilaya]);

  useEffect(() => {
    if (tab === 'patients')
      load('pat', () => statsService.patients({ annee, wilaya })).then(setPatData);
  }, [tab, annee, wilaya]);

  useEffect(() => {
    if (tab === 'traitements')
      load('trt', () => statsService.traitements({ annee })).then(setTrtData);
  }, [tab, annee]);

  const isLoading = (key) => loading[key];
  const activeColor = TABS.find(t => t.key === tab)?.color || '#2563eb';
  const top_wilayas = incData?.par_wilaya || [];
  const handleSelectWilaya = useCallback((selected) => {
    setWilaya(prev => prev === selected ? '' : selected);
  }, []);

  return (
    <AppLayout title="Statistiques & Carte SIG">

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:4 }}>
          Statistiques — RegistreCancer.dz
        </h1>
        <p style={{ fontSize:12, color:'#64748b' }}>
          Analyse épidémiologique · Incidence par wilaya · Données démographiques
        </p>
      </div>

      {/* Filtres globaux */}
      <FilterBar annee={annee} onAnnee={setAnnee} sexe={sexe} onSexe={setSexe}
        annees={annees} wilaya={wilaya} onWilaya={setWilaya} />

      {/* Tabs */}
      <div style={{ display:'flex', background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden', marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom:`2px solid ${tab===t.key ? t.color : 'transparent'}`, color:tab===t.key ? t.color : '#64748b', fontSize:12.5, fontWeight:tab===t.key ? 600 : 400, cursor:'pointer', fontFamily:'var(--font-body)', transition:'color 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Carte SIG ────────────────────────────────────────── */}
      {tab === 'sig' && (
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>
          {/* Carte */}
          <Card title="Carte de l'Algérie" sub={`${incData?.total_filtre ?? '—'} patients${annee ? ' · '+annee : ''}`} accent="#2563eb">
            {isLoading('sig') ? <Loader color="#2563eb" /> : (
              <AlgeriaMap
                data={incData?.par_wilaya || []}
                selectedWilaya={wilaya}
                onWilayaClick={(w) => { setWilaya(w === wilaya ? '' : w); }}
              />
            )}
          </Card>

          {/* Classement wilayas */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card title="Classement des wilayas" sub="Par nombre de patients" accent="#2563eb">
              {isLoading('sig') ? <Loader color="#2563eb" /> : (
                <div style={{ maxHeight:400, overflowY:'auto' }}>
                  {(incData?.par_wilaya || []).slice(0,20).map((w, i) => (
                    <div key={w.wilaya}
                      onClick={() => setWilaya(w.wilaya === wilaya ? '' : w.wilaya)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 8px', borderRadius:6, cursor:'pointer', background: wilaya === w.wilaya ? 'rgba(0,168,255,0.08)' : 'transparent', marginBottom:2 }}
                      onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
                      onMouseLeave={e => e.currentTarget.style.background= wilaya === w.wilaya ? 'rgba(0,168,255,0.08)' : 'transparent'}
                    >
                      <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'#64748b', minWidth:18, textAlign:'right' }}>{i+1}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#0f172a' }}>{w.wilaya}</div>
                        <div style={{ height:4, background:'#f1f5f9', borderRadius:2, marginTop:3 }}>
                          <div style={{ height:'100%', width:`${(w.count / (incData.par_wilaya[0]?.count||1)) * 100}%`, background:`linear-gradient(90deg,#2563eb80,#2563eb)`, borderRadius:2 }} />
                        </div>
                      </div>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color:'#2563eb', minWidth:30, textAlign:'right' }}>{w.count}</span>
                    </div>
                  ))}
                  {(incData?.par_wilaya || []).length === 0 && (
                    <div style={{ textAlign:'center', padding:32, color:'#64748b', fontSize:12 }}>
                      Aucune donnée de wilaya enregistrée
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
          <div style={{ gridColumn:'1 / -1' }}>
            <ChartCard
              title="Carte d'Algérie par wilaya"
              sub="Dégradé bleu selon le nombre de cas. Gris si aucun cas. Cliquez sur une wilaya pour filtrer le dashboard."
              span={2}
            >
              <AlgeriaHeatmap
                data={top_wilayas}
                selectedWilaya={wilaya}
                onSelectWilaya={handleSelectWilaya}
              />
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── TAB: Cancers ──────────────────────────────────────────── */}
      {tab === 'cancers' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Card title="Top 20 localisations tumorales" sub="ICD-O-3 topographie" accent="#7c3aed">
            {isLoading('can') ? <Loader color="#7c3aed" /> : (
              <div>
                {(canData?.top_topographies || []).map((c, i) => (
                  <HBar key={c.topographie_code} rank={i+1}
                    label={`${c.topographie_code} – ${c.topographie_libelle}`}
                    value={c.count} max={canData.top_topographies[0]?.count || 1}
                    color={C[i % C.length]} />
                ))}
                {!canData?.top_topographies?.length && <Empty text="Aucun diagnostic enregistré" />}
              </div>
            )}
          </Card>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card title="Distribution par stade AJCC" accent="#7c3aed">
              {isLoading('can') ? <Loader color="#7c3aed" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={(canData?.par_stade||[]).filter(s=>s.count>0).map(s=>({
                      name: s.stade_ajcc==='U'?'Inconnu':`Stade ${s.stade_ajcc}`,
                      value: s.count, color: STADE_C[s.stade_ajcc]||'#9ca3af'
                    }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {(canData?.par_stade||[]).filter(s=>s.count>0).map((s,i) => (
                        <Cell key={i} fill={STADE_C[s.stade_ajcc]||'#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} formatter={(v,n,p) => [v, p.payload.name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Base du diagnostic" accent="#7c3aed">
              {isLoading('can') ? <Loader color="#7c3aed" /> : (
                <div>
                  {(canData?.par_base_diag||[]).map((b,i) => (
                    <HBar key={b.base_diagnostic}
                      label={b.base_diagnostic || 'Non précisé'} value={b.count}
                      max={canData.par_base_diag[0]?.count||1} color={C[i%C.length]} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Top 10 morphologies tumorales" sub="ICD-O-3 morphologie" accent="#7c3aed">
            {isLoading('can') ? <Loader color="#7c3aed" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(canData?.par_morphologie||[]).map(m=>({ name: m.morphologie_code, label: m.morphologie_libelle, count: m.count }))} layout="vertical" margin={{top:0,right:20,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Cas" radius={[0,4,4,0]}>
                    {(canData?.par_morphologie||[]).map((_,i) => <Cell key={i} fill={C[i%C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB: Patients ─────────────────────────────────────────── */}
      {tab === 'patients' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Pyramide des âges */}
          <Card title="Pyramide des âges" sub="Hommes / Femmes par tranche" accent="#16a34a">
            {isLoading('pat') ? <Loader color="#16a34a" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={patData?.pyramide_ages || []} layout="vertical" margin={{top:0,right:10,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => Math.abs(v)} tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="tranche" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false} width={38} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => [Math.abs(v)]} />
                  <Legend wrapperStyle={{fontSize:11}} />
                  <Bar dataKey="hommes"  name="Hommes" fill="#2563eb" radius={[0,4,4,0]} />
                  <Bar dataKey="femmes"  name="Femmes" fill="#ff80ab" radius={[4,0,0,4]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Évolution annuelle */}
          <Card title="Évolution annuelle" sub="Nouveaux patients enregistrés" accent="#16a34a">
            {isLoading('pat') ? <Loader color="#16a34a" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={patData?.evolution_annuelle || []} margin={{top:5,right:10,bottom:0,left:-20}}>
                  <defs>
                    <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ff80ab" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ff80ab" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="annee" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{fontSize:11,paddingTop:8}} />
                  <Area type="monotone" dataKey="total"  name="Total"  stroke="#16a34a" fill="url(#gT)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="hommes" name="Hommes" stroke="#2563eb" fill="url(#gH)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="femmes" name="Femmes" stroke="#ff80ab" fill="url(#gF)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Tranches d'âge */}
          <Card title="Distribution par âge au diagnostic" accent="#16a34a">
            {isLoading('pat') ? <Loader color="#16a34a" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={patData?.tranches_age || []} margin={{top:5,right:10,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="tranche" tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Patients" radius={[4,4,0,0]}>
                    {(patData?.tranches_age||[]).map((_,i) => <Cell key={i} fill={C[i%C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Statut vital */}
          <Card title="Statut vital" accent="#16a34a">
            {isLoading('pat') ? <Loader color="#16a34a" /> : (
              <div>
                {(patData?.par_statut_vital||[]).map((s,i) => {
                  const labels = { vivant:'Vivant', decede:'Décédé', inconnu:'Inconnu' };
                  const colors = { vivant:'#16a34a', decede:'#dc2626', inconnu:'#9ca3af' };
                  return (
                    <HBar key={s.statut_vital}
                      label={labels[s.statut_vital] || s.statut_vital}
                      value={s.count}
                      max={patData.par_statut_vital[0]?.count || 1}
                      color={colors[s.statut_vital] || '#9ca3af'} />
                  );
                })}
                {patData?.age_moyen && (
                  <div style={{ marginTop:14, padding:'10px 12px', background:'#f1f5f9', borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>Âge moyen au diagnostic</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:700, color:'#16a34a' }}>
                      {parseFloat(patData.age_moyen).toFixed(1)} ans
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>
         </div>
       
      )}

      {/* ── TAB: Traitements ──────────────────────────────────────── */}
      {tab === 'traitements' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Totaux par type */}
          <div style={{ gridColumn:'1 / -1', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
            {trtData && [
              { label:'Chimiothérapies',  val:trtData.totaux?.chimiotherapie,  color:'#2563eb' },
              { label:'Radiothérapies',   val:trtData.totaux?.radiotherapie,   color:'#d97706'  },
              { label:'Chirurgies',       val:trtData.totaux?.chirurgie,       color:'#dc2626' },
              { label:'Hormonothérapies', val:trtData.totaux?.hormonotherapie, color:'#16a34a' },
              { label:'Immunothérapies',  val:trtData.totaux?.immunotherapie,  color:'#9333ea' },
            ].map(t => (
              <div key={t.label} style={{ background:'#ffffff', border:`1px solid ${t.color}20`, borderRadius:'12px', padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{t.icon}</div>
                <div style={{ fontSize:24, fontWeight:800, color:t.color, fontFamily:'var(--font-display)', marginBottom:3 }}>{t.val ?? '—'}</div>
                <div style={{ fontSize:10.5, color:'#64748b' }}>{t.label}</div>
              </div>
            ))}
          </div>

          {/* Protocoles chimio */}
          <Card title="Top protocoles chimiothérapie" accent="#2563eb">
            {isLoading('trt') ? <Loader color="#2563eb" /> : (
              <div>
                {(trtData?.protocoles_chimio||[]).map((p,i) => (
                  <HBar key={p.protocole} rank={i+1} label={p.protocole} value={p.count}
                    max={trtData.protocoles_chimio[0]?.count||1} color={C[i%C.length]} />
                ))}
                {!trtData?.protocoles_chimio?.length && <Empty text="Aucune chimio enregistrée" />}
              </div>
            )}
          </Card>

          {/* Réponses chimio */}
          <Card title="Réponses aux chimiothérapies" accent="#2563eb">
            {isLoading('trt') ? <Loader color="#2563eb" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trtData?.reponses_chimio||[]} margin={{top:5,right:10,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="reponse_tumorale" tick={{fill:'#94a3b8',fontSize:12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'#94a3b8',fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Patients" radius={[4,4,0,0]}>
                    {(trtData?.reponses_chimio||[]).map((r,i) => <Cell key={i} fill={REPONSE_C[r.reponse_tumorale]||'#9ca3af'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Techniques radio */}
          <Card title="Techniques de radiothérapie" accent="#d97706">
            {isLoading('trt') ? <Loader color="#d97706" /> : (
              <div>
                {(trtData?.techniques_radio||[]).map((t,i) => (
                  <HBar key={t.technique} label={t.technique} value={t.count}
                    max={trtData.techniques_radio[0]?.count||1} color={C[i%C.length]} />
                ))}
                {!trtData?.techniques_radio?.length && <Empty text="Aucune radiothérapie enregistrée" />}
              </div>
            )}
          </Card>

          {/* Marges chirurgicales */}
          <Card title="Marges de résection chirurgicale" accent="#dc2626">
            {isLoading('trt') ? <Loader color="#dc2626" /> : (
              <div>
                {(trtData?.marges_resection||[]).map(m => (
                  <HBar key={m.marges_resection} label={
                    {R0:'R0 – Marges saines', R1:'R1 – Marges envahies microscopiquement', R2:'R2 – Envahissement macroscopique', RX:'RX – Marges non évaluées'}[m.marges_resection] || m.marges_resection
                  } value={m.count} max={Math.max(...(trtData.marges_resection||[]).map(x=>x.count),1)}
                    color={MARGES_C[m.marges_resection]||'#9ca3af'} />
                ))}
                {!trtData?.marges_resection?.length && <Empty text="Aucune chirurgie enregistrée" />}
              </div>
            )}
          </Card>
        </div>
      )}
    </AppLayout>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function Loader({ color = '#2563eb' }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
      <div style={{ width:28, height:28, border:`3px solid rgba(37,99,235,0.12)`, borderTopColor:color, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  );
}
function Empty({ text }) {
  return <div style={{ textAlign:'center', padding:24, color:'#64748b', fontSize:12 }}>{text}</div>;
}
