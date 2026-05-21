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
    background: '#f1f5f9',
    border: '1px solid rgba(37,99,235,0.08)',
    borderRadius: '12px',
    color: '#0f172a', fontSize: 13.5,
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
              padding: '10px 12px', background: '#ffffff',
              border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px',
              fontSize: 12, color: '#64748b', whiteSpace: 'nowrap',
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
                background: active ? 'rgba(37,99,235,0.08)' : '#f1f5f9',
                border: `1px solid ${active ? '#2563eb' : 'rgba(37,99,235,0.08)'}`,
                borderRadius: '12px', cursor: 'pointer',
                fontSize: 13, color: active ? '#2563eb' : '#334155',
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
          border: '2px solid rgba(37,99,235,0.12)',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <span style={{ fontSize: 12.5, color: '#64748b' }}>
          Chargement des champs personnalisés...
        </span>
      </div>
    );
  }

  if (!champs || champs.length === 0) return null;

  // Parser topographie_code qui peut contenir plusieurs codes séparés par des virgules
  const getTopographieCodes = (topographieCode) => {
    if (!topographieCode) return [];
    return typeof topographieCode === 'string' 
      ? topographieCode.split(',').map(c => c.trim()).filter(Boolean)
      : [];
  };

  const selectedCodes = getTopographieCodes(topographieCode);

  // Séparer champs globaux et spécifiques cancer
  const champsGlobaux    = champs.filter(c => !c.topographie_code);
  // Filtrer champs spécifiques : afficher ceux qui contiennent le code sélectionné
  const champsSpecifiques = selectedCodes.length > 0
    ? champs.filter(c => {
        if (!c.topographie_code) return false;
        const champCodes = getTopographieCodes(c.topographie_code);
        // Le champ s'affiche si AU MOINS UN code correspond
        return champCodes.some(code => selectedCodes.includes(code));
      })
    : [];

  return (
    <div style={{ marginTop: 24 }}>
      {/* Séparateur titre */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18,
      }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(37,99,235,0.12)' }} />
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 0.8,
          color: '#64748b', textTransform: 'uppercase',
          padding: '0 8px', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Champs personnalisés
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(37,99,235,0.12)' }} />
      </div>

      {/* Champs spécifiques cancer */}
      {champsSpecifiques.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: 'rgba(0,168,255,0.04)',
          border: '1px solid rgba(0,168,255,0.15)',
          borderRadius: '12px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#0f172a',
            marginBottom: 14, letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            Spécifique — {champsSpecifiques[0]?.topographie_libelle || selectedCodes.join(', ')}
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
            color: '#334155', marginBottom: 6, letterSpacing: 0.3,
          }}>
            <span style={{ fontSize: 11 }}>{TYPE_ICONS[champ.type_champ]}</span>
            {champ.nom}
            {champ.obligatoire && (
              <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>
            )}
            <span style={{
              marginLeft: 'auto', fontSize: 10,
              color: 'rgba(255,255,255,0.2)',
              background: '#f1f5f9',
              padding: '1px 6px', borderRadius: 10,
            }}>
              {TYPE_LABELS[champ.type_champ]}
            </span>
          </label>

          {champ.description && (
            <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6, lineHeight: 1.4 }}>
              {champ.description}
            </p>
          )}

          <ChampInput
            champ={champ}
            valeur={valeurs[champ.code] ?? ''}
            onChange={onChange}
          />

          {erreurs[champ.code] && (
            <p style={{ marginTop: 4, fontSize: 11.5, color: '#dc2626' }}>
              {erreurs[champ.code]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}