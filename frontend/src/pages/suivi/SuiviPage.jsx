import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { suiviService } from '../../services/suiviService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

const EVOLUTION_COLORS = {
 stable: { color:'#00a8ff', bg:'rgba(0,168,255,0.1)', label:'Stable' },
 regression: { color:'#00e5a0', bg:'rgba(0,229,160,0.1)', label:'Régression' },
 progression:{ color:'#ff4d6a', bg:'rgba(255,77,106,0.1)', label:'Progression' },
 remission: { color:'#4ade80', bg:'rgba(74,222,128,0.1)', label:'Rémission' },
 inconnu: { color:'#9ca3af', bg:'rgba(156,163,175,0.1)',label:'Non évaluable' },
};
const STATUT_COLORS = {
 planifiee: { color:'#9b8afb', bg:'rgba(155,138,251,0.1)' },
 realisee: { color:'#00e5a0', bg:'rgba(0,229,160,0.1)' },
 annulee: { color:'#ff4d6a', bg:'rgba(255,77,106,0.1)' },
 reportee: { color:'#f5a623', bg:'rgba(245,166,35,0.1)' },
};
const SEVERITE_COLORS = { '1':'#00e5a0','2':'#f5a623','3':'#ff7832','4':'#ff4d6a','5':'#6b7280' };
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
 if (ps === null || ps === undefined) return <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>;
 const colors = ['#00e5a0','#4ade80','#f5a623','#ff7832','#ff4d6a'];
 return <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700, fontFamily:'var(--font-mono)', background:`${colors[ps]}18`, color:colors[ps], border:`1px solid ${colors[ps]}30` }}>PS {ps}</span>;
}


