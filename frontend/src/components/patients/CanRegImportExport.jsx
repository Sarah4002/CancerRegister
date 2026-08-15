/**
 * components/patients/CanRegImportExport.jsx
 *
 * Modal Import / Export CanReg5
 * - Import : upload CSV → aperçu → confirmation → création patients
 * - Export : téléchargement CSV CanReg5 depuis notre base
 */

import { useState, useRef, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import toast from 'react-hot-toast';

// ── Icônes ───────────────────────────────────────────────────
function UploadIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}
function DownloadIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

// ── Étapes ───────────────────────────────────────────────────
const STEPS = { SELECT: 'select', PREVIEW: 'preview', RESULT: 'result' };

// ── Composant principal ───────────────────────────────────────
export default function CanRegImportExport({ onImportDone }) {
  const [open,         setOpen]         = useState(false);
  const [mode,         setMode]         = useState('import'); // 'import' | 'export'
  const [step,         setStep]         = useState(STEPS.SELECT);
  const [file,         setFile]         = useState(null);
  const [isDragging,   setIsDragging]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [preview,      setPreview]      = useState(null);   // résultat aperçu
  const [result,       setResult]       = useState(null);   // résultat import
  const [exporting,    setExporting]    = useState(false);
  const fileRef = useRef();

  const reset = () => {
    setStep(STEPS.SELECT);
    setFile(null);
    setPreview(null);
    setResult(null);
    setLoading(false);
  };

  const close = () => { setOpen(false); setTimeout(reset, 300); };

  // ── Drag & Drop ──────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) setFile(f);
    else toast.error('Seuls les fichiers .csv sont acceptés.');
  }, []);

  // ── Aperçu ───────────────────────────────────────────────
  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post('/exports/canreg/preview/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
      setStep(STEPS.PREVIEW);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la lecture du fichier.');
    } finally {
      setLoading(false);
    }
  };

  // ── Import confirmé ──────────────────────────────────────
  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post('/exports/canreg/import/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      setStep(STEPS.RESULT);
      toast.success(`${data.crees} patient(s) importé(s) avec succès !`);
      onImportDone?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'import.');
    } finally {
      setLoading(false);
    }
  };

  // ── Export ───────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await apiClient.get('/exports/canreg/export/', {
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `canreg5_export_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export CanReg5 téléchargé !');
    } catch {
      toast.error('Erreur lors de l\'export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      {/* Bouton déclencheur */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 16px',
          background: '#ffffff',
          border: '1px solid rgba(37,99,235,0.08)',
          borderRadius: '12px',
          color: '#334155',
          fontSize: 13, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'var(--font-body)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.08)'; e.currentTarget.style.color = '#334155'; }}
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        CanReg5
      </button>

      {/* Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, animation: 'fadeIn 0.2s ease',
        }} onClick={e => e.target === e.currentTarget && close()}>
          <style>{`
            @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
            @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
            @keyframes spin    { to { transform:rotate(360deg); } }
          `}</style>

          <div style={{
            width: '100%', maxWidth: step === STEPS.PREVIEW ? 860 : 540,
            background: '#ffffff',
            border: '1px solid rgba(37,99,235,0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
            animation: 'slideUp 0.25s ease',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          }}>

            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid rgba(37,99,235,0.12)',
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)', margin: 0 }}>
                  CanReg5 — Import / Export
                </h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                  Interopérabilité avec le logiciel CanReg5
                </p>
              </div>
              <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            {/* Onglets Import / Export */}
            {step === STEPS.SELECT && (
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(37,99,235,0.12)' }}>
                {[
                  { key: 'import', label: 'Importer depuis CanReg5', icon: <UploadIcon size={15} /> },
                  { key: 'export', label: 'Exporter vers CanReg5',   icon: <DownloadIcon size={15} /> },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setMode(tab.key)} style={{
                    flex: 1, padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    background: mode === tab.key ? 'rgba(37,99,235,0.08)' : 'transparent',
                    border: 'none', borderBottom: mode === tab.key ? '2px solid #2563eb' : '2px solid transparent',
                    color: mode === tab.key ? '#2563eb' : '#64748b',
                    fontSize: 13, fontWeight: mode === tab.key ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Contenu scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

              {/* ── STEP SELECT ── */}
              {step === STEPS.SELECT && mode === 'import' && (
                <div>
                  {/* Zone drag & drop */}
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current.click()}
                    style={{
                      border: `2px dashed ${isDragging ? '#2563eb' : file ? '#16a34a' : 'rgba(37,99,235,0.08)'}`,
                      borderRadius: '12px',
                      padding: '40px 24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDragging ? 'rgba(37,99,235,0.08)' : file ? 'rgba(0,229,160,0.05)' : '#f1f5f9',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                      onChange={e => setFile(e.target.files[0])} />

                    {file ? (
                      <>
                        <div style={{ fontSize: 32, marginBottom: 8 }}></div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#16a34a' }}>{file.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          {(file.size / 1024).toFixed(1)} KB — Cliquez pour changer
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ color: '#64748b', marginBottom: 12 }}><UploadIcon size={32} /></div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
                          Glissez votre fichier CanReg5 ici
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          ou cliquez pour sélectionner — Format .csv uniquement
                        </div>
                      </>
                    )}
                  </div>

                  {/* Instructions */}
                  <div style={{
                    marginTop: 16, padding: '14px 16px',
                    background: 'rgba(0,168,255,0.06)',
                    border: '1px solid rgba(0,168,255,0.15)',
                    borderRadius: '12px', fontSize: 12.5,
                    color: '#334155', lineHeight: 1.7,
                  }}>
                    <strong style={{ color: '#2563eb', display: 'block', marginBottom: 6 }}>
                      Comment exporter depuis CanReg5 ?
                    </strong>
                    CanReg5 → <strong>File</strong> → <strong>Export</strong> → <strong>Export data as flat file (CSV)</strong>
                    → Sélectionner tous les champs → Enregistrer → Importer ici.
                  </div>

                  <button
                    onClick={handlePreview}
                    disabled={!file || loading}
                    style={{
                      width: '100%', marginTop: 16, padding: '12px',
                      background: file ? 'linear-gradient(135deg, #2563eb, #2563eb)' : '#f1f5f9',
                      border: '1px solid ' + (file ? 'transparent' : 'rgba(37,99,235,0.12)'),
                      borderRadius: '12px',
                      color: file ? '#fff' : '#64748b',
                      fontSize: 13.5, fontWeight: 600,
                      cursor: file && !loading ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {loading
                      ? <><Spinner /> Analyse en cours...</>
                      : '→ Analyser le fichier'}
                  </button>
                </div>
              )}

              {/* ── STEP SELECT — EXPORT ── */}
              {step === STEPS.SELECT && mode === 'export' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}></div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                    Exporter tous les patients
                  </h3>
                  <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
                    Génère un fichier CSV au format CanReg5 contenant tous les patients
                    et leurs diagnostics enregistrés dans notre application.
                  </p>

                  <div style={{
                    padding: '14px 16px', marginBottom: 24,
                    background: 'rgba(0,229,160,0.06)',
                    border: '1px solid rgba(0,229,160,0.15)',
                    borderRadius: '12px',
                    fontSize: 12.5, color: '#334155',
                    textAlign: 'left', lineHeight: 1.7,
                  }}>
                    <strong style={{ color: '#16a34a', display: 'block', marginBottom: 6 }}>
                      Comment importer dans CanReg5 ?
                    </strong>
                    CanReg5 → <strong>File</strong> → <strong>Import</strong> → <strong>Import from flat file (CSV)</strong>
                    → Sélectionner le fichier téléchargé → Valider le mapping → Importer.
                  </div>

                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    style={{
                      width: '100%', padding: '12px',
                      background: 'linear-gradient(135deg, #16a34a, #00b38a)',
                      border: 'none', borderRadius: '12px',
                      color: '#fff', fontSize: 13.5, fontWeight: 600,
                      cursor: exporting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: exporting ? 0.7 : 1,
                    }}
                  >
                    {exporting
                      ? <><Spinner color="#fff" /> Export en cours...</>
                      : <><DownloadIcon size={16} /> Télécharger le fichier CanReg5</>}
                  </button>
                </div>
              )}

              {/* ── STEP PREVIEW ── */}
              {step === STEPS.PREVIEW && preview && (
                <div>
                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Total lignes',  value: preview.total,    color: '#2563eb' },
                      { label: 'Valides',        value: preview.valides,  color: '#16a34a' },
                      { label: 'Invalides',      value: preview.invalides, color: '#dc2626' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        padding: '14px', textAlign: 'center',
                        background: '#f1f5f9',
                        border: `1px solid ${s.color}25`,
                        borderRadius: '12px',
                        borderTop: `3px solid ${s.color}`,
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tableau aperçu */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Aperçu — {preview.apercu_limite} première(s) ligne(s)
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(37,99,235,0.12)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid rgba(37,99,235,0.12)' }}>
                          {['#', 'Statut', 'Nom', 'Prénom', 'Naissance', 'Sexe', 'Wilaya', 'Topographie', 'Date diag'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.apercu.map((row, i) => (
                          <tr key={i} style={{
                            borderBottom: i < preview.apercu.length - 1 ? '1px solid rgba(37,99,235,0.12)' : 'none',
                            background: !row.valide ? 'rgba(255,77,106,0.04)' : 'transparent',
                          }}>
                            <td style={{ padding: '9px 12px', color: '#64748b' }}>{row.ligne}</td>
                            <td style={{ padding: '9px 12px' }}>
                              {row.valide
                                ? <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>✓ OK</span>
                                : <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 600 }} title={row.erreurs.join(', ')}>✗ Erreur</span>}
                            </td>
                            <td style={{ padding: '9px 12px', fontWeight: 500, color: '#0f172a' }}>{row.patient?.nom || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#334155' }}>{row.patient?.prenom || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#334155' }}>{row.patient?.date_naissance || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#334155' }}>{row.patient?.sexe || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#334155' }}>{row.patient?.wilaya || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#334155' }}>{row.diagnostic?.topographie_code || '—'}</td>
                            <td style={{ padding: '9px 12px', color: '#334155' }}>{row.diagnostic?.date_diagnostic || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── STEP RESULT ── */}
              {step === STEPS.RESULT && result && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>
                    {result.erreurs === 0 ? '' : ''}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
                    Import terminé
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Patients créés',     value: result.crees,            color: '#16a34a' },
                      { label: 'Avec diagnostic',    value: result.avec_diagnostic,  color: '#7c3aed' },
                      { label: 'Doublons', value: result.doublons, color: '#d97706' },
                      { label: 'Erreurs',  value: result.erreurs,  color: '#dc2626' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        padding: '14px', textAlign: 'center',
                        background: '#f1f5f9',
                        border: `1px solid ${s.color}25`,
                        borderRadius: '12px',
                        borderTop: `3px solid ${s.color}`,
                      }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={close} style={{
                    padding: '11px 32px',
                    background: 'linear-gradient(135deg, #2563eb, #2563eb)',
                    border: 'none', borderRadius: '12px',
                    color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Fermer et voir les patients
                  </button>
                </div>
              )}
            </div>

            {/* Footer — boutons navigation */}
            {step === STEPS.PREVIEW && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(37,99,235,0.12)', display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(STEPS.SELECT)} style={{
                  flex: '0 0 110px', padding: '11px',
                  background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)',
                  borderRadius: '12px', color: '#334155',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>← Retour</button>
                <button onClick={handleImport} disabled={loading || preview.valides === 0} style={{
                  flex: 1, padding: '11px',
                  background: preview.valides > 0
                    ? 'linear-gradient(135deg, #16a34a, #00b38a)'
                    : '#f1f5f9',
                  border: 'none', borderRadius: '12px',
                  color: preview.valides > 0 ? '#fff' : '#64748b',
                  fontSize: 13.5, fontWeight: 600,
                  cursor: loading || preview.valides === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {loading
                    ? <><Spinner color="#fff" /> Import en cours...</>
                    : `✓ Confirmer l'import de ${preview.valides} patient(s)`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Spinner({ color = '#2563eb' }) {
  return (
    <div style={{
      width: 14, height: 14,
      border: `2px solid ${color}40`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}