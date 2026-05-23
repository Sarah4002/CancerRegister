import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { apiClient } from '../../services/apiClient';
import { diagnosticService } from '../../services/diagnosticService';
import { validationRulesService } from '../../services/validationRulesService';
import { AppLayout } from '../../components/layout/Sidebar';
import {
 BarChart, Bar, AreaChart, Area, XAxis, YAxis,
 CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import toast from 'react-hot-toast';

// -- Constantes --
const ROLE_CFG = {
 admin: { color:'#1d4ed8', label:'Administrateur' },
 doctor: { color:'#2563eb', label:'Medecin Oncologue' },
 registrar: { color:'#3b82f6', label:'Enregistreur' },
 epidemiologist: { color:'#60a5fa', label:'Epidemiologist' },
 pharmacist: { color:'#f59e0b', label:'Pharmacien' },
 analyst: { color:'#93c5fd', label:'Analyste' },
 readonly: { color:'#64748b', label:'Lecture seule' } };
const ACTION_CFG = {
 login: { color:'#60a5fa' }, logout: { color:'#64748b' },
 view: { color:'#2563eb' }, create: { color:'#3b82f6' },
 update: { color:'#1d4ed8' }, delete: { color:'#dc2626' },
 export: { color:'#60a5fa' }, report: { color:'#2563eb' },
 import: { color:'#93c5fd' } };
const VALIDATION_MODULES = [
 { value:'patient', label:'Dossier patient' },
 { value:'diagnostic', label:'Diagnostic' },
 { value:'traitement', label:'Traitement' },
 { value:'suivi', label:'Suivi / Consultation' },
];
const VALIDATION_SOURCES = [
  { value:'diagnostic', label:'Diagnostic' },
  { value:'patient', label:'Patient' },
  { value:'traitement', label:'Traitement' },
  { value:'suivi', label:'Suivi / Consultation' },
];
const VALIDATION_FIELDS = {
  patient: [
    { value:'sexe', label:'Sexe' },
    { value:'date_naissance', label:'Date de naissance' },
    { value:'age', label:'Âge' },
    { value:'patient_numero', label:'Numéro patient' },
  ],
  diagnostic: [
    { value:'topographie_code', label:'Topographie ICD-O-3' },
    { value:'topographie_libelle', label:'Libellé topographie' },
    { value:'morphologie_code', label:'Morphologie ICD-O-3' },
    { value:'stade_ajcc', label:'Stade AJCC' },
    { value:'tnm_m', label:'TNM M' },
    { value:'lateralite', label:'Latéralité' },
    { value:'date_diagnostic', label:'Date de diagnostic' },
    { value:'date_premier_symptome', label:'Date premiers symptômes' },
    { value:'patient.sexe', label:'Sexe du patient' },
    { value:'patient.date_naissance', label:'Date de naissance du patient' },
    { value:'patient.age', label:'Âge du patient' },
  ],
  traitement: [
    { value:'date_debut', label:'Date de début' },
    { value:'date_fin', label:'Date de fin' },
    { value:'type_traitement', label:'Type de traitement' },
  ],
  suivi: [
    { value:'date_consultation', label:'Date de consultation' },
    { value:'motif', label:'Motif' },
    { value:'poids', label:'Poids' },
  ],
};
const VALIDATION_OPERATORS = [
  { value:'equals', label:'Égale à' },
  { value:'not_equals', label:'Différente de' },
  { value:'contains', label:'Contient' },
  { value:'not_contains', label:'Ne contient pas' },
  { value:'present', label:'Est renseigné' },
  { value:'blank', label:'Est vide' },
  { value:'greater_than', label:'Supérieur à' },
  { value:'less_than', label:'Inférieur à' },
];
const C = ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#1d4ed8','#2563eb','#60a5fa','#bfdbfe'];

const CustomTooltip = ({ active, payload, label }) => {
 if (!active || !payload?.length) return null;
 return (
 <div style={{ background:'#ffffff', border:'1px solid #f1f5f9', borderRadius:8, padding:'10px 14px', fontSize:12 }}>
 {label && <div style={{ color:'#64748b', marginBottom:4, fontWeight:600 }}>{label}</div>}
 {payload.map((p,i) => <div key={i} style={{ color:p.color||'#e2e8f0' }}>{p.name||'Valeur'} : <b>{p.value}</b></div>)}
 </div>
 );
};

// -- Composants --
function StatCard({ label, value, color, sub }) {
 return (
 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'14px 18px' }}>
 <div style={{ fontSize:26, fontWeight:800, fontFamily:'var(--font-display)', color, marginBottom:2 }}>{value ?? '—'}</div>
 <div style={{ fontSize:11, color:'#64748b' }}>{label}</div>
 {sub && <div style={{ fontSize:10, color, marginTop:3 }}>{sub}</div>}
 </div>
 );
}

function RoleBadge({ role }) {
 const cfg = ROLE_CFG[role] || { color:'#64748b', label:role };
 return (
 <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, background:`${cfg.color}15`, color:cfg.color, border:`1px solid ${cfg.color}25` }}>
 {cfg.label}
 </span>
 );
}

function ActionBadge({ action, label }) {
 const cfg = ACTION_CFG[action] || { color:'#64748b' };
 return (
 <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:600, background:`${cfg.color}12`, color:cfg.color, border:`1px solid ${cfg.color}20` }}>
 {label}
 </span>
 );
}

// ------------------------------------------------------------
// SECTION UTILISATEURS
// ------------------------------------------------------------

