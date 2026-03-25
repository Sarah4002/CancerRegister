import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { statsService } from '../../services/statsService';
import { AppLayout } from '../../components/layout/Sidebar';
import AlgeriaMap from './AlgeriaMap';

// ── Couleurs ──────────────────────────────────────────────────────
const C = ['#00a8ff','#9b8afb','#00e5a0','#f5a623','#ff4d6a','#c084fc','#38bdf8','#34d399','#fb923c','#a78bfa'];
const STADE_C = { '0':'#00e5a0','I':'#4ade80','IA':'#86efac','IB':'#bbf7d0','II':'#f5a623','IIA':'#fbbf24','IIB':'#fcd34d','III':'#ff7832','IIIA':'#fb923c','IIIB':'#fdba74','IV':'#ff4d6a','U':'#6b7280' };
const REPONSE_C = { RC:'#00e5a0', RP:'#00a8ff', SD:'#f5a623', PD:'#ff4d6a', NE:'#9ca3af' };
const MARGES_C  = { R0:'#00e5a0', R1:'#f5a623', R2:'#ff4d6a', RX:'#9ca3af' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#0f1420', border:'1px solid #1e2a3a', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
      {label && <div style={{ color:'#9ca3af', marginBottom:6, fontWeight:600 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color||'#e2e8f0', marginBottom:2 }}>{p.name} : <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

// ── Composants ─────────────────────────────────────────────────────
function Card({ title, sub, children, accent = '#00a8ff' }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)', borderLeft:`3px solid ${accent}`, fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5 }}>
        {title}{sub && <span style={{ fontWeight:400, marginLeft:6, textTransform:'none', fontSize:10 }}>{sub}</span>}
      </div>
      <div style={{ padding:'14px 16px' }}>{children}</div>
    </div>
  );
}

