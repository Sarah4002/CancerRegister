import { useState, useRef, useCallback, useEffect } from 'react';

const LANG = 'fr-FR';
const MAX_RETRIES = 3;

export default function useSpeechRecognition({ onTranscript, continuous = false }) {
  // ⚠️ continuous = false — plus stable, évite les coupures réseau
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [interimText, setInterimText] = useState('');
  const [error,       setError]       = useState(null);
  const [supported,   setSupported]   = useState(true);

  const recognitionRef = useRef(null);
  const finalTextRef   = useRef('');
  const retryCountRef  = useRef(0);
  const shouldRestartRef = useRef(false);
  const allTextRef     = useRef(''); // accumule sur plusieurs sessions

  const createRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang             = LANG;
    recognition.continuous       = false;  // false = plus stable
    recognition.interimResults   = true;
    recognition.maxAlternatives  = 1;

    recognition.onstart = () => {
      console.log('🎙️ onstart');
      setIsListening(true);
      setError(null);
      finalTextRef.current = '';
    };

    recognition.onspeechstart = () => {
      console.log('🗣️ Parole détectée !');
      retryCountRef.current = 0; // reset retry si parole détectée
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        finalTextRef.current += final;
        allTextRef.current   += final;
      }

      setInterimText(interim);
      setTranscript(allTextRef.current.trim());
    };

    recognition.onerror = (event) => {
      console.error('❌ onerror:', event.error);

      if (event.error === 'network') {
        setError('Erreur réseau — vérifiez votre connexion internet (Google Speech API requise).');
        shouldRestartRef.current = false;
        setIsListening(false);
        return;
      }

      if (event.error === 'not-allowed') {
        setError('Permission microphone refusée — autorisez le micro dans votre navigateur.');
        shouldRestartRef.current = false;
        setIsListening(false);
        return;
      }

      if (event.error === 'no-speech') {
        // Pas de parole détectée — relancer si on écoute encore
        console.warn('⚠️ no-speech — relance automatique...');
        return; // onend va gérer le restart
      }

      if (event.error === 'aborted') return; // normal à l'arrêt
    };

    recognition.onend = () => {
      console.log('🏁 onend — texte accumulé:', allTextRef.current);

      // Si on doit continuer à écouter → relancer automatiquement
      if (shouldRestartRef.current && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        console.log(`🔄 Relance ${retryCountRef.current}/${MAX_RETRIES}...`);
        setTimeout(() => {
          try { recognitionRef.current?.start(); } catch (e) {}
        }, 300);
        return;
      }

      // Fin définitive → envoyer le texte accumulé
      setIsListening(false);
      setInterimText('');

      const texte = allTextRef.current.trim();
      if (texte) {
        console.log('✅ Envoi transcript:', texte);
        onTranscript?.(texte);
      } else {
        console.warn('⚠️ Aucun texte capturé');
        if (retryCountRef.current >= MAX_RETRIES) {
          setError('Aucune parole détectée. Vérifiez votre microphone et connexion internet.');
        }
      }

      allTextRef.current = '';
    };

    return recognition;
  }, [onTranscript]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      setError('Votre navigateur ne supporte pas la saisie vocale. Utilisez Chrome ou Edge.');
    }
  }, []);

  const start = useCallback(() => {
    if (isListening) return;

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current  = recognition;
    shouldRestartRef.current = true;
    retryCountRef.current   = 0;
    allTextRef.current      = '';
    finalTextRef.current    = '';

    setTranscript('');
    setInterimText('');
    setError(null);

    try {
      recognition.start();
      console.log('▶️ start()');
    } catch (e) {
      console.error('start() erreur:', e);
    }
  }, [isListening, createRecognition]);

  const stop = useCallback(() => {
    console.log('⏹️ stop()');
    shouldRestartRef.current = false;
    try { recognitionRef.current?.stop(); } catch (e) {}
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  const reset = useCallback(() => {
    shouldRestartRef.current = false;
    try { recognitionRef.current?.abort(); } catch (e) {}
    setTranscript('');
    setInterimText('');
    setError(null);
    setIsListening(false);
    allTextRef.current   = '';
    finalTextRef.current = '';
  }, []);

  return {
    isListening, transcript, interimText,
    error, supported,
    start, stop, toggle, reset,
  };
}