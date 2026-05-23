import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  Clock,
  Headphones,
  KeyRound,
  LockKeyhole,
  Mail,
  Mic,
  Moon,
  Phone,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Sun,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import AccessDenied from '../../components/auth/AccessDenied';
import useAuthStore from '../../hooks/useAuth';
import usePermissions from '../../hooks/usePermissions';
import usePreferences from '../../hooks/usePreferences';
import { authService } from '../../services/api';

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

export default function DoctorSettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const { role } = usePermissions();
  const { theme, language, dateFormat, interfaceSize, updatePreference } = usePreferences();
  const fileInputRef = useRef(null);
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
  const dark = theme === 'dark';
  const ui = dark ? darkUi : lightUi;

  const text = useMemo(() => {
    if (language === 'ar') {
      return {
        title: 'إعدادات الطبيب',
        subtitle: 'تحكم في الحساب والتفضيلات الطبية والأمان والإدخال الصوتي.',
        profile: 'ملف الطبيب',
        security: 'الأمان',
        preferences: 'التفضيلات',
        notifications: 'الإشعارات',
        voice: 'الإدخال الصوتي',
        activity: 'نشاط الطبيب',
        support: 'الدعم',
        save: 'حفظ',
      };
    }
    if (language === 'en') {
      return {
        title: 'Doctor Settings',
        subtitle: 'Control your account, medical preferences, security and voice input.',
        profile: 'Doctor profile',
        security: 'Security',
        preferences: 'Preferences',
        notifications: 'Notifications',
        voice: 'Voice input',
        activity: 'Doctor activity',
        support: 'Support',
        save: 'Save',
      };
    }
    return {
      title: 'Parametres Medecin',
      subtitle: 'Controlez votre compte, vos preferences medicales, votre securite et la saisie vocale.',
      profile: 'Profil Medecin',
      security: 'Securite',
      preferences: 'Preferences',
      notifications: 'Notifications',
      voice: 'Saisie vocale',
      activity: 'Activite du medecin',
      support: 'Support',
      save: 'Enregistrer',
    };
  }, [language]);

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

  if (role && role !== 'doctor') {
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
    } catch {
      toast.error('Impossible de charger le profil.');
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

  async function saveProfile(event) {
    event.preventDefault();
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

  async function changePassword(event) {
    event.preventDefault();
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

  return (
    <AppLayout title={text.title}>
      <div style={{ ...pageStyle, background: ui.page, color: ui.text, direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        <header style={heroStyle(ui)}>
          <div style={avatarStyle}>
            {profile?.avatar ? <img src={profile.avatar} alt="Profil medecin" style={avatarImageStyle} /> : <UserRound size={34} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={eyebrowStyle}>RegistreCancer.dz</div>
            <h2 style={heroTitleStyle(ui)}>{text.title}</h2>
            <p style={mutedStyle(ui)}>{text.subtitle}</p>
          </div>
          <button type="button" onClick={saveProfile} disabled={savingProfile} style={primaryButtonStyle}>
            <Check size={16} />
            {savingProfile ? 'Enregistrement...' : text.save}
          </button>
        </header>

        <div style={gridStyle}>
          <Panel ui={ui} icon={Stethoscope} title={text.profile} wide>
            <form onSubmit={saveProfile}>
              <div style={profileGridStyle}>
                <Input ui={ui} label="Prenom" value={profileForm.first_name} onChange={(v) => setProfileForm((p) => ({ ...p, first_name: v }))} />
                <Input ui={ui} label="Nom" value={profileForm.last_name} onChange={(v) => setProfileForm((p) => ({ ...p, last_name: v }))} />
                <InfoField ui={ui} label="Email" value={profile?.email || user?.email || 'doctor@registre.dz'} />
                <Input ui={ui} label="Telephone" value={profileForm.phone} onChange={(v) => setProfileForm((p) => ({ ...p, phone: v }))} />
                <Input ui={ui} label="Specialite" value={profileForm.speciality} onChange={(v) => setProfileForm((p) => ({ ...p, speciality: v }))} />
                <Input ui={ui} label="Hopital" value={profileForm.institution} onChange={(v) => setProfileForm((p) => ({ ...p, institution: v }))} />
                <Input ui={ui} label="Wilaya" value={profileForm.wilaya} onChange={(v) => setProfileForm((p) => ({ ...p, wilaya: v }))} />
                <Input ui={ui} label="Numero CNOM" value={profileForm.registration_number} onChange={(v) => setProfileForm((p) => ({ ...p, registration_number: v }))} />
              </div>
              <div style={actionsStyle}>
                <button type="submit" disabled={savingProfile} style={primaryButtonStyle}>{savingProfile ? 'Enregistrement...' : 'Modifier profil'}</button>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={secondaryButtonStyle}><Camera size={15} /> Ajouter photo</button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }} />
              </div>
            </form>
          </Panel>

          <Panel ui={ui} icon={ShieldCheck} title={text.security}>
            <form onSubmit={changePassword} style={{ marginBottom: 12 }}>
              <Input ui={ui} type="password" label="Ancien mot de passe" value={passwordForm.old_password} onChange={(v) => setPasswordForm((p) => ({ ...p, old_password: v }))} />
              <Input ui={ui} type="password" label="Nouveau mot de passe" value={passwordForm.new_password} onChange={(v) => setPasswordForm((p) => ({ ...p, new_password: v }))} />
              <Input ui={ui} type="password" label="Confirmer mot de passe" value={passwordForm.confirm_password} onChange={(v) => setPasswordForm((p) => ({ ...p, confirm_password: v }))} />
              <button type="submit" disabled={savingPassword} style={primaryButtonStyle}>
                <KeyRound size={15} />
                {savingPassword ? 'Modification...' : 'Modifier mot de passe'}
              </button>
            </form>
            <div style={securityActionsStyle}>
              <button type="button" onClick={loadSecurityData} style={secondaryButtonStyle}><RefreshCw size={15} /> Actualiser appareils</button>
              <button type="button" onClick={disconnectAllDevices} style={dangerButtonStyle}><LockKeyhole size={15} /> Deconnecter appareils</button>
            </div>
            <MiniTable
              ui={ui}
              rows={devices.map((device) => [
                `${device.name}${device.current ? ' (actuel)' : ''}`,
                `${device.ip_address || '-'} - ${formatDate(device.last_seen, dateFormat)}`,
              ])}
              empty={loadingSecurity ? 'Chargement...' : 'Aucun appareil detecte'}
            />
          </Panel>

          <Panel ui={ui} icon={Sun} title={text.preferences}>
            <Field ui={ui} label="Theme">
              <Segmented ui={ui} value={theme} options={[['light', <><Sun size={14} /> Light Mode</>], ['dark', <><Moon size={14} /> Dark Mode</>]]} onChange={(v) => updatePreference('theme', v)} />
            </Field>
            <Field ui={ui} label="Langue">
              <Segmented ui={ui} value={language} options={[['fr', 'Francais'], ['ar', 'العربية'], ['en', 'English']]} onChange={(v) => updatePreference('language', v)} />
            </Field>
            <Field ui={ui} label="Format date">
              <select value={dateFormat} onChange={(e) => updatePreference('dateFormat', e.target.value)} style={inputStyle(ui)}>
                <option>JJ/MM/AAAA</option>
                <option>AAAA-MM-JJ</option>
                <option>MM/JJ/AAAA</option>
              </select>
            </Field>
            <Field ui={ui} label="Taille interface">
              <Segmented ui={ui} value={interfaceSize} options={[['small', 'Petite'], ['medium', 'Moyenne'], ['large', 'Grande']]} onChange={(v) => updatePreference('interfaceSize', v)} />
            </Field>
          </Panel>

          <Panel ui={ui} icon={Bell} title={text.notifications}>
            {NOTIFICATIONS.map((item) => (
              <ToggleRow key={item} ui={ui} label={item} checked={notifications[item]} onChange={(checked) => setNotifications((current) => ({ ...current, [item]: checked }))} />
            ))}
          </Panel>

          <Panel ui={ui} icon={Mic} title={text.voice}>
            <ToggleRow ui={ui} label="Activer microphone" checked={microphoneEnabled} onChange={setMicrophoneEnabled} />
            <button type="button" onClick={testMicrophone} style={secondaryButtonStyle}><Mic size={15} /> Tester microphone</button>
            <Field ui={ui} label="Langue reconnaissance">
              <select value={language} onChange={(e) => updatePreference('language', e.target.value)} style={inputStyle(ui)}>
                <option value="fr">Francais medical</option>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field ui={ui} label="Sensibilite audio">
              <input type="range" min="0" max="100" value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} style={{ width: '100%' }} />
              <div style={mutedStyle(ui)}>{sensitivity}%</div>
            </Field>
          </Panel>

          <Panel ui={ui} icon={Clock} title={text.activity}>
            <MiniTable
              ui={ui}
              rows={activity.map((log) => [
                `${ACTION_LABELS[log.action] || log.action}${log.resource ? ` - ${log.resource}` : ''}`,
                formatDate(log.timestamp, dateFormat),
              ])}
              empty={loadingSecurity ? 'Chargement...' : 'Aucune activite'}
            />
          </Panel>

          <Panel ui={ui} icon={Headphones} title={text.support} wide>
            <div style={supportGridStyle}>
              <a href="mailto:support@registrecancer.dz" style={supportCardStyle(ui)}><Mail size={17} /> support@registrecancer.dz</a>
              <a href="tel:+213000000000" style={supportCardStyle(ui)}><Phone size={17} /> +213 XXX XX XX XX</a>
            </div>
            <div style={tipStyle}>Simplicite, rapidite, securite et saisie vocale : la page est pensee pour le confort du medecin.</div>
          </Panel>
        </div>
      </div>
    </AppLayout>
  );
}

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

function Panel({ ui, icon: Icon, title, wide, children }) {
  return (
    <section style={{ ...panelStyle(ui), ...(wide ? wideStyle : {}) }}>
      <div style={panelHeaderStyle}>
        <div style={panelIconStyle(ui)}><Icon size={18} /></div>
        <h3 style={panelTitleStyle(ui)}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function InfoField({ ui, label, value }) {
  return (
    <div style={infoFieldStyle(ui)}>
      <div style={labelStyle(ui)}>{label}</div>
      <div style={valueStyle(ui)}>{value || '-'}</div>
    </div>
  );
}

function Input({ ui, label, value, onChange, type = 'text' }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle(ui)}>{label}</span>
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} style={inputStyle(ui)} />
    </label>
  );
}

function Field({ ui, label, children }) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle(ui)}>{label}</span>
      {children}
    </label>
  );
}

