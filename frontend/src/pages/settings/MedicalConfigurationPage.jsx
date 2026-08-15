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
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          <aside style={sideStyle}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Configuration</div>
            <NavItem active={tab === 'rules'} icon="✓" title="Règles de validation" sub="Contrôles des données" onClick={() => switchTab('rules')} />
            <NavItem active={tab === 'fields'} icon="+" title="Champs personnalisés" sub="Formulaires cliniques" onClick={() => switchTab('fields')} />
            <div style={{ marginTop: 20, padding: 12, borderRadius: 10, background: '#eff6ff', color: '#475569', fontSize: 11.5, lineHeight: 1.55 }}>
              Ces réglages s'appliquent aux nouveaux dossiers et formulaires médicaux.
            </div>
          </aside>

          <main>
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{tab === 'rules' ? 'Règles de validation' : 'Champs personnalisés'}</h2>
                  <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#64748b' }}>
                    {tab === 'rules' ? 'Définissez les contrôles appliqués aux données cliniques.' : 'Ajoutez les informations utiles aux formulaires des dossiers.'}
                  </p>
                </div>
                <button onClick={() => setShowForm(true)} style={primaryButton}>+ {tab === 'rules' ? 'Nouvelle règle' : 'Nouveau champ'}</button>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <Stat value={items.length} label={tab === 'rules' ? 'Règles' : 'Champs'} color="#2563eb" />
                <Stat value={activeCount} label="Actifs" color="#16a34a" />
              </div>
            </div>

            {showForm && <ConfigForm tab={tab} form={form} setForm={setForm} onSubmit={submit} onCancel={() => setShowForm(false)} saving={saving} />}

            <div style={cardStyle}>
              {loading ? <Empty text="Chargement..." /> : items.length === 0 ? <Empty text={tab === 'rules' ? 'Aucune règle de validation.' : 'Aucun champ personnalisé.'} /> : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {items.map(item => {
                    const active = tab === 'rules' ? item.active : item.actif;
                    return <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid #eef2f7' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: active ? '#eff6ff' : '#f1f5f9', color: active ? '#2563eb' : '#94a3b8', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{tab === 'rules' ? '✓' : '+'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.label || item.nom}</div>
                        <div style={{ marginTop: 3, fontSize: 11.5, color: '#64748b' }}>{MODULES[item.module] || item.module} · {tab === 'rules' ? item.severity : TYPES[item.type_champ]}</div>
                      </div>
                      <Toggle active={active} onClick={() => toggle(item)} />
                      <button onClick={() => remove(item)} style={deleteButton} title="Supprimer">×</button>
                    </div>;
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AppLayout>
  );
}

function ConfigForm({ tab, form, setForm, onSubmit, onCancel, saving }) {
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  return <form onSubmit={onSubmit} style={{ ...cardStyle, marginBottom: 16 }}>
    <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#0f172a' }}>{tab === 'rules' ? 'Nouvelle règle' : 'Nouveau champ'}</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      {tab === 'rules' ? <>
        <Input label="Libellé *" value={form.label} onChange={v => set('label', v)} required />
        <Input label="Code *" value={form.code} onChange={v => set('code', v)} required />
        <Select label="Module" value={form.module} onChange={v => set('module', v)} options={MODULES} />
        <Select label="Sévérité" value={form.severity} onChange={v => set('severity', v)} options={{ error: 'Erreur', warning: 'Avertissement', info: 'Information' }} />
        <Input label="Champ concerné" value={form.field_name} onChange={v => set('field_name', v)} />
        <Input label="Description" value={form.description} onChange={v => set('description', v)} />
      </> : <>
        <Input label="Nom du champ *" value={form.nom} onChange={v => set('nom', v)} required />
        <Select label="Module" value={form.module} onChange={v => set('module', v)} options={MODULES} />
        <Select label="Type" value={form.type_champ} onChange={v => set('type_champ', v)} options={TYPES} />
        <Input label="Ordre" type="number" value={form.ordre} onChange={v => set('ordre', v)} />
        <Input label="Description" value={form.description} onChange={v => set('description', v)} />
      </>}
    </div>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}><button type="button" onClick={onCancel} style={secondaryButton}>Annuler</button><button disabled={saving} style={primaryButton}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div>
  </form>;
}

function Input({ label, value, onChange, required, type = 'text' }) { return <label style={labelStyle}>{label}<input type={type} required={required} value={value ?? ''} onChange={e => onChange(e.target.value)} style={inputStyle} /></label>; }
function Select({ label, value, onChange, options }) { return <label style={labelStyle}>{label}<select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function NavItem({ active, icon, title, sub, onClick }) { return <button onClick={onClick} style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 10, padding: 11, border: active ? '1px solid #bfdbfe' : '1px solid transparent', borderRadius: 10, background: active ? '#eff6ff' : 'transparent', cursor: 'pointer', color: '#0f172a' }}><span style={{ color: active ? '#2563eb' : '#94a3b8', fontWeight: 800 }}>{icon}</span><span><span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{title}</span><span style={{ display: 'block', fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>{sub}</span></span></button>; }
function Toggle({ active, onClick }) { return <button onClick={onClick} style={{ width: 36, height: 20, border: 0, borderRadius: 12, background: active ? '#2563eb' : '#cbd5e1', cursor: 'pointer' }}><span style={{ display: 'block', width: 14, height: 14, marginLeft: active ? 18 : 4, borderRadius: '50%', background: '#fff', transition: 'margin .15s' }} /></button>; }
function Stat({ value, label, color }) { return <div style={{ padding: '8px 12px', borderLeft: `3px solid ${color}`, background: '#f8fafc', borderRadius: 7 }}><strong style={{ color, fontSize: 16 }}>{value}</strong><span style={{ marginLeft: 6, color: '#64748b', fontSize: 11 }}>{label}</span></div>; }
function Empty({ text }) { return <div style={{ padding: 42, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{text}</div>; }

const cardStyle = { background: '#fff', border: '1px solid rgba(37,99,235,.1)', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(15,23,42,.04)' };
const sideStyle = { ...cardStyle, padding: 14, position: 'sticky', top: 92 };
const inputStyle = { width: '100%', boxSizing: 'border-box', marginTop: 5, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc', fontSize: 12.5, color: '#0f172a', outline: 'none' };
const labelStyle = { fontSize: 11.5, fontWeight: 700, color: '#475569' };
const primaryButton = { padding: '9px 14px', border: 0, borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' };
const secondaryButton = { ...primaryButton, background: '#f1f5f9', color: '#475569', border: '1px solid #dbeafe' };
const deleteButton = { width: 26, height: 26, border: '1px solid #fee2e2', borderRadius: 7, background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontSize: 17, lineHeight: 1 };
