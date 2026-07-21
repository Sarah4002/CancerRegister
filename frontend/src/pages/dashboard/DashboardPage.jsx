import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { dashboardService } from '../../services/dashboardService';
import { AppLayout } from '../../components/layout/Sidebar';
import AlgeriaHeatmap from '../../components/dashboard/AlgeriaHeatmap';

/* ── Color Palette ── */
const STADE_COLORS = {
  '0':'#16a34a','I':'#22c55e','IA':'#22c55e','IB':'#86efac',
  'II':'#d97706','IIA':'#f59e0b','IIB':'#fbbf24','IIC':'#fcd34d',
  'III':'#ea580c','IIIA':'#ea580c','IIIB':'#ea580c','IIIC':'#fdba74',
  'IV':'#dc2626','U':'#94a3b8',
};
const STATUT_COLORS = {
  nouveau:'#2563eb', traitement:'#7c3aed', remission:'#16a34a',
  perdu:'#d97706', decede:'#dc2626', archive:'#64748b',
};
const REPONSE_COLORS = {
  RC:'#16a34a', RP:'#2563eb', SD:'#d97706', PD:'#dc2626', NE:'#94a3b8',
};
const CHART_COLORS = ['#2563eb','#7c3aed','#16a34a','#d97706','#dc2626','#0891b2','#0d9488','#ca8a04','#9333ea'];

const STATUT_LABELS = {
  nouveau:'Nouveau', traitement:'Traitement', remission:'Rémission',
  perdu:'Perdu de vue', decede:'Décédé', archive:'Archivé',
};

const FILTER_TAG_LABELS = {
  annee:    v => `Année : ${v}`,
  sexe:     v => ({ F:'Sexe : Femme', M:'Sexe : Homme' }[v] || v),
  statut:   v => `Statut : ${STATUT_LABELS[v] || v}`,
  wilaya:   v => `Wilaya : ${v}`,
  stade:    v => `Stade : ${v === 'U' ? 'Inconnu' : v}`,
  dateFrom: v => `Du : ${v}`,
  dateTo:   v => `Au : ${v}`,
};

const CURRENT_YEAR = new Date().getFullYear();
// FIX #1 : années générées dynamiquement jusqu'à l'année courante
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => String(CURRENT_YEAR - i));

const DEFAULT_FILTERS = {
  annee: '',
  sexe: '', statut: '', wilaya: '', stade: '',
  dateFrom: '', dateTo: '',
};

