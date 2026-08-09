/**
 * ComparaisonFusionModal.jsx
 * src/components/patients/ComparaisonFusionModal.jsx
 *
 * Modal réutilisable pour comparer deux dossiers et éditer la fiche fusionnée.
 * Utilisé depuis :
 *   - DoublonsPage.jsx (fusion de doublons existants)
 *   - NewPatientPage.jsx (doublon détecté à la création)
 */

import { useState, useEffect } from 'react';

// ── Champs affichés dans la comparaison ───────────────────────
const CHAMPS = [
  { key: 'nom',                 label: 'Nom',                   editable: true  },
  { key: 'prenom',              label: 'Prenom',                editable: true  },
  { key: 'date_naissance',      label: 'Date de naissance',     editable: true,  type: 'date' },
  { key: 'sexe',                label: 'Sexe',                  editable: true,
    options: [{ v: 'M', l: 'Masculin' }, { v: 'F', l: 'Féminin' }] },
  { key: 'id_national',         label: 'N Identite nationale',  editable: true,  mono: true },
  { key: 'num_securite_sociale',label: 'N Securite sociale',    editable: true,  mono: true },
  { key: 'telephone',           label: 'Telephone',             editable: true,  mono: true },
  { key: 'telephone2',          label: 'Telephone 2',           editable: true,  mono: true },
  { key: 'email',               label: 'Email',                 editable: true  },
  { key: 'adresse',             label: 'Adresse',               editable: true  },
  { key: 'commune',             label: 'Commune',               editable: true  },
  { key: 'wilaya',              label: 'Wilaya',                editable: true  },
  { key: 'registration_number', label: 'N Enregistrement',      editable: false, mono: true },
  { key: 'statut_dossier',      label: 'Statut dossier',        editable: false },
  { key: 'date_modification',   label: 'Derniere modification', editable: false },
];

// ── Palette alignée sur le design system commun (STATUT_COLORS, ROLE_CFG, etc.) ──
const CERTITUDE_STYLE = {
  haute:   { bg: 'rgba(220,38,38,0.08)',  color: '#dc2626', border: 'rgba(220,38,38,0.2)',  label: 'Certitude haute'   },
  moyenne: { bg: 'rgba(217,119,6,0.08)',  color: '#d97706', border: 'rgba(217,119,6,0.2)',  label: 'Certitude moyenne' },
  faible:  { bg: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: 'rgba(124,58,237,0.2)', label: 'Certitude faible'  },
};

function formatDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-DZ'); }
  catch { return d; }
}

// ── Calcul fusion initiale ─────────────────────────────────────
function calculerFusionInitiale(donneesA, donneesB, principalId) {
  const principal  = principalId === donneesA.id ? donneesA : donneesB;
  const secondaire = principalId === donneesA.id ? donneesB : donneesA;
  const fusion = {};

  CHAMPS.forEach(({ key }) => {
    const vp = principal[key];
    const vs = secondaire[key];
    const vide = v => v === null || v === undefined || v === '' || v === 'inconnu';
    fusion[key] = !vide(vp) ? vp : (!vide(vs) ? vs : '');
  });

  return fusion;
}

