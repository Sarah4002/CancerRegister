import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rcpService } from '../../services/rcpService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

const STATUT_CFG = {
  planifiee: { color:'#7c3aed', label:'Planifiée' },
  en_cours:  { color:'#2563eb', label:'En cours'  },
  terminee:  { color:'#16a34a', label:'Terminée'  },
  annulee:   { color:'#dc2626', label:'Annulée'   },
  reportee:  { color:'#d97706', label:'Reportée'  },
};

const TYPE_ICONS = {
  sein:'', digestif:'', poumon:'', orl:'', gyneco:'',
  uro:'', hemato:'', neuro:'', dermato:'', os:'',
  pediatrique:'', palliative:'', generale:'',
};

function StatutBadge({ statut, label }) {
  const c = STATUT_CFG[statut] || { color:'#64748b' };
  return (
    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500,
      background:`${c.color}18`, color:c.color, border:`1px solid ${c.color}30` }}>
      {label || c.label}
    </span>
  );
}

export default function RCPPage() {
  const navigate = useNavigate();
  const [reunions, setReunions]   = useState([]);
  const [stats, setStats]         = useState(null);
  const [prochaines, setProchaines] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');

  const fetchReunions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (statutFilter) params.statut = statutFilter;
      if (typeFilter)   params.type_rcp = typeFilter;
      const { data } = await rcpService.reunions.list(params);
      setReunions(data.results || data);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, [search, statutFilter, typeFilter]);

  useEffect(() => { fetchReunions(); }, [fetchReunions]);
  useEffect(() => {
    rcpService.reunions.stats().then(({ data }) => setStats(data)).catch(() => {});
    rcpService.reunions.prochaines().then(({ data }) => setProchaines(data || [])).catch(() => {});
  }, []);

  return (
    <AppLayout title="RCP – Réunions de Concertation Pluridisciplinaire">

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Réunions totales',    value:stats.total,               color:'#2563eb' },
            { label:'Dossiers discutés',   value:stats.total_dossiers,      color:'#7c3aed' },
            { label:'Décisions prises',    value:stats.total_decisions,     color:'#16a34a' },
            { label:'Décisions en attente',value:stats.decisions_en_attente,color:'#d97706' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', border:'1px solid rgba(37,99,235,0.1)', borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden', boxShadow:'0 2px 8px rgba(15,23,42,0.06)' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${s.color}, ${s.color}88)`, borderRadius:'14px 14px 0 0' }} />
              <div style={{ minHeight:22, marginBottom:6 }} />
              <div style={{ fontSize:26, fontWeight:800, fontFamily:'var(--font-display)', color:s.color, marginBottom:3 }}>{s.value ?? '—'}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#334155' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Prochaines RCPs */}
      {prochaines.length > 0 && (
        <div style={{ background:'#ffffff', border:'1px solid rgba(0,168,255,0.2)', borderRadius:'12px', padding:'14px 18px', marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#2563eb', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>Prochaines réunions planifiées</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {prochaines.slice(0,4).map(r => (
              <Link key={r.id} to={`/rcp/${r.id}`} style={{ textDecoration:'none' }}>
                <div style={{ padding:'8px 14px', background:'rgba(0,168,255,0.08)', border:'1px solid rgba(0,168,255,0.2)', borderRadius:'12px', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(0,168,255,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(0,168,255,0.08)'}
                >
                  <div style={{ fontSize:12, fontWeight:600, color:'#0f172a', marginBottom:2 }}>
                    {TYPE_ICONS[r.type_rcp]} {r.titre}
                  </div>
                  <div style={{ fontSize:10, color:'#2563eb', fontFamily:'var(--font-mono)' }}>
                    {new Date(r.date_reunion).toLocaleDateString('fr-DZ', { day:'numeric', month:'short' })} à {r.heure_debut?.slice(0,5)}
                    {r.nombre_dossiers > 0 && ` · ${r.nombre_dossiers} dossiers`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'12px 16px', display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8, background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'12px', padding:'7px 12px' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748b"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par titre, lieu..."
            style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:12.5, color:'#0f172a', fontFamily:'var(--font-body)' }} />
        </div>
        <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)}
          style={{ padding:'7px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'12px', color:'#334155', fontSize:12, outline:'none', cursor:'pointer' }}>
          <option value="">Statut : Tous</option>
          {Object.entries(STATUT_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding:'7px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'12px', color:'#334155', fontSize:12, outline:'none', cursor:'pointer' }}>
          <option value="">Type : Tous</option>
          <option value="sein">Sein</option>
          <option value="digestif">Digestif</option>
          <option value="poumon">Thoracique</option>
          <option value="gyneco">Gynécologique</option>
          <option value="hemato">Hématologique</option>
          <option value="generale">Générale</option>
        </select>
        <Link to="/rcp/nouveau" style={{ textDecoration:'none', marginLeft:'auto' }}>
          <button style={{ padding:'8px 16px', background:'linear-gradient(135deg, #2563eb, #2563eb)', border:'none', borderRadius:'12px', color:'#fff', fontSize:12.5, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'var(--font-display)' }}>
            + Nouvelle RCP
          </button>
        </Link>
      </div>

      {/* Liste */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? (
          <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:48, textAlign:'center', color:'#64748b' }}>
            <div style={{ width:32, height:32, border:'3px solid rgba(37,99,235,0.12)', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
            Chargement...
          </div>
        ) : reunions.length === 0 ? (
          <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:56, textAlign:'center' }}>
            <div style={{ fontSize:14, color:'#64748b', marginBottom:16 }}>Aucune réunion RCP trouvée</div>
            <Link to="/rcp/nouveau"><button style={{ padding:'8px 20px', background:'linear-gradient(135deg,#2563eb,#2563eb)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer' }}>Créer la première RCP</button></Link>
          </div>
        ) : reunions.map(r => (
          <div key={r.id}
            onClick={() => navigate(`/rcp/${r.id}`)}
            style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'16px 20px', cursor:'pointer', transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,168,255,0.3)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,168,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(37,99,235,0.08)'; e.currentTarget.style.boxShadow='none'; }}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
              {/* Infos principales */}
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:20 }}>{TYPE_ICONS[r.type_rcp]}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:'#0f172a', fontFamily:'var(--font-display)' }}>{r.titre}</div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>{r.type_label}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  <InfoChip val={new Date(r.date_reunion).toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} />
                  <InfoChip val={`${r.heure_debut?.slice(0,5)}${r.heure_fin ? ' – '+r.heure_fin.slice(0,5) : ''}`} />
                  {r.lieu && <InfoChip val={r.lieu} />}
                  {r.coordinateur_nom && <InfoChip val={r.coordinateur_nom} />}
                </div>
              </div>
              {/* Métriques + statut */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                <StatutBadge statut={r.statut} label={r.statut_label} />
                <div style={{ display:'flex', gap:12 }}>
                  <Metric val={r.nombre_dossiers} label="dossiers" color="#7c3aed" />
                  <Metric val={r.nombre_membres_presents} label="membres" color="#2563eb" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

function InfoChip({ val }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11.5, color:'#334155' }}>
      {val}
    </span>
  );
}

function Metric({ val, label, color }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:16, fontWeight:700, color, fontFamily:'var(--font-display)' }}>{val}</div>
      <div style={{ fontSize:9, color:'#64748b', textTransform:'uppercase' }}>{label}</div>
    </div>
  );
}