function Segmented({ ui, value, options, onChange }) {
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

function ToggleRow({ ui, label, checked, onChange }) {
  return (
    <div style={toggleRowStyle(ui)}>
      <span>{label}</span>
      <button type="button" onClick={() => onChange(!checked)} style={{ ...toggleStyle, ...(checked ? toggleOnStyle : {}) }}>
        <span style={{ ...toggleKnobStyle, transform: checked ? 'translateX(18px)' : 'translateX(0)' }} />
      </button>
    </div>
  );
}

function MiniTable({ ui, rows, empty }) {
  return (
    <div style={miniTableStyle(ui)}>
      {rows.length === 0 ? (
        <div style={miniRowStyle(ui)}>{empty}</div>
      ) : rows.map(([action, date]) => (
        <div key={`${action}-${date}`} style={miniRowStyle(ui)}>
          <span>{action}</span>
          <strong>{date}</strong>
        </div>
      ))}
    </div>
  );
}

const lightUi = { page: 'transparent', card: '#ffffff', raised: '#f8fbff', text: '#0f172a', muted: '#64748b', border: 'rgba(37,99,235,0.1)' };
const darkUi = { page: '#0f172a', card: '#111827', raised: '#1e293b', text: '#f8fafc', muted: '#94a3b8', border: 'rgba(147,197,253,0.18)' };
const pageStyle = { borderRadius: 16, padding: 4, transition: 'background 0.2s ease' };
const heroStyle = (ui) => ({ display: 'flex', gap: 16, alignItems: 'center', background: ui.card, border: `1px solid ${ui.border}`, borderRadius: 16, padding: 20, marginBottom: 18 });
const avatarStyle = { width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#2563eb,#60a5fa)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 };
const avatarImageStyle = { width: '100%', height: '100%', objectFit: 'cover' };
const eyebrowStyle = { color: '#2563eb', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 };
const heroTitleStyle = (ui) => ({ color: ui.text, fontFamily: 'var(--font-display)', fontSize: 22, margin: '3px 0' });
const mutedStyle = (ui) => ({ color: ui.muted, fontSize: 12, lineHeight: 1.6 });
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 };
const panelStyle = (ui) => ({ background: ui.card, border: `1px solid ${ui.border}`, borderRadius: 14, padding: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.05)' });
const wideStyle = { gridColumn: '1 / -1' };
const panelHeaderStyle = { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 };
const panelIconStyle = (ui) => ({ width: 34, height: 34, borderRadius: 10, background: ui.raised, color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' });
const panelTitleStyle = (ui) => ({ color: ui.text, fontSize: 15, fontWeight: 900, fontFamily: 'var(--font-display)' });
const profileGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 };
const infoFieldStyle = (ui) => ({ background: ui.raised, border: `1px solid ${ui.border}`, borderRadius: 10, padding: 10 });
const labelStyle = (ui) => ({ display: 'block', color: ui.muted, fontSize: 10.5, fontWeight: 800, marginBottom: 5 });
const valueStyle = (ui) => ({ color: ui.text, fontSize: 12.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
const actionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 };
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 };
const inputStyle = (ui) => ({ width: '100%', height: 38, border: `1px solid ${ui.border}`, background: ui.raised, color: ui.text, borderRadius: 10, padding: '0 10px', fontSize: 12, boxSizing: 'border-box' });
const segmentedStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 7 };
const segmentButtonStyle = (ui) => ({ minHeight: 36, border: `1px solid ${ui.border}`, borderRadius: 9, background: ui.raised, color: ui.text, cursor: 'pointer', fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 });
const segmentActiveStyle = { background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' };
const toggleRowStyle = (ui) => ({ minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, color: ui.text, fontSize: 12.5, fontWeight: 800, borderBottom: `1px solid ${ui.border}` });
const toggleStyle = { width: 42, height: 24, borderRadius: 999, border: '1px solid rgba(100,116,139,0.22)', background: '#e2e8f0', padding: 2, cursor: 'pointer' };
const toggleOnStyle = { background: '#2563eb', borderColor: '#2563eb' };
const toggleKnobStyle = { display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#ffffff', transition: 'transform 0.18s ease' };
const securityActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 };
const secondaryButtonStyle = { minHeight: 36, border: '1px solid rgba(37,99,235,0.16)', background: '#ffffff', color: '#2563eb', borderRadius: 10, padding: '0 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 };
const dangerButtonStyle = { ...secondaryButtonStyle, color: '#dc2626', border: '1px solid rgba(220,38,38,0.18)', background: '#fff5f5' };
const primaryButtonStyle = { minHeight: 40, border: 'none', borderRadius: 10, background: '#2563eb', color: '#ffffff', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 900, cursor: 'pointer' };
const miniTableStyle = (ui) => ({ marginTop: 8, border: `1px solid ${ui.border}`, borderRadius: 10, overflow: 'hidden' });
const miniRowStyle = (ui) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 11px', borderBottom: `1px solid ${ui.border}`, color: ui.text, fontSize: 12 });
const supportGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 };
const supportCardStyle = (ui) => ({ minHeight: 46, border: `1px solid ${ui.border}`, background: ui.raised, color: '#2563eb', borderRadius: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', fontSize: 12.5, fontWeight: 800 });
const tipStyle = { marginTop: 12, background: '#eff6ff', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.14)', borderRadius: 12, padding: 12, fontSize: 12.5, fontWeight: 800 };
