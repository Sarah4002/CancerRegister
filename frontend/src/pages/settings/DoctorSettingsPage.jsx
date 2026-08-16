import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import AccessDenied from '../../components/auth/AccessDenied';
import useAuthStore from '../../hooks/useAuth';
import usePermissions from '../../hooks/usePermissions';
import usePreferences from '../../hooks/usePreferences';
import { authService } from '../../services/api';
import { validationRulesService } from '../../services/validationRulesService';
import api from '../../services/api';
import MedicalProposalsTab from './MedicalProposalsTab';

/* ─────────────────────────────────────────────────────────────────────────────
   PRIMITIVES PARTAGÉES — identiques à AdminSettingsPage, pour garder le même
   design entre l'espace admin et l'espace médecin.
───────────────────────────────────────────────────────────────────────────── */
const cardSt = {
  background: '#fff', border: '1px solid rgba(37,99,235,0.08)',
  borderRadius: 14, padding: '22px 24px',
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
};

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-display)' }}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, padding: '14px 0', borderBottom: '1px solid rgba(37,99,235,0.06)' }}>
      <div style={{ maxWidth: 340 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 3 }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const inputSt = {
  padding: '8px 12px', background: '#f8fafc', border: '1px solid rgba(37,99,235,0.15)',
  borderRadius: 9, color: '#0f172a', fontSize: 12.5, outline: 'none', minWidth: 220,
};

function PrimaryButton({ children, onClick, disabled, color = '#2563eb', variant = 'solid', type = 'button' }) {
  const solid = variant === 'solid';
  return (
    <button
      type={type}
      onClick={onClick} disabled={disabled}
      style={{
        padding: '9px 18px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        border: solid ? 'none' : `1px solid ${color}30`,
        background: solid ? (disabled ? '#93c5fd' : `linear-gradient(135deg,${color}dd,${color})`) : `${color}0c`,
        color: solid ? '#fff' : color,
        opacity: disabled ? 0.7 : 1,
        boxShadow: solid ? `0 3px 10px ${color}30` : 'none',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 42, height: 24, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative',
        background: checked ? '#2563eb' : '#cbd5e1', transition: 'background .15s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, left: checked ? 21 : 3, transition: 'left .15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </button>
  );
}

function DataTable({ headers, rows, empty, actions }) {
  if (!rows.length) {
    return <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>{empty}</div>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid rgba(37,99,235,0.08)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} style={{ borderBottom: '1px solid rgba(37,99,235,0.06)' }}>
            {cells.map((cell, j) => (
              <td key={j} style={{ padding: '10px', fontSize: 12, color: '#0f172a' }}>{cell}</td>
            ))}
            {actions && <td style={{ padding: '10px' }}>{actions[i]}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TABS NAVIGATION — même composant que dans AdminSettingsPage
───────────────────────────────────────────────────────────────────────────── */
function TabsNav({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#fff', padding: 6, borderRadius: 12, border: '1px solid rgba(37,99,235,0.08)', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', width: 'fit-content', flexWrap: 'wrap' }}>
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            style={{
              padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7,
              background: isActive ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'transparent',
              color: isActive ? '#fff' : '#64748b',
              boxShadow: isActive ? '0 3px 10px rgba(37,99,235,0.3)' : 'none',
              transition: 'all .15s',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DONNÉES STATIQUES
───────────────────────────────────────────────────────────────────────────── */
const NOTIFICATIONS = [
  'Nouveaux patients',
  'Nouveaux diagnostics',
  'Rappels suivi',
  'Emails systeme',
  'Alertes importantes',
];

const ACTION_LABELS = {
  login: 'Connexion',
  logout: 'Deconnexion',
  view: 'Consultation',
  create: 'Creation',
  update: 'Modification',
  delete: 'Suppression',
  export: 'Export',
  import: 'Import',
  report: 'Rapport',
};

const MODULES = {
  patient: 'Dossier patient', diagnostic: 'Diagnostic',
  traitement: 'Traitement', suivi: 'Suivi / consultation',
};
const TYPES = { texte: 'Texte', nombre: 'Nombre', date: 'Date', booleen: 'Oui / Non', textarea: 'Texte long', select: 'Liste' };
const emptyRule = { code: '', label: '', module: 'diagnostic', field_name: '', severity: 'warning', description: '', active: true, conditions: [] };
const emptyField = { nom: '', description: '', type_champ: 'texte', module: 'patient', obligatoire: false, actif: true, ordre: 0, options: [] };

function readApiError(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  return Object.values(data).flat().join(' ') || fallback;
}

function formatDate(value, format) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  if (format === 'AAAA-MM-JJ') return `${yyyy}-${mm}-${dd}`;
  if (format === 'MM/JJ/AAAA') return `${mm}/${dd}/${yyyy}`;
  return `${dd}/${mm}/${yyyy}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — PROFIL
───────────────────────────────────────────────────────────────────────────── */
function ProfileTab({ profile, user, profileForm, setProfileForm, saveProfile, savingProfile, uploadPhoto, fileInputRef }) {
  const set = (k, v) => setProfileForm((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardSt}>
        <SectionTitle sub="Ces informations apparaissent sur vos comptes-rendus et dans l'annuaire des praticiens.">Profil médecin</SectionTitle>

        <FieldRow label="Prénom">
          <input style={inputSt} value={profileForm.first_name || ''} onChange={(e) => set('first_name', e.target.value)} />
        </FieldRow>
        <FieldRow label="Nom">
          <input style={inputSt} value={profileForm.last_name || ''} onChange={(e) => set('last_name', e.target.value)} />
        </FieldRow>
        <FieldRow label="Email" hint="Non modifiable, utilisé pour la connexion.">
          <input style={{ ...inputSt, background: '#f1f5f9', color: '#64748b' }} value={profile?.email || user?.email || 'doctor@registre.dz'} disabled />
        </FieldRow>
        <FieldRow label="Téléphone">
          <input style={inputSt} value={profileForm.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        </FieldRow>
        <FieldRow label="Spécialité">
          <input style={inputSt} value={profileForm.speciality || ''} onChange={(e) => set('speciality', e.target.value)} />
        </FieldRow>
        <FieldRow label="Hôpital / institution">
          <input style={inputSt} value={profileForm.institution || ''} onChange={(e) => set('institution', e.target.value)} />
        </FieldRow>
        <FieldRow label="Wilaya">
          <input style={inputSt} value={profileForm.wilaya || ''} onChange={(e) => set('wilaya', e.target.value)} />
        </FieldRow>
        <FieldRow label="Numéro CNOM" hint="Numéro d'inscription à l'ordre des médecins.">
          <input style={inputSt} value={profileForm.registration_number || ''} onChange={(e) => set('registration_number', e.target.value)} />
        </FieldRow>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <PrimaryButton onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Enregistrement...' : 'Enregistrer les modifications'}</PrimaryButton>
        </div>
      </div>

      <div style={cardSt}>
        <SectionTitle sub="Visible sur votre profil et vos comptes-rendus.">Photo de profil</SectionTitle>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }} />
        <PrimaryButton onClick={() => fileInputRef.current?.click()} color="#2563eb" variant="outline">Ajouter une photo</PrimaryButton>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — SÉCURITÉ
───────────────────────────────────────────────────────────────────────────── */
function SecurityTab({ passwordForm, setPasswordForm, changePassword, savingPassword, devices, loadingSecurity, loadSecurityData, disconnectAllDevices, dateFormat }) {
  const set = (k, v) => setPasswordForm((p) => ({ ...p, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardSt}>
        <SectionTitle sub="Choisissez un mot de passe fort que vous n'utilisez sur aucun autre site.">Changer le mot de passe</SectionTitle>

        <FieldRow label="Ancien mot de passe">
          <input style={inputSt} type="password" value={passwordForm.old_password} onChange={(e) => set('old_password', e.target.value)} />
        </FieldRow>
        <FieldRow label="Nouveau mot de passe">
          <input style={inputSt} type="password" value={passwordForm.new_password} onChange={(e) => set('new_password', e.target.value)} />
        </FieldRow>
        <FieldRow label="Confirmer le mot de passe">
          <input style={inputSt} type="password" value={passwordForm.confirm_password} onChange={(e) => set('confirm_password', e.target.value)} />
        </FieldRow>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <PrimaryButton onClick={changePassword} disabled={savingPassword}>{savingPassword ? 'Modification...' : 'Modifier le mot de passe'}</PrimaryButton>
        </div>
      </div>

      <div style={cardSt}>
        <SectionTitle sub="Appareils actuellement connectés à votre compte.">Appareils connectés</SectionTitle>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <PrimaryButton onClick={loadSecurityData} color="#2563eb" variant="outline">Actualiser</PrimaryButton>
          <PrimaryButton onClick={disconnectAllDevices} color="#dc2626" variant="outline">Déconnecter tous les appareils</PrimaryButton>
        </div>

        <DataTable
          headers={['Appareil', 'IP', 'Dernière connexion']}
          empty={loadingSecurity ? 'Chargement...' : 'Aucun appareil détecté'}
          rows={devices.map((device) => [
            `${device.name}${device.current ? ' (actuel)' : ''}`,
            device.ip_address || '-',
            formatDate(device.last_seen, dateFormat),
          ])}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — PRÉFÉRENCES
───────────────────────────────────────────────────────────────────────────── */
function PreferencesTab({ theme, language, dateFormat, interfaceSize, updatePreference }) {
  return (
    <div style={cardSt}>
      <SectionTitle sub="Apparence et comportement de votre espace de travail.">Préférences d'affichage</SectionTitle>

      <FieldRow label="Mode sombre" hint="Bascule l'interface en thème sombre.">
        <Toggle checked={theme === 'dark'} onChange={(v) => updatePreference('theme', v ? 'dark' : 'light')} />
      </FieldRow>

      <FieldRow label="Langue" hint="Langue utilisée dans l'interface.">
        <select style={inputSt} value={language} onChange={(e) => updatePreference('language', e.target.value)}>
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </FieldRow>

      <FieldRow label="Format de date">
        <select style={inputSt} value={dateFormat} onChange={(e) => updatePreference('dateFormat', e.target.value)}>
          <option>JJ/MM/AAAA</option>
          <option>AAAA-MM-JJ</option>
          <option>MM/JJ/AAAA</option>
        </select>
      </FieldRow>

      <FieldRow label="Taille de l'interface">
        <select style={inputSt} value={interfaceSize} onChange={(e) => updatePreference('interfaceSize', e.target.value)}>
          <option value="small">Petite</option>
          <option value="medium">Moyenne</option>
          <option value="large">Grande</option>
        </select>
      </FieldRow>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — NOTIFICATIONS
───────────────────────────────────────────────────────────────────────────── */
function NotificationsTab({ notifications, setNotifications }) {
  return (
    <div style={cardSt}>
      <SectionTitle sub="Choisissez les événements pour lesquels vous souhaitez être notifié.">Notifications</SectionTitle>
      {NOTIFICATIONS.map((item) => (
        <FieldRow key={item} label={item}>
          <Toggle checked={!!notifications[item]} onChange={(checked) => setNotifications((current) => ({ ...current, [item]: checked }))} />
        </FieldRow>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — SAISIE VOCALE
───────────────────────────────────────────────────────────────────────────── */
function VoiceTab({ microphoneEnabled, setMicrophoneEnabled, testMicrophone, language, updatePreference, sensitivity, setSensitivity }) {
  return (
    <div style={cardSt}>
      <SectionTitle sub="Utilisée pour dicter vos comptes-rendus et diagnostics.">Saisie vocale</SectionTitle>

      <FieldRow label="Activer le microphone">
        <Toggle checked={microphoneEnabled} onChange={setMicrophoneEnabled} />
      </FieldRow>

      <FieldRow label="Tester le microphone" hint="Vérifie que votre navigateur autorise l'accès au micro.">
        <PrimaryButton onClick={testMicrophone} color="#2563eb" variant="outline">Tester</PrimaryButton>
      </FieldRow>

      <FieldRow label="Langue de reconnaissance">
        <select style={inputSt} value={language} onChange={(e) => updatePreference('language', e.target.value)}>
          <option value="fr">Français médical</option>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </FieldRow>

      <FieldRow label="Sensibilité audio" hint={`${sensitivity}%`}>
        <input type="range" min="0" max="100" value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} style={{ width: 220 }} />
      </FieldRow>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — ACTIVITÉ
───────────────────────────────────────────────────────────────────────────── */
function ActivityTab({ activity, loadingSecurity, dateFormat }) {
  return (
    <div style={cardSt}>
      <SectionTitle sub="Historique de vos actions récentes sur la plateforme.">Activité du médecin</SectionTitle>
      <DataTable
        headers={['Action', 'Date']}
        empty={loadingSecurity ? 'Chargement...' : 'Aucune activité'}
        rows={activity.map((log) => [
          `${ACTION_LABELS[log.action] || log.action}${log.resource ? ` - ${log.resource}` : ''}`,
          formatDate(log.timestamp, dateFormat),
        ])}
      />
    </div>
  );
}



/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — CONFIGURATION MÉDICALE (réservé au médecin chef)
───────────────────────────────────────────────────────────────────────────── */
function MedicalConfigTab() {
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
  const activeCount = items.filter((item) => (tab === 'rules' ? item.active : item.actif)).length;

  return (
    <div style={cardSt}>
      <SectionTitle sub="Règles de validation et champs personnalisés appliqués aux dossiers.">Configuration médicale</SectionTitle>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <PrimaryButton onClick={() => switchTab('rules')} color="#2563eb" variant={tab === 'rules' ? 'solid' : 'outline'}>Règles de validation</PrimaryButton>
        <PrimaryButton onClick={() => switchTab('fields')} color="#2563eb" variant={tab === 'fields' ? 'solid' : 'outline'}>Champs personnalisés</PrimaryButton>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <PrimaryButton onClick={() => setShowForm((v) => !v)} color="#2563eb" variant="outline">
          {showForm ? 'Fermer le formulaire' : `+ ${tab === 'rules' ? 'Nouvelle règle' : 'Nouveau champ'}`}
        </PrimaryButton>
        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{items.length} {tab === 'rules' ? 'règle(s)' : 'champ(s)'} · {activeCount} actif(s)</span>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ marginBottom: 16, borderTop: '1px solid rgba(37,99,235,0.06)', paddingTop: 6 }}>
          {tab === 'rules' ? (
            <>
              <FieldRow label="Libellé *"><input style={inputSt} value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} /></FieldRow>
              <FieldRow label="Code *"><input style={inputSt} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></FieldRow>
              <FieldRow label="Module">
                <select style={inputSt} value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}>
                  {Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Sévérité">
                <select style={inputSt} value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                  <option value="error">Erreur</option>
                  <option value="warning">Avertissement</option>
                  <option value="info">Information</option>
                </select>
              </FieldRow>
            </>
          ) : (
            <>
              <FieldRow label="Nom du champ *"><input style={inputSt} value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></FieldRow>
              <FieldRow label="Module">
                <select style={inputSt} value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}>
                  {Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Type">
                <select style={inputSt} value={form.type_champ} onChange={(e) => setForm((f) => ({ ...f, type_champ: e.target.value }))}>
                  {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Ordre"><input style={{ ...inputSt, minWidth: 100 }} type="number" value={form.ordre} onChange={(e) => setForm((f) => ({ ...f, ordre: e.target.value }))} /></FieldRow>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <PrimaryButton type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</PrimaryButton>
          </div>
        </form>
      )}

      <DataTable
        headers={['Nom', 'Détails', '']}
        empty={loading ? 'Chargement...' : (tab === 'rules' ? 'Aucune règle de validation.' : 'Aucun champ personnalisé.')}
        rows={loading ? [] : items.map((item) => [
          item.label || item.nom,
          `${MODULES[item.module] || item.module} · ${tab === 'rules' ? (item.severity === 'error' ? 'Erreur' : item.severity === 'warning' ? 'Avertissement' : 'Information') : TYPES[item.type_champ]}`,
        ])}
        actions={loading ? [] : items.map((item) => {
          const active = tab === 'rules' ? item.active : item.actif;
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Toggle checked={active} onChange={() => toggle(item)} />
              <button type="button" onClick={() => remove(item)} title="Supprimer" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)', color: '#dc2626', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
            </div>
          );
        })}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN — DoctorSettingsPage
   ══════════════════════════════════════════════ */
export default function DoctorSettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const { role } = usePermissions();
  const { theme, language, dateFormat, interfaceSize, updatePreference } = usePreferences();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [devices, setDevices] = useState([]);
  const [activity, setActivity] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      return { ...Object.fromEntries(NOTIFICATIONS.map((item) => [item, true])), ...JSON.parse(localStorage.getItem('doctor_notifications') || '{}') };
    } catch {
      return Object.fromEntries(NOTIFICATIONS.map((item) => [item, true]));
    }
  });
  const [microphoneEnabled, setMicrophoneEnabled] = useState(() => localStorage.getItem('doctor_microphone') !== 'false');
  const [sensitivity, setSensitivity] = useState(() => Number(localStorage.getItem('doctor_audio_sensitivity') || 70));

  useEffect(() => {
    loadProfile();
    loadSecurityData();
  }, []);

  useEffect(() => {
    localStorage.setItem('doctor_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('doctor_microphone', String(microphoneEnabled));
  }, [microphoneEnabled]);

  useEffect(() => {
    localStorage.setItem('doctor_audio_sensitivity', String(sensitivity));
  }, [sensitivity]);

  if (role && !['doctor', 'doctor_chef'].includes(role)) {
    return <AccessDenied message="Cette page est reservee au profil medecin." />;
  }

  async function loadProfile() {
    try {
      const { data } = await authService.getProfile();
      setProfile(data);
      setProfileForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        speciality: data.speciality || '',
        institution: data.institution || '',
        wilaya: data.wilaya || '',
        registration_number: data.registration_number || '',
        department: data.department || '',
      });
      setUser({
        ...(user || {}),
        ...data,
        full_name: data.display_name || data.full_name,
        cnom: data.registration_number,
      });
    } catch (error) {
      toast.error(readApiError(error, 'Impossible de charger le profil.'));
    }
  }

  async function loadSecurityData() {
    setLoadingSecurity(true);
    try {
      const [devicesRes, activityRes] = await Promise.all([
        authService.getDevices(),
        authService.getActivity(),
      ]);
      setDevices(devicesRes.data.results || []);
      setActivity(activityRes.data.results || []);
    } catch {
      toast.error('Impossible de charger securite et activite.');
    } finally {
      setLoadingSecurity(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const { data } = await authService.updateProfile(profileForm);
      setProfile(data);
      setUser({
        ...(user || {}),
        ...data,
        full_name: data.display_name || data.full_name,
        cnom: data.registration_number,
      });
      toast.success('Profil modifie avec succes.');
    } catch (error) {
      toast.error(readApiError(error, 'Erreur modification profil.'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('avatar', file);
    try {
      const { data } = await authService.updateProfile(form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(data);
      setUser({ ...(user || {}), ...data, full_name: data.display_name || data.full_name });
      toast.success('Photo ajoutee avec succes.');
    } catch (error) {
      toast.error(readApiError(error, 'Erreur ajout photo.'));
    } finally {
      event.target.value = '';
    }
  }

  async function changePassword() {
    setSavingPassword(true);
    try {
      await authService.changePassword(passwordForm);
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      await loadSecurityData();
      toast.success('Mot de passe modifie.');
    } catch (error) {
      toast.error(readApiError(error, 'Erreur changement mot de passe.'));
    } finally {
      setSavingPassword(false);
    }
  }

  async function disconnectAllDevices() {
    const ok = window.confirm('Deconnecter tous les appareils ? Vous devrez vous reconnecter.');
    if (!ok) return;
    try {
      await authService.logoutAll();
      toast.success('Tous les appareils sont deconnectes.');
      await logout();
    } catch (error) {
      toast.error(readApiError(error, 'Erreur deconnexion appareils.'));
    }
  }

  async function testMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneEnabled(true);
      toast.success('Microphone detecte.');
    } catch {
      toast.error('Microphone bloque ou indisponible.');
    }
  }

  const TABS = [
    { key: 'profile', label: 'Profil' },
    { key: 'security', label: 'Sécurité' },
    { key: 'preferences', label: 'Préférences' },
    { key: 'proposals', label: role === 'doctor_chef' ? 'Propositions & médecins' : 'Propositions' },
    ...(role === 'doctor_chef' ? [{ key: 'medical', label: 'Configuration médicale' }] : []),
  ];

  return (
    <AppLayout title="Paramètres Médecin">
      <div style={{ marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 3 }}>
          Paramètres du médecin
        </h2>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18 }}>
          Compte, préférences médicales, sécurité et saisie vocale.
        </div>
      </div>

      <TabsNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' && (
        <ProfileTab
          profile={profile} user={user} profileForm={profileForm} setProfileForm={setProfileForm}
          saveProfile={saveProfile} savingProfile={savingProfile} uploadPhoto={uploadPhoto} fileInputRef={fileInputRef}
        />
      )}
      {activeTab === 'security' && (
        <SecurityTab
          passwordForm={passwordForm} setPasswordForm={setPasswordForm} changePassword={changePassword}
          savingPassword={savingPassword} devices={devices} loadingSecurity={loadingSecurity}
          loadSecurityData={loadSecurityData} disconnectAllDevices={disconnectAllDevices} dateFormat={dateFormat}
        />
      )}
      {activeTab === 'preferences' && (
        <PreferencesTab theme={theme} language={language} dateFormat={dateFormat} interfaceSize={interfaceSize} updatePreference={updatePreference} />
      )}
      {activeTab === 'proposals' && <MedicalProposalsTab isChief={role === 'doctor_chef'} />}
      
     
     
      {activeTab === 'medical' && role === 'doctor_chef' && <MedicalConfigTab />}
    </AppLayout>
  );
}