function StatutVitalBadge({ statut }) {
  if (!statut) return <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>;
  const isDeces = statut === 'decede' || statut === 'décédé';
  return (
    <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600,
      background: isDeces ? 'rgba(107,114,128,0.15)' : 'rgba(0,229,160,0.12)',
      color: isDeces ? '#6b7280' : '#00e5a0',
      border: `1px solid ${isDeces ? '#6b728030' : '#00e5a030'}` }}>
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
 <button onClick={onNew} style={addBtnStyle('#9b8afb')}>+ Nouvelle consultation</button>
 </div>
 <TableCard loading={loading} empty={data.length === 0} emptyText="Aucune consultation trouvée">
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ background:'var(--bg-elevated)' }}>
 {['Patient','Dossier','Type','Date','PS ECOG','Statut vital','Rechute','Évolution','Statut','Prochain RDV',''].map(h => <th key={h} style={thSt}>{h}</th>)}
 </tr>
 </thead>
 <tbody>
 {data.map((c, i) => {
 const sc = STATUT_COLORS[c.statut] || STATUT_COLORS.planifiee;
 const ec = EVOLUTION_COLORS[c.evolution_maladie];
 return (
 <tr key={c.id} onClick={() => navigate(`/suivi/consultations/${c.id}`)}
 style={{ cursor:'pointer', borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}
 onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
 onMouseLeave={e => e.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,0.01)'}
 >
 <td style={tdSt}>
 <div style={{ fontWeight:600, fontSize:13 }}>{c.patient_nom}</div>
 <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--accent)' }}>{c.patient_numero}</div>
 </td>
 <td style={tdSt}><span style={{ fontSize:12, color:'var(--text-secondary)' }}>{c.type_label}</span></td>
 <td style={{ ...tdSt, fontFamily:'var(--font-mono)', fontSize:12 }}>{new Date(c.date_consultation).toLocaleDateString('fr-DZ')}</td>
 <td style={tdSt}><PSBadge ps={c.ps_ecog} /></td>
 <td style={{ ...tdSt, fontFamily:'var(--font-mono)', fontSize:12 }}>{c.poids_kg ? `${c.poids_kg} kg` : '—'}</td>
 <td style={tdSt}>
 {c.rechute
 ? <span style={{ fontSize:11, fontWeight:600, color:'#ff4d6a' }}>↩ {c.nombre_rechutes || 1}x</span>
 : <span style={{ fontSize:11, color:'var(--text-muted)' }}>—</span>}
 </td>
 <td style={tdSt}>{ec ? <Badge label={ec.label} color={ec.color} bg={ec.bg} /> : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>}</td>
 <td style={tdSt}><Badge label={c.statut_label} color={sc.color} bg={sc.bg} /></td>
 <td style={{ ...tdSt, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
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
 <button onClick={onNew} style={addBtnStyle('#9b8afb')}>+ Nouvel effet indésirable</button>
 </div>
 <TableCard loading={loading} empty={data.length === 0} emptyText="Aucun effet indésirable enregistré">
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ background:'var(--bg-elevated)' }}>
 {['Patient','Médicament','Type','Sévérité','Date','Impact traitement','Résolu',''].map(h => <th key={h} style={thSt}>{h}</th>)}
 </tr>
 </thead>
 <tbody>
 {data.map((e, i) => {
 const sevColor = SEVERITE_COLORS[e.severite] || '#9ca3af';
 return (
 <tr key={e.id}
 style={{ borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}
 onMouseEnter={el => el.currentTarget.style.background='var(--bg-hover)'}
 onMouseLeave={el => el.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,0.01)'}
 >
 <td style={tdSt}>
 <div style={{ fontWeight:600, fontSize:13 }}>{e.patient_nom}</div>
 <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--accent)' }}>{e.patient_numero}</div>
 </td>
 <td style={{ ...tdSt, fontWeight:500, fontSize:13 }}>{e.medicament_cause}</td>
 <td style={tdSt}><Badge label={EFFET_TYPE_LABELS[e.type_effet] || e.type_effet} color="#9b8afb" /></td>
 <td style={tdSt}>
 <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color:sevColor, background:`${sevColor}18`, padding:'2px 8px', borderRadius:6, border:`1px solid ${sevColor}30` }}>
 G{e.severite}
 </span>
 </td>
 <td style={{ ...tdSt, fontFamily:'var(--font-mono)', fontSize:12 }}>{new Date(e.date_apparition).toLocaleDateString('fr-DZ')}</td>
 <td style={tdSt}><span style={{ fontSize:11, color:'var(--text-secondary)' }}>{e.impact_traitement_label || e.impact_traitement || '—'}</span></td>
 <td style={tdSt}><span style={{ fontSize:11, color: e.resolu ? '#00e5a0' : '#f5a623' }}>{e.resolu ? 'Résolu' : 'En cours'}</span></td>
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
 { key:'consultations', label:'Consultations', color:'#9b8afb' },
 { key:'effets', label:'Effets indésirables', color:'#f5a623' },
 { key:'agenda', label:'Agenda', color:'#00a8ff' },
 ];

 return (
 <AppLayout title="Suivi Clinique">
 {/* Stats */}
 {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          <StatCard label="Nouveaux cas"           value={stats.nouveaux_cas ?? '—'}       color="#9b8afb" sub="Patients enregistrés" />
          <StatCard label="Rechutes"               value={stats.total_rechutes ?? '—'}      color="#f5a623" sub="Patients en rechute" />
          <StatCard label="Décès"                  value={stats.total_deces ?? '—'}         color="#6b7280" sub="Patients décédés" />
          <StatCard label="Effets indésirables"    value={stats.effets_non_resolus ?? '—'}  color="#ff4d6a" sub="Non résolus" />
        </div>
      )}

      {/* Tabs */}
 <div style={{ display:'flex', background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', overflow:'hidden', marginBottom:16 }}>
 {TABS.map(t => (
 <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom:`2px solid ${tab===t.key?t.color:'transparent'}`, color:tab===t.key?t.color:'var(--text-muted)', fontSize:12.5, fontWeight:tab===t.key?600:400, cursor:'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap' }}>
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
 <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', padding:56, textAlign:'center' }}>
 <div style={{ fontSize:40, marginBottom:12 }}></div>
 <div style={{ color:'var(--text-muted)', fontSize:14 }}>Aucune consultation planifiée</div>
 </div>
 );
 const byDate = {};
 data.forEach(c => { const d = c.date_consultation; if (!byDate[d]) byDate[d] = []; byDate[d].push(c); });
 return (
 <div>
 {Object.entries(byDate).map(([date, consults]) => (
 <div key={date} style={{ marginBottom:16 }}>
 <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
 <div style={{ height:1, flex:1, background:'var(--border)' }} />
 {new Date(date).toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long' })}
 <div style={{ height:1, flex:1, background:'var(--border)' }} />
 </div>
 {consults.map(c => (
 <div key={c.id} onClick={() => navigate(`/suivi/consultations/${c.id}`)}
 style={{ background:'var(--bg-card)', border:'1px solid rgba(155,138,251,0.2)', borderLeft:'3px solid #9b8afb', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:8, cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}
 onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
 onMouseLeave={e => e.currentTarget.style.background='var(--bg-card)'}
 >
 <div style={{ flex:1 }}>
 <div style={{ fontWeight:600, fontSize:13, color:'var(--text-primary)', marginBottom:2 }}>{c.patient_nom}</div>
 <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.type_label}</div>
 </div>
 <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--accent)' }}>{c.patient_numero}</div>
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
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', padding:'14px 16px', borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:28, fontWeight:700, color, fontFamily:'var(--font-display)', marginBottom:2 }}>{value ?? '—'}</div>
      <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500, marginBottom:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}
function TableCard({ loading, empty, emptyText, children }) {
 return (
 <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
 {loading ? (
 <div style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>
 <div style={{ width:28, height:28, border:'3px solid var(--border)', borderTopColor:'#9b8afb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }} />
 Chargement...
 </div>
 ) : empty ? (
 <div style={{ padding:56, textAlign:'center' }}>
 <div style={{ fontSize:13, color:'var(--text-muted)' }}>{emptyText}</div>
 </div>
 ) : children}
 </div>
 );
}
function SearchBox({ value, onChange, placeholder }) {
 return (
 <div style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'7px 12px' }}>
 <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
 <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:12.5, color:'var(--text-primary)', fontFamily:'var(--font-body)' }} />
 </div>
 );
}
const thSt = { padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:600, letterSpacing:0.5, color:'var(--text-muted)', textTransform:'uppercase', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' };
const tdSt = { padding:'11px 12px', verticalAlign:'middle' };
const selSt = { padding:'7px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:12, cursor:'pointer', outline:'none' };
const viewBtnSt = { padding:'4px 10px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-secondary)', fontSize:11, cursor:'pointer' };
const addBtnStyle = (color) => ({ padding:'8px 16px', background:`linear-gradient(135deg, ${color}, ${color}cc)`, border:'none', borderRadius:'var(--radius-md)', color:'#fff', fontSize:12.5, fontWeight:600, cursor:'pointer', marginLeft:'auto', fontFamily:'var(--font-display)' });