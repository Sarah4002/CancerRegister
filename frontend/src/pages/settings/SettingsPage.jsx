import { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  Clock,
  Database,
  Eye,
  FileDown,
  FileInput,
  Globe2,
  KeyRound,
  Languages,
  Laptop,
  LockKeyhole,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sun,
  UserCog,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import usePreferences from '../../hooks/usePreferences';

const WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Bejaia', 'Biskra', 'Bechar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tebessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
  'Djelfa', 'Jijel', 'Setif', 'Saida', 'Skikda', 'Sidi Bel Abbes', 'Annaba', 'Guelma',
  'Constantine', 'Medea', 'Mostaganem', 'Msila', 'Mascara', 'Ouargla', 'Oran',
];

const USERS = [
  { id: 1, nom: 'Dr. Amel Benali', email: 'amel.benali@chu.dz', role: 'Doctor', wilaya: 'Alger', statut: 'Actif' },
  { id: 2, nom: 'Karim Haddad', email: 'karim.haddad@registre.dz', role: 'Registrar', wilaya: 'Oran', statut: 'Actif' },
  { id: 3, nom: 'Nadia Saidi', email: 'nadia.saidi@insp.dz', role: 'Epidemiologist', wilaya: 'Setif', statut: 'Inactif' },
  { id: 4, nom: 'Yacine Merabet', email: 'yacine.merabet@msprh.dz', role: 'Analyst', wilaya: 'Constantine', statut: 'Actif' },
];

const ROLES = ['Admin', 'Doctor', 'Registrar', 'Epidemiologist', 'Analyst', 'Readonly'];

const PERMISSIONS = [
  'Voir patients',
  'Ajouter patients',
  'Modifier dossiers',
  'Exporter donnees',
  'Voir statistiques',
  'Gerer utilisateurs',
  'Supprimer dossiers',
  'Importer fichiers',
];

const SECURITY_LOGS = [
  { event: 'Connexion reussie', user: 'admin@registre.dz', date: '22/05/2026 08:42', level: 'Info' },
  { event: 'Mot de passe modifie', user: 'amel.benali@chu.dz', date: '21/05/2026 17:10', level: 'OK' },
  { event: 'Tentative 2FA echouee', user: 'karim.haddad@registre.dz', date: '21/05/2026 09:16', level: 'Alerte' },
];

const CONNECTED_DEVICES = [
  { name: 'Chrome - Windows', location: 'Alger, Algerie', lastSeen: 'Actuel' },
  { name: 'Edge - Windows', location: 'Oran, Algerie', lastSeen: 'Hier 18:22' },
  { name: 'Safari - iPad', location: 'Constantine, Algerie', lastSeen: '19/05/2026' },
];

