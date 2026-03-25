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

const CERTITUDE_STYLE = {
  haute:   { bg: 'rgba(255,77,106,0.12)',  color: '#ff4d6a', label: 'Certitude haute'   },
  moyenne: { bg: 'rgba(245,166,35,0.12)',  color: '#f5a623', label: 'Certitude moyenne' },
  faible:  { bg: 'rgba(155,138,251,0.12)', color: '#9b8afb', label: 'Certitude faible'  },
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

  if (!champ.editable) {
    return (
      <td style={{ padding: '9px 14px', fontSize: 12.5,
        fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
        color: 'rgba(0,229,160,0.7)' }}>
        {champ.type === 'date' ? formatDate(value) : (value || '—')}
      </td>
    );
  }

  if (editing) {
    if (champ.options) {
      return (
        <td style={{ padding: '6px 14px' }}>
          <select
            value={value || ''}
            onChange={e => { onChange(e.target.value); setEditing(false); }}
            onBlur={() => setEditing(false)}
            autoFocus
            style={{
              width: '100%', padding: '5px 8px',
              background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
              borderRadius: 6, color: 'var(--text-primary)',
              fontSize: 12, fontFamily: 'var(--font-body)',
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
      <td style={{ padding: '6px 14px' }}>
        <input
          type={champ.type || 'text'}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={e => { if (e.key === 'Enter') setEditing(false); }}
          autoFocus
          style={{
            width: '100%', padding: '5px 8px',
            background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
            borderRadius: 6, color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
          }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={() => setEditing(true)}
      title="Cliquer pour modifier"
      style={{
        padding: '9px 14px', fontSize: 12.5, cursor: 'text',
        fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
        color: '#00e5a0',
        borderBottom: '1px dashed rgba(0,229,160,0.3)',
        transition: 'background 0.1s',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,160,0.06)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {champ.type === 'date' ? formatDate(value) : (value || '—')}
      <span style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        fontSize: 9, color: 'rgba(0,229,160,0.4)', fontFamily: 'var(--font-body)',
      }}>
        edit
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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{
        width: '100%', maxWidth: 980,
        background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-light)', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
                {titre || (modeCreation ? 'Doublon détecté' : 'Comparaison des dossiers')}
              </h2>
              <span style={{
                padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: cs.bg, color: cs.color,
              }}>{cs.label} — {Math.round(score * 100)}%</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {raisons.join(' · ')}
            </p>
            {modeCreation && (
              <p style={{
                fontSize: 12, color: '#f5a623', marginTop: 6,
                padding: '6px 12px', background: 'rgba(245,166,35,0.08)',
                borderRadius: 6, border: '1px solid rgba(245,166,35,0.2)',
              }}>
                Un dossier similaire existe déjà. Souhaitez-vous fusionner ou créer quand même ?
              </p>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body)',
          }}>×</button>
        </div>

        {/* ── Sélection du dossier principal ── */}
        {!modeCreation && (
          <div style={{
            padding: '12px 24px', background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              DOSSIER À CONSERVER :
            </span>
            {[donneesA, donneesB].filter(d => d.id).map(d => (
              <label key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '5px 12px', borderRadius: 'var(--radius-md)',
                background: principalId === d.id ? 'rgba(0,229,160,0.1)' : 'var(--bg-card)',
                border: `1px solid ${principalId === d.id ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}>
                <input type="radio" name="principal" checked={principalId === d.id}
                  onChange={() => setPrincipalId(d.id)}
                  style={{ accentColor: '#00e5a0' }} />
                <span style={{ fontSize: 12.5, fontWeight: 500,
                  color: principalId === d.id ? '#00e5a0' : 'var(--text-primary)' }}>
                  {d.nom} {d.prenom} — {d.registration_number}
                </span>
              </label>
            ))}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              L'autre dossier sera archivé
            </span>
          </div>
        )}

        {/* ── Légende colonne fusion ── */}
        <div style={{
          padding: '8px 24px', background: 'rgba(0,229,160,0.03)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11, color: 'rgba(0,229,160,0.6)',
        }}>
          La colonne <strong style={{ color: '#00e5a0' }}>Après fusion</strong> est éditable — cliquez sur une cellule pour modifier la valeur.
        </div>

        {/* ── Tableau de comparaison ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: 10,
                  color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5,
                  textTransform: 'uppercase', width: '18%' }}>Champ</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10,
                  color: '#00a8ff', fontWeight: 600, letterSpacing: 0.5,
                  textTransform: 'uppercase', width: '27%' }}>
                  {modeCreation ? 'Nouveau dossier' : donneesA.registration_number}
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10,
                  color: '#9b8afb', fontWeight: 600, letterSpacing: 0.5,
                  textTransform: 'uppercase', width: '27%' }}>
                  {modeCreation ? `Existant — ${donneesB.registration_number}` : donneesB.registration_number}
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10,
                  color: '#00e5a0', fontWeight: 600, letterSpacing: 0.5,
                  textTransform: 'uppercase', width: '28%' }}>
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
                      ? 'rgba(245,166,35,0.04)'
                      : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {/* Label */}
                    <td style={{ padding: '9px 24px', fontSize: 11,
                      color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                      {champ.label}
                      {different && (
                        <div style={{ fontSize: 9, color: '#f5a623', marginTop: 1 }}>Conflit</div>
                      )}
                    </td>
                    {/* Valeur A */}
                    <td style={{ padding: '9px 14px', fontSize: 12.5,
                      fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
                      color: 'var(--text-primary)' }}>
                      {valA}
                    </td>
                    {/* Valeur B */}
                    <td style={{ padding: '9px 14px', fontSize: 12.5,
                      fontFamily: champ.mono ? 'var(--font-mono)' : 'var(--font-body)',
                      color: 'var(--text-primary)' }}>
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
          padding: '18px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {Object.values(fusion).filter(v => v && v !== '—').length} champs renseignés dans le dossier fusionné
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onClose} style={{
              padding: '9px 18px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}>Annuler</button>

            {modeCreation && onForcerCreation && (
              <button onClick={onForcerCreation} style={{
                padding: '9px 18px', background: 'rgba(155,138,251,0.1)',
                border: '1px solid rgba(155,138,251,0.3)', borderRadius: 'var(--radius-md)',
                color: '#9b8afb', fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}>Créer quand même</button>
            )}

            <button onClick={handleFusion} disabled={loading} style={{
              padding: '9px 22px',
              background: loading ? 'var(--border)' : 'linear-gradient(135deg, #ff4d6a, #c0392b)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {loading ? (
                <>
                  <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Fusion...
                </>
              ) : 'Fusionner les dossiers'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}