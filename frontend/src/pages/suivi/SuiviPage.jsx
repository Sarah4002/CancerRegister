import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { suiviService } from '../../services/suiviService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

const EVOLUTION_COLORS = {
 stable: { color:'#2563eb', bg:'rgba(0,168,255,0.1)', label:'Stable' },
 regression: { color:'#16a34a', bg:'rgba(0,229,160,0.1)', label:'Régression' },
 progression:{ color:'#dc2626', bg:'rgba(255,77,106,0.1)', label:'Progression' },
 remission: { color:'#22c55e', bg:'rgba(74,222,128,0.1)', label:'Rémission' },
 inconnu: { color:'#64748b', bg:'rgba(156,163,175,0.1)',label:'Non évaluable' },
};
const STATUT_COLORS = {
 planifiee: { color:'#7c3aed', bg:'rgba(155,138,251,0.1)' },
 realisee: { color:'#16a34a', bg:'rgba(0,229,160,0.1)' },
 annulee: { color:'#dc2626', bg:'rgba(255,77,106,0.1)' },
 reportee: { color:'#d97706', bg:'rgba(245,166,35,0.1)' },
};
const SEVERITE_COLORS = { '1':'#16a34a','2':'#d97706','3':'#ff7832','4':'#dc2626','5':'#6b7280' };
const EFFET_TYPE_LABELS = {
 hemato:'Hématologique', digestif:'Digestif', cutane:'Cutané',
 neuro:'Neurologique', cardiaque:'Cardiaque', hepatique:'Hépatique',
 renal:'Rénal', pulmo:'Pulmonaire', fatigue:'Fatigue', douleur:'Douleur',
 psycho:'Psychologique', autre:'Autre',
};

function Badge({ label, color, bg }) {
 return <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, background:bg||`${color}18`, color, border:`1px solid ${color}30` }}>{label}</span>;
}
function PSBadge({ ps }) {
 if (ps === null || ps === undefined) return <span style={{ color:'#64748b', fontSize:12 }}>—</span>;
 const colors = ['#16a34a','#22c55e','#d97706','#ff7832','#dc2626'];
 return <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700, fontFamily:'var(--font-mono)', background:`${colors[ps]}18`, color:colors[ps], border:`1px solid ${colors[ps]}30` }}>PS {ps}</span>;
}


function StatutVitalBadge({ statut }) {
  if (!statut) return <span style={{ color:'#64748b', fontSize:12 }}>—</span>;
  const isDeces = statut === 'decede' || statut === 'décédé';
  return (
    <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600,
      background: isDeces ? 'rgba(107,114,128,0.15)' : 'rgba(0,229,160,0.12)',
      color: isDeces ? '#6b7280' : '#16a34a',
      border: `1px solid ${isDeces ? '#6b728030' : '#16a34a30'}` }}>
      {isDeces ? 'Décédé' : 'Vivant'}
    </span>
  );
}

