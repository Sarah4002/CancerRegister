import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { adminService } from '../../services/adminService';
import { AppLayout } from '../../components/layout/Sidebar';

/* ── Config partagée avec AdminUsersPage / AuditLogsPage ── */
const ROLE_CFG = {
  admin:          { color:'#1d4ed8', label:'Administrateur' },
  doctor_chef:    { color:'#7c3aed', label:'Medecin Chef' },
  doctor:         { color:'#2563eb', label:'Medecin Oncologue' },
  secretaire:     { color:'#0891b2', label:'Secretaire' },
  registrar:      { color:'#0d9488', label:'Enregistreur' },
  epidemiologist: { color:'#9333ea', label:'Epidemiologist' },
  pharmacist:     { color:'#d97706', label:'Pharmacien' },
  anapath:        { color:'#ca8a04', label:'Anapathologist' },
  readonly:       { color:'#64748b', label:'Lecture seule' },
};

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

const CHART_COLORS = ['#2563eb','#7c3aed','#16a34a','#d97706','#dc2626','#0891b2','#0d9488','#ca8a04','#9333ea'];

/* ── Tooltip custom (identique DashboardPage) ── */
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
        <div key={i} style={{ color: p.color || p.payload?.color || '#2563eb', marginBottom:2, fontWeight:500 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── KPI Card ── */
function KPICard({ label, value, sub, color, icon, link }) {
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
      <div style={{ fontSize:22, lineHeight:1, marginBottom:12 }}>{icon}</div>
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
function ChartCard({ title, sub, children, span = 1, action }) {
  return (
    <div style={{
      background:'#fff', border:'1px solid rgba(37,99,235,0.08)',
      borderRadius:14, padding:'20px 22px',
      boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
      gridColumn: span === 2 ? '1 / -1' : 'auto',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', fontFamily:'var(--font-display)' }}>{title}</div>
          {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ActionBadge({ action }) {
  const c = ACTION_CFG[action] || { color:'#64748b', label:action || '—' };
  return (
    <span style={{
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500,
      background:`${c.color}12`, color:c.color, border:`1px solid ${c.color}28`, whiteSpace:'nowrap',
    }}>{c.label}</span>
  );
}

/* ══════════════════════════════════════════════
   MAIN — AdminPage (Utilisateurs + Audit uniquement)
   ══════════════════════════════════════════════ */
export default function AdminPage() {
  const [userStats,  setUserStats]  = useState(null);
  const [auditStats, setAuditStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uStats, aStats, logsRes] = await Promise.all([
        adminService.users.stats(),
        adminService.audit.stats(),
        adminService.audit.list(),
      ]);
      setUserStats(uStats.data);
      setAuditStats(aStats.data);
      const logs = logsRes.data.results || logsRes.data || [];
      setRecentLogs(logs.slice(0, 8));
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Admin overview error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return (
    <AppLayout title="Administration">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:44, height:44, border:'3px solid #dbeafe', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
          <div style={{ color:'#64748b', fontSize:14 }}>Chargement des données...</div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );

  if (!userStats && !auditStats) return (
    <AppLayout title="Administration">
      <div style={{ textAlign:'center', padding:60, color:'#64748b' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:14 }}>Impossible de charger les données.</div>
        <button
          onClick={fetchAll}
          style={{ marginTop:16, padding:'10px 24px', background:'linear-gradient(135deg,#3b82f6,#2563eb)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontWeight:600, fontSize:13 }}
        >
          Réessayer
        </button>
      </div>
    </AppLayout>
  );

  const parRoleData = (userStats?.par_role || []).map(r => ({
    name:  ROLE_CFG[r.role]?.label || r.role,
    value: r.n,
    color: ROLE_CFG[r.role]?.color || '#94a3b8',
  }));

  const maxRole = Math.max(...parRoleData.map(r => r.value), 1);

  return (
    <AppLayout title="Administration">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:3 }}>
            Vue d'ensemble — Administration
          </h2>
          <div style={{ fontSize:11, color:'#94a3b8' }}>
            {lastUpdate && `Actualisé à ${lastUpdate.toLocaleTimeString('fr-DZ')}`}
          </div>
        </div>
        <button
          onClick={fetchAll}
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

      {/* ── KPIs — Utilisateurs ── */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.2, marginBottom:10 }}>Utilisateurs</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          <KPICard label="Utilisateurs total"  value={userStats?.total}         color="#2563eb" icon="👥" link="/admin/users" />
          <KPICard label="Comptes actifs"      value={userStats?.actifs}        color="#16a34a" icon="✅" link="/admin/users" />
          <KPICard label="En attente"          value={userStats?.inactifs}      color="#d97706" icon="⏳" link="/admin/users" />
          <KPICard label="Connectés (7 jours)" value={userStats?.connectes_7j}  color="#7c3aed" icon="🕐" link="/admin/users" />
        </div>
      </div>

      {/* ── KPIs — Journal d'audit ── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.2, marginBottom:10 }}>Journal d'audit</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KPICard label="Événements total"    value={auditStats?.total}        color="#0891b2" icon="📋" link="/admin/audit-logs" />
          <KPICard label="Aujourd'hui"         value={auditStats?.today}        color="#0d9488" icon="📅" link="/admin/audit-logs" />
          <KPICard label="Utilisateurs actifs" value={auditStats?.unique_users} color="#9333ea" icon="🔗" link="/admin/audit-logs" />
          <KPICard label="Suppressions"        value={auditStats?.deletes}      color="#dc2626" icon="🗑️" link="/admin/audit-logs" />
        </div>
      </div>

      {/* ── Répartition par rôle + Activité récente ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        <ChartCard title="Utilisateurs par rôle" sub="Répartition des comptes">
          {parRoleData.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Aucune donnée</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={parRoleData} layout="vertical" margin={{ top:0, right:20, bottom:0, left:10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number"   tick={{ fill:'#94a3b8', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Utilisateurs" radius={[0,5,5,0]}>
                  {parRoleData.map((r, i) => <Cell key={i} fill={r.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Actifs vs Inactifs" sub="État des comptes utilisateurs">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name:'Actifs',   value: userStats?.actifs || 0,   color:'#16a34a' },
                  { name:'Inactifs', value: userStats?.inactifs || 0, color:'#d97706' },
                ]}
                cx="50%" cy="50%" innerRadius={56} outerRadius={82} dataKey="value" paddingAngle={4}
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}
              >
                <Cell fill="#16a34a" />
                <Cell fill="#d97706" />
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Activité récente (audit) ── */}
      <div style={{ marginBottom:24 }}>
        <ChartCard
          title="Activité récente"
          sub="Derniers événements du journal d'audit"
          span={2}
          action={
            <Link to="/admin/audit-logs" style={{ fontSize:12, color:'#2563eb', fontWeight:600, textDecoration:'none' }}>
              Voir tout →
            </Link>
          }
        >
          {recentLogs.length === 0 ? (
            <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Aucun événement récent</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <tbody>
                {recentLogs.map((log, i) => (
                  <tr key={log.id || i} style={{ borderBottom: i < recentLogs.length - 1 ? '1px solid rgba(37,99,235,0.06)' : 'none' }}>
                    <td style={{ padding:'10px 4px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          width:28, height:28, borderRadius:'50%',
                          background:`${ACTION_CFG[log.action]?.color || '#94a3b8'}18`,
                          border:`1px solid ${ACTION_CFG[log.action]?.color || '#94a3b8'}30`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:700, color:ACTION_CFG[log.action]?.color || '#64748b', flexShrink:0,
                        }}>
                          {(log.user_display || log.user_email || 'U')[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize:12.5, color:'#0f172a', fontWeight:600 }}>{log.user_display || log.user_email || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 4px' }}><ActionBadge action={log.action} /></td>
                    <td style={{ padding:'10px 4px', fontSize:12, color:'#334155' }}>
                      {log.resource || '—'} {log.resource_id ? <span style={{ color:'#94a3b8', fontFamily:'var(--font-mono)' }}>#{log.resource_id}</span> : ''}
                    </td>
                    <td style={{ padding:'10px 4px', fontSize:11, color:'#64748b', fontFamily:'var(--font-mono)', whiteSpace:'nowrap', textAlign:'right' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ChartCard>
      </div>

      {/* ── Accès rapides ── */}
      <div style={{ background:'#fff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:14, padding:'18px 22px', boxShadow:'0 2px 8px rgba(15,23,42,0.06)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.2, marginBottom:14 }}>Accès rapides</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { to:'/admin/users',       label:'Gestion des utilisateurs', color:'#2563eb' },
            { to:'/admin/audit-logs',  label:'Journal d\'audit',         color:'#7c3aed' },
            { to:'/register',         label:'+ Nouvel utilisateur',     color:'#16a34a' },
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
