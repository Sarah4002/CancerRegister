/**
 * components/layout/Sidebar.jsx
 *
 * Sidebar dynamique : les liens sont filtrés selon les permissions
 * du rôle de l'utilisateur connecté.
 * Remplace votre Sidebar.jsx actuel.
 */

import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../hooks/useAuth';
import usePermissions from '../../hooks/usePermissions';

// ── Définition complète de la navigation ──────────────────────
// Chaque item a une `permission` optionnelle.
// Si `permission` est défini, l'item n'apparaît que si can[permission] === true.
// Si pas de `permission`, l'item est toujours visible (ex: dashboard).

const NAV_CONFIG = [
  {
    section: 'PRINCIPAL',
    items: [
      { path: '/dashboard', label: 'Tableau de bord', icon: GridIcon },
    ],
  },
  {
    section: 'PATIENTS',
    items: [
      { path: '/patients',          label: 'Liste des patients', icon: UsersIcon,  permission: 'readPatient'  },
      { path: '/patients/doublons', label: 'Doublons',           icon: CopyIcon,   permission: 'writePatient' },
    ],
  },
  {
    section: 'CLINIQUE',
    items: [
      { path: '/diagnostics', label: 'Diagnostics',   icon: MicroscopeIcon, permission: 'readDiagnostic' },
      { path: '/traitements', label: 'Traitements',   icon: PillIcon,       permission: 'readTreatment'  },
      { path: '/suivi',       label: 'Suivi clinique',icon: HeartIcon,      permission: 'readTreatment'  },
    ],
  },
{
    section: 'ANALYSES',
    items: [
      { path: '/stats',        label: 'Statistiques',  icon: ChartIcon,    permission: 'viewStatistics' },
      { path: '/carte',        label: 'Carte SIG',     icon: MapIcon,      permission: 'viewMap'        },
      { path: '/rcp',          label: 'RCP',           icon: CalendarIcon, permission: 'viewRcp'        },
    ],
  },
{
    section: 'SYSTÈME',
    items: [
      { path: '/admin',   label: 'Administration',     icon: SettingsIcon, permission: 'manageUsers'  },
    ],
  },
  
];

export default function Sidebar() {
  const location  = useLocation();
  const { logout } = useAuthStore();
  const { can, user, roleLabel, roleColor } = usePermissions();

  // Filtrer les items selon les permissions
  const filteredNav = NAV_CONFIG
    .map(section => ({
      ...section,
      items: section.items.filter(item =>
        !item.permission || can[item.permission]
      ),
    }))
    .filter(section => section.items.length > 0);

  return (
    <aside style={{
      width: 220,
      background: '#080d18',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0,
      height: '100vh',
      zIndex: 100,
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>

      {/* Logo */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #00a8ff, #00e5c0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 0.3 }}>
              RegistreCancer.dz
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 0.5 }}>
              MINISTÈRE DE LA SANTÉ
            </div>
          </div>
        </div>
      </div>

      {/* Badge utilisateur connecté */}
      {user && (
        <div style={{
          margin: '10px 12px',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.full_name}
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
            background: roleColor.bg, color: roleColor.color,
            border: `1px solid ${roleColor.border}`,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: roleColor.color }} />
            {roleLabel}
          </span>
        </div>
      )}

      {/* Navigation filtrée */}
      <nav style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {filteredNav.map(({ section, items }) => (
          <div key={section}>
            <div style={{
              padding: '10px 16px 3px',
              fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
              color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
            }}>
              {section}
            </div>

            {items.map(({ path, label, icon: Icon }) => {
              // Gestion active : /patients/doublons ne doit pas activer /patients
              const isDoublons = path === '/patients/doublons';
              const active = isDoublons
                ? location.pathname.startsWith('/patients/doublons')
                : path === '/patients'
                  ? location.pathname === '/patients' || (location.pathname.startsWith('/patients/') && !location.pathname.startsWith('/patients/doublons'))
                  : location.pathname.startsWith(path);

              return (
                <Link key={path} to={path} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: isDoublons ? '7px 16px 7px 28px' : '8px 16px',
                    background:  active ? 'rgba(0,168,255,0.12)' : 'transparent',
                    borderLeft:  `2px solid ${active ? '#00a8ff' : 'transparent'}`,
                    color:       active ? '#fff' : 'rgba(255,255,255,0.45)',
                    fontSize:    isDoublons ? 12 : 12.5,
                    cursor:      'pointer',
                    transition:  'all 0.15s',
                  }}
                    onMouseEnter={e => !active && (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
                    onMouseLeave={e => !active && (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                  >
                    <Icon size={isDoublons ? 13 : 15} />
                    <span>{label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer : déconnexion */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={logout} style={{
          width: '100%', padding: '7px',
          background: 'rgba(255,77,106,0.1)',
          border: '1px solid rgba(255,77,106,0.2)',
          borderRadius: 6, color: '#ff4d6a',
          fontSize: 11.5, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontFamily: 'var(--font-body)',
        }}>
          <LogoutIcon size={13} /> Déconnexion
        </button>
      </div>
    </aside>
  );
}

export function AppLayout({ children, title }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: 220, flex: 1 }}>
        <div style={{
          height: 52, display: 'flex', alignItems: 'center',
          padding: '0 24px', borderBottom: '1px solid var(--border)',
          justifyContent: 'space-between',
        }}>
          <h1 style={{ fontSize: 15, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {title}
          </h1>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────── */
function GridIcon({ size = 16 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
}
function UsersIcon({ size = 16 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><circle cx="9" cy="7" r="4" /><circle cx="17" cy="7" r="4" /><path d="M2 21c0-4 4-7 7-7s7 3 7 7" /></svg>;
}
function CopyIcon({ size = 16 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3" /></svg>;
}
function MicroscopeIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.6}><path d="M6 21h12M12 3v12M9 6l3-3 3 3" /></svg>;
}
function PillIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.6}><rect x="3" y="8" width="18" height="8" rx="4" /><line x1="12" y1="8" x2="12" y2="16" /></svg>;
}
function HeartIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.6}><path d="M12 21s-8-6-8-11a5 5 0 0110 0 5 5 0 0110 0c0 5-8 11-8 11z" /></svg>;
}
function ChartIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.6}><path d="M4 19V5M10 19V9M16 19v-6M22 19V3" /></svg>;
}
function MapIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.6}><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /></svg>;
}
function CalendarIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.6}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function SettingsIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.6}><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
}
function LogoutIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.6}><path d="M16 17l5-5-5-5M21 12H9" /><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /></svg>;
}