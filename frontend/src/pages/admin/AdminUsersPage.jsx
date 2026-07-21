import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   BADGES
───────────────────────────────────────────────────────────────────────────── */
function RoleBadge({ role }) {
  const c = ROLE_CFG[role] || { color:'#64748b', label:role };
  return (
    <span style={{
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500,
      background:`${c.color}12`, color:c.color, border:`1px solid ${c.color}28`, whiteSpace:'nowrap',
    }}>{c.label}</span>
  );
}

function StatusBadge({ active }) {
  const c = active
    ? { bg:'rgba(22,163,74,0.08)', color:'#16a34a', border:'rgba(22,163,74,0.2)', label:'Actif' }
    : { bg:'rgba(217,119,6,0.08)', color:'#d97706', border:'rgba(217,119,6,0.2)', label:'Inactif' };
  return (
    <span style={{
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500,
      background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:'nowrap',
    }}>{c.label}</span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ICON BUTTONS (actions de ligne — meme langage visuel que PatientsPage)
───────────────────────────────────────────────────────────────────────────── */
function ToggleActiveButton({ active, onClick }) {
  const [hovered, setHovered] = useState(false);
  const color = active ? '#d97706' : '#16a34a';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={active ? 'Désactiver ce compte' : 'Activer ce compte'}
      style={{
        width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:8, border: hovered ? `1px solid ${color}4d` : '1px solid transparent',
        background: hovered ? `${color}12` : 'transparent', cursor:'pointer', transition:'all .15s', flexShrink:0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hovered ? color : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'stroke .15s' }}>
        <circle cx="12" cy="12" r="10" />
        {active ? <line x1="8" y1="12" x2="16" y2="12" /> : <polyline points="8 12 11 15 16 9" />}
      </svg>
    </button>
  );
}

function ResetPwdButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Réinitialiser le mot de passe"
      style={{
        width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:8, border: hovered ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
        background: hovered ? 'rgba(124,58,237,0.08)' : 'transparent', cursor:'pointer', transition:'all .15s', flexShrink:0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hovered ? '#7c3aed' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'stroke .15s' }}>
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </button>
  );
}

function EditButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Modifier / voir le détail"
      style={{
        width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:8, border: hovered ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
        background: hovered ? 'rgba(37,99,235,0.08)' : 'transparent', cursor:'pointer', transition:'all .15s', flexShrink:0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hovered ? '#2563eb' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'stroke .15s' }}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL — reset mot de passe
