/**
 * hooks/useVoiceToForm.js
 * Version proxy Django — la clé API reste sécurisée côté serveur.
 */

import { useState, useCallback } from 'react';

export default function useVoiceToForm(formType = 'patient') {
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastResult,   setLastResult]   = useState(null);
  const [extractError, setExtractError] = useState(null);

  const extractFields = useCallback(async (transcript) => {
    if (!transcript?.trim()) return {};

    setIsExtracting(true);
    setExtractError(null);

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch('/api/v1/voice/extract/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          transcript: transcript,
          form_type:  formType,
        }),
      });

      if (!response.ok) {
        // try to read error text from backend to help debugging
        let errText = '';
        try { errText = await response.text(); } catch {}
        throw new Error(`Erreur serveur: ${response.status} ${errText}`);
      }

      const data   = await response.json();
      const fields = data.fields || {};

      if (data.error && Object.keys(fields).length === 0) {
        throw new Error(data.error);
      }

      setLastResult({ transcript, fields, timestamp: new Date() });
      return fields;

    } catch (err) {
      const msg = err.message.includes('JSON')
        ? 'Extraction impossible — essayez de dicter plus clairement.'
        : `Erreur : ${err.message}`;
      setExtractError(msg);
      return {};
    } finally {
      setIsExtracting(false);
    }
  }, [formType]);

  return { extractFields, isExtracting, lastResult, extractError };
}

export function mergeExtractedFields(currentData, extractedFields, setData) {
  if (!extractedFields || Object.keys(extractedFields).length === 0) return;
  setData(prev => ({ ...prev, ...extractedFields }));
}