/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'#fff', border:'1px solid rgba(37,99,235,0.15)',
      borderRadius:10, padding:'10px 14px',
      boxShadow:'0 4px 16px rgba(15,23,42,0.12)', fontSize:12,
    }}>
      {label && <div style={{ color:'#64748b', marginBottom:6, fontWeight:600, fontSize:11 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#2563eb', marginBottom:2, fontWeight:500 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── KPI Card ── */
function KPICard({ label, value, sub, color, icon, trend, link }) {
  const content = (
    <div
      style={{
        background:'#fff', border:'1px solid rgba(37,99,235,0.1)',
        borderRadius:14, padding:'18px 20px',
        position:'relative', overflow:'hidden',
        transition:'all 0.2s ease',
        cursor: link ? 'pointer' : 'default',
        boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
      }}
      onMouseEnter={e => { if (link) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px rgba(37,99,235,0.12)`; }}}
      onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 8px rgba(15,23,42,0.06)'; }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${color}, ${color}88)`, borderRadius:'14px 14px 0 0' }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:22, lineHeight:1 }}>{icon}</div>
        {trend !== undefined && (
          <span style={{
            fontSize:10, padding:'3px 8px', borderRadius:20,
            background: trend >= 0 ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
            color: trend >= 0 ? '#16a34a' : '#dc2626', fontWeight:700,
            border: `1px solid ${trend >= 0 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}
          </span>
        )}
      </div>
      <div style={{ fontSize:30, fontWeight:800, fontFamily:'var(--font-display)', color, lineHeight:1, marginBottom:4 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize:12, fontWeight:600, color:'#334155', marginBottom: sub ? 2 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:'#94a3b8' }}>{sub}</div>}
    </div>
  );
  return link ? <Link to={link} style={{ textDecoration:'none' }}>{content}</Link> : content;
}

/* ── Chart Card ── */
function ChartCard({ title, sub, children, span = 1 }) {
  return (
    <div style={{
      background:'#fff', border:'1px solid rgba(37,99,235,0.08)',
      borderRadius:14, padding:'20px 22px',
      boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
      gridColumn: span === 2 ? '1 / -1' : 'auto',
    }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', fontFamily:'var(--font-display)' }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Horizontal Bar ── */
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:12, color:'#334155', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color, fontWeight:700 }}>{value}</span>
      </div>
      <div style={{ height:6, background:'#f1f5f9', borderRadius:999, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, ${color}99, ${color})`, borderRadius:999, transition:'width 0.6s ease' }} />
      </div>
    </div>
  );
}

/* ── Filter Select ── */
function FilterSelect({ label, id, value, onChange, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontSize:12, padding:'7px 10px',
          border:'1px solid rgba(37,99,235,0.18)', borderRadius:9,
          background:'#fff', color:'#334155', cursor:'pointer',
          minWidth:130, outline:'none',
          boxShadow:'0 1px 4px rgba(15,23,42,0.05)',
        }}
      >
        {children}
      </select>
    </div>
  );
}

/* ── Filter Date ── */
function FilterDate({ label, value, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontSize:12, padding:'7px 10px',
          border:'1px solid rgba(37,99,235,0.18)', borderRadius:9,
          background:'#fff', color:'#334155',
          minWidth:130, outline:'none',
          boxShadow:'0 1px 4px rgba(15,23,42,0.05)',
        }}
      />
    </div>
  );
}