// ── Cellule éditable ───────────────────────────────────────────
function CellEditable({ champ, value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);

  if (!champ.editable) {
    return (
      <td style={{
        padding: '10px 14px', fontSize: 12.5,
        fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
        color: '#94a3b8',
      }}>
        {champ.type === 'date' ? formatDate(value) : (value || '—')}
      </td>
    );
  }

  if (editing) {
    if (champ.options) {
      return (
        <td style={{ padding: '7px 14px' }}>
          <select
            value={value || ''}
            onChange={e => { onChange(e.target.value); setEditing(false); }}
            onBlur={() => setEditing(false)}
            autoFocus
            style={{
              width: '100%', padding: '6px 9px',
              background: '#f8fafc', border: '1px solid #2563eb',
              borderRadius: 8, color: '#0f172a',
              fontSize: 12.5, fontFamily: 'var(--font-body)', outline: 'none',
            }}
          >
            <option value="">—</option>
            {champ.options.map(o => (
              <option key={o.v} value={o.v}>{o.l}</option>
            ))}
          </select>
        </td>
      );
    }
    return (
      <td style={{ padding: '7px 14px' }}>
        <input
          type={champ.type || 'text'}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
          autoFocus
          style={{
            width: '100%', padding: '6px 9px',
            background: '#f8fafc', border: '1px solid #2563eb',
            borderRadius: 8, color: '#0f172a',
            fontSize: 12.5, outline: 'none',
            fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
          }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={() => setEditing(true)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Cliquer pour modifier"
      style={{
        padding: '10px 14px', fontSize: 12.5, cursor: 'text', fontWeight: 600,
        fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
        color: '#16a34a',
        background: hovered ? 'rgba(22,163,74,0.06)' : 'transparent',
        borderBottom: '1px dashed rgba(22,163,74,0.3)',
        transition: 'background 0.15s',
        position: 'relative',
      }}
    >
      {champ.type === 'date' ? formatDate(value) : (value || '—')}
      <span style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        fontSize: 9, color: 'rgba(22,163,74,0.5)', fontFamily: 'var(--font-body)',
        fontWeight: 500,
      }}>
        modifier
      </span>
    </td>
  );
}

// ── Modal principale ───────────────────────────────────────────
export default function ComparaisonFusionModal({
  // Mode "doublon existant" : paire complète
  paire,
  // Mode "création" : données du formulaire + suspect trouvé
  donneesNouveauPatient,
  suspect,
  // Callbacks
  onClose,
  onFusionner,      // (idPrincipal, idSecondaire, champsFusion) => Promise
  onForcerCreation, // () => void  — uniquement en mode création
  titre,
}) {
  // Construire donneesA / donneesB selon le mode
  const modeCreation = !!donneesNouveauPatient;

  const donneesA = modeCreation
    ? { ...donneesNouveauPatient, id: null, registration_number: 'Nouveau dossier', statut_dossier: '—', date_modification: new Date().toISOString() }
    : paire.apercu_a;
  const donneesB = modeCreation
    ? suspect.apercu
    : paire.apercu_b;

  // En mode création, le dossier existant (B) est toujours le principal
  const [principalId, setPrincipalId] = useState(
    modeCreation ? donneesB.id : donneesA.id
  );
  const [fusion, setFusion]   = useState({});
  const [loading, setLoading] = useState(false);

  // Recalculer fusion quand principal change
  useEffect(() => {
    setFusion(calculerFusionInitiale(donneesA, donneesB, principalId));
  }, [principalId]);

  const updateFusion = (key, val) => {
    setFusion(prev => ({ ...prev, [key]: val }));
  };

  const raisons = modeCreation ? suspect.raisons : paire.raisons;
  const score   = modeCreation ? suspect.score   : paire.score;
  const certitude = modeCreation ? suspect.certitude : paire.certitude;
  const cs = CERTITUDE_STYLE[certitude] || CERTITUDE_STYLE.faible;

  const handleFusion = async () => {
    setLoading(true);
    try {
      const idPrincipal  = principalId;
      const idSecondaire = principalId === donneesA.id ? donneesB.id : donneesA.id;
      await onFusionner(idPrincipal, idSecondaire, fusion);
    } finally {
      setLoading(false);
    }
  };

  const overlayClick = e => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div
      onClick={overlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 1500,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
        animation: 'fadeIn .15s ease',
      }}
    >
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 980,
        background: '#fff', borderRadius: 18,
        border: '1px solid rgba(37,99,235,0.08)', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
        animation: 'slideUp .2s ease',
      }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#3b82f6,#2563eb)' }} />

        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(37,99,235,0.1)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {titre || (modeCreation ? 'Doublon détecté' : 'Comparaison des dossiers')}
              </h2>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: cs.bg, color: cs.color, border: `1px solid ${cs.border}`,
              }}>{cs.label} — {Math.round(score * 100)}%</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              {raisons.join(' · ')}
            </p>
            {modeCreation && (
              <div style={{
                marginTop: 10, fontSize: 12, color: '#d97706',
                padding: '8px 12px', background: 'rgba(217,119,6,0.06)',
                borderRadius: 10, border: '1px solid rgba(217,119,6,0.2)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span style={{ fontWeight: 500 }}>Un dossier similaire existe déjà. Souhaitez-vous fusionner ou créer quand même ?</span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, color: '#94a3b8', lineHeight: 1, padding: '2px 6px', borderRadius: 6, flexShrink: 0,
          }}>×</button>
        </div>

        {/* ── Sélection du dossier principal ── */}
        {!modeCreation && (
          <div style={{
            padding: '14px 24px', background: '#f8fafc',
            borderBottom: '1px solid rgba(37,99,235,0.1)',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Dossier à conserver
            </span>
            {[donneesA, donneesB].filter(d => d.id).map(d => (
              <label key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '6px 13px', borderRadius: 20,
                background: principalId === d.id ? 'rgba(22,163,74,0.08)' : '#fff',
                border: `1px solid ${principalId === d.id ? 'rgba(22,163,74,0.3)' : 'rgba(37,99,235,0.15)'}`,
                transition: 'all 0.15s',
              }}>
                <input type="radio" name="principal" checked={principalId === d.id}
                  onChange={() => setPrincipalId(d.id)}
                  style={{ accentColor: '#16a34a' }} />
                <span style={{ fontSize: 12.5, fontWeight: 600,
                  color: principalId === d.id ? '#16a34a' : '#334155' }}>
                  {d.nom} {d.prenom} — {d.registration_number}
                </span>
              </label>
            ))}
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
              L'autre dossier sera archivé
            </span>
          </div>
        )}

        {/* ── Légende colonne fusion ── */}
        <div style={{
          padding: '9px 24px', background: 'rgba(22,163,74,0.04)',
          borderBottom: '1px solid rgba(37,99,235,0.1)',
          fontSize: 11.5, color: '#64748b',
        }}>
          La colonne <strong style={{ color: '#16a34a' }}>Après fusion</strong> est éditable — cliquez sur une cellule pour modifier la valeur.
        </div>

        {/* ── Tableau de comparaison ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: 10.5,
                  color: '#94a3b8', fontWeight: 700, letterSpacing: 0.6,
                  textTransform: 'uppercase', width: '18%',
                  borderBottom: '1px solid rgba(37,99,235,0.08)' }}>Champ</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5,
                  color: '#2563eb', fontWeight: 700, letterSpacing: 0.6,
                  textTransform: 'uppercase', width: '27%',
                  borderBottom: '1px solid rgba(37,99,235,0.08)' }}>
                  {modeCreation ? 'Nouveau dossier' : donneesA.registration_number}
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5,
                  color: '#7c3aed', fontWeight: 700, letterSpacing: 0.6,
                  textTransform: 'uppercase', width: '27%',
                  borderBottom: '1px solid rgba(37,99,235,0.08)' }}>
                  {modeCreation ? `Existant — ${donneesB.registration_number}` : donneesB.registration_number}
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5,
                  color: '#16a34a', fontWeight: 700, letterSpacing: 0.6,
                  textTransform: 'uppercase', width: '28%',
                  borderBottom: '1px solid rgba(37,99,235,0.08)' }}>
                  Après fusion (éditable)
                </th>
              </tr>
            </thead>
            <tbody>
              {CHAMPS.map((champ, i) => {
                const va = donneesA[champ.key];
                const vb = donneesB[champ.key];
                const different = va && vb && String(va) !== String(vb);
                const valA = champ.type === 'date' ? formatDate(va) : (va || '—');
                const valB = champ.type === 'date' ? formatDate(vb) : (vb || '—');

                return (
                  <tr key={champ.key} style={{
                    background: different
                      ? 'rgba(217,119,6,0.04)'
                      : i % 2 === 0 ? 'transparent' : 'rgba(37,99,235,0.015)',
                    borderBottom: '1px solid rgba(37,99,235,0.06)',
                  }}>
                    {/* Label */}
                    <td style={{ padding: '10px 24px', fontSize: 11,
                      color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>
                      {champ.label}
                      {different && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: 9.5, color: '#d97706', marginTop: 3, fontWeight: 700,
                          padding: '1px 7px', borderRadius: 20, background: 'rgba(217,119,6,0.1)',
                          border: '1px solid rgba(217,119,6,0.2)', width: 'fit-content',
                        }}>Conflit</div>
                      )}
                    </td>
                    {/* Valeur A */}
                    <td style={{ padding: '10px 14px', fontSize: 12.5,
                      fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
                      color: '#0f172a' }}>
                      {valA}
                    </td>
                    {/* Valeur B */}
                    <td style={{ padding: '10px 14px', fontSize: 12.5,
                      fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
                      color: '#0f172a' }}>
                      {valB}
                    </td>
                    {/* Fusion éditable */}
                    <CellEditable
                      champ={champ}
                      value={fusion[champ.key]}
                      onChange={val => updateFusion(champ.key, val)}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Actions ── */}
        <div style={{
          padding: '18px 24px', borderTop: '1px solid rgba(37,99,235,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
            {Object.values(fusion).filter(v => v && v !== '—').length} champs renseignés dans le dossier fusionné
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', background: 'transparent',
              border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10,
              color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Annuler</button>

            {modeCreation && onForcerCreation && (
              <button onClick={onForcerCreation} style={{
                padding: '10px 20px', background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.25)', borderRadius: 10,
                color: '#7c3aed', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Créer quand même</button>
            )}

            <button onClick={handleFusion} disabled={loading} style={{
              padding: '10px 24px',
              background: loading ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
            }}>
              {loading ? (
                <>
                  <span style={{ width: 13, height: 13, border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                  Fusion…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v4a1 1 0 0 1-1 1H3" />
                    <path d="M21 8V4a1 1 0 0 0-1-1h-4" />
                    <path d="M3 16v4a1 1 0 0 0 1 1h4" />
                    <path d="M16 21h4a1 1 0 0 0 1-1v-4" />
                  </svg>
                  Fusionner les dossiers
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}