const TEXT = {
  fr: {
    pageTitle: 'Parametres',
    eyebrow: 'Configuration systeme',
    heroTitle: 'Parametres du registre national du cancer',
    heroText: 'Centralisez les preferences generales, les utilisateurs, les roles et les regles de securite.',
    save: 'Enregistrer',
    generalTitle: '1. Parametres generales',
    generalSubtitle: "Identite du systeme, langue, theme et informations de l'etablissement.",
    identity: 'Identite du systeme',
    systemName: 'Nom du systeme',
    logo: 'Logo ministere / hopital',
    logoHelp: 'Importer un logo PNG ou JPG',
    browse: 'Parcourir',
    defaultWilaya: 'Wilaya par defaut',
    regional: 'Preferences regionales',
    language: 'Langue',
    timezone: 'Fuseau horaire',
    dateFormat: 'Format date',
    theme: 'Theme',
    institution: 'Informations etablissement',
    hospitalName: 'Nom hopital',
    phone: 'Telephone',
    address: 'Adresse',
    email: 'Email',
    usersTitle: '2. Gestion des utilisateurs',
    usersSubtitle: 'Comptes, statuts, roles et permissions disponibles dans le systeme.',
    addUser: 'Ajouter utilisateur',
    permissionsOn: 'permissions activees',
    invertAll: 'Tout inverser',
    securityTitle: '3. Securite',
    securitySubtitle: 'Mot de passe, JWT, sessions, authentification forte et journalisation.',
    auth: 'Authentification',
    password: 'Changer mot de passe',
    newPassword: 'Nouveau mot de passe',
    change: 'Changer',
    jwt: 'Authentification JWT',
    jwtDesc: "Jetons d'acces et de rafraichissement pour l'API.",
    twoFactor: 'Double authentification (2FA)',
    twoFactorDesc: 'Code de verification requis lors de la connexion.',
    sessionTimeout: 'Session timeout',
    devices: 'Appareils connectes',
    logs: 'Historique connexions et logs securite',
    logsDesc: 'Derniers evenements critiques et connexions utilisateurs.',
    export: 'Exporter',
    activePreview: 'Apercu actif',
    enabled: 'Active',
    disabled: 'Desactive',
    saved: 'Parametres enregistres',
  },
  en: {
    pageTitle: 'Settings',
    eyebrow: 'System configuration',
    heroTitle: 'National cancer registry settings',
    heroText: 'Manage general preferences, users, roles and security rules in one place.',
    save: 'Save',
    generalTitle: '1. General settings',
    generalSubtitle: 'System identity, language, theme and institution information.',
    identity: 'System identity',
    systemName: 'System name',
    logo: 'Ministry / hospital logo',
    logoHelp: 'Upload a PNG or JPG logo',
    browse: 'Browse',
    defaultWilaya: 'Default wilaya',
    regional: 'Regional preferences',
    language: 'Language',
    timezone: 'Time zone',
    dateFormat: 'Date format',
    theme: 'Theme',
    institution: 'Institution information',
    hospitalName: 'Hospital name',
    phone: 'Phone',
    address: 'Address',
    email: 'Email',
    usersTitle: '2. User management',
    usersSubtitle: 'Accounts, status, roles and permissions available in the system.',
    addUser: 'Add user',
    permissionsOn: 'permissions enabled',
    invertAll: 'Invert all',
    securityTitle: '3. Security',
    securitySubtitle: 'Password, JWT, session timeout, strong authentication and logs.',
    auth: 'Authentication',
    password: 'Change password',
    newPassword: 'New password',
    change: 'Change',
    jwt: 'JWT authentication',
    jwtDesc: 'Access and refresh tokens for the API.',
    twoFactor: 'Two-factor authentication (2FA)',
    twoFactorDesc: 'Verification code required at login.',
    sessionTimeout: 'Session timeout',
    devices: 'Connected devices',
    logs: 'Login history and security logs',
    logsDesc: 'Latest critical events and user connections.',
    export: 'Export',
    activePreview: 'Active preview',
    enabled: 'Enabled',
    disabled: 'Disabled',
    saved: 'Settings saved',
  },
  ar: {
    pageTitle: 'الإعدادات',
    eyebrow: 'إعدادات النظام',
    heroTitle: 'إعدادات السجل الوطني للسرطان',
    heroText: 'إدارة اللغة والمظهر والمستخدمين والصلاحيات والأمان من مكان واحد.',
    save: 'حفظ',
    generalTitle: '1. الإعدادات العامة',
    generalSubtitle: 'هوية النظام واللغة والمظهر ومعلومات المؤسسة.',
    identity: 'هوية النظام',
    systemName: 'اسم النظام',
    logo: 'شعار الوزارة / المستشفى',
    logoHelp: 'تحميل شعار PNG أو JPG',
    browse: 'اختيار',
    defaultWilaya: 'الولاية الافتراضية',
    regional: 'الإعدادات الإقليمية',
    language: 'اللغة',
    timezone: 'المنطقة الزمنية',
    dateFormat: 'تنسيق التاريخ',
    theme: 'المظهر',
    institution: 'معلومات المؤسسة',
    hospitalName: 'اسم المستشفى',
    phone: 'الهاتف',
    address: 'العنوان',
    email: 'البريد الإلكتروني',
    usersTitle: '2. إدارة المستخدمين',
    usersSubtitle: 'الحسابات والحالات والأدوار والصلاحيات المتاحة في النظام.',
    addUser: 'إضافة مستخدم',
    permissionsOn: 'صلاحيات مفعلة',
    invertAll: 'عكس الكل',
    securityTitle: '3. الأمان',
    securitySubtitle: 'كلمة المرور و JWT ومدة الجلسة والمصادقة الثنائية والسجلات.',
    auth: 'المصادقة',
    password: 'تغيير كلمة المرور',
    newPassword: 'كلمة مرور جديدة',
    change: 'تغيير',
    jwt: 'مصادقة JWT',
    jwtDesc: 'رموز الوصول والتحديث الخاصة بواجهة API.',
    twoFactor: 'المصادقة الثنائية (2FA)',
    twoFactorDesc: 'رمز تحقق مطلوب عند تسجيل الدخول.',
    sessionTimeout: 'انتهاء الجلسة',
    devices: 'الأجهزة المتصلة',
    logs: 'سجل الدخول وسجلات الأمان',
    logsDesc: 'آخر الأحداث المهمة واتصالات المستخدمين.',
    export: 'تصدير',
    activePreview: 'المعاينة الحالية',
    enabled: 'مفعل',
    disabled: 'معطل',
    saved: 'تم حفظ الإعدادات',
  },
};

