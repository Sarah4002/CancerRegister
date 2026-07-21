import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import { adminService } from '../../services/adminService';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try { const { data } = await adminService.audit.list(); setLogs(data.results || data || []); }
    catch { toast.error("Impossible de charger le journal d'audit."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadLogs(); }, [loadLogs]);
  return <AppLayout title="Journal d'audit"><div style={cardStyle}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}><div><h2 style={titleStyle}>Journal d'audit</h2><p style={subStyle}>Dernières actions enregistrées</p></div><button onClick={loadLogs} style={buttonStyle}>Actualiser</button></div>
    {loading ? <p style={subStyle}>Chargement…</p> : <div style={{ overflowX: 'auto' }}><table style={tableStyle}><thead><tr><th>Action</th><th>Ressource</th><th>Adresse IP</th><th>Date</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{log.action}</td><td>{log.resource || '—'} {log.resource_id ? `#${log.resource_id}` : ''}</td><td>{log.ip_address || '—'}</td><td>{log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : '—'}</td></tr>)}</tbody></table></div>}
  </div></AppLayout>;
}

const cardStyle = { background: '#fff', border: '1px solid #dbeafe', borderRadius: 14, padding: 22 };
const titleStyle = { margin: 0, fontSize: 18, color: '#0f172a' };
const subStyle = { margin: '4px 0 0', fontSize: 12, color: '#64748b' };
const buttonStyle = { border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontWeight: 600 };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
