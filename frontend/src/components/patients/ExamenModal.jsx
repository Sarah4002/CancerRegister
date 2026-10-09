
import React, { useState } from 'react';
import {
  CATEGORIES_EXAMENS,
  EXAMENS_PREDEFINIS
} from '../../utils/examensDataset';
import { examenService } from '../../services/examenService';

export default function ExamenModal({
  patientId,
  examen,
  onClose,
  onSuccess
}) {
  const [categorie, setCategorie] = useState(
    examen?.categorie || CATEGORIES_EXAMENS[0].value
  );

  const [nomExamen, setNomExamen] = useState(
    examen?.nom_examen || ''
  );

  const [datePrescription, setDatePrescription] = useState(
    examen?.date_prescription ||
      new Date().toISOString().split('T')[0]
  );

  const [resultat, setResultat] = useState(
    examen?.resultat || ''
  );

  const [dateRealisation, setDateRealisation] = useState(
    examen?.date_realisation ||
      new Date().toISOString().split('T')[0]
  );

  const [fichier, setFichier] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nomExamen) {
      alert('Veuillez sélectionner un examen.');
      return;
    }

    setSubmitting(true);

    try {
      const hasResult = Boolean(resultat.trim() || fichier);
      const payload = new FormData();

      if (examen) {
        payload.append('resultat', resultat);

        payload.append(
          'statut',
          hasResult
            ? 'resultat_disponible'
            : examen.statut || 'prescrit'
        );

        if (hasResult) {
          payload.append('date_realisation', dateRealisation);
        }

        if (fichier) {
          payload.append('fichier_resultat', fichier);
        }

        await examenService.update(examen.id, payload);
      } else {
        payload.append('patient', patientId);
        payload.append('categorie', categorie);
        payload.append('nom_examen', nomExamen);
        payload.append('date_prescription', datePrescription);
        payload.append('resultat', resultat);

        payload.append(
          'statut',
          hasResult ? 'resultat_disponible' : 'prescrit'
        );

        if (hasResult) {
          payload.append('date_realisation', dateRealisation);
        }

        if (fichier) {
          payload.append('fichier_dicom', fichier);
        }

        await examenService.create(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(
        "Erreur lors de l'enregistrement de l'examen ou de son résultat."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const availableExams = EXAMENS_PREDEFINIS[categorie] || [];

  return (
    <div style={overlaySt}>
      <div
        style={modalSt}
        role="dialog"
        aria-modal="true"
        aria-labelledby="examen-modal-title"
      >
        {/* En-tête */}
        <div style={headerSt}>
          <h3
            id="examen-modal-title"
            style={titleSt}
          >
            {examen
              ? 'Mettre à jour un examen'
              : 'Demander un examen'}
          </h3>

          <button
            type="button"
            onClick={onClose}
            style={closeBtnSt}
            aria-label="Fermer la fenêtre"
          >
            &times;
          </button>
        </div>

        {/* Formulaire défilant */}
        <form onSubmit={handleSubmit} style={bodySt}>
          <div style={fieldSt}>
            <label htmlFor="examen-categorie" style={labelSt}>
              Catégorie
            </label>

            <select
              id="examen-categorie"
              value={categorie}
              disabled={Boolean(examen)}
              onChange={(e) => {
                setCategorie(e.target.value);
                setNomExamen('');
              }}
              style={inputSt}
            >
              {CATEGORIES_EXAMENS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldSt}>
            <label htmlFor="examen-nom" style={labelSt}>
              Examen
            </label>

            <select
              id="examen-nom"
              value={nomExamen}
              disabled={Boolean(examen)}
              onChange={(e) => setNomExamen(e.target.value)}
              style={inputSt}
              required
            >
              <option value="">-- Sélectionnez --</option>

              {availableExams.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldSt}>
            <label htmlFor="examen-date-prescription" style={labelSt}>
              Date de prescription
            </label>

            <input
              id="examen-date-prescription"
              type="date"
              value={datePrescription}
              onChange={(e) => setDatePrescription(e.target.value)}
              style={inputSt}
              disabled={Boolean(examen)}
              required
            />
          </div>

          <div style={fieldSt}>
            <label htmlFor="examen-resultat" style={labelSt}>
              Résultat (laisser vide si en attente)
            </label>

            <textarea
              id="examen-resultat"
              value={resultat}
              onChange={(e) => setResultat(e.target.value)}
              rows={4}
              placeholder="Conclusion ou résultat de l'examen..."
              style={textareaSt}
            />
          </div>

          {examen && (
            <div style={fieldSt}>
              <label
                htmlFor="examen-date-realisation"
                style={labelSt}
              >
                Date de réalisation
              </label>

              <input
                id="examen-date-realisation"
                type="date"
                value={dateRealisation}
                onChange={(e) => setDateRealisation(e.target.value)}
                style={inputSt}
              />
            </div>
          )}

          <div style={fieldSt}>
            <label htmlFor="examen-fichier" style={labelSt}>
              {examen
                ? 'Importer le compte rendu ou les images'
                : 'Joindre un document à la demande'}
            </label>

            <input
              id="examen-fichier"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.dcm,.doc,.docx"
              onChange={(e) =>
                setFichier(e.target.files?.[0] || null)
              }
              style={fileInputSt}
            />

            {fichier && (
              <small style={fileNameSt}>
                Fichier sélectionné : {fichier.name}
              </small>
            )}

            {examen?.fichier_resultat && (
              <a
                href={examen.fichier_resultat}
                target="_blank"
                rel="noreferrer"
                style={fileLinkSt}
              >
                Ouvrir le fichier de résultat actuel
              </a>
            )}

            {examen?.fichier_dicom_url && (
              <a
                href={examen.fichier_dicom_url}
                target="_blank"
                rel="noreferrer"
                style={fileLinkSt}
              >
                Ouvrir le document joint à la demande
              </a>
            )}
          </div>

          {/* Actions toujours visibles en bas */}
          <div style={footerSt}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={btnCancelSt}
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                ...btnSubmitSt,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'wait' : 'pointer'
              }}
            >
              {submitting
                ? 'Enregistrement...'
                : examen
                  ? 'Enregistrer'
                  : 'Demander l’examen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Styles responsive */

const overlaySt = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12,
  boxSizing: 'border-box',
  zIndex: 9999,
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)'
};

const modalSt = {
  background: 'var(--bg-elevated, #1e1e2e)',
  color: 'var(--text-primary, #fff)',
  width: '100%',
  maxWidth: 520,
  maxHeight: 'calc(100vh - 24px)',
  maxHeight: 'calc(100dvh - 24px)',
  borderRadius: 'var(--radius-lg, 12px)',
  border: '1px solid var(--border, #333)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  boxSizing: 'border-box'
};

const headerSt = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border, #333)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexShrink: 0
};

const titleSt = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.4,
  fontWeight: 600,
  overflowWrap: 'anywhere'
};

