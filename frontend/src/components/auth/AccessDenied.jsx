/**
 * components/auth/AccessDenied.jsx
 *
 * Page affichée quand un utilisateur tente d'accéder
 * à une section pour laquelle il n'a pas les droits.
 *
 * Aussi : composant <RoleGuard> pour protéger des blocs JSX inline.
 */

import { useNavigate } from 'react-router-dom';
import usePermissions, { ROLE_LABELS } from '../../hooks/usePermissions';

// ── Page accès refusé (route complète) ────────────────────────
export default function AccessDenied({ message }) {
  const navigate       = useNavigate();
  const { roleLabel, roleColor } = usePermissions();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-deep)',
    }}>
      <div style={{
        maxWidth: 460, textAlign: 'center', padding: '0 24px',
        animation: 'fadeUp 0.4s ease',
      }}>
        {/* Icône */}
        <div style={{
          width: 72, height: 72, margin: '0 auto 24px',
          background: 'rgba(255,77,106,0.08)',
          border: '1px solid rgba(255,77,106,0.2)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#ff4d6a" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        {/* Titre */}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
          color: 'var(--text-primary)', marginBottom: 10,
        }}>
          Accès non autorisé
        </h2>

        {/* Message */}
        <p style={{
          fontSize: 14, color: 'var(--text-secondary)',
          lineHeight: 1.7, marginBottom: 20,
        }}>
          {message || 'Vous n\'avez pas les droits nécessaires pour accéder à cette section.'}
        </p>

        {/* Badge rôle actuel */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 20, marginBottom: 28,
          background: roleColor.bg, border: `1px solid ${roleColor.border}`,
          fontSize: 12, fontWeight: 600, color: roleColor.color,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor.color }} />
          Votre profil : {roleLabel}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            ← Retour
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '10px 20px',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Tableau de bord
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ── Guard inline : masque un bloc si permission manquante ──────
export function RoleGuard({ permission, children, fallback = null }) {
  const { can } = usePermissions();
  if (permission && !can[permission]) return fallback;
  return children;
}

// ── HOC : route protégée par permission ───────────────────────
export function RequirePermission({ permission, message, children }) {
  const { can } = usePermissions();
  if (!can[permission]) return <AccessDenied message={message} />;
  return children;
}