/**
 * components/custom_fields/CustomFieldsSection.jsx
 *
 * Section "Champs personnalisés" à plugger dans n'importe quel formulaire.
 *
 * Usage :
 *   <CustomFieldsSection
 *     module="patient"
 *     objectId={patient.id}           // null si création
 *     topographieCode="C50"           // optionnel
 *     valeurs={valeurs}
 *     onChange={(code, val) => setValeur(code, val)}
 *     loading={loading}
 *   />
 */

const TYPE_ICONS = {
  texte:    '✏️',
  nombre:   '🔢',
  date:     '📅',
  booleen:  '☑️',
  textarea: '📝',
  select:   '📋',
};

const TYPE_LABELS = {
  texte:    'Texte',
  nombre:   'Nombre',
  date:     'Date',
  booleen:  'Oui/Non',
  textarea: 'Texte long',
  select:   'Liste',
};

// ── Rendu d'un champ selon son type ──────────────────────────
function ChampInput({ champ, valeur, onChange }) {
  const base = {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: 13.5,
    outline: 'none', fontFamily: 'var(--font-body)',
    boxSizing: 'border-box',
  };

  switch (champ.type_champ) {

    case 'texte':
      return (
        <input
          type="text"
          value={valeur || ''}
          onChange={e => onChange(champ.code, e.target.value)}
          placeholder={champ.description || `Saisir ${champ.nom.toLowerCase()}...`}
          style={base}
        />
      );

    case 'nombre':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            value={valeur || ''}
            onChange={e => onChange(champ.code, e.target.value)}
            min={champ.valeur_min ?? undefined}
            max={champ.valeur_max ?? undefined}
            placeholder="0"
            style={{ ...base, flex: 1 }}
          />
          {champ.unite && (
            <span style={{
              padding: '10px 12px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap',
            }}>
              {champ.unite}
            </span>
          )}
        </div>
      );

    case 'date':
      return (
        <input
          type="date"
          value={valeur || ''}
          onChange={e => onChange(champ.code, e.target.value)}
          style={base}
        />
      );

    case 'booleen':
      const isTrue = valeur === 'true' || valeur === true || valeur === 'Oui';
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          {['Oui', 'Non', 'Inconnu'].map(opt => {
            const val    = opt === 'Oui' ? 'true' : opt === 'Non' ? 'false' : '';
            const active = valeur === val || (opt === 'Oui' && isTrue);
            return (
              <label key={opt} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: '9px 12px',
                background: active ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border-light)'}`,
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                fontSize: 13, color: active ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400, transition: 'all 0.15s',
              }}>
                <input
                  type="radio"
                  name={champ.code}
                  value={val}
                  checked={active}
                  onChange={() => onChange(champ.code, val)}
                  style={{ display: 'none' }}
                />
                {opt === 'Oui' ? '✓' : opt === 'Non' ? '✗' : '?'} {opt}
              </label>
            );
          })}
        </div>
      );

    case 'textarea':
      return (
        <textarea
          value={valeur || ''}
          onChange={e => onChange(champ.code, e.target.value)}
          placeholder={champ.description || `Saisir ${champ.nom.toLowerCase()}...`}
          rows={3}
          style={{ ...base, resize: 'vertical', lineHeight: 1.6 }}
        />
      );

    case 'select':
      return (
        <select
          value={valeur || ''}
          onChange={e => onChange(champ.code, e.target.value)}
          style={{ ...base, cursor: 'pointer' }}
        >
          <option value="">— Sélectionner —</option>
          {(champ.options || []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    default:
      return null;
  }
}

// ── Composant principal ───────────────────────────────────────
export default function CustomFieldsSection({
  module,
  objectId   = null,
  topographieCode = '',
  champs     = [],
  valeurs    = {},
  onChange,
  loading    = false,
  erreurs    = {},  // { code: message }
}) {
  if (loading) {
    return (
      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 16, height: 16,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          Chargement des champs personnalisés...
        </span>
      </div>
    );
  }

  if (!champs || champs.length === 0) return null;

  // Séparer champs globaux et spécifiques cancer
  const champsGlobaux    = champs.filter(c => !c.topographie_code);
  const champsSpecifiques = champs.filter(c => c.topographie_code);

  return (
    <div style={{ marginTop: 24 }}>
      {/* Séparateur titre */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 0.8,
          color: 'var(--text-muted)', textTransform: 'uppercase',
          padding: '0 8px', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Champs personnalisés
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* Champs spécifiques cancer */}
      {champsSpecifiques.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: 'rgba(0,168,255,0.04)',
          border: '1px solid rgba(0,168,255,0.15)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            marginBottom: 14, letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            🎯 Spécifique — {champsSpecifiques[0]?.topographie_libelle || topographieCode}
          </div>
          <ChampsGrid champs={champsSpecifiques} valeurs={valeurs} onChange={onChange} erreurs={erreurs} />
        </div>
      )}

      {/* Champs globaux */}
      {champsGlobaux.length > 0 && (
        <ChampsGrid champs={champsGlobaux} valeurs={valeurs} onChange={onChange} erreurs={erreurs} />
      )}
    </div>
  );
}

function ChampsGrid({ champs, valeurs, onChange, erreurs }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '0 16px',
    }}>
      {champs.map(champ => (
        <div key={champ.code} style={{ marginBottom: 16 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 500,
            color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: 0.3,
          }}>
            <span style={{ fontSize: 11 }}>{TYPE_ICONS[champ.type_champ]}</span>
            {champ.nom}
            {champ.obligatoire && (
              <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>
            )}
            <span style={{
              marginLeft: 'auto', fontSize: 10,
              color: 'rgba(255,255,255,0.2)',
              background: 'var(--bg-elevated)',
              padding: '1px 6px', borderRadius: 10,
            }}>
              {TYPE_LABELS[champ.type_champ]}
            </span>
          </label>

          {champ.description && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>
              {champ.description}
            </p>
          )}

          <ChampInput
            champ={champ}
            valeur={valeurs[champ.code] ?? ''}
            onChange={onChange}
          />

          {erreurs[champ.code] && (
            <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--danger)' }}>
              {erreurs[champ.code]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}