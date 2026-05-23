import React, { useState } from 'react';
import { CATEGORIES_EXAMENS, EXAMENS_PREDEFINIS } from '../../utils/examensDataset';
import { examenService } from '../../services/examenService';

export default function ExamenModal({ patientId, onClose, onSuccess }) {
  const [categorie, setCategorie] = useState(CATEGORIES_EXAMENS[0].value);
  const [nomExamen, setNomExamen] = useState('');
  const [datePrescription, setDatePrescription] = useState(new Date().toISOString().split('T')[0]);
  // 1. Remplacement de l'état 'observations' par 'valeur'
  const [valeur, setValeur] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nomExamen) {
      alert("Veuillez sélectionner un examen.");
      return;
    }
    
    setSubmitting(true);
    try {
      await examenService.create({
        patient: patientId,
        categorie,
        nom_examen: nomExamen,
        date_prescription: datePrescription,
        // 2. Envoi de la propriété 'valeur' à la place d'observations
        valeur 
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la prescription de l'examen.");
    } finally {
      setSubmitting(false);
    }
  };

  const availableExams = EXAMENS_PREDEFINIS[categorie] || [];

  return (
    <div style={overlaySt}>
      <div style={modalSt}>
        <div style={headerSt}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Prescrire un examen</h3>
          <button onClick={onClose} style={closeBtnSt}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} style={bodySt}>
          <div style={fieldSt}>
            <label style={labelSt}>Catégorie</label>
            <select 
              value={categorie} 
              onChange={e => { setCategorie(e.target.value); setNomExamen(''); }} 
              style={inputSt}
            >
              {CATEGORIES_EXAMENS.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div style={fieldSt}>
            <label style={labelSt}>Examen</label>
            <select 
              value={nomExamen} 
              onChange={e => setNomExamen(e.target.value)} 
              style={inputSt}
              required
            >
              <option value="">-- Sélectionnez --</option>
              {availableExams.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          <div style={fieldSt}>
            <label style={labelSt}>Date de prescription</label>
            <input 
              type="date" 
              value={datePrescription} 
              onChange={e => setDatePrescription(e.target.value)} 
              style={inputSt}
              required
            />
          </div>

          {/* 3. Modification du bloc HTML/JSX pour le champ Valeur */}
          <div style={fieldSt}>
            <label style={labelSt}>Valeur (Optionnel)</label>
            <input 
              type="text" 
              value={valeur} 
              onChange={e => setValeur(e.target.value)} 
              placeholder="Ex: 120 mg/dL, Négatif..."
              style={inputSt}
            />
          </div>

          <div style={footerSt}>
            <button type="button" onClick={onClose} style={btnCancelSt}>Annuler</button>
            <button type="submit" disabled={submitting} style={btnSubmitSt}>
              {submitting ? 'Prescription...' : 'Prescrire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Styles
const overlaySt = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9999, backdropFilter: 'blur(2px)'
};
const modalSt = {
  background: 'var(--bg-elevated, #1e1e2e)',
  width: '100%', maxWidth: 450,
  borderRadius: 'var(--radius-lg, 12px)',
  border: '1px solid var(--border, #333)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  overflow: 'hidden',
  display: 'flex', flexDirection: 'column'
};
const headerSt = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border, #333)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  color: 'var(--text-primary, #fff)'
};
const closeBtnSt = {
  background: 'transparent', border: 'none', color: 'var(--text-muted, #888)',
  fontSize: 24, cursor: 'pointer', lineHeight: 1
};
const bodySt = { padding: '20px' };
const fieldSt = { marginBottom: '16px' };
const labelSt = {
  display: 'block', fontSize: 13, color: 'var(--text-secondary, #aaa)',
  marginBottom: 6, fontWeight: 500
};
const inputSt = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-card, #2a2a3c)',
  border: '1px solid var(--border, #333)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text-primary, #fff)',
  fontSize: 14, outline: 'none', boxSizing: 'border-box'
};
const footerSt = {
  display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24
};
const btnCancelSt = {
  padding: '8px 16px', background: 'transparent',
  border: '1px solid var(--border, #333)', borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text-secondary, #aaa)', cursor: 'pointer', fontSize: 14
};
const btnSubmitSt = {
  padding: '8px 16px', background: 'var(--accent, #2563eb)',
  border: 'none', borderRadius: 'var(--radius-md, 8px)',
  color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500
};