function HBar({ label, value, max, color, rank }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom:9 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:11.5, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:6 }}>
          {rank && <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-muted)', minWidth:16 }}>{rank}.</span>}
          <span style={{ maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
        </span>
        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color, fontWeight:700 }}>{value}</span>
      </div>
      <div style={{ height:5, background:'var(--bg-elevated)', borderRadius:3 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${color}99,${color})`, borderRadius:3, transition:'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function FilterBar({ annee, onAnnee, sexe, onSexe, annees, wilaya, onWilaya }) {
  return (
    <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center', background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', padding:'10px 14px' }}>
      <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>🔍 Filtres :</span>
      <select value={annee} onChange={e => onAnnee(e.target.value)}
        style={{ padding:'6px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-secondary)', fontSize:12, outline:'none', cursor:'pointer' }}>
        <option value="">Toutes les années</option>
        {annees.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <select value={sexe} onChange={e => onSexe(e.target.value)}
        style={{ padding:'6px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-secondary)', fontSize:12, outline:'none', cursor:'pointer' }}>
        <option value="">Tous sexes</option>
        <option value="M">Hommes</option>
        <option value="F">Femmes</option>
      </select>
      {wilaya !== undefined && (
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {wilaya && (
            <span style={{ padding:'4px 10px', background:'rgba(0,168,255,0.1)', border:'1px solid rgba(0,168,255,0.2)', borderRadius:20, fontSize:11, color:'#00a8ff' }}>
              📍 {wilaya}
              <span onClick={() => onWilaya('')} style={{ marginLeft:6, cursor:'pointer', color:'#ff4d6a' }}>✕</span>
            </span>
          )}
        </div>
      )}
      {(annee || sexe || wilaya) && (
        <button onClick={() => { onAnnee(''); onSexe(''); onWilaya && onWilaya(''); }}
          style={{ padding:'5px 12px', background:'rgba(255,77,106,0.1)', border:'1px solid rgba(255,77,106,0.2)', borderRadius:8, color:'#ff4d6a', fontSize:11, cursor:'pointer', marginLeft:'auto' }}>
          ✕ Réinitialiser
        </button>
      )}
    </div>
  );
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────────
const TABS = [
  { key:'sig',          label:'🗺️ Carte SIG',       color:'#00a8ff' },
  { key:'cancers',      label:'🔬 Cancers',           color:'#9b8afb' },
  { key:'patients',     label:'👥 Patients',          color:'#00e5a0' },
  { key:'traitements',  label:'💊 Traitements',       color:'#f5a623' },
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
  const activeColor = TABS.find(t => t.key === tab)?.color || '#00a8ff';

  return (
    <AppLayout title="Statistiques & Carte SIG">

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:800, color:'var(--text-primary)', marginBottom:4 }}>
          Statistiques — RegistreCancer.dz
        </h1>
        <p style={{ fontSize:12, color:'var(--text-muted)' }}>
          Analyse épidémiologique · Incidence par wilaya · Données démographiques
        </p>
      </div>

      {/* Filtres globaux */}
      <FilterBar annee={annee} onAnnee={setAnnee} sexe={sexe} onSexe={setSexe}
        annees={annees} wilaya={wilaya} onWilaya={setWilaya} />

      {/* Tabs */}
      <div style={{ display:'flex', background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', overflow:'hidden', marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom:`2px solid ${tab===t.key ? t.color : 'transparent'}`, color:tab===t.key ? t.color : 'var(--text-muted)', fontSize:12.5, fontWeight:tab===t.key ? 600 : 400, cursor:'pointer', fontFamily:'var(--font-body)', transition:'color 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Carte SIG ────────────────────────────────────────── */}
      {tab === 'sig' && (
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>
          {/* Carte */}
          <Card title="Carte de l'Algérie" sub={`${incData?.total_filtre ?? '—'} patients${annee ? ' · '+annee : ''}`} accent="#00a8ff">
            {isLoading('sig') ? <Loader color="#00a8ff" /> : (
              <AlgeriaMap
                data={incData?.par_wilaya || []}
                selectedWilaya={wilaya}
                onWilayaClick={(w) => { setWilaya(w === wilaya ? '' : w); }}
              />
            )}
          </Card>

          {/* Classement wilayas */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card title="Classement des wilayas" sub="Par nombre de patients" accent="#00a8ff">
              {isLoading('sig') ? <Loader color="#00a8ff" /> : (
                <div style={{ maxHeight:400, overflowY:'auto' }}>
                  {(incData?.par_wilaya || []).slice(0,20).map((w, i) => (
                    <div key={w.wilaya}
                      onClick={() => setWilaya(w.wilaya === wilaya ? '' : w.wilaya)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 8px', borderRadius:6, cursor:'pointer', background: wilaya === w.wilaya ? 'rgba(0,168,255,0.08)' : 'transparent', marginBottom:2 }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background= wilaya === w.wilaya ? 'rgba(0,168,255,0.08)' : 'transparent'}
                    >
                      <span style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-muted)', minWidth:18, textAlign:'right' }}>{i+1}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>{w.wilaya}</div>
                        <div style={{ height:4, background:'var(--bg-elevated)', borderRadius:2, marginTop:3 }}>
                          <div style={{ height:'100%', width:`${(w.count / (incData.par_wilaya[0]?.count||1)) * 100}%`, background:`linear-gradient(90deg,#00a8ff80,#00a8ff)`, borderRadius:2 }} />
                        </div>
                      </div>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color:'#00a8ff', minWidth:30, textAlign:'right' }}>{w.count}</span>
                    </div>
                  ))}
                  {(incData?.par_wilaya || []).length === 0 && (
                    <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)', fontSize:12 }}>
                      Aucune donnée de wilaya enregistrée
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB: Cancers ──────────────────────────────────────────── */}
      {tab === 'cancers' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Card title="Top 20 localisations tumorales" sub="ICD-O-3 topographie" accent="#9b8afb">
            {isLoading('can') ? <Loader color="#9b8afb" /> : (
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
            <Card title="Distribution par stade AJCC" accent="#9b8afb">
              {isLoading('can') ? <Loader color="#9b8afb" /> : (
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

            <Card title="Base du diagnostic" accent="#9b8afb">
              {isLoading('can') ? <Loader color="#9b8afb" /> : (
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

          <Card title="Top 10 morphologies tumorales" sub="ICD-O-3 morphologie" accent="#9b8afb">
            {isLoading('can') ? <Loader color="#9b8afb" /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(canData?.par_morphologie||[]).map(m=>({ name: m.morphologie_code, label: m.morphologie_libelle, count: m.count }))} layout="vertical" margin={{top:0,right:20,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" horizontal={false} />
                  <XAxis type="number" tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
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
          <Card title="Pyramide des âges" sub="Hommes / Femmes par tranche" accent="#00e5a0">
            {isLoading('pat') ? <Loader color="#00e5a0" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={patData?.pyramide_ages || []} layout="vertical" margin={{top:0,right:10,bottom:0,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => Math.abs(v)} tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="tranche" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false} width={38} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => [Math.abs(v)]} />
                  <Legend wrapperStyle={{fontSize:11}} />
                  <Bar dataKey="hommes"  name="Hommes" fill="#00a8ff" radius={[0,4,4,0]} />
                  <Bar dataKey="femmes"  name="Femmes" fill="#ff80ab" radius={[4,0,0,4]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Évolution annuelle */}
          <Card title="Évolution annuelle" sub="Nouveaux patients enregistrés" accent="#00e5a0">
            {isLoading('pat') ? <Loader color="#00e5a0" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={patData?.evolution_annuelle || []} margin={{top:5,right:10,bottom:0,left:-20}}>
                  <defs>
                    <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00e5a0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00a8ff" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00a8ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ff80ab" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ff80ab" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
                  <XAxis dataKey="annee" tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{fontSize:11,paddingTop:8}} />
                  <Area type="monotone" dataKey="total"  name="Total"  stroke="#00e5a0" fill="url(#gT)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="hommes" name="Hommes" stroke="#00a8ff" fill="url(#gH)" strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="femmes" name="Femmes" stroke="#ff80ab" fill="url(#gF)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Tranches d'âge */}
          <Card title="Distribution par âge au diagnostic" accent="#00e5a0">
            {isLoading('pat') ? <Loader color="#00e5a0" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={patData?.tranches_age || []} margin={{top:5,right:10,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
                  <XAxis dataKey="tranche" tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Patients" radius={[4,4,0,0]}>
                    {(patData?.tranches_age||[]).map((_,i) => <Cell key={i} fill={C[i%C.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Statut vital */}
          <Card title="Statut vital" accent="#00e5a0">
            {isLoading('pat') ? <Loader color="#00e5a0" /> : (
              <div>
                {(patData?.par_statut_vital||[]).map((s,i) => {
                  const labels = { vivant:'Vivant', decede:'Décédé', inconnu:'Inconnu' };
                  const colors = { vivant:'#00e5a0', decede:'#ff4d6a', inconnu:'#9ca3af' };
                  return (
                    <HBar key={s.statut_vital}
                      label={labels[s.statut_vital] || s.statut_vital}
                      value={s.count}
                      max={patData.par_statut_vital[0]?.count || 1}
                      color={colors[s.statut_vital] || '#9ca3af'} />
                  );
                })}
                {patData?.age_moyen && (
                  <div style={{ marginTop:14, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>Âge moyen au diagnostic</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:700, color:'#00e5a0' }}>
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
              { label:'Chimiothérapies',  val:trtData.totaux?.chimiotherapie,  color:'#00a8ff' },
              { label:'Radiothérapies',   val:trtData.totaux?.radiotherapie,   color:'#f5a623'  },
              { label:'Chirurgies',       val:trtData.totaux?.chirurgie,       color:'#ff4d6a' },
              { label:'Hormonothérapies', val:trtData.totaux?.hormonotherapie, color:'#00e5a0' },
              { label:'Immunothérapies',  val:trtData.totaux?.immunotherapie,  color:'#c084fc' },
            ].map(t => (
              <div key={t.label} style={{ background:'var(--bg-card)', border:`1px solid ${t.color}20`, borderRadius:'var(--radius-md)', padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{t.icon}</div>
                <div style={{ fontSize:24, fontWeight:800, color:t.color, fontFamily:'var(--font-display)', marginBottom:3 }}>{t.val ?? '—'}</div>
                <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>{t.label}</div>
              </div>
            ))}
          </div>

          {/* Protocoles chimio */}
          <Card title="Top protocoles chimiothérapie" accent="#00a8ff">
            {isLoading('trt') ? <Loader color="#00a8ff" /> : (
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
          <Card title="Réponses aux chimiothérapies" accent="#00a8ff">
            {isLoading('trt') ? <Loader color="#00a8ff" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trtData?.reponses_chimio||[]} margin={{top:5,right:10,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false} />
                  <XAxis dataKey="reponse_tumorale" tick={{fill:'#6b7280',fontSize:12}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fill:'#6b7280',fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Patients" radius={[4,4,0,0]}>
                    {(trtData?.reponses_chimio||[]).map((r,i) => <Cell key={i} fill={REPONSE_C[r.reponse_tumorale]||'#9ca3af'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Techniques radio */}
          <Card title="Techniques de radiothérapie" accent="#f5a623">
            {isLoading('trt') ? <Loader color="#f5a623" /> : (
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
          <Card title="Marges de résection chirurgicale" accent="#ff4d6a">
            {isLoading('trt') ? <Loader color="#ff4d6a" /> : (
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
function Loader({ color = '#00a8ff' }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
      <div style={{ width:28, height:28, border:`3px solid var(--border)`, borderTopColor:color, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  );
}
function Empty({ text }) {
  return <div style={{ textAlign:'center', padding:24, color:'var(--text-muted)', fontSize:12 }}>{text}</div>;
}
