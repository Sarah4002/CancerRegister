import React, { useState } from 'react';
import { CATEGORIES_EXAMENS, EXAMENS_PREDEFINIS } from '../../utils/examensDataset';
import { examenService } from '../../services/examenService';

export default function ExamenModal({ patientId, examen, onClose, onSuccess }) {
  const [categorie, setCategorie] = useState(examen?.categorie || CATEGORIES_EXAMENS[0].value);
  const [nomExamen, setNomExamen] = useState(examen?.nom_examen || '');
  const [datePrescription, setDatePrescription] = useState(examen?.date_prescription || new Date().toISOString().split('T')[0]);
  const [resultat, setResultat] = useState(examen?.resultat || '');
  const [dateRealisation, setDateRealisation] = useState(examen?.date_realisation || new Date().toISOString().split('T')[0]);
  const [fichier, setFichier] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nomExamen) {
      alert("Veuillez sélectionner un examen.");
      return;
    }
    
    setSubmitting(true);
    try {
      const hasResult = Boolean(resultat.trim() || fichier);
      const payload = new FormData();
      if (examen) {
        payload.append('resultat', resultat);
        payload.append('statut', hasResult ? 'resultat_disponible' : (examen.statut || 'prescrit'));
        if (hasResult) payload.append('date_realisation', dateRealisation);
        if (fichier) payload.append('fichier_resultat', fichier);
        await examenService.update(examen.id, payload);
      } else {
        payload.append('patient', patientId);
        payload.append('categorie', categorie);
        payload.append('nom_examen', nomExamen);
        payload.append('date_prescription', datePrescription);
        payload.append('resultat', resultat);
        payload.append('statut', hasResult ? 'resultat_disponible' : 'prescrit');
        if (hasResult) payload.append('date_realisation', dateRealisation);
        if (fichier) payload.append('fichier_dicom', fichier);
        await examenService.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de l'examen ou de son résultat.");
    } finally {
      setSubmitting(false);
    }
  };

  const availableExams = EXAMENS_PREDEFINIS[categorie] || [];

  return (
    <div style={overlaySt}>
      <div style={modalSt}>
        <div style={headerSt}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{examen ? 'Mettre à jour un examen' : 'Demander un examen'}</h3>
          <button onClick={onClose} style={closeBtnSt}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} style={bodySt}>
          <div style={fieldSt}>
            <label style={labelSt}>Catégorie</label>
            <select 
              value={categorie}
              disabled={Boolean(examen)}
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
              disabled={Boolean(examen)}
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
              disabled={Boolean(examen)}
              required
            />
          </div>

          <div style={fieldSt}>
            <label style={labelSt}>Résultat (laisser vide si en attente)</label>
            <textarea
              value={resultat}
              onChange={e => setResultat(e.target.value)}
              rows={4}
              placeholder="Conclusion ou résultat de l'examen..."
              style={inputSt}
            />
          </div>

          {examen && <div style={fieldSt}>
            <label style={labelSt}>Date de réalisation</label>
            <input type="date" value={dateRealisation} onChange={e => setDateRealisation(e.target.value)} style={inputSt} />
          </div>}

          <div style={fieldSt}>
            <label style={labelSt}>{examen ? 'Importer le compte rendu ou les images' : 'Joindre un document à la demande'}</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.dcm,.doc,.docx" onChange={e => setFichier(e.target.files?.[0] || null)} style={inputSt} />
            {fichier && <small style={{ display:'block', marginTop:5, color:'var(--text-muted, #888)' }}>{fichier.name}</small>}
            {examen?.fichier_resultat && <a href={examen.fichier_resultat} target="_blank" rel="noreferrer" style={{ display:'inline-block', marginTop:7, color:'#60a5fa', fontSize:12 }}>Ouvrir le fichier de résultat actuel</a>}
            {examen?.fichier_dicom_url && <a href={examen.fichier_dicom_url} target="_blank" rel="noreferrer" style={{ display:'inline-block', marginTop:7, color:'#60a5fa', fontSize:12 }}>Ouvrir le document joint à la demande</a>}
          </div>

          <div style={footerSt}>
            <button type="button" onClick={onClose} style={btnCancelSt}>Annuler</button>
            <button type="submit" disabled={submitting} style={btnSubmitSt}>
              {submitting ? 'Enregistrement...' : examen ? 'Enregistrer' : 'Demander l’examen'}
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