const THEMES = {
  light: {
    page: 'transparent',
    card: '#ffffff',
    raised: '#f8fbff',
    text: '#0f172a',
    secondary: '#334155',
    muted: '#64748b',
    border: 'rgba(37,99,235,0.1)',
    borderStrong: 'rgba(37,99,235,0.2)',
    iconBg: '#eff6ff',
  },
  dark: {
    page: '#0f172a',
    card: '#111827',
    raised: '#1e293b',
    text: '#f8fafc',
    secondary: '#dbeafe',
    muted: '#94a3b8',
    border: 'rgba(147,197,253,0.18)',
    borderStrong: 'rgba(147,197,253,0.32)',
    iconBg: '#1e3a8a',
  },
};

export default function SettingsPage() {
  const { theme, language, dateFormat, updatePreference } = usePreferences();
  const [defaultWilaya, setDefaultWilaya] = useState('Alger');
  const [timezone, setTimezone] = useState('Africa/Algiers');
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [twoFactor, setTwoFactor] = useState(true);
  const [jwtEnabled, setJwtEnabled] = useState(true);
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [permissions, setPermissions] = useState(() => buildRolePermissions('Admin'));

  const t = TEXT[language];
  const ui = THEMES[theme];
  const isArabic = language === 'ar';
  const enabledPermissions = useMemo(() => Object.values(permissions).filter(Boolean).length, [permissions]);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setPermissions(buildRolePermissions(role));
  };

  const handleSave = () => {
    toast.success(t.saved);
  };

  return (
    <AppLayout title={t.pageTitle}>
      <div style={{ ...pageStyle, background: ui.page, color: ui.text, direction: isArabic ? 'rtl' : 'ltr' }}>
        <div style={heroStyle(ui)}>
          <div>
            <div style={eyebrowStyle}>{t.eyebrow}</div>
            <h2 style={titleStyle(ui)}>{t.heroTitle}</h2>
            <p style={mutedTextStyle(ui)}>{t.heroText}</p>
          </div>
          <button type="button" onClick={handleSave} style={primaryButtonStyle}>
            <Check size={16} />
            {t.save}
          </button>
        </div>

        <div style={previewGridStyle}>
          <PreviewItem ui={ui} label={t.language} value={languageLabel(language)} />
          <PreviewItem ui={ui} label={t.theme} value={theme === 'light' ? 'Light mode' : 'Dark mode'} />
          <PreviewItem ui={ui} label={t.dateFormat} value={formatSampleDate(dateFormat)} />
          <PreviewItem ui={ui} label={t.defaultWilaya} value={defaultWilaya} />
          <PreviewItem ui={ui} label={t.timezone} value={timezone} />
          <PreviewItem ui={ui} label={t.sessionTimeout} value={`${sessionTimeout} min`} />
          <PreviewItem ui={ui} label="JWT" value={jwtEnabled ? t.enabled : t.disabled} />
          <PreviewItem ui={ui} label="2FA" value={twoFactor ? t.enabled : t.disabled} />
        </div>

        <section style={sectionStyle}>
          <SectionHeader ui={ui} icon={Building2} title={t.generalTitle} subtitle={t.generalSubtitle} />

          <div style={settingsGridStyle}>
            <Panel ui={ui} title={t.identity} icon={Database}>
              <Field ui={ui} label={t.systemName}>
                <input defaultValue="Registre National du Cancer" style={inputStyle(ui)} />
              </Field>
              <Field ui={ui} label={t.logo}>
                <div style={uploadStyle(ui)}>
                  <FileInput size={17} />
                  <span>{t.logoHelp}</span>
                  <button type="button" style={secondaryButtonStyle}>{t.browse}</button>
                </div>
              </Field>
              <Field ui={ui} label={t.defaultWilaya}>
                <select value={defaultWilaya} onChange={(event) => setDefaultWilaya(event.target.value)} style={inputStyle(ui)}>
                  {WILAYAS.map((wilaya) => <option key={wilaya}>{wilaya}</option>)}
                </select>
              </Field>
            </Panel>

            <Panel ui={ui} title={t.regional} icon={Globe2}>
              <Field ui={ui} label={t.language}>
                <div style={segmentedStyle}>
                  {[
                    ['fr', 'Francais'],
                    ['ar', 'العربية'],
                    ['en', 'English'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updatePreference('language', value)}
                      style={{ ...segmentButtonStyle(ui), ...(language === value ? segmentActiveStyle : {}) }}
                    >
                      <Languages size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field ui={ui} label={t.timezone}>
                <select value={timezone} onChange={(event) => setTimezone(event.target.value)} style={inputStyle(ui)}>
                  <option value="Africa/Algiers">Africa/Algiers - UTC+01:00</option>
                  <option value="Europe/Paris">Europe/Paris - UTC+01:00</option>
                  <option value="UTC">UTC</option>
                </select>
              </Field>
              <Field ui={ui} label={t.dateFormat}>
                <select value={dateFormat} onChange={(event) => updatePreference('dateFormat', event.target.value)} style={inputStyle(ui)}>
                  <option>JJ/MM/AAAA</option>
                  <option>AAAA-MM-JJ</option>
                  <option>MM/JJ/AAAA</option>
                </select>
              </Field>
              <Field ui={ui} label={t.theme}>
                <div style={themeSwitchStyle}>
                  <button type="button" onClick={() => updatePreference('theme', 'light')} style={{ ...segmentButtonStyle(ui), ...(theme === 'light' ? segmentActiveStyle : {}) }}>
                    <Sun size={15} />
                    Light mode
                  </button>
                  <button type="button" onClick={() => updatePreference('theme', 'dark')} style={{ ...segmentButtonStyle(ui), ...(theme === 'dark' ? segmentActiveStyle : {}) }}>
                    <Moon size={15} />
                    Dark mode
                  </button>
                </div>
              </Field>
            </Panel>

            <Panel ui={ui} title={t.institution} icon={Building2} wide>
              <div style={formGridStyle}>
                <Field ui={ui} label={t.hospitalName}>
                  <input defaultValue="Centre Hospitalier Universitaire" style={inputStyle(ui)} />
                </Field>
                <Field ui={ui} label={t.phone}>
                  <input defaultValue="+213 21 00 00 00" style={inputStyle(ui)} />
                </Field>
                <Field ui={ui} label={t.address}>
                  <input defaultValue="Alger centre, Algerie" style={inputStyle(ui)} />
                </Field>
                <Field ui={ui} label={t.email}>
                  <input defaultValue="contact@registre-cancer.dz" type="email" style={inputStyle(ui)} />
                </Field>
              </div>
            </Panel>
          </div>
        </section>

        <section style={sectionStyle}>
          <SectionHeader
            ui={ui}
            icon={Users}
            title={t.usersTitle}
            subtitle={t.usersSubtitle}
            action={(
              <button type="button" style={primaryButtonStyle}>
                <Plus size={16} />
                {t.addUser}
              </button>
            )}
          />

          <div style={tableWrapStyle(ui)}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {['Nom', 'Email', 'Role', 'Wilaya', 'Statut', 'Actions'].map((head) => (
                    <th key={head} style={thStyle(ui)}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {USERS.map((user) => (
                  <tr key={user.id}>
                    <td style={tdStrongStyle(ui)}>{user.nom}</td>
                    <td style={tdStyle(ui)}>{user.email}</td>
                    <td style={tdStyle(ui)}><RolePill role={user.role} /></td>
                    <td style={tdStyle(ui)}>{user.wilaya}</td>
                    <td style={tdStyle(ui)}><StatusPill status={user.statut} /></td>
                    <td style={tdStyle(ui)}>
                      <div style={actionsStyle}>
                        <IconButton label="Modifier" icon={Pencil} />
                        <IconButton label="Desactiver" icon={LockKeyhole} tone="warning" />
                        <IconButton label="Reinitialiser mot de passe" icon={RotateCcw} />
                        <IconButton label="Voir activite" icon={Eye} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={rolesLayoutStyle}>
            <Panel ui={ui} title="Roles" icon={UserCog}>
              <div style={roleListStyle}>
                {ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    style={{ ...roleButtonStyle(ui), ...(selectedRole === role ? roleButtonActiveStyle : {}) }}
                  >
                    <span>{role}</span>
                    {selectedRole === role && <Check size={15} />}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel ui={ui} title={`Permissions - ${selectedRole}`} icon={ShieldCheck} wide>
              <div style={permissionSummaryStyle(ui)}>
                <span>{enabledPermissions} {t.permissionsOn}</span>
                <button type="button" onClick={() => setPermissions(toggleAllPermissions(permissions))} style={secondaryButtonStyle}>
                  {t.invertAll}
                </button>
              </div>
              <div style={permissionsGridStyle}>
                {PERMISSIONS.map((permission) => (
                  <label key={permission} style={checkboxRowStyle(ui)}>
                    <input
                      type="checkbox"
                      checked={permissions[permission]}
                      onChange={(event) => setPermissions((current) => ({
                        ...current,
                        [permission]: event.target.checked,
                      }))}
                    />
                    <span>{permission}</span>
                  </label>
                ))}
              </div>
            </Panel>
          </div>
        </section>

        <section style={sectionStyle}>
          <SectionHeader ui={ui} icon={ShieldCheck} title={t.securityTitle} subtitle={t.securitySubtitle} />

          <div style={securityGridStyle}>
            <Panel ui={ui} title={t.auth} icon={KeyRound}>
              <Field ui={ui} label={t.password}>
                <div style={passwordRowStyle}>
                  <input type="password" placeholder={t.newPassword} style={inputStyle(ui)} />
                  <button type="button" style={secondaryButtonStyle}>{t.change}</button>
                </div>
              </Field>
              <ToggleRow ui={ui} icon={Database} label={t.jwt} description={t.jwtDesc} checked={jwtEnabled} onChange={setJwtEnabled} />
              <ToggleRow ui={ui} icon={ShieldCheck} label={t.twoFactor} description={t.twoFactorDesc} checked={twoFactor} onChange={setTwoFactor} />
              <Field ui={ui} label={t.sessionTimeout}>
                <select value={sessionTimeout} onChange={(event) => setSessionTimeout(event.target.value)} style={inputStyle(ui)}>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 heure</option>
                  <option value="240">4 heures</option>
                </select>
              </Field>
            </Panel>

            <Panel ui={ui} title={t.devices} icon={Laptop}>
              <div style={stackStyle}>
                {CONNECTED_DEVICES.map((device) => (
                  <div key={device.name} style={deviceRowStyle(ui)}>
                    <Laptop size={17} />
                    <div>
                      <div style={rowTitleStyle(ui)}>{device.name}</div>
                      <div style={mutedTextStyle(ui)}>{device.location} - {device.lastSeen}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel ui={ui} title={t.logs} icon={Clock} wide>
              <div style={logsToolbarStyle}>
                <span style={mutedTextStyle(ui)}>{t.logsDesc}</span>
                <button type="button" style={secondaryButtonStyle}>
                  <FileDown size={14} />
                  {t.export}
                </button>
              </div>
              <div style={miniTableStyle(ui)}>
                {SECURITY_LOGS.map((log) => (
                  <div key={`${log.event}-${log.date}`} style={logRowStyle(ui)}>
                    <div>
                      <div style={rowTitleStyle(ui)}>{log.event}</div>
                      <div style={mutedTextStyle(ui)}>{log.user}</div>
                    </div>
                    <div style={logDateStyle(ui)}>{log.date}</div>
                    <StatusPill status={log.level} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function buildRolePermissions(role) {
  const presets = {
    Admin: PERMISSIONS,
    Doctor: ['Voir patients', 'Ajouter patients', 'Modifier dossiers', 'Voir statistiques'],
    Registrar: ['Voir patients', 'Ajouter patients', 'Modifier dossiers', 'Importer fichiers'],
    Epidemiologist: ['Voir patients', 'Exporter donnees', 'Voir statistiques'],
    Analyst: ['Voir patients', 'Exporter donnees', 'Voir statistiques'],
    Readonly: ['Voir patients', 'Voir statistiques'],
  };

  return PERMISSIONS.reduce((acc, permission) => ({
    ...acc,
    [permission]: (presets[role] || []).includes(permission),
  }), {});
}

function toggleAllPermissions(current) {
  const shouldEnable = Object.values(current).some((value) => !value);
  return PERMISSIONS.reduce((acc, permission) => ({ ...acc, [permission]: shouldEnable }), {});
}

function languageLabel(language) {
  if (language === 'ar') return 'العربية';
  if (language === 'en') return 'English';
  return 'Francais';
}

function formatSampleDate(format) {
  if (format === 'AAAA-MM-JJ') return '2026-05-22';
  if (format === 'MM/JJ/AAAA') return '05/22/2026';
  return '22/05/2026';
}

function PreviewItem({ ui, label, value }) {
  return (
    <div style={previewItemStyle(ui)}>
      <div style={previewLabelStyle(ui)}>{label}</div>
      <div style={previewValueStyle(ui)}>{value}</div>
    </div>
  );
}

function SectionHeader({ ui, icon: Icon, title, subtitle, action }) {
  return (
    <div style={sectionHeaderStyle}>
      <div style={sectionTitleWrapStyle}>
        <div style={sectionIconStyle(ui)}><Icon size={18} /></div>
        <div>
          <h3 style={sectionTitleStyle(ui)}>{title}</h3>
          <p style={mutedTextStyle(ui)}>{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function Panel({ ui, title, icon: Icon, wide, children }) {
  return (
    <div style={{ ...panelStyle(ui), ...(wide ? widePanelStyle : {}) }}>
      <div style={panelHeaderStyle}>
        <div style={panelIconStyle(ui)}><Icon size={16} /></div>
        <h4 style={panelTitleStyle(ui)}>{title}</h4>
      </div>
      {children}
    </div>
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

function ToggleRow({ ui, icon: Icon, label, description, checked, onChange }) {
  return (
    <div style={toggleRowStyle(ui)}>
      <div style={toggleIconStyle(ui)}><Icon size={16} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={rowTitleStyle(ui)}>{label}</div>
        <div style={mutedTextStyle(ui)}>{description}</div>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        style={{ ...toggleStyle, ...(checked ? toggleOnStyle : {}) }}
      >
        <span style={{ ...toggleKnobStyle, transform: checked ? 'translateX(18px)' : 'translateX(0)' }} />
      </button>
    </div>
  );
}

function RolePill({ role }) {
  const colors = {
    Admin: '#1d4ed8',
    Doctor: '#2563eb',
    Registrar: '#0891b2',
    Epidemiologist: '#16a34a',
    Analyst: '#7c3aed',
    Readonly: '#64748b',
  };
  const color = colors[role] || '#64748b';
  return <span style={{ ...pillStyle, color, background: `${color}12`, borderColor: `${color}24` }}>{role}</span>;
}

function StatusPill({ status }) {
  const isAlert = status === 'Alerte' || status === 'Inactif';
  const isOk = status === 'Actif' || status === 'OK';
  const color = isAlert ? '#dc2626' : isOk ? '#16a34a' : '#2563eb';
  return <span style={{ ...pillStyle, color, background: `${color}10`, borderColor: `${color}22` }}>{status}</span>;
}

function IconButton({ icon: Icon, label, tone }) {
  const color = tone === 'warning' ? '#d97706' : '#2563eb';
  return (
    <button type="button" title={label} aria-label={label} style={{ ...iconButtonStyle, color, borderColor: `${color}24`, background: `${color}10` }}>
      <Icon size={14} />
    </button>
  );
}

const pageStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 22,
  borderRadius: 16,
  padding: 4,
  transition: 'background 0.2s ease, color 0.2s ease',
};
const heroStyle = (ui) => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 18,
  alignItems: 'center',
  padding: 22,
  borderRadius: 16,
  background: ui.card,
  border: `1px solid ${ui.border}`,
  boxShadow: '0 12px 32px rgba(15,23,42,0.08)',
});
const eyebrowStyle = { fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 };
const titleStyle = (ui) => ({ fontFamily: 'var(--font-display)', fontSize: 22, color: ui.text, marginTop: 4, marginBottom: 4 });
const mutedTextStyle = (ui) => ({ fontSize: 11.5, color: ui.muted, lineHeight: 1.55 });
const rowTitleStyle = (ui) => ({ fontSize: 12.5, color: ui.text, fontWeight: 800 });
const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 14 };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' };
const sectionTitleWrapStyle = { display: 'flex', alignItems: 'center', gap: 10 };
const sectionIconStyle = (ui) => ({
  width: 38,
  height: 38,
  borderRadius: 10,
  background: ui.iconBg,
  color: '#60a5fa',
  border: `1px solid ${ui.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
const sectionTitleStyle = (ui) => ({ fontFamily: 'var(--font-display)', fontSize: 16, color: ui.text, marginBottom: 2 });
const previewGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 };
const previewItemStyle = (ui) => ({ background: ui.card, border: `1px solid ${ui.border}`, borderRadius: 12, padding: '10px 12px' });
const previewLabelStyle = (ui) => ({ color: ui.muted, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 });
const previewValueStyle = (ui) => ({ color: ui.text, fontSize: 12.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
const settingsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 };
const securityGridStyle = { display: 'grid', gridTemplateColumns: '1.25fr 0.9fr', gap: 14 };
const rolesLayoutStyle = { display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 14, marginTop: 14 };
const panelStyle = (ui) => ({
  background: ui.card,
  border: `1px solid ${ui.border}`,
  borderRadius: 14,
  padding: 16,
  boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
});
const widePanelStyle = { gridColumn: '1 / -1' };
const panelHeaderStyle = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 };
const panelIconStyle = (ui) => ({ width: 30, height: 30, borderRadius: 8, background: ui.iconBg, color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' });
const panelTitleStyle = (ui) => ({ fontSize: 13.5, fontWeight: 800, color: ui.text });
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 };
const fieldStyle = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 };
const labelStyle = (ui) => ({ fontSize: 11, color: ui.muted, fontWeight: 700 });
const inputStyle = (ui) => ({
  width: '100%',
  height: 40,
  padding: '0 12px',
  border: `1px solid ${ui.borderStrong}`,
  background: ui.raised,
  color: ui.text,
  fontSize: 12.5,
  borderRadius: 10,
});
const uploadStyle = (ui) => ({
  minHeight: 42,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  borderRadius: 10,
  border: `1px dashed ${ui.borderStrong}`,
  background: ui.raised,
  color: ui.muted,
  fontSize: 12,
});
const segmentedStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 };
const segmentButtonStyle = (ui) => ({
  minHeight: 38,
  border: `1px solid ${ui.borderStrong}`,
  background: ui.raised,
  color: ui.secondary,
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
});
const segmentActiveStyle = { background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' };
const themeSwitchStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
const primaryButtonStyle = {
  minHeight: 40,
  padding: '0 14px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  color: '#ffffff',
  fontSize: 12,
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
const secondaryButtonStyle = {
  minHeight: 32,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid rgba(37,99,235,0.15)',
  background: '#ffffff',
  color: '#2563eb',
  fontSize: 11,
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
const tableWrapStyle = (ui) => ({ background: ui.card, border: `1px solid ${ui.border}`, borderRadius: 14, overflow: 'auto' });
const tableStyle = { width: '100%', borderCollapse: 'collapse', minWidth: 860 };
const thStyle = (ui) => ({ padding: '12px 14px', textAlign: 'left', color: ui.muted, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: `1px solid ${ui.border}` });
const tdStyle = (ui) => ({ padding: '12px 14px', color: ui.secondary, fontSize: 12, borderBottom: `1px solid ${ui.border}`, verticalAlign: 'middle' });
const tdStrongStyle = (ui) => ({ ...tdStyle(ui), color: ui.text, fontWeight: 800 });
const actionsStyle = { display: 'flex', gap: 6, alignItems: 'center' };
const iconButtonStyle = { width: 30, height: 30, borderRadius: 8, border: '1px solid', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const roleListStyle = { display: 'flex', flexDirection: 'column', gap: 8 };
const roleButtonStyle = (ui) => ({
  width: '100%',
  minHeight: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 12px',
  borderRadius: 10,
  border: `1px solid ${ui.borderStrong}`,
  background: ui.raised,
  color: ui.secondary,
  cursor: 'pointer',
  fontSize: 12.5,
  fontWeight: 800,
});
const roleButtonActiveStyle = { color: '#2563eb', background: '#eff6ff', borderColor: 'rgba(37,99,235,0.3)' };
const permissionSummaryStyle = (ui) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, color: ui.muted, fontSize: 11.5 });
const permissionsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 };
const checkboxRowStyle = (ui) => ({
  minHeight: 38,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '8px 10px',
  borderRadius: 10,
  background: ui.raised,
  border: `1px solid ${ui.border}`,
  color: ui.secondary,
  fontSize: 12.5,
  fontWeight: 700,
});
const pillStyle = { display: 'inline-flex', alignItems: 'center', padding: '4px 9px', borderRadius: 999, border: '1px solid', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' };
const passwordRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8 };
const toggleRowStyle = (ui) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${ui.border}` });
const toggleIconStyle = (ui) => ({ width: 30, height: 30, borderRadius: 8, color: '#60a5fa', background: ui.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 });
const toggleStyle = { width: 42, height: 24, borderRadius: 999, border: '1px solid rgba(100,116,139,0.22)', background: '#e2e8f0', padding: 2, cursor: 'pointer', flexShrink: 0 };
const toggleOnStyle = { background: '#2563eb', borderColor: '#2563eb' };
const toggleKnobStyle = { display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#ffffff', transition: 'transform 0.18s ease' };
const stackStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const deviceRowStyle = (ui) => ({ display: 'flex', gap: 10, alignItems: 'center', padding: 10, borderRadius: 10, background: ui.raised, border: `1px solid ${ui.border}`, color: '#60a5fa' });
const logsToolbarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 };
const miniTableStyle = (ui) => ({ border: `1px solid ${ui.border}`, borderRadius: 12, overflow: 'hidden' });
const logRowStyle = (ui) => ({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px auto', gap: 12, alignItems: 'center', padding: '11px 12px', borderBottom: `1px solid ${ui.border}` });
const logDateStyle = (ui) => ({ color: ui.muted, fontSize: 11, textAlign: 'right' });