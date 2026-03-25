/**
 * components/voice/VoiceDictation.jsx
 * Version avec logs de debug complets
 */

import { useState, useCallback, useRef } from 'react';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import useVoiceToForm from '../../hooks/useVoiceToForm';

const STATES = {
  idle:        { color: '#00a8ff', bg: 'rgba(0,168,255,0.1)',   border: 'rgba(0,168,255,0.25)',   label: 'Dicter'       },
  listening:   { color: '#ff4d6a', bg: 'rgba(255,77,106,0.1)',  border: 'rgba(255,77,106,0.4)',   label: 'Écoute...'    },
  extracting:  { color: '#f5a623', bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.35)',  label: 'Analyse...'   },
  success:     { color: '#00e5a0', bg: 'rgba(0,229,160,0.1)',   border: 'rgba(0,229,160,0.35)',   label: 'Rempli !'     },
  error:       { color: '#ff4d6a', bg: 'rgba(255,77,106,0.08)', border: 'rgba(255,77,106,0.3)',   label: 'Erreur'       },
};

function MicIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function StopIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} fill="currentColor" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function SpinnerIcon({ size = 16, color = '#f5a623' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}30`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'voice-spin 0.7s linear infinite',
    }} />
  );
}

function SoundWave({ active, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 16 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: color,
          height: active ? `${8 + Math.sin(i * 1.2) * 6}px` : '4px',
          animation: active ? `voice-wave 0.8s ease-in-out infinite` : 'none',
          animationDelay: `${i * 0.12}s`,
          transition: 'height 0.2s ease',
        }} />
      ))}
    </div>
  );
}

const FIELD_LABELS = {
  nom: 'Nom', prenom: 'Prénom', date_naissance: 'Date naissance',
  lieu_naissance: 'Lieu naissance', sexe: 'Sexe', telephone: 'Téléphone',
  telephone2: 'Téléphone 2', email: 'Email', adresse: 'Adresse',
  wilaya: 'Wilaya', commune: 'Commune', profession: 'Profession',
  situation_familiale: 'Situation familiale', nombre_enfants: 'Nb enfants',
  niveau_instruction: 'Niveau instruction', id_national: 'N° national',
  statut_vital: 'Statut vital', antecedents_personnels: 'Antécédents perso',
  antecedents_familiaux: 'Antécédents familiaux', notes: 'Notes',
  topographie_code: 'Code topo', topographie_libelle: 'Topographie',
  morphologie_code: 'Code morpho', morphologie_libelle: 'Morphologie',
  date_diagnostic: 'Date diagnostic', stade_ajcc: 'Stade AJCC',
  tnm_t: 'T', tnm_n: 'N', tnm_m: 'M', lateralite: 'Latéralité',
  base_diagnostic: 'Base diagnostic', observations: 'Observations',
  type_traitement: 'Type traitement', date_debut: 'Début', date_fin: 'Fin',
  protocole: 'Protocole', nombre_cycles: 'Cycles', dose: 'Dose',
  intention: 'Intention', etablissement: 'Établissement',
  date_consultation: 'Date consultation', motif: 'Motif',
  poids: 'Poids (kg)', taille: 'Taille (cm)',
  performance_status: 'Performance status', evolution: 'Évolution',
  plan_traitement: 'Plan traitement', prochain_rdv: 'Prochain RDV',
};

function TranscriptPanel({ transcript, interimText, fields, color }) {
  const hasFields = fields && Object.keys(fields).length > 0;

  return (
    <div style={{
      marginTop: 10,
      background: 'var(--bg-elevated)',
      border: `1px solid ${color}30`,
      borderRadius: 10,
      overflow: 'hidden',
      animation: 'voice-fadein 0.2s ease',
    }}>
      {(transcript || interimText) && (
        <div style={{ padding: '10px 14px', borderBottom: hasFields ? `1px solid ${color}20` : 'none' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 5, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Transcription
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {transcript}
            {interimText && (
              <span style={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                {' '}{interimText}
              </span>
            )}
          </p>
        </div>
      )}

      {hasFields && (
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#00e5a0', marginBottom: 8, letterSpacing: 0.8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e5a0', display: 'inline-block' }} />
            {Object.keys(fields).length} champ{Object.keys(fields).length > 1 ? 's' : ''} détecté{Object.keys(fields).length > 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(fields).map(([key, val]) => (
              <div key={key} style={{
                padding: '3px 10px', borderRadius: 20,
                background: 'rgba(0,229,160,0.08)',
                border: '1px solid rgba(0,229,160,0.2)',
                fontSize: 11.5,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: 4 }}>
                  {FIELD_LABELS[key] || key}
                </span>
                <span style={{ color: '#00e5a0', fontWeight: 600 }}>
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message si extraction vide */}
      {!hasFields && transcript && (
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,77,106,0.8)' }}>
            ⚠️ Aucun champ reconnu — essayez de dicter plus clairement (ex: "Nom Benali prénom Mohamed")
          </div>
        </div>
      )}
    </div>
  );
}

export default function VoiceDictation({ formType = 'patient', onFieldsExtracted, compact = false }) {
  const [uiState,         setUiState]         = useState('idle');
  const [extractedFields, setExtractedFields] = useState(null);
  const [showPanel,       setShowPanel]       = useState(false);
  const [isPushHeld,      setIsPushHeld]      = useState(false);
  const holdTimerRef = useRef(null);

  const { extractFields, isExtracting, extractError } = useVoiceToForm(formType);

  // ── Callback quand la transcription est complète ──────────
  const handleTranscript = useCallback(async (text) => {
    console.log('🎤 ÉTAPE 1 — Transcription reçue:', text);

    if (!text || text.trim() === '') {
      console.warn('❌ Transcription vide — rien à envoyer');
      return;
    }

    setUiState('extracting');
    setShowPanel(true);

    console.log('🔄 ÉTAPE 2 — Envoi au proxy Django...');
    const fields = await extractFields(text);

    console.log('📦 ÉTAPE 3 — Champs reçus:', fields);
    console.log('📊 Nombre de champs:', Object.keys(fields || {}).length);

    if (fields && Object.keys(fields).length > 0) {
      setExtractedFields(fields);
      setUiState('success');
      console.log('✅ ÉTAPE 4 — Appel onFieldsExtracted avec:', fields);
      onFieldsExtracted?.(fields);
      setTimeout(() => setUiState('idle'), 3000);
    } else {
      console.warn('❌ Aucun champ extrait — fields vide ou null');
      setUiState('error');
      setTimeout(() => setUiState('idle'), 2500);
    }
  }, [extractFields, onFieldsExtracted]);

  const {
    isListening, transcript, interimText, error,
    supported, start, stop, toggle, reset,
  } = useSpeechRecognition({ onTranscript: handleTranscript });

  const currentUiState = isExtracting ? 'extracting'
    : isListening ? 'listening'
    : uiState;

  const s = STATES[currentUiState] || STATES.idle;

  // ── Mode push-to-talk ─────────────────────────────────────
  const handleMouseDown = useCallback(() => {
    holdTimerRef.current = setTimeout(() => {
      console.log('🎙️ Push-to-talk activé');
      setIsPushHeld(true);
      start();
    }, 200);
  }, [start]);

  const handleMouseUp = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    if (isPushHeld) {
      console.log('🎙️ Push-to-talk relâché');
      setIsPushHeld(false);
      stop();
    }
  }, [isPushHeld, stop]);

  // ── Mode toggle ───────────────────────────────────────────
  const handleClick = useCallback(() => {
    if (isPushHeld) return;
    if (currentUiState === 'extracting') return;
    if (currentUiState === 'success' || currentUiState === 'error') {
      reset();
      setExtractedFields(null);
      setUiState('idle');
      return;
    }
    console.log('🎙️ Toggle micro — isListening:', isListening);
    toggle();
    setShowPanel(true);
  }, [isPushHeld, currentUiState, toggle, reset, isListening]);

  if (!supported) {
    return (
      <div style={{
        padding: '8px 14px', borderRadius: 8, fontSize: 12,
        background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)',
        color: '#ff4d6a',
      }}>
        ⚠️ Saisie vocale non supportée — utilisez Chrome ou Edge
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes voice-spin   { to { transform: rotate(360deg); } }
        @keyframes voice-wave   { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.8); } }
        @keyframes voice-fadein { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes voice-pulse  { 0%,100% { box-shadow: 0 0 0 0 rgba(255,77,106,0.4); } 50% { box-shadow: 0 0 0 8px rgba(255,77,106,0); } }
      `}</style>

      {/* ── Bouton principal ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        <button
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          title={isListening ? 'Arrêter — ou maintenir pour push-to-talk' : 'Dicter — ou maintenir pour push-to-talk'}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: compact ? '7px 10px' : '8px 16px',
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: 8,
            cursor: currentUiState === 'extracting' ? 'wait' : 'pointer',
            color: s.color,
            fontSize: 12.5, fontWeight: 600,
            fontFamily: 'var(--font-body)',
            transition: 'all 0.2s ease',
            animation: isListening ? 'voice-pulse 1.5s infinite' : 'none',
            userSelect: 'none',
          }}
        >
          {currentUiState === 'extracting' ? (
            <SpinnerIcon size={16} color={s.color} />
          ) : isListening ? (
            <StopIcon size={16} />
          ) : (
            <MicIcon size={16} color={s.color} />
          )}

          {isListening && <SoundWave active={true} color={s.color} />}

          {!compact && <span>{s.label}</span>}
        </button>

        {!compact && (
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.2)', letterSpacing: 0.3 }}>
            {isPushHeld ? '🔴 Push-to-talk actif' : 'Click ou maintenir'}
          </span>
        )}

        {(transcript || extractedFields) && (
          <button
            onClick={() => setShowPanel(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', fontSize: 11,
              padding: '4px 6px', fontFamily: 'var(--font-body)',
            }}
          >
            {showPanel ? '▲ masquer' : '▼ voir'}
          </button>
        )}
      </div>

      {/* ── Erreur microphone ou extraction ── */}
      {(error || extractError) && (
        <div style={{
          marginTop: 8, padding: '7px 12px', borderRadius: 7, fontSize: 12,
          background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)',
          color: '#ff4d6a', animation: 'voice-fadein 0.2s ease',
        }}>
          {error || extractError}
        </div>
      )}

      {/* ── Panel transcription + champs extraits ── */}
      {showPanel && (transcript || interimText || extractedFields) && (
        <TranscriptPanel
          transcript={transcript}
          interimText={interimText}
          fields={extractedFields}
          color={s.color}
        />
      )}
    </div>
  );
}

export function VoiceMiniButton({ formType, onFieldsExtracted }) {
  return (
    <VoiceDictation
      formType={formType}
      onFieldsExtracted={onFieldsExtracted}
      compact={true}
    />
  );
}