function SectionUsers() {
 const navigate = useNavigate();
 const [users, setUsers] = useState([]);
 const [stats, setStats] = useState(null);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [roleFilter, setRole] = useState('');
 const [activeFilter, setActive] = useState('');
 const [selected, setSelected] = useState(null);
 const [editMode, setEditMode] = useState(false);
 const [editData, setEditData] = useState({});
 const [saving, setSaving] = useState(false);
 const [resetPwd, setResetPwd] = useState('');
 const [showResetModal, setShowResetModal] = useState(null);

 const fetchUsers = useCallback(async () => {
 setLoading(true);
 try {
 const params = {};
 if (search) params.search = search;
 if (roleFilter) params.role = roleFilter;
 if (activeFilter) params.is_active= activeFilter;
 const { data } = await adminService.users.list(params);
 setUsers(data.results || data);
 } catch { toast.error('Erreur chargement'); }
 finally { setLoading(false); }
 }, [search, roleFilter, activeFilter]);

 useEffect(() => { fetchUsers(); }, [fetchUsers]);
 useEffect(() => { adminService.users.stats().then(({ data }) => setStats(data)).catch(() => {}); }, []);

 const handleAction = async (action, userId, extra) => {
 try {
 if (action === 'activer') await adminService.users.activer(userId);
 if (action === 'desactiver') await adminService.users.desactiver(userId);
 if (action === 'resetPwd') await adminService.users.resetPassword(userId, extra);
 if (action === 'setRole') await adminService.users.setRole(userId, extra);
 toast.success('Action effectuee !');
 fetchUsers();
 if (selected?.id === userId) {
 const { data } = await adminService.users.get(userId);
 setSelected(data);
 }
 } catch (err) {
 toast.error(err.response?.data?.error || 'Erreur');
 }
 };

 const handleSaveEdit = async () => {
 setSaving(true);
 try {
 await adminService.users.update(selected.id, editData);
 toast.success('Modifications enregistrees !');
 fetchUsers();
 const { data } = await adminService.users.get(selected.id);
 setSelected(data);
 setEditMode(false);
 } catch (err) {
 toast.error(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erreur');
 } finally { setSaving(false); }
 };

 return (
 <div>
 {stats && (
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
 <StatCard label="Utilisateurs total" value={stats.total} color="#2563eb" />
 <StatCard label="Comptes actifs" value={stats.actifs} color="#3b82f6" />
 <StatCard label="En attente" value={stats.inactifs} color="#60a5fa" />
 <StatCard label="Connectes (7j)" value={stats.connectes_7j} color="#1d4ed8" />
 </div>
 )}

 {stats?.par_role && (
 <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
 {stats.par_role.map(r => {
 const cfg = ROLE_CFG[r.role] || { color:'#64748b', label:r.role };
 return (
 <div key={r.role} onClick={() => setRole(roleFilter === r.role ? '' : r.role)}
 style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, cursor:'pointer',
 background: roleFilter===r.role ? `${cfg.color}20` : '#ffffff',
 border:`1px solid ${roleFilter===r.role ? cfg.color+'40' : 'rgba(37,99,235,0.08)'}`,
 color:cfg.color, fontSize:12, fontWeight:500 }}>
 {cfg.label} <span style={{ fontFamily:'var(--font-mono)', fontSize:11 }}>({r.n})</span>
 </div>
 );
 })}
 </div>
 )}

 <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center', background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'10px 14px' }}>
 <div style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8, background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'12px', padding:'7px 12px' }}>
 <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#64748b"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, email, username..."
 style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:12.5, color:'#0f172a', fontFamily:'var(--font-body)' }} />
 </div>
 <select value={activeFilter} onChange={e => setActive(e.target.value)} style={selSt}>
 <option value="">Tous les statuts</option>
 <option value="true">Actifs</option>
 <option value="false">Inactifs</option>
 </select>
 <button onClick={() => navigate('/register')} style={{ padding:'8px 14px', borderRadius:8, background:'linear-gradient(135deg, #2563eb, #1d4ed8)', border:'none', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>
 Créer un utilisateur
 </button>
 {(search || roleFilter || activeFilter) && (
 <button onClick={() => { setSearch(''); setRole(''); setActive(''); }}
 style={{ padding:'6px 12px', background:'rgba(255,77,106,0.1)', border:'1px solid rgba(255,77,106,0.2)', borderRadius:8, color:'#dc2626', fontSize:11, cursor:'pointer' }}>
 Reset
 </button>
 )}
 </div>

 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden' }}>
 {loading ? (
 <div style={{ padding:48, textAlign:'center', color:'#64748b' }}>
 <div style={{ width:28, height:28, border:'3px solid rgba(37,99,235,0.12)', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }} />
 Chargement...
 </div>
 ) : (
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ background:'#f1f5f9' }}>
 {['Utilisateur','Role','Institution','Wilaya','Statut','Derniere connexion','Actions'].map(h => (
 <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid rgba(37,99,235,0.12)', whiteSpace:'nowrap' }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {users.map((u, i) => (
 <tr key={u.id}
 style={{ borderBottom:'1px solid rgba(37,99,235,0.12)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)', cursor:'pointer' }}
 onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
 onMouseLeave={e => e.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,0.01)'}
 onClick={() => { setSelected(u); setEditMode(false); setEditData({}); }}
 >
 <td style={{ padding:'11px 14px' }}>
 <div style={{ display:'flex', alignItems:'center', gap:10 }}>
 <div style={{ width:32, height:32, borderRadius:'50%', background:`${ROLE_CFG[u.role]?.color||'#9ca3af'}20`, border:`1px solid ${ROLE_CFG[u.role]?.color||'#9ca3af'}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
 {(u.role || 'U')[0].toUpperCase()}
 </div>
 <div>
 <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>{u.full_name || u.username}</div>
 <div style={{ fontSize:10, color:'#64748b' }}>{u.email}</div>
 </div>
 </div>
 </td>
 <td style={{ padding:'11px 14px' }}><RoleBadge role={u.role} /></td>
 <td style={{ padding:'11px 14px', fontSize:12, color:'#334155', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.institution || '—'}</td>
 <td style={{ padding:'11px 14px', fontSize:12, color:'#64748b' }}>{u.wilaya || '—'}</td>
 <td style={{ padding:'11px 14px' }}>
 <span style={{ fontSize:11, fontWeight:600, color: u.is_active ? '#16a34a' : '#d97706' }}>
 {u.is_active ? 'Actif' : 'Inactif'}
 </span>
 </td>
 <td style={{ padding:'11px 14px', fontSize:11, color:'#64748b' }}>{u.last_login_str}</td>
 <td style={{ padding:'11px 14px' }} onClick={e => e.stopPropagation()}>
 <div style={{ display:'flex', gap:5 }}>
 {!u.is_active ? (
 <BtnTiny color="#16a34a" onClick={() => handleAction('activer', u.id)}> Activer</BtnTiny>
 ) : (
 <BtnTiny color="#d97706" onClick={() => handleAction('desactiver', u.id)}>Desact.</BtnTiny>
 )}
 <BtnTiny color="#7c3aed" onClick={() => { setShowResetModal(u); setResetPwd(''); }}></BtnTiny>
 </div>
 </td>
 </tr>
 ))}
 {users.length === 0 && (
 <tr><td colSpan={7} style={{ padding:48, textAlign:'center', color:'#64748b', fontSize:13 }}>Aucun utilisateur trouve</td></tr>
 )}
 </tbody>
 </table>
 )}
 </div>

 {selected && (
 <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'16px', width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>
 <div style={{ padding:'18px 24px', borderBottom:'1px solid rgba(37,99,235,0.12)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
 <div style={{ display:'flex', alignItems:'center', gap:12 }}>
 <div style={{ width:42, height:42, borderRadius:'50%', background:`${ROLE_CFG[selected.role]?.color||'#9ca3af'}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
 {(selected.role || 'U')[0].toUpperCase()}
 </div>
 <div>
 <div style={{ fontWeight:800, fontSize:15, color:'#0f172a', fontFamily:'var(--font-display)' }}>{selected.full_name || selected.username}</div>
 <div style={{ fontSize:11, color:'#64748b' }}>{selected.email}</div>
 </div>
 </div>
 <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'#64748b', fontSize:22, cursor:'pointer', padding:'0 6px', lineHeight:1 }}>x</button>
 </div>

 <div style={{ padding:'20px 24px' }}>
 {!editMode ? (
 <>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px', marginBottom:18 }}>
 {[
 ['Role', <RoleBadge role={selected.role} />],
 ['Statut', <span style={{ color: selected.is_active ? '#16a34a' : '#d97706', fontWeight:600, fontSize:12 }}>{selected.is_active ? 'Actif' : 'Inactif'}</span>],
 ['Username', selected.username],
 ['Telephone', selected.phone || '—'],
 ['Institution',selected.institution || '—'],
 ['Wilaya', selected.wilaya || '—'],
 ['Inscrit le', selected.date_joined ? new Date(selected.date_joined).toLocaleDateString('fr-DZ') : '—'],
 ['Actions', <span style={{ fontFamily:'var(--font-mono)', color:'#7c3aed' }}>{selected.nb_actions}</span>],
 ].map(([label, val]) => (
 <div key={label} style={{ padding:'7px 0', borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
 <div style={{ fontSize:10, color:'#64748b', marginBottom:2 }}>{label}</div>
 <div style={{ fontSize:12.5, color:'#0f172a' }}>{val}</div>
 </div>
 ))}
 </div>

 <div style={{ marginBottom:18 }}>
 <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Permissions</div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
 {[
 ['Voir patients', selected.can_view_patients],
 ['Modifier patients', selected.can_edit_patients],
 ['Exporter donnees', selected.can_export_data],
 ['Gerer utilisateurs', selected.can_manage_users],
 ['Voir statistiques', selected.can_view_statistics],
 ].map(([perm, val]) => (
 <div key={perm} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 8px', borderRadius:6, background:`${val ? '#16a34a' : '#dc2626'}08`, border:`1px solid ${val ? '#16a34a' : '#dc2626'}15` }}>
 <span style={{ color: val ? '#16a34a' : '#dc2626', fontSize:12 }}>{val ? 'Oui' : 'Non'}</span>
 <span style={{ fontSize:11, color:'#334155' }}>{perm}</span>
 </div>
 ))}
 </div>
 </div>

 <div style={{ marginBottom:18 }}>
 <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Changer le role</div>
 <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
 {Object.entries(ROLE_CFG).map(([role, cfg]) => (
 <button key={role}
 onClick={() => handleAction('setRole', selected.id, role)}
 style={{ padding:'5px 10px', borderRadius:20, fontSize:11, cursor:'pointer', fontWeight: selected.role === role ? 700 : 400,
 background: selected.role === role ? `${cfg.color}25` : '#f1f5f9',
 border:`1px solid ${selected.role === role ? cfg.color : 'rgba(37,99,235,0.12)'}`,
 color: selected.role === role ? cfg.color : '#334155' }}>
 {cfg.label}
 </button>
 ))}
 </div>
 </div>

 <div style={{ display:'flex', gap:8, flexWrap:'wrap', paddingTop:14, borderTop:'1px solid rgba(37,99,235,0.12)' }}>
 <button onClick={() => { setEditMode(true); setEditData({ first_name: selected.first_name, last_name: selected.last_name, phone: selected.phone, institution: selected.institution, wilaya: selected.wilaya }); }}
 style={actionBtnSt('#2563eb')}> Modifier</button>
 {!selected.is_active
 ? <button onClick={() => handleAction('activer', selected.id)} style={actionBtnSt('#16a34a')}> Activer le compte</button>
 : <button onClick={() => handleAction('desactiver', selected.id)} style={actionBtnSt('#d97706')}>Desactiver</button>
 }
 <button onClick={() => { setShowResetModal(selected); setResetPwd(''); setSelected(null); }} style={actionBtnSt('#7c3aed')}> Reinitialiser MDP</button>
 </div>
 </>
 ) : (
 <div>
 <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:14 }}> Modifier les informations</div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
 {[
 ['Prenom', 'first_name', 'text'],
 ['Nom', 'last_name', 'text'],
 ['Telephone', 'phone', 'text'],
 ['Institution', 'institution','text'],
 ['Wilaya', 'wilaya', 'text'],
 ].map(([label, field, type]) => (
 <div key={field} style={{ marginBottom:12 }}>
 <label style={{ display:'block', fontSize:11, color:'#64748b', marginBottom:4 }}>{label}</label>
 <input type={type} value={editData[field] || ''} onChange={e => setEditData(p => ({...p, [field]: e.target.value}))} style={inputSt} />
 </div>
 ))}
 </div>
 <div style={{ display:'flex', gap:8, marginTop:16 }}>
 <button onClick={() => setEditMode(false)} style={{ flex:'0 0 90px', padding:'10px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#334155', fontSize:12, cursor:'pointer' }}>Annuler</button>
 <button onClick={handleSaveEdit} disabled={saving} style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,#2563eb,#2563eb)', border:'none', borderRadius:8, color:'#fff', fontSize:12.5, fontWeight:600, cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>
 {saving ? 'Enregistrement...' : 'Sauvegarder'}
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {showResetModal && (
 <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001 }}>
 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'16px', padding:'24px 28px', width:'100%', maxWidth:400 }}>
 <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:16 }}> Reinitialiser le mot de passe</div>
 <div style={{ fontSize:12, color:'#64748b', marginBottom:14 }}>Pour : <strong style={{ color:'#7c3aed' }}>{showResetModal.full_name || showResetModal.username}</strong></div>
 <input type="password" value={resetPwd} onChange={e => setResetPwd(e.target.value)}
 placeholder="Nouveau mot de passe (min. 8 caracteres)"
 style={{ ...inputSt, marginBottom:16, width:'100%', boxSizing:'border-box' }} />
 <div style={{ display:'flex', gap:8 }}>
 <button onClick={() => setShowResetModal(null)} style={{ flex:'0 0 80px', padding:'10px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#334155', fontSize:12, cursor:'pointer' }}>Annuler</button>
 <button onClick={async () => {
 if (resetPwd.length < 8) { toast.error('Min. 8 caracteres'); return; }
 await handleAction('resetPwd', showResetModal.id, resetPwd);
 setShowResetModal(null);
 }} style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,#7c3aed,#7c6fcd)', border:'none', borderRadius:8, color:'#fff', fontSize:12.5, fontWeight:600, cursor:'pointer' }}>
 Confirmer
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

// ------------------------------------------------------------
// SECTION AUDIT LOGS
// ------------------------------------------------------------

function SectionAudit() {
 const [logs, setLogs] = useState([]);
 const [stats, setStats] = useState(null);
 const [loading, setLoad] = useState(true);
 const [action, setAction]= useState('');
 const [dateFrom, setDF] = useState('');
 const [dateTo, setDT] = useState('');

 const fetchLogs = useCallback(async () => {
 setLoad(true);
 try {
 const params = { page_size: 50 };
 if (action) params.action = action;
 if (dateFrom) params.date_from = dateFrom;
 if (dateTo) params.date_to = dateTo;
 const { data } = await adminService.audit.list(params);
 setLogs(data.results || data);
 } catch {} finally { setLoad(false); }
 }, [action, dateFrom, dateTo]);

 useEffect(() => { fetchLogs(); }, [fetchLogs]);
 useEffect(() => { adminService.audit.stats().then(({ data }) => setStats(data)).catch(() => {}); }, []);

 return (
 <div>
 {stats && (
 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
 <StatCard label="Logs total" value={stats.total?.toLocaleString()} color="#7c3aed" />
 <StatCard label="Aujourd'hui" value={stats.aujourd_hui} color="#2563eb" />
 <StatCard label="Cette semaine" value={stats.cette_semaine} color="#16a34a" />
 <StatCard label="Ce mois" value={stats.ce_mois} color="#d97706" />
 </div>
 )}

 {stats?.activite_7j && (
 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'14px 16px', marginBottom:20 }}>
 <div style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Activite — 7 derniers jours</div>
 <ResponsiveContainer width="100%" height={100}>
 <AreaChart data={stats.activite_7j} margin={{top:0,right:0,bottom:0,left:-30}}>
 <defs>
 <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
 <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
 <XAxis dataKey="date" tick={{fill:'#94a3b8',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={d => d.slice(5)} />
 <YAxis tick={{fill:'#94a3b8',fontSize:9}} axisLine={false} tickLine={false} allowDecimals={false} />
 <Tooltip content={<CustomTooltip />} />
 <Area type="monotone" dataKey="count" name="Actions" stroke="#7c3aed" fill="url(#gA)" strokeWidth={2} dot={false} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 )}

 {stats && (
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'14px 16px' }}>
 <div style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Par type d'action</div>
 {stats.par_action.map((a, i) => {
 const cfg = ACTION_CFG[a.action] || { color:'#64748b' };
 return (
 <div key={a.action} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
 <span style={{ fontSize:12, color:'#334155', display:'flex', alignItems:'center', gap:6 }}>{a.action}</span>
 <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, color:cfg.color }}>{a.n}</span>
 </div>
 );
 })}
 </div>
 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'14px 16px' }}>
 <div style={{ fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Utilisateurs les plus actifs</div>
 {(stats.top_users || []).map((u, i) => {
 const nom = `${u.user__first_name || ''} ${u.user__last_name || ''}`.trim() || u.user__username || '?';
 return (
 <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
 <span style={{ fontSize:12, color:'#334155' }}>{nom}</span>
 <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, color:'#7c3aed' }}>{u.n}</span>
 </div>
 );
 })}
 </div>
 </div>
 )}

 <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'center', background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'10px 14px' }}>
 <select value={action} onChange={e => setAction(e.target.value)} style={selSt}>
 <option value="">Toutes les actions</option>
 {Object.entries(ACTION_CFG).map(([k, v]) => <option key={k} value={k}>{k}</option>)}
 </select>
 <input type="date" value={dateFrom} onChange={e => setDF(e.target.value)} style={selSt} />
 <span style={{ fontSize:11, color:'#64748b' }}>{'->'}</span>
 <input type="date" value={dateTo} onChange={e => setDT(e.target.value)} style={selSt} />
 {(action || dateFrom || dateTo) && (
 <button onClick={() => { setAction(''); setDF(''); setDT(''); }} style={{ padding:'6px 12px', background:'rgba(255,77,106,0.1)', border:'1px solid rgba(255,77,106,0.2)', borderRadius:8, color:'#dc2626', fontSize:11, cursor:'pointer' }}> Reset</button>
 )}
 </div>

 <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden' }}>
 {loading ? (
 <div style={{ padding:36, textAlign:'center', color:'#64748b' }}>
 <div style={{ width:24, height:24, border:'3px solid rgba(37,99,235,0.12)', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 8px' }} />
 </div>
 ) : (
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <thead>
 <tr style={{ background:'#f1f5f9' }}>
 {['Horodatage','Utilisateur','Action','Ressource','IP'].map(h => (
 <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid rgba(37,99,235,0.12)', whiteSpace:'nowrap' }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {logs.map((log, i) => (
 <tr key={log.id} style={{ borderBottom:'1px solid rgba(37,99,235,0.12)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-mono)', fontSize:11, color:'#64748b', whiteSpace:'nowrap' }}>
 {new Date(log.timestamp).toLocaleString('fr-DZ', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
 </td>
 <td style={{ padding:'9px 12px' }}>
 <div style={{ fontSize:12, fontWeight:600, color:'#0f172a' }}>{log.user_nom}</div>
 <div style={{ fontSize:10, color:'#64748b' }}>{log.user_role}</div>
 </td>
 <td style={{ padding:'9px 12px' }}><ActionBadge action={log.action} label={log.action_label} /></td>
 <td style={{ padding:'9px 12px', fontSize:11, color:'#334155', fontFamily:'var(--font-mono)' }}>
 {log.resource}{log.resource_id ? `#${log.resource_id}` : ''}
 </td>
 <td style={{ padding:'9px 12px', fontFamily:'var(--font-mono)', fontSize:10, color:'#64748b' }}>{log.ip_address || '—'}</td>
 </tr>
 ))}
 {logs.length === 0 && (
 <tr><td colSpan={5} style={{ padding:32, textAlign:'center', color:'#64748b', fontSize:13 }}>Aucun log trouve</td></tr>
 )}
 </tbody>
 </table>
 )}
 </div>
 </div>
 );
}

// ------------------------------------------------------------
// SECTION CHAMPS PERSONNALISES
// ------------------------------------------------------------

function SectionCustomFields() {
 const [champs, setChamps] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [editChamp, setEditChamp] = useState(null);
 const [saving, setSaving] = useState(false);
 const [topoQuery, setTopoQuery] = useState('');
 const [topoResults, setTopoResults] = useState([]);
 const [topoLoading, setTopoLoading] = useState(false);
 const topoRef = useRef(null);
 const [showTopoDropdown, setShowTopoDropdown] = useState(false);

 const MODULE_LABELS = {
   patient:    { label: 'Dossier patient',      color: '#2563eb' },
   diagnostic: { label: 'Diagnostic',           color: '#7c3aed' },
   traitement: { label: 'Traitement',           color: '#d97706' },
   suivi:      { label: 'Suivi / Consultation', color: '#16a34a' },
 };

 const TYPE_OPTIONS = [
   { value: 'texte',    label: 'Texte libre' },
   { value: 'nombre',   label: 'Nombre' },
   { value: 'date',     label: 'Date' },
   { value: 'booleen',  label: 'Oui / Non' },
   { value: 'textarea', label: 'Texte long' },
   { value: 'select',   label: 'Liste deroulante' },
 ];

 // Recherche de topographies
 useEffect(() => {
   if (!topoQuery || topoQuery.length < 2) {
     setTopoResults([]);
     return;
   }
   const handler = setTimeout(async () => {
     setTopoLoading(true);
     try {
       const { data } = await diagnosticService.searchTopographies(topoQuery);
       setTopoResults(data || []);
       setShowTopoDropdown(true);
     } catch {
       setTopoResults([]);
     } finally {
       setTopoLoading(false);
     }
   }, 300);
   return () => clearTimeout(handler);
 }, [topoQuery]);

 // Fermer dropdown quand on clique en dehors
 useEffect(() => {
   const handler = (e) => {
     if (topoRef.current && !topoRef.current.contains(e.target)) {
       setShowTopoDropdown(false);
     }
   };
   document.addEventListener('mousedown', handler);
   return () => document.removeEventListener('mousedown', handler);
 }, []);

 const handleSelectTopographie = (topo) => {
   // Ajouter la topographie à la liste (éviter les doublons)
   const topographies = editChamp?.topographies_list || [];
   const alreadyExists = topographies.some(t => t.code === topo.code);
   if (!alreadyExists) {
     topographies.push(topo);
   }
   setEditChamp(p => ({
     ...p,
     topographies_list: topographies
   }));
   setTopoQuery('');
   setTopoResults([]);
   setShowTopoDropdown(false);
 };

 const handleRemoveTopographie = (code) => {
   setEditChamp(p => ({
     ...p,
     topographies_list: (p.topographies_list || []).filter(t => t.code !== code)
   }));
 };

 const handleClearAllTopographies = () => {
   setEditChamp(p => ({
     ...p,
     topographies_list: []
   }));
   setTopoQuery('');
   setTopoResults([]);
 };

 const CHAMP_VIDE = {
   nom: '', description: '', type_champ: 'texte', module: 'patient',
   topographie_code: '', topographie_libelle: '', topographies_list: [],
   obligatoire: false, actif: true, ordre: 0,
   valeur_min: '', valeur_max: '', unite: '',
   options: [],
 };

 const fetchChamps = async () => {
   setLoading(true);
   try {
     const { data } = await apiClient.get('/custom-fields/champs/');
     // Convertir le topographie_code en topographies_list si nécessaire
     const champsAvecLists = (data.results || data).map(champ => {
       if (champ.topographie_code && !champ.topographies_list) {
         return {
           ...champ,
           topographies_list: champ.topographie_code.split(',').map(code => ({
             code: code.trim(),
             libelle: champ.topographie_libelle || ''
           }))
         };
       }
       return champ;
     });
     setChamps(champsAvecLists);
   } catch {
     toast.error('Erreur lors du chargement.');
   } finally {
     setLoading(false);
   }
 };

 useEffect(() => { fetchChamps(); }, []);

 const handleSave = async (form) => {
   setSaving(true);
   // Convertir topographies_list en topographie_code CSV
   const topographiesCodes = (form.topographies_list || []).map(t => t.code).join(',');
   const topographiesLibelles = (form.topographies_list || []).map(t => `${t.code} – ${t.libelle}`).join('; ');
   
   // Créer un payload clean sans données internes/invalides
   const payload = {
     nom: form.nom || '',
     description: form.description || '',
     type_champ: form.type_champ || 'texte',
     module: form.module || 'patient',
     topographie_code: topographiesCodes,
     topographie_libelle: topographiesLibelles,
     obligatoire: form.obligatoire || false,
     actif: form.actif !== false, // true par défaut
     ordre: form.ordre === '' || form.ordre === undefined ? 0 : Number(form.ordre),
     options: form.options || [],
     valeur_min: form.valeur_min === '' || form.valeur_min === undefined ? null : Number(form.valeur_min),
     valeur_max: form.valeur_max === '' || form.valeur_max === undefined ? null : Number(form.valeur_max),
     unite: form.unite || '',
   };
   
   try {
     if (form.id) {
       await apiClient.patch(`/custom-fields/champs/${form.id}/`, payload);
       toast.success('Champ modifie avec succes.');
     } else {
       await apiClient.post('/custom-fields/champs/', payload);
       toast.success('Champ cree avec succes.');
     }
     setShowForm(false);
     setEditChamp(null);
     fetchChamps();
   } catch (err) {
     const msg = err.response?.data
       ? Object.values(err.response.data).flat().join(' ')
       : 'Erreur lors de la sauvegarde.';
     toast.error(msg);
   } finally {
     setSaving(false);
   }
 };

 const handleToggleActif = async (champ) => {
   try {
     await apiClient.patch(`/custom-fields/champs/${champ.id}/`, { actif: !champ.actif });
     toast.success(champ.actif ? 'Champ desactive.' : 'Champ active.');
     fetchChamps();
   } catch {
     toast.error('Erreur lors de la modification.');
   }
 };

 const handleDelete = async (champ) => {
   if (!window.confirm(`Supprimer le champ "${champ.nom}" ? Cette action est irreversible.`)) return;
   try {
     await apiClient.delete(`/custom-fields/champs/${champ.id}/`);
     toast.success('Champ supprime.');
     fetchChamps();
   } catch {
     toast.error('Erreur lors de la suppression.');
   }
 };

 const total = champs.length;
 const actifs = champs.filter(c => c.actif).length;

 return (
   <div>
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
       <div>
         <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>Gestionnaire de champs personnalises</h3>
         <p style={{ fontSize: 12, color: '#64748b' }}>Creez des champs supplementaires qui apparaissent dans les formulaires</p>
       </div>
       {!showForm && (
         <button onClick={() => { setEditChamp(null); setShowForm(true); }} style={{
           padding: '8px 14px', background: 'linear-gradient(135deg, #2563eb, #2563eb)',
           border: 'none', borderRadius: '12px',
           color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
         }}>
           + Nouveau champ
         </button>
       )}
     </div>

     

     {showForm && (
       <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '16px', padding: '20px 24px', marginBottom: 20 }}>
         <h4 style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 16 }}>
           {editChamp ? `Modifier - ${editChamp.nom}` : 'Nouveau champ personnalise'}
         </h4>
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
           <div style={{ marginBottom: 12 }}>
             <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Nom du champ *</label>
             <input value={editChamp?.nom || ''} onChange={e => setEditChamp(p => ({ ...p, nom: e.target.value }))}
               style={{ width: '100%', padding: '8px 10px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#0f172a', fontSize: 12 }} />
           </div>
           <div style={{ marginBottom: 12 }}>
             <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Module *</label>
             <select value={editChamp?.module || 'patient'} onChange={e => setEditChamp(p => ({ ...p, module: e.target.value }))}
               style={{ width: '100%', padding: '8px 10px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#0f172a', fontSize: 12, cursor: 'pointer' }}>
               {Object.entries(MODULE_LABELS).map(([v, m]) => (
                 <option key={v} value={v}>{m.label}</option>
               ))}
             </select>
           </div>
           <div style={{ marginBottom: 12 }}>
             <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Type de champ *</label>
             <select value={editChamp?.type_champ || 'texte'} onChange={e => setEditChamp(p => ({ ...p, type_champ: e.target.value }))}
               style={{ width: '100%', padding: '8px 10px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#0f172a', fontSize: 12, cursor: 'pointer' }}>
               {TYPE_OPTIONS.map(t => (
                 <option key={t.value} value={t.value}>{t.label}</option>
               ))}
             </select>
           </div>
           {editChamp?.module === 'diagnostic' && (
             <div style={{ marginBottom: 12, gridColumn: '1 / -1', padding: '12px', background: '#ffffff', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6 }}>
               <label style={{ display: 'block', fontSize: 11, color: '#0f172a', marginBottom: 8, fontWeight: 600 }}>
                 Topographie(s) ICD-O-3 (optionnel)
               </label>
               <p style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
                 Sélectionner une ou plusieurs topographies pour rendre ce champ spécifique à certains types de cancer. Laisser vide pour un champ global.
               </p>
               
               {/* Liste des topographies sélectionnées */}
               {(editChamp?.topographies_list || []).length > 0 && (
                 <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                   {editChamp.topographies_list.map((topo, idx) => (
                     <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6 }}>
                       <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#334155', minWidth: 50 }}>{topo.code}</span>
                       <span style={{ fontSize: 12, color: '#0f172a', flex: 1 }}>{topo.libelle}</span>
                       <button type="button" onClick={() => handleRemoveTopographie(topo.code)} style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 4, padding: '4px 8px', color: '#334155', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Retirer</button>
                     </div>
                   ))}
                   <button type="button" onClick={handleClearAllTopographies} style={{ padding: '6px 12px', background: 'rgba(255,77,106,0.1)', border: 'none', borderRadius: 4, color: '#dc2626', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>✕ Réinitialiser tous</button>
                 </div>
               )}
               
               {/* Recherche et ajout */}
               <div style={{ position: 'relative' }} ref={topoRef}>
                 <input
                   type="text"
                   value={topoQuery}
                   onChange={e => { setTopoQuery(e.target.value); setShowTopoDropdown(true); }}
                   placeholder="Rechercher et ajouter des topographies (ex: C50, sein)"
                   style={{ width: '100%', padding: '10px 12px 10px 36px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#0f172a', fontSize: 12 }}
                   onFocus={() => topoQuery.length >= 2 && setShowTopoDropdown(true)}
                 />
                 <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12 }}>
                   {topoLoading ? (
                     <div style={{ width: 14, height: 14, border: '2px solid rgba(37,99,235,0.12)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                   ) : (
                    ''
                   )}
                 </div>
                 
                 {showTopoDropdown && topoResults.length > 0 && (
                   <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 6, marginTop: 4, maxHeight: 240, overflow: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                     {topoResults.map(r => {
                       const isSelected = (editChamp?.topographies_list || []).some(t => t.code === r.code);
                       return (
                         <button
                           key={r.id}
                           type="button"
                           onClick={() => handleSelectTopographie(r)}
                           disabled={isSelected}
                           style={{
                             display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
                             background: isSelected ? 'rgba(0, 168, 255, 0.1)' : 'none',
                             border: 'none', cursor: isSelected ? 'not-allowed' : 'pointer', textAlign: 'left',
                             borderBottom: '1px solid rgba(37,99,235,0.12)', transition: 'background 0.2s', opacity: isSelected ? 0.6 : 1
                           }}
                           onMouseEnter={e => !isSelected && (e.currentTarget.style.background = '#eff6ff')}
                           onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'none')}
                         >
                           <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#2563eb', minWidth: 60 }}>{r.code}</span>
                           <span style={{ fontSize: 12.5, color: '#0f172a' }}>{r.libelle}</span>
                           {r.categorie && <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>{r.categorie}</span>}
                           {isSelected && <span style={{ marginLeft: 'auto', color: '#2563eb', fontWeight: 700 }}>✓ Ajoutée</span>}
                         </button>
                       );
                     })}
                   </div>
                 )}
               </div>
             </div>
           )}
           <div style={{ marginBottom: 12 }}>
             <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Ordre d'affichage</label>
             <input type="number" value={editChamp?.ordre || 0} onChange={e => setEditChamp(p => ({ ...p, ordre: parseInt(e.target.value) || 0 }))}
               style={{ width: '100%', padding: '8px 10px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#0f172a', fontSize: 12 }} />
           </div>
           <div style={{ marginBottom: 12, gridColumn: '1 / -1' }}>
             <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Description (optionnel)</label>
             <input value={editChamp?.description || ''} onChange={e => setEditChamp(p => ({ ...p, description: e.target.value }))}
               style={{ width: '100%', padding: '8px 10px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#0f172a', fontSize: 12 }} />
           </div>
           <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
             <input type="checkbox" checked={editChamp?.obligatoire || false} onChange={e => setEditChamp(p => ({ ...p, obligatoire: e.target.checked }))}
               style={{ width: 14, height: 14 }} />
             <span style={{ fontSize: 12, color: '#334155' }}>Champ obligatoire</span>
           </div>
         </div>
         <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(37,99,235,0.12)' }}>
           <button onClick={() => { setShowForm(false); setEditChamp(null); }} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#334155', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
           <button onClick={() => handleSave(editChamp || CHAMP_VIDE)} disabled={saving} style={{ flex: 1, padding: '8px 16px', background: 'linear-gradient(135deg, #2563eb, #2563eb)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
             {saving ? 'Enregistrement...' : editChamp?.id ? 'Modifier' : 'Creer'}
           </button>
         </div>
       </div>
     )}

     <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
       {loading ? (
         <div style={{ padding: 40, textAlign: 'center' }}>
           <div style={{ width: 24, height: 24, border: '2px solid rgba(37,99,235,0.12)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
           <div style={{ fontSize: 12, color: '#64748b' }}>Chargement...</div>
         </div>
       ) : champs.length === 0 ? (
         <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
           Aucun champ personnalise - cliquez sur "+ Nouveau champ" pour commencer.
         </div>
       ) : (
         <table style={{ width: '100%', borderCollapse: 'collapse' }}>
           <thead>
             <tr style={{ borderBottom: '1px solid rgba(37,99,235,0.12)' }}>
               {['Nom', 'Module', 'Type', 'Obligatoire', 'Statut', 'Actions'].map(h => (
                 <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
               ))}
             </tr>
           </thead>
           <tbody>
             {champs.map((champ, i) => {
               const mod = MODULE_LABELS[champ.module] || {};
               return (
                 <tr key={champ.id} style={{ borderBottom: '1px solid rgba(37,99,235,0.12)' }}>
                   <td style={{ padding: '10px 14px' }}>
                     <div style={{ fontSize: 12.5, fontWeight: 500, color: '#0f172a' }}>{champ.nom}</div>
                     {champ.description && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{champ.description}</div>}
                   </td>
                   <td style={{ padding: '10px 14px' }}>
                     <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10.5, fontWeight: 500, background: `${mod.color}15`, color: mod.color }}>{mod.label}</span>
                   </td>
                   <td style={{ padding: '10px 14px', fontSize: 12, color: '#334155' }}>
                     {TYPE_OPTIONS.find(t => t.value === champ.type_champ)?.label}
                   </td>
                   <td style={{ padding: '10px 14px', fontSize: 12 }}>{champ.obligatoire ? 'Oui' : 'Non'}</td>
                   <td style={{ padding: '10px 14px' }}>
                     <button onClick={() => handleToggleActif(champ)} style={{
                       padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, cursor: 'pointer', border: 'none',
                       background: champ.actif ? 'rgba(0,229,160,0.1)' : 'rgba(255,77,106,0.1)',
                       color: champ.actif ? '#16a34a' : '#dc2626',
                     }}>
                       {champ.actif ? 'Actif' : 'Inactif'}
                     </button>
                   </td>
                   <td style={{ padding: '10px 14px' }}>
                     <div style={{ display: 'flex', gap: 4 }}>
                       <button onClick={() => { 
                         // Convertir topographie_code (CSV) en topographies_list (array) pour édition
                         const champAvecList = { ...champ };
                         if (champ.topographie_code && !champ.topographies_list) {
                           const codes = champ.topographie_code.split(',').map(c => c.trim());
                           const libelles = champ.topographie_libelle ? champ.topographie_libelle.split(';').map(l => l.trim()) : [];
                           champAvecList.topographies_list = codes.map((code, idx) => ({
                             code: code,
                             libelle: libelles[idx] ? libelles[idx].replace(`${code} – `, '').trim() : ''
                           }));
                         } else {
                           champAvecList.topographies_list = champ.topographies_list || [];
                         }
                         setEditChamp(champAvecList); 
                         setShowForm(true); 
                       }} style={{ padding: '4px 8px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 4, color: '#334155', fontSize: 11, cursor: 'pointer' }}>Modifier</button>
                       <button onClick={() => handleDelete(champ)} style={{ padding: '4px 8px', background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', borderRadius: 4, color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>Supprimer</button>
                     </div>
                   </td>
                 </tr>
               );
             })}
           </tbody>
         </table>
       )}
     </div>
   </div>
 );
}

function SectionValidationRules() {
 const [rules, setRules] = useState([]);
 const [loading, setLoading] = useState(true);
 const [showForm, setShowForm] = useState(false);
 const [editRule, setEditRule] = useState(null);
 const [saving, setSaving] = useState(false);
 const [search, setSearch] = useState('');
 const [moduleFilter, setModuleFilter] = useState('');
 const [customFields, setCustomFields] = useState([]);
 const [form, setForm] = useState({
   code: '', label: '', description: '', severity: 'warning', active: true,
   module: 'diagnostic',
   conditions: [
     { source: 'diagnostic', field: 'topographie_code', operator: 'equals', value: '' },
   ],
 });

 const loadRules = useCallback(async () => {
   setLoading(true);
   try {
     const { data } = await validationRulesService.list({ page_size: 200 });
     setRules(data.results || data);
   } catch {
     toast.error('Erreur au chargement des règles.');
   } finally {
     setLoading(false);
   }
 }, []);

 const loadCustomFields = useCallback(async () => {
   try {
     const { data } = await apiClient.get('/custom-fields/champs/', { params: { page_size: 200 } });
     setCustomFields(data.results || data);
   } catch {
     toast.error('Impossible de charger les champs personnalisés.');
   }
 }, []);

 useEffect(() => { loadRules(); loadCustomFields(); }, [loadRules, loadCustomFields]);

 const customFieldOptions = customFields
   .filter((field) => field.module === form.module)
   .map((field) => ({ value: field.code, label: `${field.nom} (${field.code})` }));
 const ruleFieldsBySource = (source) => {
   const baseFields = VALIDATION_FIELDS[source] || [];
   if (source === 'diagnostic') {
     return [...baseFields, ...customFieldOptions];
   }
   return baseFields;
 };

 const setFormValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
 const setConditionValue = (index, key, value) => {
   setForm((prev) => {
     const next = [...prev.conditions];
     next[index] = { ...next[index], [key]: value };
     if (key === 'source') {
       const options = ruleFieldsBySource(value);
       next[index].field = options.length > 0 ? options[0].value : '';
     }
     return { ...prev, conditions: next };
   });
 };
 const addCondition = () => {
   setForm((prev) => ({
     ...prev,
     conditions: [
       ...prev.conditions,
       { source: 'patient', field: 'sexe', operator: 'equals', value: '' },
     ],
   }));
 };
 const removeCondition = (index) => {
   setForm((prev) => ({
     ...prev,
     conditions: prev.conditions.filter((_, idx) => idx !== index),
   }));
 };

 const slugify = (text) => text
   .toString()
   .normalize('NFKD')
   .replace(/\p{Diacritic}/gu, '')
   .replace(/[^a-zA-Z0-9]+/g, '_')
   .replace(/^_+|_+$/g, '')
   .toLowerCase();

 const resetForm = () => {
   setForm({
     code: '', label: '', description: '', severity: 'warning', active: true,
     module: 'diagnostic',
     conditions: [
       { source: 'diagnostic', field: 'topographie_code', operator: 'equals', value: '' },
     ],
   });
   setEditRule(null);
 };

 const handleEdit = (rule) => {
   const conditions = Array.isArray(rule.conditions) && rule.conditions.length
     ? rule.conditions.map((cond) => ({
         source: cond.source || (cond.field?.startsWith('patient.') ? 'patient' : 'diagnostic'),
         field: cond.field || rule.field_name || '',
         operator: cond.operator || 'equals',
         value: cond.value || '',
       }))
     : [{ source: 'diagnostic', field: 'topographie_code', operator: 'equals', value: '' }];

   setEditRule(rule);
   setForm({
     code: rule.code,
     label: rule.label,
     description: rule.description,
     severity: rule.severity || 'warning',
     active: rule.active,
     module: rule.module || 'diagnostic',
     conditions,
   });
   setShowForm(true);
 };

 const handleSave = async () => {
   if (!form.label.trim()) { toast.error('Le libellé de la règle est requis.'); return; }
   if (!form.conditions || form.conditions.length === 0 || !form.conditions[0].field.trim()) {
     toast.error('Au moins une condition doit être définie.'); return;
   }

   for (const condition of form.conditions) {
     if (!condition.field.trim()) { toast.error('Chaque condition doit avoir un champ.'); return; }
     if (['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than'].includes(condition.operator) && !String(condition.value).trim()) {
       toast.error('La valeur est requise pour l’opérateur sélectionné.'); return;
     }
   }

   const payload = {
     code: form.code.trim() || slugify(form.label),
     label: form.label,
     description: form.description,
     severity: form.severity,
     active: form.active,
     module: form.module,
     field_name: form.conditions[0].field,
     conditions: form.conditions.map((condition) => ({
       source: condition.source,
       field: condition.field,
       operator: condition.operator,
       value: condition.value,
     })),
   };
   setSaving(true);
   try {
     if (editRule && editRule.id) {
       await validationRulesService.update(editRule.id, payload);
       toast.success('Règle modifiée avec succès.');
     } else {
       await validationRulesService.create(payload);
       toast.success('Règle créée avec succès.');
     }
     resetForm();
     setShowForm(false);
     loadRules();
   } catch (err) {
     const msg = err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erreur lors de l’enregistrement.';
     toast.error(msg);
   } finally {
     setSaving(false);
   }
 };

 const handleDelete = async (rule) => {
   if (!window.confirm(`Supprimer la règle ${rule.label} ?`)) return;
   try {
     await validationRulesService.delete(rule.id);
     toast.success('Règle supprimée.');
     loadRules();
   } catch {
     toast.error('Impossible de supprimer la règle.');
   }
 };

 const filteredRules = rules.filter((rule) => {
   if (moduleFilter && rule.module !== moduleFilter) return false;
   if (search && ![rule.code, rule.label, rule.description, rule.field_name].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))) return false;
   return true;
 });

 return (
   <div>
     <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:20, flexWrap:'wrap' }}>
       <div>
         <h3 style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:6 }}>Règles de validation</h3>
         <p style={{ fontSize:13, color:'#64748b' }}>Créez et éditez des règles par page/module et champ ciblé.</p>
       </div>
       <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding:'10px 16px', background:'linear-gradient(135deg, #16a34a, #22c55e)', border:'none', borderRadius:12, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>+ Nouvelle règle</button>
     </div>

     {showForm && (
       <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:16, padding:20, marginBottom:24 }}>
         <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:16, marginBottom:18 }}>
           <div>
             <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>Libellé de la règle *</label>
             <input value={form.label} onChange={(e) => setFormValue('label', e.target.value)} style={{ width:'100%', padding:10, borderRadius:12, border:'1px solid rgba(37,99,235,0.12)', background:'#f1f5f9', fontSize:13, color:'#0f172a' }} />
           </div>
           <div>
             <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>Page / module *</label>
             <select value={form.module} onChange={(e) => setFormValue('module', e.target.value)} style={{ width:'100%', padding:10, borderRadius:12, border:'1px solid rgba(37,99,235,0.12)', background:'#f1f5f9', fontSize:13, color:'#0f172a', cursor:'pointer' }}>
               {VALIDATION_MODULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
             </select>
           </div>
           <div style={{ gridColumn:'1 / -1' }}>
             <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>Conditions *</label>
             <div style={{ display:'grid', gap:12 }}>
               {form.conditions.map((condition, index) => {
                 const conditionFields = ruleFieldsBySource(condition.source);
                 return (
                   <div key={index} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr auto', gap:12, alignItems:'end' }}>
                     <div>
                       <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>Source</label>
                       <select value={condition.source} onChange={(e) => setConditionValue(index, 'source', e.target.value)} style={{ width:'100%', padding:10, borderRadius:12, border:'1px solid rgba(37,99,235,0.12)', background:'#f1f5f9', fontSize:13, color:'#0f172a', cursor:'pointer' }}>
                         {VALIDATION_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
                       </select>
                     </div>
                     <div>
                       <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>Champ</label>
                       <select value={condition.field} onChange={(e) => setConditionValue(index, 'field', e.target.value)} style={{ width:'100%', padding:10, borderRadius:12, border:'1px solid rgba(37,99,235,0.12)', background:'#f1f5f9', fontSize:13, color:'#0f172a', cursor:'pointer' }}>
                         <option value="">Sélectionner un champ</option>
                         {conditionFields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}
                       </select>
                     </div>
                     <div>
                       <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>Opérateur</label>
                       <select value={condition.operator} onChange={(e) => setConditionValue(index, 'operator', e.target.value)} style={{ width:'100%', padding:10, borderRadius:12, border:'1px solid rgba(37,99,235,0.12)', background:'#f1f5f9', fontSize:13, color:'#0f172a', cursor:'pointer' }}>
                         {VALIDATION_OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                       </select>
                     </div>
                     {['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than'].includes(condition.operator) ? (
                       <div>
                         <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>Valeur</label>
                         <input value={condition.value} onChange={(e) => setConditionValue(index, 'value', e.target.value)} style={{ width:'100%', padding:10, borderRadius:12, border:'1px solid rgba(37,99,235,0.12)', background:'#f1f5f9', fontSize:13, color:'#0f172a' }} />
                       </div>
                     ) : (
                       <div />
                     )}
                     <div style={{ display:'flex', justifyContent:'flex-end' }}>
                       {index > 0 && (
                         <button type='button' onClick={() => removeCondition(index)} style={{ padding:'10px 14px', border:'1px solid rgba(255,77,106,0.2)', borderRadius:12, background:'#fff3f2', color:'#dc2626', cursor:'pointer', fontSize:13 }}>
                           Supprimer
                         </button>
                       )}
                     </div>
                   </div>
                 );
               })}
               {form.conditions.length < 3 && (
                 <button type='button' onClick={addCondition} style={{ padding:'10px 14px', borderRadius:12, background:'#eff6ff', border:'1px solid rgba(37,99,235,0.12)', color:'#2563eb', cursor:'pointer', fontSize:13, width:'fit-content' }}>
                   + Ajouter une condition
                 </button>
               )}
             </div>
           </div>
           <div>
             <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>Niveau *</label>
             <select value={form.severity} onChange={(e) => setFormValue('severity', e.target.value)} style={{ width:'100%', padding:10, borderRadius:12, border:'1px solid rgba(37,99,235,0.12)', background:'#f1f5f9', fontSize:13, color:'#0f172a', cursor:'pointer' }}>
               <option value='error'>Erreur</option>
               <option value='warning'>Avertissement</option>
               <option value='info'>Information</option>
             </select>
           </div>
           <div style={{ gridColumn:'1 / -1' }}>
             <label style={{ display:'block', fontSize:12, color:'#64748b', marginBottom:6 }}>Description / message *</label>
             <textarea value={form.description} onChange={(e) => setFormValue('description', e.target.value)} rows={3} style={{ width:'100%', padding:10, borderRadius:12, border:'1px solid rgba(37,99,235,0.12)', background:'#f1f5f9', fontSize:13, color:'#0f172a' }} />
           </div>
           <div style={{ display:'flex', alignItems:'center', gap:8 }}>
             <input type='checkbox' checked={form.active} onChange={(e) => setFormValue('active', e.target.checked)} style={{ width:14, height:14 }} />
             <span style={{ fontSize:12, color:'#334155' }}>Règle active</span>
           </div>
         </div>
         <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
           <button type='button' onClick={() => { setShowForm(false); resetForm(); }} style={{ padding:'10px 16px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:12, color:'#334155', cursor:'pointer' }}>Annuler</button>
           <button type='button' onClick={handleSave} disabled={saving} style={{ padding:'10px 16px', background:'linear-gradient(135deg, #16a34a, #22c55e)', border:'none', borderRadius:12, color:'#fff', fontWeight:700, cursor:saving ? 'not-allowed' : 'pointer', opacity:saving ? 0.7 : 1 }}>
             {saving ? 'Enregistrement...' : editRule ? 'Modifier la règle' : 'Créer la règle'}
           </button>
         </div>
       </div>
     )}

     <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
       <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Rechercher une règle...' style={{ flex:1, minWidth:200, padding:10, background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:12, color:'#0f172a', fontSize:13 }} />
       <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={{ padding:10, borderRadius:12, border:'1px solid rgba(37,99,235,0.12)', background:'#f1f5f9', color:'#0f172a', cursor:'pointer' }}>
         <option value=''>Tous les modules</option>
         {VALIDATION_MODULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
       </select>
     </div>

     <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:16, overflow:'hidden' }}>
       {loading ? (
         <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>
           <div style={{ width:24, height:24, border:'2px solid rgba(37,99,235,0.12)', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto 10px' }} />
           Chargement...
         </div>
       ) : filteredRules.length === 0 ? (
         <div style={{ padding:40, textAlign:'center', color:'#64748b', fontSize:13.5 }}>
           {search || moduleFilter ? 'Aucune règle ne correspond à votre recherche.' : 'Aucune règle de validation — créez-en une pour démarrer.'}
         </div>
       ) : (
         <table style={{ width:'100%', borderCollapse:'collapse' }}>
           <thead>
             <tr style={{ background:'#f1f5f9' }}>
               {['Code','Libellé','Page','Champ','Niveau','Active','Actions'].map((h) => (
                 <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#64748b', letterSpacing:0.5, textTransform:'uppercase' }}>{h}</th>
               ))}
             </tr>
           </thead>
           <tbody>
             {filteredRules.map((rule, index) => (
               <tr key={rule.id || index} style={{ borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
                 <td style={{ padding:'12px 14px', fontSize:13, color:'#0f172a' }}>{rule.code}</td>
                 <td style={{ padding:'12px 14px', fontSize:13, color:'#0f172a' }}>{rule.label}</td>
                 <td style={{ padding:'12px 14px', fontSize:12, color:'#64748b' }}>{VALIDATION_MODULES.find((m) => m.value === rule.module)?.label || rule.module}</td>
                 <td style={{ padding:'12px 14px', fontSize:12, color:'#64748b' }}>{rule.field_name || '—'}</td>
                 <td style={{ padding:'12px 14px', fontSize:12, color:'#0f172a' }}>{rule.severity}</td>
                 <td style={{ padding:'12px 14px' }}><span style={{ padding:'4px 10px', borderRadius:999, background:rule.active ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)', color:rule.active ? '#16a34a' : '#dc2626', fontSize:11, fontWeight:600 }}>{rule.active ? 'Oui' : 'Non'}</span></td>
                 <td style={{ padding:'12px 14px' }}>
                   <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                     <button type='button' onClick={() => handleEdit(rule)} style={{ padding:'6px 10px', border:'1px solid rgba(37,99,235,0.16)', borderRadius:8, color:'#2563eb', background:'#f1f5f9', cursor:'pointer', fontSize:11 }}>Modifier</button>
                     <button type='button' onClick={() => handleDelete(rule)} style={{ padding:'6px 10px', border:'1px solid rgba(255,77,106,0.2)', borderRadius:8, color:'#dc2626', background:'#fff3f2', cursor:'pointer', fontSize:11 }}>Supprimer</button>
                   </div>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       )}
     </div>
   </div>
 );
}

// ------------------------------------------------------------
// PAGE PRINCIPALE
// ------------------------------------------------------------

export default function AdminPage() {
 const [tab, setTab] = useState('users');

 const TABS = [
 { key:'users', label:'Utilisateurs', color:'#2563eb' },
 { key:'audit', label:'Audit Logs', color:'#7c3aed' },
 { key:'champs', label:'Champs personnalises', color:'#d97706' },
 { key:'validation', label:'Règles de validation', color:'#16a34a' },
 ];

 return (
 <AppLayout title="Administration">
 <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
 <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,77,106,0.12)', border:'1px solid rgba(255,77,106,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#dc2626' }}>ADM</div>
 <div>
 <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'#0f172a', marginBottom:2 }}>Panneau d'administration</h2>
 <p style={{ fontSize:11, color:'#64748b' }}>Gestion des utilisateurs - Audit logs - Informations systeme</p>
 </div>
 </div>

 <div style={{ display:'flex', background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden', marginBottom:20 }}>
 {TABS.map(t => (
 <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, padding:'12px', background:'none', border:'none', borderBottom:`2px solid ${tab===t.key ? t.color : 'transparent'}`, color:tab===t.key ? t.color : '#64748b', fontSize:13, fontWeight:tab===t.key ? 600 : 400, cursor:'pointer', fontFamily:'var(--font-body)', transition:'color 0.15s' }}>
 {t.label}
 </button>
 ))}
 </div>

 {tab === 'users'&& <SectionUsers />}
 {tab === 'audit'&& <SectionAudit />}
 {tab === 'champs'&& <SectionCustomFields />}
 {tab === 'validation'&& <SectionValidationRules />}
 </AppLayout>
 );
}

function BtnTiny({ color, onClick, children }) {
 return (
 <button onClick={onClick} style={{ padding:'4px 8px', background:`${color}12`, border:`1px solid ${color}25`, borderRadius:6, color, fontSize:10, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}
 onMouseEnter={e => e.currentTarget.style.background=`${color}22`}
 onMouseLeave={e => e.currentTarget.style.background=`${color}12`}
 >{children}</button>
 );
}
const actionBtnSt = (color) => ({ padding:'8px 14px', background:`${color}12`, border:`1px solid ${color}25`, borderRadius:8, color, fontSize:12, fontWeight:600, cursor:'pointer' });
const selSt = { padding:'7px 10px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#334155', fontSize:12, outline:'none', cursor:'pointer' };
const inputSt = { width:'100%', padding:'8px 11px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.08)', borderRadius:8, color:'#0f172a', fontSize:12.5, outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' };
