/**
 * AjouterMedecinModal.jsx
 *
 * Modal de sélection d'un médecin / participant pour une RCP.
 * - Affiche TOUS les utilisateurs actifs (sauf readonly)
 * - Filtre en temps réel par nom / email / institution / rôle
 * - Empêche les doublons : les IDs déjà présents sont grisés
 * - Sélection unique avec confirmation visuelle
 * - Envoie l'ID sélectionné via onAjouter(medecinId)
 */

import { useState, useEffect, useCallback } from 'react';
import { accountsService } from '../../services/accountsService';

// ── Couleurs par rôle ─────────────────────────────────────────
const ROLE_COLORS = {
  admin:          '#6b7280',
  doctor:         '#2563eb',
  anapath:        '#7c3aed',
  epidemiologist: '#0891b2',
  pharmacist:     '#d97706',
  nurse:          '#16a34a',
  radiologist:    '#ea580c',
  surgeon:        '#dc2626',
  readonly:       '#94a3b8',
};

const getRoleColor = (role) => ROLE_COLORS[role] || '#64748b';

// ── Initiales à partir du nom complet ─────────────────────────
function initiales(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AjouterMedecinModal({ onClose, onAjouter, dejaPresents = [] }) {
  const [allMedecins, setAllMedecins]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [query, setQuery]               = useState('');
  const [selectedId, setSelectedId]     = useState(null);
  const [submitting, setSubmitting]     = useState(false);

  // IDs déjà présents (robuste : accepte int ou string)
  const presentIds = new Set((dejaPresents || []).filter(Boolean).map(String));

  // Chargement initial de tous les utilisateurs
  useEffect(() => {
    setLoading(true);
    accountsService
      .medecins()
      .then(({ data }) => setAllMedecins(data.medecins || []))
      .catch(() => setAllMedecins([]))
      .finally(() => setLoading(false));
  }, []);

  // Filtrage local (plus réactif que de re-fetcher à chaque frappe)
  const normalizedQ = query.trim().toLowerCase();
  const visible = allMedecins.filter((m) => {
    // Toujours exclure les déjà présents de la liste visible
    if (presentIds.has(String(m.id))) return false;
    if (!normalizedQ) return true;
    return (
      (m.full_name     || '').toLowerCase().includes(normalizedQ) ||
      (m.email         || '').toLowerCase().includes(normalizedQ) ||
      (m.institution   || '').toLowerCase().includes(normalizedQ) ||
      (m.speciality    || '').toLowerCase().includes(normalizedQ) ||
      (m.role_display  || '').toLowerCase().includes(normalizedQ) ||
      (m.role          || '').toLowerCase().includes(normalizedQ) ||
      (m.wilaya        || '').toLowerCase().includes(normalizedQ)
    );
  });

  const handleAjouter = async () => {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    try {
      await onAjouter(selectedId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyAllPresent =
    !loading && allMedecins.length > 0 &&
    allMedecins.every((m) => presentIds.has(String(m.id)));

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border, rgba(37,99,235,0.12))',
          borderRadius: 16,
          width: '100%', maxWidth: 560,
          maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border, rgba(37,99,235,0.1))',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-elevated, #f8fafc)',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #0f172a)', fontFamily: 'var(--font-display)' }}>
              Ajouter un medecin a la presence
            </div>
            {!loading && (
              <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
                {allMedecins.length - presentIds.size} participant{allMedecins.length - presentIds.size > 1 ? 's' : ''} disponible{allMedecins.length - presentIds.size > 1 ? 's' : ''}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--bg-card, #fff)',
              border: '1px solid var(--border, rgba(37,99,235,0.12))',
              color: 'var(--text-muted, #64748b)',
              fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            x
          </button>
        </div>

        {/* ── Recherche ── */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border, rgba(37,99,235,0.08))', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-elevated, #f1f5f9)',
              border: '1px solid var(--border, rgba(37,99,235,0.12))',
              borderRadius: 10, padding: '9px 12px',
            }}
          >
            <SearchIcon />
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedId(null); }}
              placeholder="Rechercher par nom, email, institution, role..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: 'var(--text-primary, #0f172a)',
                fontFamily: 'var(--font-body)',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #94a3b8)', fontSize: 16, lineHeight: 1, padding: 0 }}
              >
                x
              </button>
            )}
          </div>
        </div>

        {/* ── Liste ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
              <div style={{ width: 28, height: 28, border: '3px solid rgba(37,99,235,0.12)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13 }}>Chargement des utilisateurs...</div>
            </div>
          ) : alreadyAllPresent ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: 13 }}>
              Tous les participants disponibles sont deja presents dans cette RCP.
            </div>
          ) : visible.length === 0 && query ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: 13 }}>
              Aucun resultat pour <strong style={{ color: 'var(--text-secondary, #334155)' }}>"{query}"</strong>
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: 13 }}>
              Aucun utilisateur disponible.
            </div>
          ) : (
            visible.map((m) => {
              const isSelected = String(m.id) === String(selectedId);
              const color = getRoleColor(m.role);
              const label = m.full_name || m.email || '—';
              const sub = [m.role_display, m.institution, m.wilaya]
                .filter(Boolean).join(' · ');

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : m.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '11px 20px',
                    border: 'none',
                    borderBottom: '1px solid var(--border, rgba(37,99,235,0.06))',
                    background: isSelected
                      ? 'rgba(37,99,235,0.06)'
                      : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(37,99,235,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: color + '15',
                      border: `1.5px solid ${color}35`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, color,
                      flexShrink: 0, letterSpacing: 0.5,
                    }}
                  >
                    {initiales(label)}
                  </div>

                  {/* Infos */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13, fontWeight: 700,
                        color: 'var(--text-primary, #0f172a)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 2,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 11, color: 'var(--text-muted, #94a3b8)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {sub || m.email}
                    </div>
                  </div>

                  {/* Badge rôle */}
                  <span
                    style={{
                      padding: '3px 9px', borderRadius: 20, fontSize: 10,
                      fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                      background: color + '12',
                      color,
                      border: `1px solid ${color}25`,
                    }}
                  >
                    {m.role_display || m.role}
                  </span>

                  {/* Coche sélection */}
                  {isSelected && (
                    <div
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#2563eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border, rgba(37,99,235,0.1))',
            background: 'var(--bg-elevated, #f8fafc)',
            display: 'flex', gap: 10, alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {selectedId && (
            <div style={{ flex: 1, fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
              {(() => {
                const m = allMedecins.find((x) => String(x.id) === String(selectedId));
                return m ? `${m.full_name} selectionne` : '';
              })()}
            </div>
          )}
          {!selectedId && <div style={{ flex: 1 }} />}

          <button
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: 'var(--bg-card, #fff)',
              border: '1px solid var(--border, rgba(37,99,235,0.15))',
              borderRadius: 8,
              color: 'var(--text-secondary, #334155)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleAjouter}
            disabled={!selectedId || submitting}
            style={{
              padding: '9px 22px',
              background: selectedId && !submitting
                ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                : 'var(--bg-elevated, #e2e8f0)',
              border: 'none',
              borderRadius: 8,
              color: selectedId && !submitting ? '#fff' : 'var(--text-muted, #94a3b8)',
              fontSize: 13, fontWeight: 700,
              cursor: selectedId && !submitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {submitting ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="var(--text-muted, #94a3b8)"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
