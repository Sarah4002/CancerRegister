import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../hooks/useAuth';
import usePermissions from '../../hooks/usePermissions';
import usePreferences from '../../hooks/usePreferences';

const SIDEBAR_WIDTH = 260;
const MOBILE_BREAKPOINT = 1100;

const NAV_CONFIG = [
  { section: 'Principal', items: [
    { path: '/dashboard', label: 'Tableau de bord', icon: GridIcon, roles: ['doctor', 'doctor_chef', 'anapath', 'epidemiologist', 'pharmacist', 'secretaire', 'readonly'] },
  ] },
  { section: 'Administration', items: [
    { path: '/dashboardadmin', label: 'Tableau de bord ', icon: GridIcon, permission: 'manageUsers' },
    { path: '/utilisateurs', label: 'Utilisateurs', icon: UsersIcon, permission: 'manageUsers' },
    { path: '/audit-logs', label: "Journal d'audit", icon: CopyIcon, permission: 'manageUsers' },
    { path: '/parametres', label: 'Paramètres', icon: SlidersIcon, permission: 'manageUsers' },
  ] },
  {
    section: 'Patients',
    items: [
      { path: '/patients', label: 'Liste des patients', icon: UsersIcon, permission: 'readPatient' },
    ],
  },
  {
    section: 'Secrétariat',
    items: [
      { path: '/secretaire/rendezvous/nouveau', label: 'Rendez-vous', icon: CalendarIcon, permission: 'manageAppointments', roles: ['secretaire'] },
    ],
  },
  {
    section: 'Analyses',
    items: [
      { path: '/stats', label: 'Statistiques', icon: ChartIcon, roles: ['doctor_chef', 'epidemiologist', 'readonly'] },
      { path: '/carte', label: 'Carte SIG', icon: MapIcon, permission: 'viewMap' },
      { path: '/rcp', label: 'RCP', icon: CalendarIcon, permission: 'viewRcp' },
    ],
  },
  {
    section: 'Systeme',
    items: [
      { path: '/aide', label: "Centre d'aide", labelKey: 'help', icon: HelpIcon, roles: ['doctor', 'doctor_chef', 'anapath', 'epidemiologist', 'pharmacist', 'secretaire', 'readonly'] },
      { path: '/parametres-medecin', label: 'Parametres', labelKey: 'doctorSettings', icon: DoctorSettingsIcon, roles: ['doctor'] },
    ],
  },
];

const UI_TEXT = {
  fr: {
    subtitle: 'Interface simple, lumineuse et centree sur le travail clinique',
    help: "Centre d'aide",
    doctorSettings: 'Parametres medecin',
    backToPatients: 'Retour aux patients',
  },
  en: {
    subtitle: 'Simple, clear interface focused on clinical work',
    help: 'Help center',
    doctorSettings: 'Doctor settings',
    backToPatients: 'Back to patients',
  },
  ar: {
    subtitle: 'واجهة بسيطة ومريحة للعمل الطبي',
    help: 'مركز المساعدة',
    doctorSettings: 'إعدادات الطبيب',
    backToPatients: 'العودة إلى المرضى',
  },
};

