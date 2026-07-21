import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '../../components/layout/Sidebar';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const ACTION_CFG = {
  create:          { color:'#16a34a', label:'Création' },
  update:          { color:'#2563eb', label:'Modification' },
  delete:          { color:'#dc2626', label:'Suppression' },
  login:           { color:'#0891b2', label:'Connexion' },
  logout:          { color:'#64748b', label:'Déconnexion' },
  activate:        { color:'#16a34a', label:'Activation' },
  deactivate:      { color:'#d97706', label:'Désactivation' },
  reset_password:  { color:'#7c3aed', label:'Reset mot de passe' },
  role_change:     { color:'#9333ea', label:'Changement de rôle' },
  view:            { color:'#0d9488', label:'Consultation' },
  export:          { color:'#ca8a04', label:'Export' },
};

/* ─────────────────────────────────────────────────────────────────────────────
   BADGES
───────────────────────────────────────────────────────────────────────────── */
function ActionBadge({ action }) {
  const c = ACTION_CFG[action] || { color:'#64748b', label:action || '—' };
  return (
    <span style={{
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500,
      background:`${c.color}12`, color:c.color, border:`1px solid ${c.color}28`, whiteSpace:'nowrap',
    }}>{c.label}</span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function AuditLogsPage() {
  const [logs, setLogs]           = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [actionFilter, setAction] = useState('');
  const [selected, setSelected]   = useState(null);
  const isInitialLoad              = useRef(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      const { data } = await adminService.audit.list(params);
      setLogs(data.results || data || []);
    } catch {
      toast.error("Impossible de charger le journal d'audit.");
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter]);

  const fetchStats = useCallback(() => {
    if (adminService.audit.stats) {
      adminService.audit.stats().then(({ data }) => setStats(data)).catch(() => {});
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    // Afficher les premiers journaux sans attendre ; seule la recherche est temporisée.
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      fetchLogs();
      return undefined;
    }
    const timer = setTimeout(fetchLogs, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const actionCounts = logs.reduce((acc, l) => {
    acc[l.action] = (acc[l.action] || 0) + 1;
    return acc;
  }, {});

  return (
    <AppLayout title="Journal d'audit">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Stats strip */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Événements total',     val:stats.total,          color:'#2563eb' },
            { label:"Aujourd'hui",          val:stats.today,          color:'#16a34a' },
            { label:'Utilisateurs actifs',  val:stats.unique_users,   color:'#7c3aed' },
            { label:'Suppressions',         val:stats.deletes,        color:'#dc2626' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background:'#fff', border:'1px solid rgba(37,99,235,0.1)',
              borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden',
              boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:'14px 14px 0 0' }} />
              <div style={{ minHeight:22, marginBottom:6 }} />
              <div style={{ fontSize:30, fontWeight:800, color, fontFamily:'var(--font-display)', lineHeight:1, marginBottom:4 }}>{val ?? '—'}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#334155' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres actions rapides */}
      {Object.keys(actionCounts).length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {Object.entries(actionCounts).map(([action, n]) => {
            const cfg = ACTION_CFG[action] || { color:'#64748b', label:action };
            const active = actionFilter === action;
            return (
              <div key={action} onClick={() => setAction(active ? '' : action)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, cursor:'pointer',
                  background: active ? `${cfg.color}18` : '#fff',
                  border:`1px solid ${active ? cfg.color+'40' : 'rgba(37,99,235,0.15)'}`,
                  color:cfg.color, fontSize:12, fontWeight:500, boxShadow:'0 1px 4px rgba(15,23,42,0.05)' }}>
                {cfg.label} <span style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>({n})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border-light)',
        borderRadius:'var(--radius-md)', padding:'14px 18px',
        display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap',
      }}>
        {/* Search */}
        <div style={{
          flex:1, minWidth:220,
          display:'flex', alignItems:'center', gap:8,
          background:'#f8fafc', border:'1px solid var(--border)',
          borderRadius:'var(--radius-md)', padding:'8px 12px',
        }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Utilisateur, ressource, IP..."
            style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:13, color:'#0f172a', fontFamily:'var(--font-body)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b' }}>✕</button>
          )}
        </div>

        {/* Filtre action */}
        <select
          value={actionFilter}
          onChange={e => setAction(e.target.value)}
          style={{
            padding:'8px 12px', background:'var(--bg-elevated)',
            border:'1px solid var(--border)', borderRadius:'var(--radius-md)',
            color:'#334155', fontSize:12.5, cursor:'pointer', outline:'none',
          }}
        >
          <option value="">Action : Toutes</option>
          {Object.entries(ACTION_CFG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>

        {(search || actionFilter) && (
          <button
            onClick={() => { setSearch(''); setAction(''); }}
            style={{ padding:'8px 14px', background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'var(--radius-md)', color:'#dc2626', fontSize:12, cursor:'pointer' }}
          >
            Réinitialiser
          </button>
        )}

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <button
            onClick={fetchLogs}
            style={{
              padding:'9px 16px', background:'#fff', border:'1px solid rgba(37,99,235,0.2)',
              borderRadius:'var(--radius-md)', color:'#2563eb', fontSize:13, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 6px rgba(15,23,42,0.06)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 12a8 8 0 018-8M12 4l-2 2 2 2M20 12a8 8 0 01-8 8M12 20l2-2-2-2"/>
            </svg>
            Actualiser
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border-light)',
        borderRadius:'var(--radius-md)', overflow:'hidden',
      }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'#64748b' }}>
            <div style={{ width:32, height:32, border:'3px solid #dbeafe', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
            Chargement...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding:64, textAlign:'center' }}>
            <div style={{ fontSize:14, color:'#64748b' }}>Aucun événement trouvé</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-elevated)' }}>
                {['Utilisateur','Action','Ressource','Adresse IP','Date'].map((h, idx) => (
                  <th key={idx} style={{
                    padding:'10px 14px', textAlign:'left',
                    fontSize:11, fontWeight:600, letterSpacing:.5,
                    color:'#94a3b8', textTransform:'uppercase',
                    borderBottom:'1px solid rgba(37,99,235,0.06)', whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id}
                  onClick={() => setSelected(log)}
                  style={{
                    cursor:'pointer', borderBottom:'1px solid rgba(37,99,235,0.06)', transition:'background .1s',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:32, height:32, borderRadius:'50%',
                        background:`${ACTION_CFG[log.action]?.color || '#94a3b8'}18`,
                        border:`1px solid ${ACTION_CFG[log.action]?.color || '#94a3b8'}30`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13, fontWeight:700, color:ACTION_CFG[log.action]?.color || '#64748b',
                      }}>
                        {(log.user_display || log.user_email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{log.user_display || log.user_email || '—'}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{log.user_email && log.user_display ? log.user_email : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px' }}><ActionBadge action={log.action} /></td>
                  <td style={{ padding:'12px 14px', fontSize:12.5, color:'#334155' }}>
                    {log.resource || '—'} {log.resource_id ? <span style={{ color:'#94a3b8', fontFamily:'var(--font-mono)' }}>#{log.resource_id}</span> : ''}
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:11, color:'#64748b', fontFamily:'var(--font-mono)' }}>{log.ip_address || '—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:11, color:'#64748b', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && logs.length > 0 && (
          <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)' }}>
            <span style={{ fontSize:12, color:'#64748b' }}>{logs.length} événement(s) affiché(s)</span>
          </div>
        )}
      </div>

      {/* Modale détail */}
      {selected && (
        <div onClick={e => { if (e.target === e.currentTarget) setSelected(null); }} style={{
          position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)',
          zIndex:1500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .15s ease',
        }}>
          <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(15,23,42,0.22)', animation:'slideUp .2s ease' }}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(37,99,235,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:`${ACTION_CFG[selected.action]?.color || '#94a3b8'}18`, border:`1px solid ${ACTION_CFG[selected.action]?.color || '#94a3b8'}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:ACTION_CFG[selected.action]?.color || '#64748b' }}>
                  {(selected.user_display || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:15, color:'#0f172a' }}>{selected.user_display || selected.user_email || '—'}</div>
                  <div style={{ fontSize:11.5, color:'#94a3b8' }}>{selected.timestamp ? new Date(selected.timestamp).toLocaleString('fr-FR') : '—'}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#94a3b8', lineHeight:1, padding:'2px 6px' }}>×</button>
            </div>
            <div style={{ padding:'20px 24px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px', marginBottom:18 }}>
                {[
                  ['Action', <ActionBadge action={selected.action} />],
                  ['Ressource', `${selected.resource || '—'} ${selected.resource_id ? `#${selected.resource_id}` : ''}`],
                  ['Adresse IP', selected.ip_address || '—'],
                  ['User Agent', selected.user_agent || '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding:'7px 0', borderBottom:'1px solid rgba(37,99,235,0.08)' }}>
                    <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:12.5, color:'#0f172a', wordBreak:'break-word' }}>{val}</div>
                  </div>
                ))}
              </div>
              {selected.details && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Détails</div>
                  <pre style={{ background:'#f8fafc', border:'1px solid rgba(37,99,235,0.1)', borderRadius:10, padding:12, fontSize:11.5, color:'#334155', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                    {typeof selected.details === 'string' ? selected.details : JSON.stringify(selected.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
