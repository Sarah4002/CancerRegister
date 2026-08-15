import { useCallback, useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import usePreferences from '../../hooks/usePreferences';
import { validationRulesService } from '../../services/validationRulesService';
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
   HOOK PARTAGÉ — logique commune à la page complète et au panel embarqué
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

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE COMPLÈTE (design AdminSettingsPage) — utilisée en autonome
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
   Reprend exactement les tokens visuels (Panel, ToggleRow, Segmented, inputStyle,
   clair/sombre) utilisés par DoctorSettingsPage pour s'intégrer dans sa grille.
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
const segmentedStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7, marginBottom: 14 };
const segmentButtonStyle = (ui) => ({ minHeight: 36, border: `1px solid ${ui.border}`, borderRadius: 9, background: ui.raised, color: ui.text, cursor: 'pointer', fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 });
const segmentActiveStyle = { background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' };
const primaryButtonStyle = { minHeight: 40, border: 'none', borderRadius: 10, background: '#2563eb', color: '#ffffff', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 900, cursor: 'pointer' };
const secondaryButtonStyle = (ui) => ({ minHeight: 36, border: `1px solid ${ui.border}`, background: ui.raised, color: '#2563eb', borderRadius: 10, padding: '0 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 });
const dangerIconButtonStyle = (ui) => ({ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(220,38,38,0.2)', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontSize: 16, lineHeight: 1, flexShrink: 0 });
const miniTableStyle = (ui) => ({ marginTop: 4, border: `1px solid ${ui.border}`, borderRadius: 10, overflow: 'hidden' });
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

export function MedicalConfigurationPanel() {
  const { theme } = usePreferences();
  const ui = theme === 'dark' ? darkUi : lightUi;
  const c = useMedicalConfig();

  return (
    <section style={panelStyle(ui)}>
      <div style={panelHeaderStyle}>
        <div style={panelIconStyle(ui)}><Settings2 size={18} /></div>
        <h3 style={panelTitleStyle(ui)}>Configuration médicale</h3>
      </div>

      <DoctorSegmented
        ui={ui}
        value={c.tab}
        options={[['rules', 'Règles de validation'], ['fields', 'Champs personnalisés']]}
        onChange={c.switchTab}
      />

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
    </section>
  );
}