// ── Section Consultations ─────────────────────────────────────────
function SectionConsultations({ onNew }) {
 const navigate = useNavigate();
 const [data, setData] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [statut, setStatut] = useState('');

 const load = useCallback(async () => {
 setLoading(true);
 try {
 const params = {};
 if (search) params.search = search;
 if (statut) params.statut = statut;
 const { data: res } = await suiviService.consultations.list(params);
 setData(res.results || res);
 } catch { toast.error('Erreur chargement consultations'); }
 finally { setLoading(false); }
 }, [search, statut]);

 useEffect(() => { load(); }, [load]);

 return (
 <div>
 <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
 <SearchBox value={search} onChange={setSearch} placeholder="Rechercher patient, motif..." />
 <select value={statut} onChange={e => setStatut(e.target.value)} style={selSt}>
 <option value="">Statut : Tous</option>
 <option value="planifiee">Planifiée</option>
 <option value="realisee">Réalisée</option>
 <option value="annulee">Annulée</option>
 <option value="reportee">Reportée</option>
 </select>
 <button onClick={onNew} style={addBtnStyle('#7c3aed')}>+ Nouvelle consultation</button>
 </div>
 <TableCard loading={loading} empty={data.length === 0} emptyText="Aucune consultation trouvée">
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ background:'#f1f5f9' }}>
 {['Patient','Dossier','Type','Date','PS ECOG','Statut vital','Rechute','Évolution','Statut','Prochain RDV',''].map(h => <th key={h} style={thSt}>{h}</th>)}
 </tr>
 </thead>
 <tbody>
 {data.map((c, i) => {
 const sc = STATUT_COLORS[c.statut] || STATUT_COLORS.planifiee;
 const ec = EVOLUTION_COLORS[c.evolution_maladie];
 return (
 <tr key={c.id} onClick={() => navigate(`/suivi/consultations/${c.id}`)}
 style={{ cursor:'pointer', borderBottom:'1px solid rgba(37,99,235,0.12)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}
 onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
 onMouseLeave={e => e.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,0.01)'}
 >
 <td style={tdSt}>
 <div style={{ fontWeight:600, fontSize:13 }}>{c.patient_nom}</div>
 <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#2563eb' }}>{c.patient_numero}</div>
 </td>
 <td style={tdSt}><span style={{ fontSize:12, color:'#334155' }}>{c.type_label}</span></td>
 <td style={{ ...tdSt, fontFamily:'var(--font-mono)', fontSize:12 }}>{new Date(c.date_consultation).toLocaleDateString('fr-DZ')}</td>
 <td style={tdSt}><PSBadge ps={c.ps_ecog} /></td>
 <td style={{ ...tdSt, fontFamily:'var(--font-mono)', fontSize:12 }}>{c.poids_kg ? `${c.poids_kg} kg` : '—'}</td>
 <td style={tdSt}>
 {c.rechute
 ? <span style={{ fontSize:11, fontWeight:600, color:'#dc2626' }}>↩ {c.nombre_rechutes || 1}x</span>
 : <span style={{ fontSize:11, color:'#64748b' }}>—</span>}
 </td>
 <td style={tdSt}>{ec ? <Badge label={ec.label} color={ec.color} bg={ec.bg} /> : <span style={{ color:'#64748b', fontSize:12 }}>—</span>}</td>
 <td style={tdSt}><Badge label={c.statut_label} color={sc.color} bg={sc.bg} /></td>
 <td style={{ ...tdSt, fontFamily:'var(--font-mono)', fontSize:11, color:'#64748b' }}>
 {c.prochaine_consultation ? new Date(c.prochaine_consultation).toLocaleDateString('fr-DZ') : '—'}
 </td>
 <td style={tdSt} onClick={e => e.stopPropagation()}>
 <Link to={`/suivi/consultations/${c.id}`} style={{ textDecoration:'none' }}>
 <button style={viewBtnSt}>Voir</button>
 </Link>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </TableCard>
 </div>
 );
}


// ── Section Effets Indésirables ───────────────────────────────────
function SectionEffets({ onNew }) {
 const [data, setData] = useState([]);
 const [loading, setLoading] = useState(true);
 const [typeFilter, setTypeFilter] = useState('');

 const load = useCallback(async () => {
 setLoading(true);
 try {
 const params = {};
 if (typeFilter) params.type_effet = typeFilter;
 const { data: res } = await suiviService.effets.list(params);
 setData(res.results || res);
 } catch { toast.error('Erreur chargement effets indésirables'); }
 finally { setLoading(false); }
 }, [typeFilter]);

 useEffect(() => { load(); }, [load]);

 return (
 <div>
 <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
 <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selSt}>
 <option value="">Type : Tous</option>
 <option value="hemato">Hématologique</option>
 <option value="digestif">Digestif</option>
 <option value="cutane">Cutané</option>
 <option value="neuro">Neurologique</option>
 <option value="cardiaque">Cardiaque</option>
 <option value="fatigue">Fatigue</option>
 <option value="douleur">Douleur</option>
 <option value="autre">Autre</option>
 </select>
 <button onClick={onNew} style={addBtnStyle('#7c3aed')}>+ Nouvel effet indésirable</button>
 </div>
 <TableCard loading={loading} empty={data.length === 0} emptyText="Aucun effet indésirable enregistré">
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ background:'#f1f5f9' }}>
 {['Patient','Médicament','Type','Sévérité','Date','Impact traitement','Résolu',''].map(h => <th key={h} style={thSt}>{h}</th>)}
 </tr>
 </thead>
 <tbody>
 {data.map((e, i) => {
 const sevColor = SEVERITE_COLORS[e.severite] || '#9ca3af';
 return (
 <tr key={e.id}
 style={{ borderBottom:'1px solid rgba(37,99,235,0.12)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}
 onMouseEnter={el => el.currentTarget.style.background='#eff6ff'}
 onMouseLeave={el => el.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,0.01)'}
 >
 <td style={tdSt}>
 <div style={{ fontWeight:600, fontSize:13 }}>{e.patient_nom}</div>
 <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#2563eb' }}>{e.patient_numero}</div>
 </td>
 <td style={{ ...tdSt, fontWeight:500, fontSize:13 }}>{e.medicament_cause}</td>
 <td style={tdSt}><Badge label={EFFET_TYPE_LABELS[e.type_effet] || e.type_effet} color="#7c3aed" /></td>
 <td style={tdSt}>
 <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color:sevColor, background:`${sevColor}18`, padding:'2px 8px', borderRadius:6, border:`1px solid ${sevColor}30` }}>
 G{e.severite}
 </span>
 </td>
 <td style={{ ...tdSt, fontFamily:'var(--font-mono)', fontSize:12 }}>{new Date(e.date_apparition).toLocaleDateString('fr-DZ')}</td>
 <td style={tdSt}><span style={{ fontSize:11, color:'#334155' }}>{e.impact_traitement_label || e.impact_traitement || '—'}</span></td>
 <td style={tdSt}><span style={{ fontSize:11, color: e.resolu ? '#16a34a' : '#d97706' }}>{e.resolu ? 'Résolu' : 'En cours'}</span></td>
 <td style={tdSt}><button style={viewBtnSt}>Voir</button></td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </TableCard>
 </div>
 );
}

// ── Page principale ───────────────────────────────────────────────
export default function SuiviPage() {
 const navigate = useNavigate();
 const [tab, setTab] = useState('consultations');
 const [stats, setStats] = useState(null);
 const [aVenir, setAVenir] = useState([]);

 useEffect(() => {
 suiviService.consultations.stats().then(({ data }) => setStats(data)).catch(() => {});
 suiviService.consultations.aVenir().then(({ data }) => setAVenir(data || [])).catch(() => {});
 }, []);

 const TABS = [
 { key:'consultations', label:'Consultations', color:'#7c3aed' },
 { key:'effets', label:'Effets indésirables', color:'#d97706' },
 { key:'agenda', label:'Agenda', color:'#2563eb' },
 ];

 return (
 <AppLayout title="Suivi Clinique">
 {/* Stats */}
 {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          <StatCard label="Nouveaux cas"           value={stats.nouveaux_cas ?? '—'}       color="#7c3aed" sub="Patients enregistrés" />
          <StatCard label="Rechutes"               value={stats.total_rechutes ?? '—'}      color="#d97706" sub="Patients en rechute" />
          <StatCard label="Décès"                  value={stats.total_deces ?? '—'}         color="#6b7280" sub="Patients décédés" />
          <StatCard label="Effets indésirables"    value={stats.effets_non_resolus ?? '—'}  color="#dc2626" sub="Non résolus" />
        </div>
      )}

      {/* Tabs */}
 <div style={{ display:'flex', background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden', marginBottom:16 }}>
 {TABS.map(t => (
 <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom:`2px solid ${tab===t.key?t.color:'transparent'}`, color:tab===t.key?t.color:'#64748b', fontSize:12.5, fontWeight:tab===t.key?600:400, cursor:'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap' }}>
 {t.label}
 </button>
 ))}
 </div>

 {tab === 'consultations' && <SectionConsultations onNew={() => navigate('/suivi/consultations/nouveau')} />}
 {tab === 'effets' && <SectionEffets onNew={() => navigate('/suivi/evenements/nouveau')} />}
 {tab === 'agenda' && <AgendaAVenir data={aVenir} />}
 </AppLayout>
 );
}

// ── Agenda ────────────────────────────────────────────────────────
function AgendaAVenir({ data }) {
 const navigate = useNavigate();
 if (data.length === 0) return (
 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:56, textAlign:'center' }}>
 <div style={{ fontSize:40, marginBottom:12 }}></div>
 <div style={{ color:'#64748b', fontSize:14 }}>Aucune consultation planifiée</div>
 </div>
 );
 const byDate = {};
 data.forEach(c => { const d = c.date_consultation; if (!byDate[d]) byDate[d] = []; byDate[d].push(c); });
 return (
 <div>
 {Object.entries(byDate).map(([date, consults]) => (
 <div key={date} style={{ marginBottom:16 }}>
 <div style={{ fontSize:12, fontWeight:700, color:'#64748b', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
 <div style={{ height:1, flex:1, background:'rgba(37,99,235,0.12)' }} />
 {new Date(date).toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long' })}
 <div style={{ height:1, flex:1, background:'rgba(37,99,235,0.12)' }} />
 </div>
 {consults.map(c => (
 <div key={c.id} onClick={() => navigate(`/suivi/consultations/${c.id}`)}
 style={{ background:'#ffffff', border:'1px solid rgba(155,138,251,0.2)', borderLeft:'3px solid #7c3aed', borderRadius:'12px', padding:'12px 16px', marginBottom:8, cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}
 onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
 onMouseLeave={e => e.currentTarget.style.background='#ffffff'}
 >
 <div style={{ flex:1 }}>
 <div style={{ fontWeight:600, fontSize:13, color:'#0f172a', marginBottom:2 }}>{c.patient_nom}</div>
 <div style={{ fontSize:11, color:'#64748b' }}>{c.type_label}</div>
 </div>
 <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#2563eb' }}>{c.patient_numero}</div>
 <PSBadge ps={c.ps_ecog} />
 </div>
 ))}
 </div>
 ))}
 </div>
 );
}

// ── Sub-components ────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'14px 16px', borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:28, fontWeight:700, color, fontFamily:'var(--font-display)', marginBottom:2 }}>{value ?? '—'}</div>
      <div style={{ fontSize:12, color:'#0f172a', fontWeight:500, marginBottom:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:'#64748b' }}>{sub}</div>}
    </div>
  );
}
function TableCard({ loading, empty, emptyText, children }) {
 return (
 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden' }}>
 {loading ? (
 <div style={{ padding:48, textAlign:'center', color:'#64748b' }}>
 <div style={{ width:28, height:28, border:'3px solid rgba(37,99,235,0.12)', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }} />
 Chargement...
 </div>
 ) : empty ? (
 <div style={{ padding:56, textAlign:'center' }}>
 <div style={{ fontSize:13, color:'#64748b' }}>{emptyText}</div>
 </div>
 ) : children}
 </div>
 );
}
function SearchBox({ value, onChange, placeholder }) {
 return (
 <div style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8, background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'12px', padding:'7px 12px' }}>
 <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748b"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
 <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:12.5, color:'#0f172a', fontFamily:'var(--font-body)' }} />
 </div>
 );
}
const thSt = { padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:600, letterSpacing:0.5, color:'#64748b', textTransform:'uppercase', borderBottom:'1px solid rgba(37,99,235,0.12)', whiteSpace:'nowrap' };
const tdSt = { padding:'11px 12px', verticalAlign:'middle' };
const selSt = { padding:'7px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'12px', color:'#334155', fontSize:12, cursor:'pointer', outline:'none' };
const viewBtnSt = { padding:'4px 10px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:6, color:'#334155', fontSize:11, cursor:'pointer' };
const addBtnStyle = (color) => ({ padding:'8px 16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border:'none', borderRadius:'12px', color:'#fff', fontSize:12.5, fontWeight:600, cursor:'pointer', marginLeft:'auto', fontFamily:'var(--font-display)' });