import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import { validationRulesService } from '../../services/validationRulesService';
import api from '../../services/api';

const MODULES = {
  patient: 'Dossier patient', diagnostic: 'Diagnostic',
  traitement: 'Traitement', suivi: 'Suivi / consultation',
};
const TYPES = { texte: 'Texte', nombre: 'Nombre', date: 'Date', booleen: 'Oui / Non', textarea: 'Texte long', select: 'Liste' };

const emptyRule = { code: '', label: '', module: 'diagnostic', field_name: '', severity: 'warning', description: '', active: true, conditions: [] };
const emptyField = { nom: '', description: '', type_champ: 'texte', module: 'patient', obligatoire: false, actif: true, ordre: 0, options: [] };

/* ─────────────────────────────────────────────────────────────────────────────
   PRIMITIVES PARTAGÉES (identiques à AdminSettingsPage)
───────────────────────────────────────────────────────────────────────────── */
const cardSt = {
  background:'#fff', border:'1px solid rgba(37,99,235,0.08)',
  borderRadius:14, padding:'22px 24px',
  boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
};

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

const inputSt = {
  padding:'8px 12px', background:'#f8fafc', border:'1px solid rgba(37,99,235,0.15)',
  borderRadius:9, color:'#0f172a', fontSize:12.5, outline:'none', minWidth:220,
};

function PrimaryButton({ children, onClick, disabled, color = '#2563eb', variant = 'solid', type = 'button' }) {
  const solid = variant === 'solid';
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        padding:'9px 18px', borderRadius:10, fontSize:12.5, fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer',
        border: solid ? 'none' : `1px solid ${color}30`,
        background: solid ? (disabled ? '#93c5fd' : `linear-gradient(135deg,${color}dd,${color})`) : `${color}0c`,
        color: solid ? '#fff' : color,
        opacity: disabled ? 0.7 : 1,
        boxShadow: solid ? `0 3px 10px ${color}30` : 'none',
        display:'inline-flex', alignItems:'center', gap:6,
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width:42, height:24, borderRadius:20, border:'none', cursor:'pointer', position:'relative',
        background: checked ? '#2563eb' : '#cbd5e1', transition:'background .15s', flexShrink:0,
      }}
    >
      <div style={{
        width:18, height:18, borderRadius:'50%', background:'#fff',
        position:'absolute', top:3, left: checked ? 21 : 3, transition:'left .15s',
        boxShadow:'0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TABS NAVIGATION (identique à AdminSettingsPage)
───────────────────────────────────────────────────────────────────────────── */
const TABS = [
  { key:'rules',  label:'Règles de validation',   icon:'' },
  { key:'fields', label:'Champs personnalisés',   icon:'' },
];

function TabsNav({ active, onChange }) {
  return (
    <div style={{ display:'flex', gap:6, marginBottom:20, background:'#fff', padding:6, borderRadius:12, border:'1px solid rgba(37,99,235,0.08)', boxShadow:'0 2px 8px rgba(15,23,42,0.06)', width:'fit-content' }}>
      {TABS.map(t => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding:'9px 16px', borderRadius:9, border:'none', cursor:'pointer',
              fontSize:12.5, fontWeight:600, display:'flex', alignItems:'center', gap:7,
              background: isActive ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'transparent',
              color: isActive ? '#fff' : '#64748b',
              boxShadow: isActive ? '0 3px 10px rgba(37,99,235,0.3)' : 'none',
              transition:'all .15s',
            }}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FORMULAIRE (créer une règle / un champ)
───────────────────────────────────────────────────────────────────────────── */
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
              <option value="error">Erreur</option>
              <option value="warning">Avertissement</option>
              <option value="info">Information</option>
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
            <Toggle checked={form.obligatoire} onChange={v => set('obligatoire', v)} />
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

/* ══════════════════════════════════════════════
   MAIN — MedicalConfigurationPage
   ══════════════════════════════════════════════ */
export default function MedicalConfigurationPage() {
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

  return (
    <AppLayout title="Paramètres & configuration médicale">
      <div style={{ marginBottom:6 }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:3 }}>
          Configuration médicale
        </h2>
        <div style={{ fontSize:12, color:'#94a3b8', marginBottom:18 }}>
          Règles de validation clinique et champs personnalisés appliqués aux formulaires.
        </div>
      </div>

      <TabsNav active={tab} onChange={switchTab} />

      {/* ── Bandeau stats + action ── */}
      <div style={{ ...cardSt, marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
          <SectionTitle sub={tab === 'rules' ? 'Définissez les contrôles appliqués aux données cliniques.' : 'Ajoutez les informations utiles aux formulaires des dossiers.'}>
            {tab === 'rules' ? 'Règles de validation' : 'Champs personnalisés'}
          </SectionTitle>
          <PrimaryButton onClick={() => setShowForm(true)}>+ {tab === 'rules' ? 'Nouvelle règle' : 'Nouveau champ'}</PrimaryButton>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ padding:'8px 12px', borderLeft:'3px solid #2563eb', background:'#f8fafc', borderRadius:7 }}>
            <strong style={{ color:'#2563eb', fontSize:16 }}>{items.length}</strong>
            <span style={{ marginLeft:6, color:'#64748b', fontSize:11 }}>{tab === 'rules' ? 'Règles' : 'Champs'}</span>
          </div>
          <div style={{ padding:'8px 12px', borderLeft:'3px solid #16a34a', background:'#f8fafc', borderRadius:7 }}>
            <strong style={{ color:'#16a34a', fontSize:16 }}>{activeCount}</strong>
            <span style={{ marginLeft:6, color:'#64748b', fontSize:11 }}>Actifs</span>
          </div>
        </div>
      </div>

      {showForm && <ConfigForm tab={tab} form={form} setForm={setForm} onSubmit={submit} onCancel={() => setShowForm(false)} saving={saving} />}

      {/* ── Liste ── */}
      <div style={cardSt}>
        <SectionTitle sub={tab === 'rules' ? 'Toutes les règles configurées, triées par création.' : 'Tous les champs personnalisés disponibles dans les formulaires.'}>
          {tab === 'rules' ? 'Liste des règles' : 'Liste des champs'}
        </SectionTitle>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Chargement...</div>
        ) : items.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
            {tab === 'rules' ? 'Aucune règle de validation.' : 'Aucun champ personnalisé.'}
          </div>
        ) : (
          <div>
            {items.map(item => {
              const active = tab === 'rules' ? item.active : item.actif;
              return (
                <FieldRow
                  key={item.id}
                  label={item.label || item.nom}
                  hint={`${MODULES[item.module] || item.module} · ${tab === 'rules' ? (item.severity === 'error' ? 'Erreur' : item.severity === 'warning' ? 'Avertissement' : 'Information') : TYPES[item.type_champ]}`}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <Toggle checked={active} onChange={() => toggle(item)} />
                    <button
                      onClick={() => remove(item)}
                      title="Supprimer"
                      style={{ width:30, height:30, borderRadius:9, border:'1px solid rgba(220,38,38,0.2)', background:'rgba(220,38,38,0.06)', color:'#dc2626', cursor:'pointer', fontSize:16, lineHeight:1 }}
                    >
                      ×
                    </button>
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