function isActivePath(path, pathname) {
  if (path === '/patients/doublons') return pathname.startsWith('/patients/doublons');
  if (path === '/patients') return pathname === '/patients' || (pathname.startsWith('/patients/') && !pathname.startsWith('/patients/doublons'));
  return pathname.startsWith(path);
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

export default function Sidebar({ patientContext }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuthStore();
  const { can, user, roleLabel, roleColor } = usePermissions();
  const { theme, language } = usePreferences();
  const t = UI_TEXT[language] || UI_TEXT.fr;
  const dark = theme === 'dark';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const filteredNav = NAV_CONFIG
    .map((section) => ({
      ...section,
      items: (section.items || []).filter((item) => {
        const hasPermission = !item.permission || can[item.permission];
        const hasRole = !item.roles || item.roles.includes(user?.role);
        return hasPermission && hasRole;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const profileName =
    user?.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    user?.username ||
    'Utilisateur';

  const sidebarPosition = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.24s ease',
      }
    : {
        position: 'fixed',
        top: 0,
        left: 0,
      };

  // ── Mode contexte patient : le sidebar global est remplacé par la fiche patient ──
  const inPatientMode = !!patientContext?.patient;
  const p = patientContext?.patient;
  const patientInitials = inPatientMode
    ? ((p.nom?.[0] || '') + (p.prenom?.[0] || '')).toUpperCase() || (p.full_name?.[0] || 'P').toUpperCase()
    : '';
  const patientFullName = inPatientMode
    ? (p.full_name || `${p.nom || ''} ${p.prenom || ''}`.trim() || 'Patient')
    : '';

  return (
    <>
      {isMobile && mobileOpen && (
        <button type="button" aria-label="Fermer la navigation" onClick={() => setMobileOpen(false)} style={overlayStyle} />
      )}

      {isMobile && (
        <button
          type="button"
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setMobileOpen((current) => !current)}
          style={mobileToggleStyle}
        >
          <MenuIcon size={18} />
        </button>
      )}

      <aside style={{ ...sidebarStyle, ...(dark ? sidebarDarkStyle : {}), ...sidebarPosition }}>
        <div style={accentLineStyle} />

        {inPatientMode ? (
          <>
            {/* ── Retour à la liste ── */}
            <button
              type="button"
              onClick={() => navigate(patientContext.backPath || '/patients')}
              style={{ ...backLinkStyle, ...(dark ? backLinkDarkStyle : {}) }}
            >
              <ArrowLeftIcon size={13} />
              {patientContext.backLabel || t.backToPatients}
            </button>

            {/* ── Carte patient (remplace la marque de l'app) ── */}
            <div style={{ ...profileCardStyle, ...(dark ? profileCardDarkStyle : {}), marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ ...avatarStyle, width: 38, height: 38, fontSize: 13 }}>{patientInitials}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...profileNameStyle, color: dark ? '#f8fafc' : '#0f172a', whiteSpace: 'normal' }}>
                    {patientFullName}
                  </div>
                  <div style={{ ...profileCaptionStyle, color: dark ? '#94a3b8' : '#64748b', fontFamily: 'var(--font-mono)' }}>
                    {p.registration_number || '—'}
                  </div>
                </div>
              </div>
              {p.statut_label && (
                <div
                  style={{
                    ...rolePillStyle,
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563eb',
                    border: '1px solid rgba(37, 99, 235, 0.18)',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
                  {p.statut_label}
                </div>
              )}
            </div>

            {/* ── Navigation propre au dossier patient ── */}
            <nav style={navStyle}>
              <div style={sectionTitleStyle}>Dossier patient</div>
              {(patientContext.sections || []).map((s) => {
                const active = patientContext.activeKey === s.key;
                const Icon = s.icon || DotIcon;
                return (
                  <div
                    key={s.key}
                    onClick={() => patientContext.onSelect?.(s.key)}
                    style={{
                      ...navItemStyle,
                      ...(active ? navItemActiveStyle : {}),
                    }}
                  >
                    <div style={{ ...navIconWrapStyle, ...(active ? navIconActiveStyle : {}) }}>
                      <Icon size={15} />
                    </div>
                    <span style={{ ...navLabelStyle, color: active ? '#fff' : dark ? '#dbeafe' : '#334155' }}>
                      {s.label}
                    </span>
                    {active && <span style={activeDotStyle} />}
                  </div>
                );
              })}
            </nav>
          </>
        ) : (
          <>
            <div style={brandWrapStyle}>
              <div style={brandBadgeStyle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div style={{ ...brandTitleStyle, color: dark ? '#f8fafc' : '#0f172a' }}>RegistreCancer.dz</div>
                <div style={{ ...brandSubtitleStyle, color: dark ? '#94a3b8' : '#64748b' }}>Plateforme nationale oncologique</div>
              </div>
            </div>

            <div style={{ ...profileCardStyle, ...(dark ? profileCardDarkStyle : {}) }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <div style={avatarStyle}>{String(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...profileNameStyle, color: dark ? '#f8fafc' : '#0f172a' }}>{profileName}</div>
                  <div style={{ ...profileCaptionStyle, color: dark ? '#94a3b8' : '#64748b' }}>{user?.institution || user?.email || 'Compte connecte'}</div>
                </div>
              </div>
              <div
                style={{
                  ...rolePillStyle,
                  background: roleColor?.bg || 'rgba(37, 99, 235, 0.1)',
                  color: roleColor?.color || '#2563eb',
                  border: `1px solid ${roleColor?.border || 'rgba(37, 99, 235, 0.18)'}`,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor?.color || '#2563eb' }} />
                {roleLabel || 'Profil utilisateur'}
              </div>
            </div>

            <nav style={navStyle}>
              {filteredNav.map(({ section, items }) => (
                <div key={section} style={{ marginBottom: 10 }}>
                  <div style={sectionTitleStyle}>{section}</div>
                  {items.map(({ path, label, icon: Icon, labelKey }) => {
                    const active = isActivePath(path, location.pathname);
                    const compact = path === '/patients/doublons';
                    const displayLabel = labelKey ? t[labelKey] : label;
                    return (
                      <Link key={path} to={path} style={{ textDecoration: 'none' }}>
                        <div
                          style={{
                            ...navItemStyle,
                            ...(compact ? navItemCompactStyle : {}),
                            ...(active ? navItemActiveStyle : {}),
                          }}
                        >
                          <div style={{ ...navIconWrapStyle, ...(active ? navIconActiveStyle : {}) }}>
                            <Icon size={compact ? 13 : 15} />
                          </div>
                          <span style={{ ...navLabelStyle, color: active ? '#fff' : dark ? '#dbeafe' : '#334155' }}>{displayLabel}</span>
                          {active && <span style={activeDotStyle} />}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </>
        )}

        <div style={{ padding: '8px 12px 4px' }}>
          <button onClick={logout} style={logoutButtonStyle}>
            <LogoutIcon size={14} />
            Deconnexion
          </button>
        </div>
      </aside>
    </>
  );
}

export function AppLayout({ children, title, patientContext, breadcrumb }) {
  const isMobile = useIsMobile();
  const { theme, language } = usePreferences();
  const dark = theme === 'dark';
  const t = UI_TEXT[language] || UI_TEXT.fr;

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: dark ? '#0f172a' : 'linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%)' }}>
      <Sidebar patientContext={patientContext} />
      <div
        className="app-shell__main"
        style={{
          marginLeft: isMobile ? 0 : SIDEBAR_WIDTH,
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ ...topbarStyle, ...(dark ? topbarDarkStyle : {}) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 3, height: 20, background: 'linear-gradient(180deg, #2563eb, #93c5fd)', borderRadius: 2 }} />
            <div>
              <h1 style={{ ...pageTitleStyle, color: dark ? '#f8fafc' : '#0f172a' }}>{title}</h1>
              {breadcrumb && breadcrumb.length > 0 ? (
                <div style={breadcrumbStyle}>
                  {breadcrumb.map((b, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {b.onClick ? (
                        <span
                          onClick={b.onClick}
                          style={{ ...breadcrumbLinkStyle, color: dark ? '#93c5fd' : '#2563eb' }}
                        >
                          {b.label}
                        </span>
                      ) : (
                        <span style={{ ...breadcrumbCurrentStyle, color: dark ? '#94a3b8' : '#64748b' }}>{b.label}</span>
                      )}
                      {i < breadcrumb.length - 1 && (
                        <span style={{ ...breadcrumbSepStyle, color: dark ? '#475569' : '#cbd5e1' }}>›</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: dark ? '#94a3b8' : '#64748b', marginTop: 2 }}>{t.subtitle}</div>
              )}
            </div>
          </div>
        </div>
        <div className="app-shell__content" style={{ padding: isMobile ? '18px 14px 24px' : '28px', flex: 1 }}>
          <div style={contentPanelStyle}>{children}</div>
        </div>
      </div>
    </div>
  );
}

const accentLineStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 3,
  background: 'linear-gradient(90deg, #2563eb, #93c5fd)',
};

const sidebarStyle = {
  width: SIDEBAR_WIDTH,
  background: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  zIndex: 120,
  padding: '20px 12px 14px',
  borderRight: '1px solid rgba(59, 130, 246, 0.12)',
  boxShadow: '10px 0 36px rgba(15, 23, 42, 0.08)',
  overflow: 'hidden',
};

const sidebarDarkStyle = {
  background: '#111827',
  borderRight: '1px solid rgba(147, 197, 253, 0.16)',
  boxShadow: '10px 0 36px rgba(0, 0, 0, 0.28)',
};

const brandWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 8px 16px',
  marginBottom: 4,
};

const brandBadgeStyle = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 6px 20px rgba(37, 99, 235, 0.3)',
  flexShrink: 0,
};

const brandTitleStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: '#0f172a',
  fontFamily: 'var(--font-display)',
  letterSpacing: 0.2,
};

const brandSubtitleStyle = {
  fontSize: 10,
  color: '#64748b',
  marginTop: 1,
  lineHeight: 1.4,
};

const backLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '10px 12px',
  margin: '10px 0 4px',
  background: 'transparent',
  border: '1px solid rgba(37, 99, 235, 0.16)',
  borderRadius: 10,
  color: '#2563eb',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};

const backLinkDarkStyle = {
  border: '1px solid rgba(147, 197, 253, 0.2)',
  color: '#93c5fd',
};

const profileCardStyle = {
  margin: '0 4px 12px',
  padding: '12px',
  borderRadius: 12,
  background: 'linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%)',
  border: '1px solid rgba(37, 99, 235, 0.15)',
};

const profileCardDarkStyle = {
  background: '#1e293b',
  border: '1px solid rgba(147, 197, 253, 0.18)',
};

const avatarStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
};

const profileNameStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const profileCaptionStyle = {
  fontSize: 10,
  color: '#64748b',
  marginTop: 1,
};

const rolePillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '3px 8px',
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
};

const navStyle = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '0 4px 6px',
};

const sectionTitleStyle = {
  padding: '4px 8px 6px',
  fontSize: 9.5,
  fontWeight: 800,
  letterSpacing: 1.4,
  textTransform: 'uppercase',
  color: '#94a3b8',
};

const navItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 10px',
  borderRadius: 10,
  marginBottom: 2,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  border: '1px solid transparent',
};

const navItemCompactStyle = {
  marginLeft: 12,
  paddingTop: 7,
  paddingBottom: 7,
};

const navItemActiveStyle = {
  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
};

const navIconWrapStyle = {
  width: 28,
  height: 28,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#eff6ff',
  color: '#2563eb',
  flexShrink: 0,
};

const navIconActiveStyle = {
  background: 'rgba(255,255,255,0.2)',
  color: '#fff',
};

const navLabelStyle = {
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.2,
  flex: 1,
};

const activeDotStyle = {
  width: 5,
  height: 5,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.8)',
  flexShrink: 0,
};

const logoutButtonStyle = {
  width: '100%',
  padding: '10px 14px',
  background: '#fff5f5',
  border: '1px solid rgba(220, 38, 38, 0.12)',
  borderRadius: 10,
  color: '#dc2626',
  fontSize: 12.5,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontFamily: 'var(--font-body)',
  transition: 'all 0.15s',
};

const topbarStyle = {
  minHeight: 72,
  display: 'flex',
  alignItems: 'center',
  padding: '16px 28px',
  borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
  background: 'rgba(255, 255, 255, 0.88)',
  boxShadow: '0 1px 8px rgba(15, 23, 42, 0.04)',
  backdropFilter: 'blur(12px)',
  position: 'sticky',
  top: 0,
  zIndex: 80,
};

const topbarDarkStyle = {
  background: 'rgba(17, 24, 39, 0.92)',
  borderBottom: '1px solid rgba(147, 197, 253, 0.16)',
};

const pageTitleStyle = {
  fontSize: 17,
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  color: '#0f172a',
};

const breadcrumbStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginTop: 3,
  fontSize: 11.5,
};

const breadcrumbLinkStyle = {
  cursor: 'pointer',
  fontWeight: 600,
};

const breadcrumbCurrentStyle = {
  fontWeight: 500,
};

const breadcrumbSepStyle = {
  margin: '0 6px',
  fontSize: 11,
};

const contentPanelStyle = {
  minHeight: '100%',
};

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.24)',
  border: 'none',
  zIndex: 110,
};