const closeBtnSt = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted, #888)',
  fontSize: 26,
  cursor: 'pointer',
  lineHeight: 1,
  padding: '2px 4px',
  flexShrink: 0
};

const bodySt = {
  padding: '20px',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
  minHeight: 0,
  flex: '1 1 auto',
  boxSizing: 'border-box'
};

const fieldSt = {
  marginBottom: 16,
  minWidth: 0
};

const labelSt = {
  display: 'block',
  fontSize: 13,
  color: 'var(--text-secondary, #aaa)',
  marginBottom: 6,
  fontWeight: 500,
  lineHeight: 1.5
};

const inputSt = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  minHeight: 42,
  padding: '10px 12px',
  background: 'var(--bg-card, #2a2a3c)',
  border: '1px solid var(--border, #333)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text-primary, #fff)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box'
};

const textareaSt = {
  ...inputSt,
  minHeight: 100,
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.5
};

const fileInputSt = {
  display: 'block',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  padding: '10px',
  background: 'var(--bg-card, #2a2a3c)',
  border: '1px solid var(--border, #333)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text-secondary, #aaa)',
  fontSize: 13,
  boxSizing: 'border-box'
};

const fileNameSt = {
  display: 'block',
  marginTop: 8,
  color: 'var(--text-muted, #aaa)',
  fontSize: 12,
  overflowWrap: 'anywhere'
};

const fileLinkSt = {
  display: 'block',
  marginTop: 8,
  color: 'var(--accent, #60a5fa)',
  fontSize: 12,
  lineHeight: 1.5,
  overflowWrap: 'anywhere'
};

const footerSt = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 24,
  paddingTop: 16,
  borderTop: '1px solid var(--border, #333)'
};

const btnCancelSt = {
  padding: '10px 16px',
  minHeight: 40,
  background: 'transparent',
  border: '1px solid var(--border, #333)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text-secondary, #aaa)',
  cursor: 'pointer',
  fontSize: 14
};

const btnSubmitSt = {
  padding: '10px 16px',
  minHeight: 40,
  background: 'var(--accent, #2563eb)',
  border: 'none',
  borderRadius: 'var(--radius-md, 8px)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600
};

