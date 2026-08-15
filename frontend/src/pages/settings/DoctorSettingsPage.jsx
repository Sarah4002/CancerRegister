import { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw, Search, Settings2, Sliders } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import usePreferences from '../../hooks/usePreferences';
import { validationRulesService } from '../../services/validationRulesService';
import { adminService } from '../../services/adminService';
import api from '../../services/api';

const MODULES = {
  patient: 'Dossier patient', diagnostic: 'Diagnostic',
  traitement: 'Traitement', suivi: 'Suivi / consultation',
};
const TYPES = { texte: 'Texte', nombre: 'Nombre', date: 'Date', booleen: 'Oui / Non', textarea: 'Texte long', select: 'Liste' };
const SEVERITY_LABELS = { error: 'Erreur', warning: 'Avertissement', info: 'Information' };

const emptyRule = { code: '', label: '', module: 'diagnostic', field_name: '', severity: 'warning', description: '', active: true, conditions: [] };
const emptyField = { nom: '', description: '', type_champ: 'texte', module: 'patient', obligatoire: false, actif: true, ordre: 0, options: [] };

/* ─────────────────────────────────────────────────────────────────────────────
   HOOK PARTAGÉ — règles / champs personnalisés
───────────────────────────────────────────────────────────────────────────── */
function useMedicalConfig() {
  const [tab, setTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyRule);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, fieldsRes] = await Promise.all([
        validationRulesService.list({ page_size: 200 }),
        api.get('/custom-fields/champs/', { params: { page_size: 200 } }),
      ]);
      setRules(rulesRes.data.results || rulesRes.data || []);
      setFields(fieldsRes.data.results || fieldsRes.data || []);
    } catch {
      toast.error('Impossible de charger la configuration médicale.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const switchTab = (next) => {
    setTab(next);
    setShowForm(false);
    setForm(next === 'rules' ? emptyRule : emptyField);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (tab === 'rules') {
        await validationRulesService.create({ ...form, conditions: form.conditions || [] });
      } else {
        await api.post('/custom-fields/champs/', { ...form, ordre: Number(form.ordre) || 0 });
      }
      toast.success(tab === 'rules' ? 'Règle de validation créée.' : 'Champ personnalisé créé.');
      setShowForm(false);
      setForm(tab === 'rules' ? emptyRule : emptyField);
      load();
    } catch (error) {
      const details = error.response?.data;
      toast.error(details ? Object.values(details).flat().join(' ') : "Échec de l'enregistrement.");
    } finally { setSaving(false); }
  };

  const toggle = async (item) => {
    try {
      if (tab === 'rules') await validationRulesService.update(item.id, { active: !item.active });
      else await api.patch(`/custom-fields/champs/${item.id}/`, { actif: !item.actif });
      load();
    } catch { toast.error('Modification impossible.'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Supprimer « ${item.label || item.nom} » ?`)) return;
    try {
      if (tab === 'rules') await validationRulesService.delete(item.id);
      else await api.delete(`/custom-fields/champs/${item.id}/`);
      toast.success('Élément supprimé.');
      load();
    } catch { toast.error('Suppression impossible.'); }
  };

  const items = tab === 'rules' ? rules : fields;
  const activeCount = items.filter(item => tab === 'rules' ? item.active : item.actif).length;

  return { tab, switchTab, items, activeCount, loading, showForm, setShowForm, form, setForm, submit, toggle, remove, saving };
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOOK — paramètres généraux (nom app, email, langue, session...)
───────────────────────────────────────────────────────────────────────────── */
function useGeneralSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.settings.get();
      setSettings(data);
    } catch {
      setSettings({
        nom_application: 'RegistreCancer.dz',
        email_contact: '',
        langue: 'fr-DZ',
        fuseau_horaire: 'Africa/Algiers',
        session_timeout: 60,
        mode_maintenance: false,
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await adminService.settings.update(settings);
      toast.success('Paramètres enregistrés.');
    } catch (err) {
      toast.error(err.response?.data?.error || "Échec de l'enregistrement.");
    } finally { setSaving(false); }
  };

  return { settings, set, save, loading, saving };
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOOK — mots de passe (politique + attribution)
───────────────────────────────────────────────────────────────────────────── */
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

function usePasswordManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState({ longueur_min: 8, expiration_jours: 90, exiger_maj_chiffre: true });
  const [savingPolicy, setSavingPolicy] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.users.list({ search });
      setUsers(data.results || data || []);
    } catch {
      toast.error('Impossible de charger les utilisateurs.');
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  useEffect(() => {
    adminService.settings.get?.()
      .then(({ data }) => { if (data?.password_policy) setPolicy(data.password_policy); })
      .catch(() => {});
  }, []);

  const openFor = (u) => { setSelectedUser(u); setNewPwd(generatePassword()); };
  const closeModal = () => { setSelectedUser(null); setNewPwd(''); };

  const confirmNewPassword = async () => {
    if (!selectedUser) return;
    if (newPwd.length < (policy.longueur_min || 8)) {
      toast.error(`Le mot de passe doit contenir au moins ${policy.longueur_min || 8} caractères.`);
      return;
    }
    setSaving(true);
    try {
      await adminService.users.resetPassword(selectedUser.id, newPwd);
      toast.success(`Nouveau mot de passe attribué à ${selectedUser.full_name || selectedUser.username}.`);
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Échec de la réinitialisation.');
    } finally { setSaving(false); }
  };

  const savePolicy = async () => {
    setSavingPolicy(true);
    try {
      await adminService.settings.update({ password_policy: policy });
      toast.success('Politique de mot de passe enregistrée.');
    } catch (err) {
      toast.error(err.response?.data?.error || "Échec de l'enregistrement.");
    } finally { setSavingPolicy(false); }
  };

  return { users, search, setSearch, loading, selectedUser, openFor, closeModal, newPwd, setNewPwd, saving, confirmNewPassword, policy, setPolicy, savePolicy, savingPolicy, fetchUsers };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE COMPLÈTE (design AdminSettingsPage) — inchangée
═══════════════════════════════════════════════════════════════════════════ */
const cardSt = { background:'#fff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:14, padding:'22px 24px', boxShadow:'0 2px 8px rgba(15,23,42,0.06)' };

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', fontFamily:'var(--font-display)' }}>{children}</div>
      {sub && <div style={{ fontSize:12, color:'#94a3b8', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:24, padding:'14px 0', borderBottom:'1px solid rgba(37,99,235,0.06)' }}>
      <div style={{ maxWidth:340 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', marginBottom:3 }}>{label}</div>
        {hint && <div style={{ fontSize:11.5, color:'#94a3b8', lineHeight:1.5 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

const inputSt = { padding:'8px 12px', background:'#f8fafc', border:'1px solid rgba(37,99,235,0.15)', borderRadius:9, color:'#0f172a', fontSize:12.5, outline:'none', minWidth:220 };

function PrimaryButton({ children, onClick, disabled, color = '#2563eb', variant = 'solid', type = 'button' }) {
  const solid = variant === 'solid';
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding:'9px 18px', borderRadius:10, fontSize:12.5, fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer',
      border: solid ? 'none' : `1px solid ${color}30`,
      background: solid ? (disabled ? '#93c5fd' : `linear-gradient(135deg,${color}dd,${color})`) : `${color}0c`,
      color: solid ? '#fff' : color, opacity: disabled ? 0.7 : 1,
      boxShadow: solid ? `0 3px 10px ${color}30` : 'none', display:'inline-flex', alignItems:'center', gap:6,
    }}>
      {children}
    </button>
  );
}

function AdminToggle({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} style={{ width:42, height:24, borderRadius:20, border:'none', cursor:'pointer', position:'relative', background: checked ? '#2563eb' : '#cbd5e1', transition:'background .15s', flexShrink:0 }}>
      <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: checked ? 21 : 3, transition:'left .15s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }} />
    </button>
  );
}

const TABS = [
  { key:'rules',  label:'Règles de validation' },
  { key:'fields', label:'Champs personnalisés' },
];

function TabsNav({ active, onChange }) {
  return (
    <div style={{ display:'flex', gap:6, marginBottom:20, background:'#fff', padding:6, borderRadius:12, border:'1px solid rgba(37,99,235,0.08)', boxShadow:'0 2px 8px rgba(15,23,42,0.06)', width:'fit-content' }}>
      {TABS.map(t => {
        const isActive = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{
            padding:'9px 16px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12.5, fontWeight:600,
            background: isActive ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'transparent',
            color: isActive ? '#fff' : '#64748b', boxShadow: isActive ? '0 3px 10px rgba(37,99,235,0.3)' : 'none', transition:'all .15s',
          }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ConfigForm({ tab, form, setForm, onSubmit, onCancel, saving }) {
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  return (
    <form onSubmit={onSubmit} style={{ ...cardSt, marginBottom:16 }}>
      <SectionTitle sub={tab === 'rules' ? 'Définissez le contrôle appliqué aux données cliniques.' : "Ajoutez l'information utile aux formulaires des dossiers."}>
        {tab === 'rules' ? 'Nouvelle règle de validation' : 'Nouveau champ personnalisé'}
      </SectionTitle>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'0 24px' }}>
        {tab === 'rules' ? <>
          <FieldRow label="Libellé *"><input required style={inputSt} value={form.label} onChange={e => set('label', e.target.value)} /></FieldRow>
          <FieldRow label="Code *"><input required style={inputSt} value={form.code} onChange={e => set('code', e.target.value)} /></FieldRow>
          <FieldRow label="Module">
            <select style={inputSt} value={form.module} onChange={e => set('module', e.target.value)}>
              {Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Sévérité">
            <select style={inputSt} value={form.severity} onChange={e => set('severity', e.target.value)}>
              {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Champ concerné"><input style={inputSt} value={form.field_name} onChange={e => set('field_name', e.target.value)} /></FieldRow>
          <FieldRow label="Description"><input style={inputSt} value={form.description} onChange={e => set('description', e.target.value)} /></FieldRow>
        </> : <>
          <FieldRow label="Nom du champ *"><input required style={inputSt} value={form.nom} onChange={e => set('nom', e.target.value)} /></FieldRow>
          <FieldRow label="Module">
            <select style={inputSt} value={form.module} onChange={e => set('module', e.target.value)}>
              {Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Type">
            <select style={inputSt} value={form.type_champ} onChange={e => set('type_champ', e.target.value)}>
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Ordre"><input type="number" style={{ ...inputSt, minWidth:100 }} value={form.ordre} onChange={e => set('ordre', e.target.value)} /></FieldRow>
          <FieldRow label="Description"><input style={inputSt} value={form.description} onChange={e => set('description', e.target.value)} /></FieldRow>
          <FieldRow label="Obligatoire" hint="Rend ce champ requis dans le formulaire.">
            <AdminToggle checked={form.obligatoire} onChange={v => set('obligatoire', v)} />
          </FieldRow>
        </>}
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
        <PrimaryButton type="button" onClick={onCancel} color="#64748b" variant="outline">Annuler</PrimaryButton>
        <PrimaryButton type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</PrimaryButton>
      </div>
    </form>
  );
}

export default function MedicalConfigurationPage() {
  const c = useMedicalConfig();

  return (
    <AppLayout title="Paramètres & configuration médicale">
      <div style={{ marginBottom:6 }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:3 }}>Configuration médicale</h2>
        <div style={{ fontSize:12, color:'#94a3b8', marginBottom:18 }}>Règles de validation clinique et champs personnalisés appliqués aux formulaires.</div>
      </div>

      <TabsNav active={c.tab} onChange={c.switchTab} />

      <div style={{ ...cardSt, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
          <SectionTitle sub={c.tab === 'rules' ? 'Définissez les contrôles appliqués aux données cliniques.' : 'Ajoutez les informations utiles aux formulaires des dossiers.'}>
            {c.tab === 'rules' ? 'Règles de validation' : 'Champs personnalisés'}
          </SectionTitle>
          <PrimaryButton onClick={() => c.setShowForm(true)}>+ {c.tab === 'rules' ? 'Nouvelle règle' : 'Nouveau champ'}</PrimaryButton>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ padding:'8px 12px', borderLeft:'3px solid #2563eb', background:'#f8fafc', borderRadius:7 }}>
            <strong style={{ color:'#2563eb', fontSize:16 }}>{c.items.length}</strong>
            <span style={{ marginLeft:6, color:'#64748b', fontSize:11 }}>{c.tab === 'rules' ? 'Règles' : 'Champs'}</span>
          </div>
          <div style={{ padding:'8px 12px', borderLeft:'3px solid #16a34a', background:'#f8fafc', borderRadius:7 }}>
            <strong style={{ color:'#16a34a', fontSize:16 }}>{c.activeCount}</strong>
            <span style={{ marginLeft:6, color:'#64748b', fontSize:11 }}>Actifs</span>
          </div>
        </div>
      </div>

      {c.showForm && <ConfigForm tab={c.tab} form={c.form} setForm={c.setForm} onSubmit={c.submit} onCancel={() => c.setShowForm(false)} saving={c.saving} />}

      <div style={cardSt}>
        <SectionTitle sub={c.tab === 'rules' ? 'Toutes les règles configurées, triées par création.' : 'Tous les champs personnalisés disponibles dans les formulaires.'}>
          {c.tab === 'rules' ? 'Liste des règles' : 'Liste des champs'}
        </SectionTitle>
        {c.loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Chargement...</div>
        ) : c.items.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:13 }}>{c.tab === 'rules' ? 'Aucune règle de validation.' : 'Aucun champ personnalisé.'}</div>
        ) : (
          <div>
            {c.items.map(item => {
              const active = c.tab === 'rules' ? item.active : item.actif;
              return (
                <FieldRow key={item.id} label={item.label || item.nom} hint={`${MODULES[item.module] || item.module} · ${c.tab === 'rules' ? SEVERITY_LABELS[item.severity] : TYPES[item.type_champ]}`}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <AdminToggle checked={active} onChange={() => c.toggle(item)} />
                    <button onClick={() => c.remove(item)} title="Supprimer" style={{ width:30, height:30, borderRadius:9, border:'1px solid rgba(220,38,38,0.2)', background:'rgba(220,38,38,0.06)', color:'#dc2626', cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>
                  </div>
                </FieldRow>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PANEL EMBARQUÉ (design DoctorSettingsPage) — <MedicalConfigurationPanel />
   4 onglets : Règles · Champs · Général · Mots de passe
═══════════════════════════════════════════════════════════════════════════ */
const lightUi = { page: 'transparent', card: '#ffffff', raised: '#f8fbff', text: '#0f172a', muted: '#64748b', border: 'rgba(37,99,235,0.1)' };
const darkUi = { page: '#0f172a', card: '#111827', raised: '#1e293b', text: '#f8fafc', muted: '#94a3b8', border: 'rgba(147,197,253,0.18)' };

const panelStyle = (ui) => ({ background: ui.card, border: `1px solid ${ui.border}`, borderRadius: 14, padding: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.05)', gridColumn: '1 / -1' });
const panelHeaderStyle = { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 };
const panelIconStyle = (ui) => ({ width: 34, height: 34, borderRadius: 10, background: ui.raised, color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' });
const panelTitleStyle = (ui) => ({ color: ui.text, fontSize: 15, fontWeight: 900, fontFamily: 'var(--font-display)' });
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 };
const labelStyle = (ui) => ({ display: 'block', color: ui.muted, fontSize: 10.5, fontWeight: 800, marginBottom: 5 });
const inputStyle = (ui) => ({ width: '100%', height: 38, border: `1px solid ${ui.border}`, background: ui.raised, color: ui.text, borderRadius: 10, padding: '0 10px', fontSize: 12, boxSizing: 'border-box' });
const toggleRowStyle = (ui) => ({ minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, color: ui.text, fontSize: 12.5, fontWeight: 800, borderBottom: `1px solid ${ui.border}` });
const toggleStyle = { width: 42, height: 24, borderRadius: 999, border: '1px solid rgba(100,116,139,0.22)', background: '#e2e8f0', padding: 2, cursor: 'pointer', flexShrink: 0 };
const toggleOnStyle = { background: '#2563eb', borderColor: '#2563eb' };
const toggleKnobStyle = { display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#ffffff', transition: 'transform 0.18s ease' };
const segmentedStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 7, marginBottom: 14 };
const segmentButtonStyle = (ui) => ({ minHeight: 36, border: `1px solid ${ui.border}`, borderRadius: 9, background: ui.raised, color: ui.text, cursor: 'pointer', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 6px' });
const segmentActiveStyle = { background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' };
const primaryButtonStyle = { minHeight: 40, border: 'none', borderRadius: 10, background: '#2563eb', color: '#ffffff', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 900, cursor: 'pointer' };
const secondaryButtonStyle = (ui) => ({ minHeight: 36, border: `1px solid ${ui.border}`, background: ui.raised, color: '#2563eb', borderRadius: 10, padding: '0 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 });
const dangerIconButtonStyle = (ui) => ({ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(220,38,38,0.2)', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 });
const miniTableStyle = (ui) => ({ marginTop: 4, border: `1px solid ${ui.border}`, borderRadius: 10, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' });
const miniRowStyle = (ui) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 11px', borderBottom: `1px solid ${ui.border}`, color: ui.text, fontSize: 12 });

function DoctorSegmented({ ui, value, options, onChange }) {
  return (
    <div style={segmentedStyle}>
      {options.map(([optionValue, label]) => (
        <button key={optionValue} type="button" onClick={() => onChange(optionValue)} style={{ ...segmentButtonStyle(ui), ...(value === optionValue ? segmentActiveStyle : {}) }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function DoctorToggleRow({ ui, label, sub, checked, onChange, onDelete }) {
  return (
    <div style={toggleRowStyle(ui)}>
      <div style={{ minWidth: 0 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
        {sub && <div style={{ color: ui.muted, fontSize: 10.5, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" onClick={() => onChange(!checked)} style={{ ...toggleStyle, ...(checked ? toggleOnStyle : {}) }}>
          <span style={{ ...toggleKnobStyle, transform: checked ? 'translateX(18px)' : 'translateX(0)' }} />
        </button>
        {onDelete && <button type="button" onClick={onDelete} title="Supprimer" style={dangerIconButtonStyle(ui)}>×</button>}
      </div>
    </div>
  );
}

/* ── Sous-section : Général ── */
function GeneralSection({ ui }) {
  const g = useGeneralSettings();
  if (g.loading || !g.settings) return <div style={miniRowStyle(ui)}>Chargement...</div>;

  return (
    <div>
      <label style={fieldStyle}>
        <span style={labelStyle(ui)}>Nom de l'application</span>
        <input style={inputStyle(ui)} value={g.settings.nom_application} onChange={(e) => g.set('nom_application', e.target.value)} />
      </label>
      <label style={fieldStyle}>
        <span style={labelStyle(ui)}>Email de contact</span>
        <input type="email" style={inputStyle(ui)} value={g.settings.email_contact} onChange={(e) => g.set('email_contact', e.target.value)} placeholder="support@registrecancer.dz" />
      </label>
      <label style={fieldStyle}>
        <span style={labelStyle(ui)}>Langue par défaut</span>
        <select style={inputStyle(ui)} value={g.settings.langue} onChange={(e) => g.set('langue', e.target.value)}>
          <option value="fr-DZ">Français (Algérie)</option>
          <option value="fr-FR">Français (France)</option>
        </select>
      </label>
      <label style={fieldStyle}>
        <span style={labelStyle(ui)}>Fuseau horaire</span>
        <select style={inputStyle(ui)} value={g.settings.fuseau_horaire} onChange={(e) => g.set('fuseau_horaire', e.target.value)}>
          <option value="Africa/Algiers">Africa/Algiers (UTC+1)</option>
          <option value="UTC">UTC</option>
        </select>
      </label>
      <label style={fieldStyle}>
        <span style={labelStyle(ui)}>Expiration de session (minutes)</span>
        <input type="number" min={5} max={480} style={inputStyle(ui)} value={g.settings.session_timeout} onChange={(e) => g.set('session_timeout', Number(e.target.value))} />
      </label>
      <div style={toggleRowStyle(ui)}>
        <span>Mode maintenance</span>
        <button type="button" onClick={() => g.set('mode_maintenance', !g.settings.mode_maintenance)} style={{ ...toggleStyle, ...(g.settings.mode_maintenance ? toggleOnStyle : {}) }}>
          <span style={{ ...toggleKnobStyle, transform: g.settings.mode_maintenance ? 'translateX(18px)' : 'translateX(0)' }} />
        </button>
      </div>
      <button type="button" onClick={g.save} disabled={g.saving} style={{ ...primaryButtonStyle, marginTop: 14 }}>
        {g.saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </div>
  );
}

/* ── Sous-section : Mots de passe ── */
function PasswordsSection({ ui }) {
  const p = usePasswordManagement();

  return (
    <div>
      {/* Politique */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...labelStyle(ui), marginBottom: 8 }}>Politique de mot de passe</div>
        <label style={fieldStyle}>
          <span style={labelStyle(ui)}>Longueur minimale</span>
          <input type="number" min={6} max={32} style={{ ...inputStyle(ui), maxWidth: 120 }} value={p.policy.longueur_min} onChange={(e) => p.setPolicy((s) => ({ ...s, longueur_min: Number(e.target.value) }))} />
        </label>
        <label style={fieldStyle}>
          <span style={labelStyle(ui)}>Expiration (jours, 0 = jamais)</span>
          <input type="number" min={0} max={365} style={{ ...inputStyle(ui), maxWidth: 120 }} value={p.policy.expiration_jours} onChange={(e) => p.setPolicy((s) => ({ ...s, expiration_jours: Number(e.target.value) }))} />
        </label>
        <div style={toggleRowStyle(ui)}>
          <span>Exiger majuscule + chiffre</span>
          <button type="button" onClick={() => p.setPolicy((s) => ({ ...s, exiger_maj_chiffre: !s.exiger_maj_chiffre }))} style={{ ...toggleStyle, ...(p.policy.exiger_maj_chiffre ? toggleOnStyle : {}) }}>
            <span style={{ ...toggleKnobStyle, transform: p.policy.exiger_maj_chiffre ? 'translateX(18px)' : 'translateX(0)' }} />
          </button>
        </div>
        <button type="button" onClick={p.savePolicy} disabled={p.savingPolicy} style={{ ...primaryButtonStyle, marginTop: 10 }}>
          {p.savingPolicy ? 'Enregistrement...' : 'Enregistrer la politique'}
        </button>
      </div>

      {/* Attribution */}
      <div>
        <div style={{ ...labelStyle(ui), marginBottom: 8 }}>Attribuer un nouveau mot de passe</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: ui.raised, border: `1px solid ${ui.border}`, borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
          <Search size={14} color={ui.muted} />
          <input
            value={p.search} onChange={(e) => p.setSearch(e.target.value)}
            placeholder="Nom, email, username..."
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 12, color: ui.text }}
          />
          <button type="button" onClick={p.fetchUsers} title="Actualiser" style={{ background: 'none', border: 'none', cursor: 'pointer', color: ui.muted, display: 'flex' }}>
            <RefreshCw size={14} />
          </button>
        </div>

        <div style={miniTableStyle(ui)}>
          {p.loading ? (
            <div style={miniRowStyle(ui)}>Chargement...</div>
          ) : p.users.length === 0 ? (
            <div style={miniRowStyle(ui)}>Aucun utilisateur trouvé</div>
          ) : (
            p.users.map((u) => (
              <div key={u.id} style={miniRowStyle(ui)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || u.username}</div>
                  <div style={{ color: ui.muted, fontSize: 10.5 }}>{u.email}</div>
                </div>
                <button type="button" onClick={() => p.openFor(u)} style={secondaryButtonStyle(ui)}>
                  <KeyRound size={13} /> Nouveau
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {p.selectedUser && (
        <div onClick={(e) => { if (e.target === e.currentTarget) p.closeModal(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: ui.card, borderRadius: 18, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(37,99,235,0.18)', overflow: 'hidden', border: `1px solid ${ui.border}` }}>
            <div style={{ height: 4, background: 'linear-gradient(90deg,#3b82f6,#2563eb)' }} />
            <div style={{ padding: '22px 22px 20px' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: ui.text, marginBottom: 5 }}>Nouveau mot de passe</div>
              <div style={{ fontSize: 12, color: ui.muted, marginBottom: 14 }}>
                Pour {p.selectedUser.full_name || p.selectedUser.username} ({p.selectedUser.email})
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={p.newPwd} onChange={(e) => p.setNewPwd(e.target.value)} style={{ ...inputStyle(ui), fontFamily: 'var(--font-mono)' }} />
                <button type="button" onClick={() => p.setNewPwd(generatePassword())} title="Générer aléatoirement" style={{ padding: '0 12px', borderRadius: 10, border: `1px solid ${ui.border}`, background: ui.raised, color: '#2563eb', cursor: 'pointer' }}>
                  <RefreshCw size={14} />
                </button>
              </div>
              <div style={{ fontSize: 10.5, color: ui.muted, marginBottom: 16 }}>
                Min. {p.policy.longueur_min || 8} caractères. Communiquez ce mot de passe de façon sécurisée.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={p.closeModal} disabled={p.saving} style={{ flex: 1, ...secondaryButtonStyle(ui), justifyContent: 'center' }}>Annuler</button>
                <button type="button" onClick={p.confirmNewPassword} disabled={p.saving} style={{ flex: 1, ...primaryButtonStyle, justifyContent: 'center' }}>
                  {p.saving ? 'Enregistrement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MedicalConfigurationPanel() {
  const { theme } = usePreferences();
  const ui = theme === 'dark' ? darkUi : lightUi;
  const c = useMedicalConfig();
  const [section, setSection] = useState('rules');

  const handleSection = (next) => {
    setSection(next);
    if (next === 'rules' || next === 'fields') c.switchTab(next);
  };

  return (
    <section style={panelStyle(ui)}>
      <div style={panelHeaderStyle}>
        <div style={panelIconStyle(ui)}><Settings2 size={18} /></div>
        <h3 style={panelTitleStyle(ui)}>Configuration médicale</h3>
      </div>

      <DoctorSegmented
        ui={ui}
        value={section}
        options={[
          ['rules', 'Règles'],
          ['fields', 'Champs'],
          ['general', 'Général'],
          ['passwords', 'Mots de passe'],
        ]}
        onChange={handleSection}
      />

      {(section === 'rules' || section === 'fields') && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button type="button" onClick={() => c.setShowForm((v) => !v)} style={secondaryButtonStyle(ui)}>
              {c.showForm ? 'Fermer le formulaire' : `+ ${c.tab === 'rules' ? 'Nouvelle règle' : 'Nouveau champ'}`}
            </button>
            <div style={{ ...labelStyle(ui), display: 'flex', alignItems: 'center', marginBottom: 0 }}>
              {c.items.length} {c.tab === 'rules' ? 'règle(s)' : 'champ(s)'} · {c.activeCount} actif(s)
            </div>
          </div>

          {c.showForm && (
            <form onSubmit={c.submit} style={{ marginBottom: 14 }}>
              {c.tab === 'rules' ? <>
                <label style={fieldStyle}><span style={labelStyle(ui)}>Libellé *</span><input required style={inputStyle(ui)} value={c.form.label} onChange={(e) => c.setForm((f) => ({ ...f, label: e.target.value }))} /></label>
                <label style={fieldStyle}><span style={labelStyle(ui)}>Code *</span><input required style={inputStyle(ui)} value={c.form.code} onChange={(e) => c.setForm((f) => ({ ...f, code: e.target.value }))} /></label>
                <label style={fieldStyle}><span style={labelStyle(ui)}>Module</span>
                  <select style={inputStyle(ui)} value={c.form.module} onChange={(e) => c.setForm((f) => ({ ...f, module: e.target.value }))}>
                    {Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label style={fieldStyle}><span style={labelStyle(ui)}>Sévérité</span>
                  <select style={inputStyle(ui)} value={c.form.severity} onChange={(e) => c.setForm((f) => ({ ...f, severity: e.target.value }))}>
                    {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              </> : <>
                <label style={fieldStyle}><span style={labelStyle(ui)}>Nom du champ *</span><input required style={inputStyle(ui)} value={c.form.nom} onChange={(e) => c.setForm((f) => ({ ...f, nom: e.target.value }))} /></label>
                <label style={fieldStyle}><span style={labelStyle(ui)}>Module</span>
                  <select style={inputStyle(ui)} value={c.form.module} onChange={(e) => c.setForm((f) => ({ ...f, module: e.target.value }))}>
                    {Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label style={fieldStyle}><span style={labelStyle(ui)}>Type</span>
                  <select style={inputStyle(ui)} value={c.form.type_champ} onChange={(e) => c.setForm((f) => ({ ...f, type_champ: e.target.value }))}>
                    {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
              </>}
              <button type="submit" disabled={c.saving} style={{ ...primaryButtonStyle, marginTop: 4 }}>
                {c.saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </form>
          )}

          <div style={miniTableStyle(ui)}>
            {c.loading ? (
              <div style={miniRowStyle(ui)}>Chargement...</div>
            ) : c.items.length === 0 ? (
              <div style={miniRowStyle(ui)}>{c.tab === 'rules' ? 'Aucune règle de validation.' : 'Aucun champ personnalisé.'}</div>
            ) : (
              c.items.map((item) => {
                const active = c.tab === 'rules' ? item.active : item.actif;
                return (
                  <DoctorToggleRow
                    key={item.id}
                    ui={ui}
                    label={item.label || item.nom}
                    sub={`${MODULES[item.module] || item.module} · ${c.tab === 'rules' ? SEVERITY_LABELS[item.severity] : TYPES[item.type_champ]}`}
                    checked={active}
                    onChange={() => c.toggle(item)}
                    onDelete={() => c.remove(item)}
                  />
                );
              })
            )}
          </div>
        </>
      )}

      {section === 'general' && <GeneralSection ui={ui} />}
      {section === 'passwords' && <PasswordsSection ui={ui} />}
    </section>
  );
}