/* ── Filter Bar ──
   FIX #3 : reçoit `wilayas` en prop pour une liste dynamique
   FIX #4 : toutes les années sont des strings (cohérence avec draft.annee)
*/
function FilterBar({ filters, draft, setDraft, onApply, onReset, wilayas = [] }) {
  const [open, setOpen] = useState(false);

  const totalActive = Object.values(filters).filter((v) => v !== '').length;

  return (
    <div style={{ marginBottom:20 }}>

      {/* Toggle Row */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: open ? 12 : 0 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'9px 16px',
            background: open ? '#eff6ff' : '#fff',
            border:'1px solid rgba(37,99,235,0.2)',
            borderRadius:10, color:'#2563eb',
            fontSize:12, fontWeight:600,
            cursor:'pointer', transition:'all 0.15s',
            boxShadow:'0 2px 6px rgba(15,23,42,0.06)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
          </svg>
          Filtres
          {totalActive > 0 && (
            <span style={{
              background:'#2563eb', color:'#fff', borderRadius:99,
              fontSize:10, fontWeight:700, padding:'1px 7px', lineHeight:'16px',
            }}>{totalActive}</span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* Active filter tags */}
        {!open && totalActive > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {Object.entries(filters)
              .filter(([, v]) => v && v !== 'all')
              .map(([k, v]) => (
                <span key={k} style={{
                  display:'inline-flex', alignItems:'center', gap:4,
                  fontSize:11, padding:'3px 10px',
                  background:'rgba(37,99,235,0.07)',
                  color:'#2563eb', borderRadius:99,
                  border:'1px solid rgba(37,99,235,0.18)',
                  fontWeight:500,
                }}>
                  {FILTER_TAG_LABELS[k]?.(v) ?? v}
                </span>
              ))}
            <button
              onClick={onReset}
              style={{
                fontSize:11, padding:'3px 10px',
                background:'transparent', color:'#94a3b8',
                border:'1px solid rgba(148,163,184,0.3)', borderRadius:99,
                cursor:'pointer',
              }}
            >
              Effacer tout
            </button>
          </div>
        )}
      </div>

      {/* Expanded Panel */}
      {open && (
        <div style={{
          background:'#fff', border:'1px solid rgba(37,99,235,0.1)',
          borderRadius:14, padding:'18px 20px',
          boxShadow:'0 4px 20px rgba(15,23,42,0.08)',
        }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:16 }}>

            {/* FIX #2 : toutes les valeurs d'année sont des strings */}
            <FilterSelect label="Année" value={draft.annee} onChange={v => setDraft(d => ({ ...d, annee: v }))}>
              <option value="">Toutes les années</option>
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </FilterSelect>

            <FilterDate label="Du" value={draft.dateFrom} onChange={v => setDraft(d => ({ ...d, dateFrom: v }))} />
            <FilterDate label="Au" value={draft.dateTo}   onChange={v => setDraft(d => ({ ...d, dateTo: v }))} />

            <div style={{ width:'0.5px', background:'rgba(37,99,235,0.1)', margin:'0 4px', alignSelf:'stretch' }} />

            <FilterSelect label="Sexe" value={draft.sexe} onChange={v => setDraft(d => ({ ...d, sexe: v }))}>
              <option value="">Tous</option>
              <option value="F">Femme</option>
              <option value="M">Homme</option>
            </FilterSelect>

            <FilterSelect label="Statut" value={draft.statut} onChange={v => setDraft(d => ({ ...d, statut: v }))}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </FilterSelect>

            {/* FIX #3 : liste wilayas dynamique depuis les données réelles de l'API */}
            <FilterSelect label="Wilaya" value={draft.wilaya} onChange={v => setDraft(d => ({ ...d, wilaya: v }))}>
              <option value="">Toutes</option>
              {wilayas.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </FilterSelect>

            <FilterSelect label="Stade" value={draft.stade} onChange={v => setDraft(d => ({ ...d, stade: v }))}>
              <option value="">Tous les stades</option>
              <option value="0">Stade 0</option>
              <option value="I">Stade I</option>
              <option value="II">Stade II</option>
              <option value="III">Stade III</option>
              <option value="IV">Stade IV</option>
              <option value="U">Inconnu</option>
            </FilterSelect>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:8, alignItems:'center', borderTop:'1px solid rgba(37,99,235,0.08)', paddingTop:14 }}>
            <button
              onClick={() => { onApply(); setOpen(false); }}
              style={{
                padding:'9px 22px', background:'linear-gradient(135deg,#3b82f6,#2563eb)',
                border:'none', borderRadius:10, color:'#fff',
                fontSize:13, fontWeight:600, cursor:'pointer',
                boxShadow:'0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              Appliquer les filtres
            </button>
            <button
              onClick={() => { onReset(); setOpen(false); }}
              style={{
                padding:'9px 18px', background:'transparent',
                border:'1px solid rgba(37,99,235,0.2)', borderRadius:10,
                color:'#64748b', fontSize:13, fontWeight:500, cursor:'pointer',
              }}
            >
              Réinitialiser
            </button>
            <span style={{ fontSize:11, color:'#94a3b8', marginLeft:4 }}>
              {Object.values(draft).filter(v => v && v !== 'all').length} filtre(s) sélectionné(s)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN — DashboardPage
   ══════════════════════════════════════════════ */
export default function DashboardPage() {
  const [data,       setData]       = useState(null);
  const [alertes,    setAlertes]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  /* filters = appliqués → déclenchent le fetch
     draft   = ce qui est dans le panneau avant "Appliquer" */
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draft,   setDraft]   = useState(DEFAULT_FILTERS);

  // FIX #6 : stabiliser la référence de `filters` pour useCallback
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: d }, { data: a }] = await Promise.all([
        dashboardService.global(filters),
        dashboardService.alertes(),
      ]);
      setData(d); setAlertes(a);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Appliquer : copie le draft dans filters → déclenche fetchData */
  const handleApply = useCallback(() => {
    setFilters({ ...draft });
  }, [draft]);

  /* Réinitialiser : remet draft ET filters à zéro */
  const handleReset = useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  }, []);

  /* ── Loading ── */
  if (loading) return (
    <AppLayout title="Tableau de bord">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:44, height:44, border:'3px solid #dbeafe', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
          <div style={{ color:'#64748b', fontSize:14 }}>Chargement des données...</div>
        </div>
      </div>
    </AppLayout>
  );

  /* ── Error ── */
  if (!data) return (
    <AppLayout title="Tableau de bord">
      <div style={{ textAlign:'center', padding:60, color:'#64748b' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:14 }}>Impossible de charger les données.</div>
        <button
          onClick={fetchData}
          style={{ marginTop:16, padding:'10px 24px', background:'linear-gradient(135deg,#3b82f6,#2563eb)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}
        >
          Réessayer
        </button>
      </div>
    </AppLayout>
  );

  const {
    kpis = {}, par_sexe = {}, par_statut = [], top_cancers = [], par_stade = [],
    evolution_mensuelle = [], top_wilayas = [], tranches_age = [],
    traitements_types = [], reponses_chimio = [], activite_recente = [],
  } = data;

  /* ── Data computed ── */
  const statutData = par_statut.map(s => ({
    name:  STATUT_LABELS[s.statut_dossier] || s.statut_dossier,
    value: s.count,
    color: STATUT_COLORS[s.statut_dossier] || '#94a3b8',
  }));

  const stadeData = par_stade.filter(s => s.count > 0).map(s => ({
    name:  s.stade_ajcc === 'U' ? 'Inconnu' : `Stade ${s.stade_ajcc}`,
    value: s.count,
    color: STADE_COLORS[s.stade_ajcc] || '#94a3b8',
  }));

  const sexeData = [
    { name:'Femme', value: par_sexe.F || 0, color:'#e879f9' },
    { name:'Homme', value: par_sexe.M || 0, color:'#2563eb' },
  ];

  const maxCancer = Math.max(...(top_cancers || []).map(c => c.count), 1);
  const maxWilaya = Math.max(...(top_wilayas || []).map(w => w.count), 1);

  // FIX #3 : liste wilayas extraite dynamiquement des données de l'API
  const wilayaOptions = (top_wilayas || []).map(w => w.wilaya).filter(Boolean);

  // FIX #7 : handleSelectWilaya via setters fonctionnels → pas de closure périmée
  const handleSelectWilaya = (wilaya) => {
    const nextWilaya = filters.wilaya === wilaya ? '' : wilaya;
    setDraft(d => ({ ...d, wilaya: nextWilaya }));
    setFilters(f => ({ ...f, wilaya: nextWilaya }));
  };

  return (
    <AppLayout title="Tableau de bord">

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:3 }}>
            RegistreCancer.dz — Vue globale
          </h2>
          <div style={{ fontSize:11, color:'#94a3b8' }}>
            Année {kpis.annee_courante} · {lastUpdate && `Actualisé à ${lastUpdate.toLocaleTimeString('fr-DZ')}`}
          </div>
        </div>
        <button
          onClick={fetchData}
          style={{
            padding:'9px 18px', background:'#fff',
            border:'1px solid rgba(37,99,235,0.2)', borderRadius:10,
            color:'#2563eb', fontSize:12, fontWeight:600, cursor:'pointer',
            display:'flex', alignItems:'center', gap:6,
            boxShadow:'0 2px 6px rgba(15,23,42,0.06)', transition:'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
          onMouseLeave={e => e.currentTarget.style.background='#fff'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 12a8 8 0 018-8M12 4l-2 2 2 2M20 12a8 8 0 01-8 8M12 20l2-2-2-2"/>
          </svg>
          Actualiser
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar
        filters={filters}
        draft={draft}
        setDraft={setDraft}
        onApply={handleApply}
        onReset={handleReset}
        wilayas={wilayaOptions}
      />

      {/* ── KPIs — Patients ── */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.2, marginBottom:10 }}>Patients</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          <KPICard label="Total patients"  value={kpis.total_patients} color="#2563eb" trend={kpis.nouveaux_ce_mois} sub={`+${kpis.nouveaux_annee} en ${kpis.annee_courante}`} link="/patients" />
          <KPICard label="En traitement"   value={kpis.en_traitement}  color="#7c3aed" link="/patients" />
          <KPICard label="En rémission"    value={kpis.en_remission}   color="#16a34a" link="/patients" />
          <KPICard label="Perdus de vue"   value={kpis.perdus_vue}     color="#d97706" link="/patients" />
          <KPICard label="Décédés"         value={kpis.decedes}        color="#dc2626" link="/patients" />
        </div>
      </div>

      {/* ── KPIs — Activité clinique ── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.2, marginBottom:10 }}>Activité clinique</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KPICard label="Total diagnostics"              value={kpis.total_diagnostics}  color="#0891b2" sub={`+${kpis.diagnostics_annee} en ${kpis.annee_courante}`} link="/diagnostics" />
          <KPICard label="Total traitements"              value={kpis.total_traitements}   color="#0d9488" link="/traitements" />
          <KPICard label="Nouveaux ce mois"               value={kpis.nouveaux_ce_mois}    color="#ea580c" link="/patients" />
          <KPICard label={`Nouveaux en ${kpis.annee_courante}`} value={kpis.nouveaux_annee} color="#9333ea" link="/patients" />
        </div>
      </div>

      {/* ── Évolution mensuelle ── */}
      <div style={{ marginBottom:16 }}>
        <ChartCard title="Évolution mensuelle" sub="Patients & diagnostics sur 12 mois" span={2}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={evolution_mensuelle} margin={{ top:5, right:10, bottom:0, left:-20 }}>
              <defs>
                <linearGradient id="gradP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois_court" tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize:12, paddingTop:8, color:'#334155' }} />
              <Area type="monotone" dataKey="patients"    name="Patients"    stroke="#2563eb" fill="url(#gradP)" strokeWidth={2.5} dot={false} activeDot={{ r:4, fill:'#2563eb' }} />
              <Area type="monotone" dataKey="diagnostics" name="Diagnostics" stroke="#7c3aed" fill="url(#gradD)" strokeWidth={2.5} dot={false} activeDot={{ r:4, fill:'#7c3aed' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Pie row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Sexe */}
        <ChartCard title="Répartition par sexe">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={sexeData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" paddingAngle={4}
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {sexeData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:4 }}>
            {sexeData.map(s => (
              <div key={s.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:s.color }} />
                <span style={{ color:'#334155' }}>{s.name}: <strong style={{ color:s.color }}>{s.value}</strong></span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Statuts */}
        <ChartCard title="Statuts dossiers">
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={statutData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                {statutData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} formatter={(v, n, p) => [v, p.payload.name]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 10px', justifyContent:'center', marginTop:4 }}>
            {statutData.map(s => (
              <div key={s.name} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:s.color }} />
                <span style={{ color:'#64748b' }}>{s.name} <strong style={{ color:s.color }}>{s.value}</strong></span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Stades */}
        <ChartCard title="Stades AJCC / UICC">
          {stadeData.length === 0 ? (
            <div style={{ height:190, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:12 }}>Aucun diagnostic enregistré</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={stadeData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                    {stadeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} formatter={(v, n, p) => [v, p.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 8px', justifyContent:'center', marginTop:4 }}>
                {stadeData.map(s => (
                  <div key={s.name} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:s.color }} />
                    <span style={{ color:'#64748b' }}>{s.name} <strong style={{ color:s.color }}>{s.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* ── Top cancers + Âge ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <ChartCard title="Top 10 localisations tumorales" sub="Topographie ICD-O-3 la plus fréquente">
          {top_cancers.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Aucun diagnostic enregistré</div>
          ) : (
            <div style={{ marginTop:4 }}>
              {top_cancers.map((c, i) => (
                <HBar key={c.topographie_code}
                  label={`${c.topographie_code} – ${c.topographie_libelle}`}
                  value={c.count} max={maxCancer}
                  color={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Distribution par âge" sub="Âge au diagnostic">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={tranches_age} margin={{ top:5, right:10, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="tranche" tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Patients" radius={[5,5,0,0]}>
                {tranches_age.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Traitements + Wilayas ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <ChartCard title="Répartition des traitements" sub="Par type de traitement administré">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={traitements_types} layout="vertical" margin={{ top:0, right:20, bottom:0, left:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number"   tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="type" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Total" radius={[0,5,5,0]}>
                {traitements_types.map((t, i) => <Cell key={i} fill={t.color || CHART_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top wilayas" sub="Patients par wilaya de résidence">
          {top_wilayas.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Aucune wilaya renseignée</div>
          ) : (
            <div style={{ marginTop:4, maxHeight:220, overflowY:'auto' }}>
              {top_wilayas.map((w, i) => (
                <HBar key={w.wilaya} label={w.wilaya} value={w.count} max={maxWilaya} color={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Carte Algérie ── */}
      <div style={{ marginBottom:16 }}>
        <ChartCard
          title="Carte d'Algerie par wilaya"
          sub="Dégradé bleu selon le nombre de cas. Gris si aucun cas. Cliquez sur une wilaya pour filtrer le dashboard."
          span={2}
        >
          <AlgeriaHeatmap
            data={top_wilayas}
            selectedWilaya={filters.wilaya}
            onSelectWilaya={handleSelectWilaya}
          />
        </ChartCard>
      </div>

      {/* ── Activité + Réponses chimio ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        <ChartCard title="Activité — 30 derniers jours">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:4 }}>
            {[
              { label:'Nouveaux patients',    val:activite_recente.nouveaux_patients,    color:'#2563eb' },
              { label:'Nouveaux diagnostics', val:activite_recente.nouveaux_diagnostics, color:'#7c3aed' },
              { label:'Nouvelles chimios',    val:activite_recente.nouveaux_chimio,      color:'#d97706' },
              { label:'Nouvelles chirurgies', val:activite_recente.nouvelles_chirurgies, color:'#dc2626' },
            ].map(item => (
              <div key={item.label} style={{ background:`${item.color}08`, border:`1px solid ${item.color}20`, borderRadius:12, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:item.color, opacity:0.6 }} />
                <div style={{ fontSize:26, fontWeight:800, fontFamily:'var(--font-display)', color:item.color, marginBottom:4 }}>{item.val}</div>
                <div style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Réponses aux chimiothérapies" sub="Évaluation tumorale">
          {reponses_chimio.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Aucune évaluation enregistrée</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reponses_chimio} margin={{ top:5, right:10, bottom:0, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="reponse_tumorale" tick={{ fill:'#94a3b8', fontSize:12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Patients" radius={[5,5,0,0]}>
                  {reponses_chimio.map((r, i) => <Cell key={i} fill={REPONSE_COLORS[r.reponse_tumorale] || '#94a3b8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Accès rapides ── */}
      <div style={{ background:'#fff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:14, padding:'18px 22px', boxShadow:'0 2px 8px rgba(15,23,42,0.06)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.2, marginBottom:14 }}>Accès rapides</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { to:'/patients/nouveau',                   label:'+ Nouveau patient',    color:'#2563eb' },
            { to:'/diagnostics/nouveau',                label:'+ Nouveau diagnostic', color:'#7c3aed' },
            { to:'/traitements/nouveau?type=chimio',    label:'+ Nouvelle chimio',    color:'#d97706' },
            { to:'/traitements/nouveau?type=chirurgie', label:'+ Nouvelle chirurgie', color:'#dc2626' },
            { to:'/patients',                           label:'Liste patients',        color:'#16a34a' },
            { to:'/traitements',                        label:'Traitements',           color:'#0891b2' },
          ].map(item => (
            <Link key={item.to} to={item.to} style={{ textDecoration:'none' }}>
              <div
                style={{ padding:'8px 16px', background:`${item.color}08`, border:`1px solid ${item.color}20`, borderRadius:10, color:item.color, fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background=`${item.color}18`; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background=`${item.color}08`; e.currentTarget.style.transform='none'; }}
              >
                {item.label}
              </div>
            </Link>
          ))}
        </div>
      </div>

    </AppLayout>
  );
}
