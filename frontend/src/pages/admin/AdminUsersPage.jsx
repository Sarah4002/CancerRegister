import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import { adminService } from '../../services/adminService';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.users.list();
      setUsers(data.results || []);
    } catch {
      toast.error('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const toggleActive = async (user) => {
    try {
      await (user.is_active ? adminService.users.desactiver(user.id) : adminService.users.activer(user.id));
      toast.success(user.is_active ? 'Utilisateur désactivé.' : 'Utilisateur activé.');
      loadUsers();
    } catch {
      toast.error('La mise à jour a échoué.');
    }
  };

  return <AppLayout title="Utilisateurs">
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div><h2 style={titleStyle}>Gestion des utilisateurs</h2><p style={subStyle}>{users.length} compte(s)</p></div>
        <button onClick={loadUsers} style={buttonStyle}>Actualiser</button>
      </div>
      {loading ? <p style={subStyle}>Chargement…</p> : <div style={{ overflowX: 'auto' }}><table style={tableStyle}><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Établissement</th><th>Statut</th><th /></tr></thead><tbody>
        {users.map((user) => <tr key={user.id}><td><strong>{user.full_name || user.username}</strong><br /><span style={subStyle}>{user.email}</span></td><td>{user.role_display || user.role}</td><td>{user.institution || '—'}</td><td><span style={{ color: user.is_active ? '#15803d' : '#b91c1c' }}>{user.is_active ? 'Actif' : 'Désactivé'}</span></td><td><button onClick={() => toggleActive(user)} style={buttonStyle}>{user.is_active ? 'Désactiver' : 'Activer'}</button></td></tr>)}
      </tbody></table></div>}
    </div>
  </AppLayout>;
}

const cardStyle = { background: '#fff', border: '1px solid #dbeafe', borderRadius: 14, padding: 22 };
const titleStyle = { margin: 0, fontSize: 18, color: '#0f172a' };
const subStyle = { margin: '4px 0 0', fontSize: 12, color: '#64748b' };
const buttonStyle = { border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontWeight: 600 };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
