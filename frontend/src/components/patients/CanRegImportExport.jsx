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
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)',
          fontSize: 13, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'var(--font-body)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
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
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            animation: 'slideUp 0.25s ease',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          }}>

            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
                  CanReg5 — Import / Export
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Interopérabilité avec le logiciel CanReg5
                </p>
              </div>
              <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            {/* Onglets Import / Export */}
            {step === STEPS.SELECT && (
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                {[
                  { key: 'import', label: 'Importer depuis CanReg5', icon: <UploadIcon size={15} /> },
                  { key: 'export', label: 'Exporter vers CanReg5',   icon: <DownloadIcon size={15} /> },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setMode(tab.key)} style={{
                    flex: 1, padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    background: mode === tab.key ? 'var(--accent-dim)' : 'transparent',
                    border: 'none', borderBottom: mode === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                    color: mode === tab.key ? 'var(--accent)' : 'var(--text-muted)',
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
                      border: `2px dashed ${isDragging ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border-light)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '40px 24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDragging ? 'var(--accent-dim)' : file ? 'rgba(0,229,160,0.05)' : 'var(--bg-elevated)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                      onChange={e => setFile(e.target.files[0])} />

                    {file ? (
                      <>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>{file.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {(file.size / 1024).toFixed(1)} KB — Cliquez pour changer
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}><UploadIcon size={32} /></div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                          Glissez votre fichier CanReg5 ici
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
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
                    borderRadius: 'var(--radius-md)', fontSize: 12.5,
                    color: 'var(--text-secondary)', lineHeight: 1.7,
                  }}>
                    <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                      📋 Comment exporter depuis CanReg5 ?
                    </strong>
                    CanReg5 → <strong>File</strong> → <strong>Export</strong> → <strong>Export data as flat file (CSV)</strong>
                    → Sélectionner tous les champs → Enregistrer → Importer ici.
                  </div>

                  <button
                    onClick={handlePreview}
                    disabled={!file || loading}
                    style={{
                      width: '100%', marginTop: 16, padding: '12px',
                      background: file ? 'linear-gradient(135deg, #00a8ff, #0080cc)' : 'var(--bg-elevated)',
                      border: '1px solid ' + (file ? 'transparent' : 'var(--border)'),
                      borderRadius: 'var(--radius-md)',
                      color: file ? '#fff' : 'var(--text-muted)',
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
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Exporter tous les patients
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
                    Génère un fichier CSV au format CanReg5 contenant tous les patients
                    et leurs diagnostics enregistrés dans notre application.
                  </p>

                  <div style={{
                    padding: '14px 16px', marginBottom: 24,
                    background: 'rgba(0,229,160,0.06)',
                    border: '1px solid rgba(0,229,160,0.15)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12.5, color: 'var(--text-secondary)',
                    textAlign: 'left', lineHeight: 1.7,
                  }}>
                    <strong style={{ color: 'var(--success)', display: 'block', marginBottom: 6 }}>
                      📋 Comment importer dans CanReg5 ?
                    </strong>
                    CanReg5 → <strong>File</strong> → <strong>Import</strong> → <strong>Import from flat file (CSV)</strong>
                    → Sélectionner le fichier téléchargé → Valider le mapping → Importer.
                  </div>

                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    style={{
                      width: '100%', padding: '12px',
                      background: 'linear-gradient(135deg, #00e5a0, #00b38a)',
                      border: 'none', borderRadius: 'var(--radius-md)',
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
                      { label: 'Total lignes',  value: preview.total,    color: '#00a8ff' },
                      { label: 'Valides',        value: preview.valides,  color: '#00e5a0' },
                      { label: 'Invalides',      value: preview.invalides, color: '#ff4d6a' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        padding: '14px', textAlign: 'center',
                        background: 'var(--bg-elevated)',
                        border: `1px solid ${s.color}25`,
                        borderRadius: 'var(--radius-md)',
                        borderTop: `3px solid ${s.color}`,
                      }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tableau aperçu */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Aperçu — {preview.apercu_limite} première(s) ligne(s)
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                          {['#', 'Statut', 'Nom', 'Prénom', 'Naissance', 'Sexe', 'Wilaya', 'Topographie', 'Date diag'].map(h => (
                            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.apercu.map((row, i) => (
                          <tr key={i} style={{
                            borderBottom: i < preview.apercu.length - 1 ? '1px solid var(--border)' : 'none',
                            background: !row.valide ? 'rgba(255,77,106,0.04)' : 'transparent',
                          }}>
                            <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>{row.ligne}</td>
                            <td style={{ padding: '9px 12px' }}>
                              {row.valide
                                ? <span style={{ color: '#00e5a0', fontSize: 11, fontWeight: 600 }}>✓ OK</span>
                                : <span style={{ color: '#ff4d6a', fontSize: 11, fontWeight: 600 }} title={row.erreurs.join(', ')}>✗ Erreur</span>}
                            </td>
                            <td style={{ padding: '9px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>{row.patient?.nom || '—'}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{row.patient?.prenom || '—'}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{row.patient?.date_naissance || '—'}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{row.patient?.sexe || '—'}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{row.patient?.wilaya || '—'}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{row.diagnostic?.topographie_code || '—'}</td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{row.diagnostic?.date_diagnostic || '—'}</td>
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
                    {result.erreurs === 0 ? '🎉' : '⚠️'}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
                    Import terminé
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Patients créés',     value: result.crees,            color: '#00e5a0' },
                      { label: 'Avec diagnostic',    value: result.avec_diagnostic,  color: '#9b8afb' },
                      { label: 'Doublons', value: result.doublons, color: '#f5a623' },
                      { label: 'Erreurs',  value: result.erreurs,  color: '#ff4d6a' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        padding: '14px', textAlign: 'center',
                        background: 'var(--bg-elevated)',
                        border: `1px solid ${s.color}25`,
                        borderRadius: 'var(--radius-md)',
                        borderTop: `3px solid ${s.color}`,
                      }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={close} style={{
                    padding: '11px 32px',
                    background: 'linear-gradient(135deg, #00a8ff, #0080cc)',
                    border: 'none', borderRadius: 'var(--radius-md)',
                    color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Fermer et voir les patients
                  </button>
                </div>
              )}
            </div>

            {/* Footer — boutons navigation */}
            {step === STEPS.PREVIEW && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(STEPS.SELECT)} style={{
                  flex: '0 0 110px', padding: '11px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>← Retour</button>
                <button onClick={handleImport} disabled={loading || preview.valides === 0} style={{
                  flex: 1, padding: '11px',
                  background: preview.valides > 0
                    ? 'linear-gradient(135deg, #00e5a0, #00b38a)'
                    : 'var(--bg-elevated)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  color: preview.valides > 0 ? '#fff' : 'var(--text-muted)',
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

function Spinner({ color = 'var(--accent)' }) {
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