const mobileToggleStyle = {
  position: 'fixed',
  top: 16,
  left: 14,
  width: 42,
  height: 42,
  borderRadius: 12,
  border: '1px solid rgba(37, 99, 235, 0.12)',
  background: '#ffffff',
  color: '#2563eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  zIndex: 130,
  cursor: 'pointer',
};

function GridIcon({ size = 16 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
}
function UsersIcon({ size = 16 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="9" cy="7" r="4"/><path d="M3 21c0-4 3-7 6-7s6 3 6 7"/><path d="M16 3c1.7 0 3 1.3 3 3s-1.3 3-3 3"/><path d="M21 21c0-3.5-2-6-5-6.5"/></svg>;
}
function CopyIcon({ size = 16 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3"/></svg>;
}
function MicroscopeIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><path d="M6 21h12M12 3v12M9 6l3-3 3 3M5 21a7 7 0 0114 0"/></svg>;
}
function PillIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><rect x="3" y="8" width="18" height="8" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/></svg>;
}
function HeartIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><path d="M12 21s-8-6-8-11a5 5 0 0110 0 5 5 0 0110 0c0 5-8 11-8 11z"/></svg>;
}
function ChartIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><path d="M4 19V5M10 19V9M16 19v-6M22 19V3"/></svg>;
}
function MapIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/></svg>;
}
function CalendarIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
}
function SettingsIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
}
function SlidersIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="13" cy="18" r="2"/></svg>;
}
function HelpIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>;
}
function DoctorSettingsIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><circle cx="12" cy="7" r="4"/><path d="M5 21a7 7 0 0114 0"/><path d="M18 4v6M15 7h6"/></svg>;
}
function LogoutIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}><path d="M16 17l5-5-5-5M21 12H9"/><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/></svg>;
}
function MenuIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>;
}
function ArrowLeftIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function DotIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4" /></svg>;
}