───────────────────────────────────────────────────────────────────────────── */
function ResetPasswordModal({ user, onClose, onConfirm, loading }) {
  const [pwd, setPwd] = useState('');
  const overlayRef = useRef(null);
  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };

  return (
    <div ref={overlayRef} onClick={handleOverlay} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(4px)',
      zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .15s ease',
    }}>
      <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:420, boxShadow:'0 24px 64px rgba(124,58,237,0.18)', overflow:'hidden', animation:'slideUp .2s ease' }}>
        <div style={{ height:4, background:'linear-gradient(90deg,#a78bfa,#7c3aed)' }} />
        <div style={{ padding:'28px 28px 24px' }}>
          <div style={{ width:52, height:52, background:'rgba(124,58,237,0.08)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, border:'1px solid rgba(124,58,237,0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div style={{ fontSize:17, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Réinitialiser le mot de passe</div>
          <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6, marginBottom:14 }}>Pour :</div>
          <div style={{ padding:'10px 14px', background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:10, marginBottom:16 }}>
            <div style={{ fontWeight:700, color:'#0f172a', fontSize:14 }}>{user?.full_name || user?.username}</div>
            <div style={{ fontSize:11.5, color:'#64748b', marginTop:2 }}>{user?.email}</div>
          </div>
          <input
            type="password" value={pwd} onChange={e => setPwd(e.target.value)}
            placeholder="Nouveau mot de passe (min. 8 caractères)"
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 13px', borderRadius:10, border:'1px solid rgba(124,58,237,0.25)', background:'#faf8ff', color:'#0f172a', fontSize:13, outline:'none', marginBottom:20 }}
          />
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} disabled={loading} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid rgba(37,99,235,0.2)', background:'transparent', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer', opacity: loading ? .5 : 1 }}>Annuler</button>
            <button
              onClick={() => { if (pwd.length < 8) { toast.error('Min. 8 caractères'); return; } onConfirm(pwd); }}
              disabled={loading}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background: loading ? '#c4b5fd' : 'linear-gradient(135deg,#a78bfa,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow:'0 4px 12px rgba(124,58,237,0.3)' }}
            >
              {loading ? 'Enregistrement…' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL — détail / édition utilisateur
───────────────────────────────────────────────────────────────────────────── */
function UserDetailModal({ user, onClose, onSaved, onToggleActive, onSetRole }) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const overlayRef = useRef(null);
  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };

  const startEdit = () => {
    setEditData({ first_name: user.first_name, last_name: user.last_name, phone: user.phone, institution: user.institution, wilaya: user.wilaya });
    setEditMode(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminService.users.update(user.id, editData);
      toast.success('Modifications enregistrées.');
      setEditMode(false);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erreur.');
    } finally {
      setSaving(false);
    }
  };

  const inputSt = { width:'100%', boxSizing:'border-box', padding:'8px 11px', background:'#f8fafc', border:'1px solid rgba(37,99,235,0.15)', borderRadius:9, color:'#0f172a', fontSize:12.5, outline:'none' };

  return (
    <div ref={overlayRef} onClick={handleOverlay} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)',
      zIndex:1500, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .15s ease',
    }}>
      <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(15,23,42,0.22)', animation:'slideUp .2s ease' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(37,99,235,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:`${ROLE_CFG[user.role]?.color || '#94a3b8'}18`, border:`1px solid ${ROLE_CFG[user.role]?.color || '#94a3b8'}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:700, color:ROLE_CFG[user.role]?.color || '#64748b' }}>
              {(user.role || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:'#0f172a' }}>{user.full_name || user.username}</div>
              <div style={{ fontSize:11.5, color:'#94a3b8' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#94a3b8', lineHeight:1, padding:'2px 6px' }}>×</button>
        </div>

        <div style={{ padding:'20px 24px' }}>
          {!editMode ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px', marginBottom:18 }}>
                {[
                  ['Rôle', <RoleBadge role={user.role} />],
                  ['Statut', <StatusBadge active={user.is_active} />],
                  ['Username', user.username],
                  ['Téléphone', user.phone || '—'],
                  ['Institution', user.institution || '—'],
                  ['Wilaya', user.wilaya || '—'],
                  ['Inscrit le', user.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-DZ') : '—'],
                  ['Dernière connexion', user.last_login_str || '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ padding:'7px 0', borderBottom:'1px solid rgba(37,99,235,0.08)' }}>
                    <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>{label}</div>
                    <div style={{ fontSize:12.5, color:'#0f172a' }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.6, marginBottom:8 }}>Changer le rôle</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {Object.entries(ROLE_CFG).map(([role, cfg]) => (
                    <button key={role} onClick={() => onSetRole(user.id, role)} style={{
                      padding:'5px 10px', borderRadius:20, fontSize:11, cursor:'pointer', fontWeight: user.role === role ? 700 : 400,
                      background: user.role === role ? `${cfg.color}20` : '#f1f5f9',
                      border:`1px solid ${user.role === role ? cfg.color : 'rgba(37,99,235,0.1)'}`,
                      color: user.role === role ? cfg.color : '#334155',
                    }}>{cfg.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingTop:14, borderTop:'1px solid rgba(37,99,235,0.1)' }}>
                <button onClick={startEdit} style={actionBtnSt('#2563eb')}>Modifier</button>
                <button onClick={() => onToggleActive(user)} style={actionBtnSt(user.is_active ? '#d97706' : '#16a34a')}>
                  {user.is_active ? 'Désactiver' : 'Activer le compte'}
                </button>
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14 }}>Modifier les informations</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
                {[
                  ['Prénom', 'first_name'], ['Nom', 'last_name'], ['Téléphone', 'phone'],
                  ['Institution', 'institution'], ['Wilaya', 'wilaya'],
                ].map(([label, field]) => (
                  <div key={field} style={{ marginBottom:12 }}>
                    <label style={{ display:'block', fontSize:11, color:'#94a3b8', marginBottom:4 }}>{label}</label>
                    <input value={editData[field] || ''} onChange={e => setEditData(p => ({ ...p, [field]: e.target.value }))} style={inputSt} />
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:16 }}>
                <button onClick={() => setEditMode(false)} style={{ flex:'0 0 90px', padding:'10px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.1)', borderRadius:10, color:'#334155', fontSize:12, cursor:'pointer' }}>Annuler</button>
                <button onClick={save} disabled={saving} style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,#3b82f6,#2563eb)', border:'none', borderRadius:10, color:'#fff', fontSize:12.5, fontWeight:600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1 }}>
                  {saving ? 'Enregistrement...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const actionBtnSt = (color) => ({ padding:'8px 14px', background:`${color}12`, border:`1px solid ${color}28`, borderRadius:10, color, fontSize:12, fontWeight:600, cursor:'pointer' });

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers]         = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRole]     = useState('');
  const [activeFilter, setActive] = useState('');
  const [selected, setSelected]   = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (activeFilter) params.is_active = activeFilter;
      const { data } = await adminService.users.list(params);
      setUsers(data.results || data);
    } catch {
      toast.error('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, activeFilter]);

  const fetchStats = useCallback(() => {
    adminService.users.stats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const timer = setTimeout(fetchUsers, 350);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const refreshAfterAction = async (updatedId) => {
    await fetchUsers();
    fetchStats();
    if (updatedId) {
      try {
        const { data } = await adminService.users.get(updatedId);
        setSelected(data);
      } catch { /* noop */ }
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await (user.is_active ? adminService.users.desactiver(user.id) : adminService.users.activer(user.id));
      toast.success(user.is_active ? 'Utilisateur désactivé.' : 'Utilisateur activé.');
      refreshAfterAction(user.id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'La mise à jour a échoué.');
    }
  };

  const handleSetRole = async (userId, role) => {
    try {
      await adminService.users.setRole(userId, role);
      toast.success('Rôle mis à jour.');
      refreshAfterAction(userId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du changement de rôle.');
    }
  };

  const handleResetPassword = async (pwd) => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      await adminService.users.resetPassword(resetTarget.id, pwd);
      toast.success(`Mot de passe réinitialisé pour ${resetTarget.full_name || resetTarget.username}.`);
      setResetTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la réinitialisation.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AppLayout title="Utilisateurs">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Stats strip */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Utilisateurs total',   val:stats.total,         color:'#2563eb' },
            { label:'Comptes actifs',       val:stats.actifs,        color:'#16a34a' },
            { label:'En attente',           val:stats.inactifs,      color:'#d97706' },
            { label:'Connectés (7 jours)',  val:stats.connectes_7j,  color:'#7c3aed' },
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

      {/* Filtres rôles rapides */}
      {stats?.par_role && (
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {stats.par_role.map(r => {
            const cfg = ROLE_CFG[r.role] || { color:'#64748b', label:r.role };
            const active = roleFilter === r.role;
            return (
              <div key={r.role} onClick={() => setRole(active ? '' : r.role)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, cursor:'pointer',
                  background: active ? `${cfg.color}18` : '#fff',
                  border:`1px solid ${active ? cfg.color+'40' : 'rgba(37,99,235,0.15)'}`,
                  color:cfg.color, fontSize:12, fontWeight:500, boxShadow:'0 1px 4px rgba(15,23,42,0.05)' }}>
                {cfg.label} <span style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>({r.n})</span>
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
            placeholder="Nom, email, username..."
            style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:13, color:'#0f172a', fontFamily:'var(--font-body)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b' }}>✕</button>
          )}
        </div>

        {/* Filtre statut */}
        <select
          value={activeFilter}
          onChange={e => setActive(e.target.value)}
          style={{
            padding:'8px 12px', background:'var(--bg-elevated)',
            border:'1px solid var(--border)', borderRadius:'var(--radius-md)',
            color:'#334155', fontSize:12.5, cursor:'pointer', outline:'none',
          }}
        >
          <option value="">Statut : Tous</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>

        {(search || roleFilter || activeFilter) && (
          <button
            onClick={() => { setSearch(''); setRole(''); setActive(''); }}
            style={{ padding:'8px 14px', background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'var(--radius-md)', color:'#dc2626', fontSize:12, cursor:'pointer' }}
          >
            Réinitialiser
          </button>
        )}

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <button
            onClick={fetchUsers}
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

          <button onClick={() => navigate('/register')} style={{
            padding:'9px 18px',
            background:'linear-gradient(135deg,#3b82f6,#2563eb)',
            border:'none', borderRadius:'var(--radius-md)',
            color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer',
            display:'flex', alignItems:'center', gap:6,
            fontFamily:'var(--font-display)',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Nouvel utilisateur
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
        ) : users.length === 0 ? (
          <div style={{ padding:64, textAlign:'center' }}>
            <div style={{ fontSize:14, color:'#64748b' }}>Aucun utilisateur trouvé</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-elevated)' }}>
                {['Utilisateur','Rôle','Institution','Wilaya','Statut','Dernière connexion','','',''].map((h, idx) => (
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
              {users.map((u, i) => (
                <tr key={u.id}
                  onClick={() => setSelected(u)}
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
                        background:`${ROLE_CFG[u.role]?.color || '#94a3b8'}18`,
                        border:`1px solid ${ROLE_CFG[u.role]?.color || '#94a3b8'}30`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13, fontWeight:700, color:ROLE_CFG[u.role]?.color || '#64748b',
                      }}>
                        {(u.role || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{u.full_name || u.username}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding:'12px 14px', fontSize:12.5, color:'#334155', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.institution || '—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:12.5, color:'#334155' }}>{u.wilaya || '—'}</td>
                  <td style={{ padding:'12px 14px' }}><StatusBadge active={u.is_active} /></td>
                  <td style={{ padding:'12px 14px', fontSize:11, color:'#64748b', fontFamily:'var(--font-mono)' }}>{u.last_login_str || '—'}</td>
                  <td style={{ padding:'12px 4px' }} onClick={e => e.stopPropagation()}>
                    <EditButton onClick={() => setSelected(u)} />
                  </td>
                  <td style={{ padding:'12px 4px' }} onClick={e => e.stopPropagation()}>
                    <ToggleActiveButton active={u.is_active} onClick={() => handleToggleActive(u)} />
                  </td>
                  <td style={{ padding:'12px 14px 12px 4px' }} onClick={e => e.stopPropagation()}>
                    <ResetPwdButton onClick={() => setResetTarget(u)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && users.length > 0 && (
          <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)' }}>
            <span style={{ fontSize:12, color:'#64748b' }}>{users.length} utilisateur(s) affiché(s)</span>
          </div>
        )}
      </div>

      {/* Modale détail / édition */}
      {selected && (
        <UserDetailModal
          user={selected}
          onClose={() => setSelected(null)}
          onSaved={() => refreshAfterAction(selected.id)}
          onToggleActive={(u) => { handleToggleActive(u); }}
          onSetRole={handleSetRole}
        />
      )}

      {/* Modale reset mot de passe */}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          loading={resetLoading}
          onClose={() => !resetLoading && setResetTarget(null)}
          onConfirm={handleResetPassword}
        />
      )}
    </AppLayout>
  );
}