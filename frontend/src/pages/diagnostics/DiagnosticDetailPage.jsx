import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { diagnosticService } from '../../services/diagnosticService';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';
import usePermissions from '../../hooks/usePermissions';
import useAuthStore from '../../hooks/useAuth';

/* ── Mêmes sections que dans le sidebar du dossier patient (PatientDossierPage.js) ── */
const PATIENT_SECTIONS = [
  { key: 'identite',    label: 'Identité & Profil'  },
  { key: 'clinique',    label: 'Infos Cliniques'    },
  { key: 'diagnostic',  label: 'Diagnostic'         },
  { key: 'examens',     label: 'Examens & Bilans'   },
  { key: 'traitements', label: 'Traitements'        },
  { key: 'suivi',       label: 'Suivi Clinique'     },
  { key: 'rcp',         label: 'RCP'                },
  { key: 'rendezvous',  label: 'Rendez-vous'        },
];

/* ─────────────────────────────────────────────────────────────────────────────
   IMPORTANT — méthodes de service attendues
   ─────────────────────────────────────────────────────────────────────────────
   Cette page suppose que `diagnosticService` expose, en plus de `.list()` et
   `.stats()` déjà utilisés dans DiagnosticsPage.js, les méthodes suivantes.
   Si elles n'existent pas encore, ajoutez-les dans services/diagnosticService.js
   sur le même modèle :

     get:    (id) => api.get(`/diagnostics/${id}/`),
     update: (id, payload) => api.patch(`/diagnostics/${id}/`, payload),
     delete: (id) => api.delete(`/diagnostics/${id}/`),

   Adaptez l'URL exacte à celle utilisée par vos autres endpoints diagnostic.
───────────────────────────────────────────────────────────────────────────── */

/* ── Mêmes tables de configuration que DiagnosticsPage.js ── */
const STADE_COLORS = {
  '0':    { bg: 'rgba(0,229,160,0.1)',   color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'I':    { bg: 'rgba(0,229,160,0.12)',  color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'IA':   { bg: 'rgba(0,229,160,0.12)',  color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'IB':   { bg: 'rgba(0,229,160,0.12)',  color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'II':   { bg: 'rgba(245,166,35,0.12)', color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  'IIA':  { bg: 'rgba(245,166,35,0.12)', color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  'IIB':  { bg: 'rgba(245,166,35,0.12)', color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  'III':  { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIA': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIB': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIC': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IV':   { bg: 'rgba(255,77,106,0.12)', color: '#dc2626', border: 'rgba(255,77,106,0.3)' },
  'U':    { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: 'rgba(107,114,128,0.2)' },
};
const STADE_OPTIONS = ['0','I','IA','IB','II','IIA','IIB','IIC','III','IIIA','IIIB','IIIC','IV','U'];

/* ─────────────────────────────────────────────────────────────────────────────
   MICRO-COMPONENTS — repris du langage visuel commun (PatientDossierPage / RendezVousDetailPage)
───────────────────────────────────────────────────────────────────────────── */
function StageBadge({ stade, label, big }) {
  const c = STADE_COLORS[stade] || STADE_COLORS['U'];
  return (
    <span style={{
      padding: big ? '5px 14px' : '3px 10px', borderRadius: 20, fontSize: big ? 13 : 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontFamily: 'var(--font-mono)',
    }}>{label || stade}</span>
  );
}

function TNMBadge({ tnm, big }) {
  if (!tnm || tnm === '—') return <span style={{ color: '#64748b', fontSize: 12 }}>—</span>;
  return (
    <span style={{
      padding: big ? '5px 14px' : '2px 8px', borderRadius: big ? 20 : 6, fontSize: big ? 13 : 11,
      background: 'rgba(0,168,255,0.08)',
      border: '1px solid rgba(0,168,255,0.2)',
      color: '#2563eb', fontFamily: 'var(--font-mono)', fontWeight: 700,
    }}>{tnm}</span>
  );
}

function SectionLabel({ children, style: s }) {
  return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', marginBottom: 12, ...s }}>{children}</div>;
}
function Grid({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>{children}</div>; }
function InfoRow({ label, value, mono, full }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(37,99,235,0.12)', gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13.5, color: '#0f172a', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL — Confirmation de suppression (même design que RendezVousDetailPage)
───────────────────────────────────────────────────────────────────────────── */
function DeleteConfirmModal({ diag, onClose, onConfirm, loading }) {
  const overlayRef = useRef(null);
  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };

  return (
    <div ref={overlayRef} onClick={handleOverlay} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn .15s ease',
    }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(220,38,38,0.18)', overflow: 'hidden', animation: 'slideUp .2s ease' }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#ef4444,#dc2626)' }} />
        <div style={{ padding: '28px 28px 24px' }}>
          <div style={{ width: 52, height: 52, background: 'rgba(220,38,38,0.08)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid rgba(220,38,38,0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Supprimer ce diagnostic ?</div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 6 }}>
            Vous êtes sur le point de supprimer définitivement le diagnostic de :
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{diag?.patient_nom || 'Patient'}</div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              {diag?.diagnostic_resume || diag?.topographie_libelle || '—'}
              {diag?.date_diagnostic ? ` · ${new Date(diag.date_diagnostic).toLocaleDateString('fr-DZ')}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(37,99,235,0.2)', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: loading ? .5 : 1 }}>Annuler</button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: loading ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
            >
              {loading ? (
                <><span style={{ width: 13, height: 13, border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> Suppression…</>
              ) : 'Supprimer définitivement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function DiagnosticDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { user } = useAuthStore();
  const isSecretary = user?.role === 'secretaire';

  const [diag, setDiag]         = useState(null);
  const [patient, setPatient]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);

  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchDiag = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      let data;
      if (typeof diagnosticService.get === 'function') {
        const res = await diagnosticService.get(id);
        data = res.data;
      } else {
        // Repli si la méthode dédiée n'existe pas encore côté service.
        const res = await diagnosticService.list({});
        const list = res.data?.results || res.data || [];
        data = list.find(d => String(d.id) === String(id));
      }
      if (!data) { setNotFound(true); return; }
      setDiag(data);
      if (data.patient) {
        patientService.get(data.patient).then(res => setPatient(res.data)).catch(() => {});
      }
    } catch (err) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDiag(); }, [fetchDiag]);

  /* ── Sections du sidebar patient (mêmes règles de visibilité que PatientDossierPage) ── */
  const visiblePatientSections = PATIENT_SECTIONS.filter((section) => {
    if (isSecretary) return section.key === 'identite' || section.key === 'rendezvous';
    return {
      identite: can.readPatient,
      clinique: can.writeDiagnostic,
      diagnostic: can.readDiagnostic,
      examens: can.readDiagnostic,
      traitements: can.readTreatment,
      suivi: can.accessClinicalFollowup,
      rcp: can.viewRcp,
      rendezvous: can.manageAppointments,
    }[section.key];
  });

  const handleSectionSelect = (key) => {
    if (!diag?.patient) return;
    navigate(`/patients/${diag.patient}`, { state: { returnSection: key } });
  };

  // Version minimale du patient (à partir des champs dénormalisés du
  // diagnostic) tant que le patient complet n'est pas encore chargé, pour
  // éviter que le sidebar bascule du mode global au mode patient une fois
  // la requête terminée.
  const patientForSidebar = patient || (diag?.patient ? {
    id: diag.patient,
    nom: diag.patient_nom || '',
    prenom: '',
    full_name: diag.patient_nom || 'Patient',
    registration_number: diag.patient_numero || '',
  } : null);

  const openEdit = () => {
    setForm({
      date_diagnostic:      diag.date_diagnostic || '',
      categorie_cancer:     diag.categorie_cancer || '',
      topographie_code:     diag.topographie_code || '',
      topographie_libelle:  diag.topographie_libelle || '',
      morphologie_code:     diag.morphologie_code || '',
      morphologie_libelle:  diag.morphologie_libelle || '',
      tnm_complet:          diag.tnm_complet || '',
      stade_ajcc:           diag.stade_ajcc || '',
      grade:                diag.grade || diag.grade_label || '',
      base_diagnostic:      diag.base_diagnostic || diag.base_diag_label || '',
      diagnostic_resume:    diag.diagnostic_resume || '',
    });
    setEditMode(true);
  };

  const handleCancelEdit = () => { setEditMode(false); setForm({}); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (typeof diagnosticService.update !== 'function') {
        toast.error("La fonction de mise à jour n'est pas encore disponible côté service.");
        return;
      }
      await diagnosticService.update(id, form);
      toast.success('Diagnostic mis à jour');
      setEditMode(false);
      await fetchDiag();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await diagnosticService.delete(id);
      toast.success('Diagnostic supprimé avec succès');
      if (diag?.patient) navigate(`/patients/${diag.patient}`, { state: { returnSection: 'diagnostic' } });
      else navigate('/diagnostics');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Détail du diagnostic">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(37,99,235,0.12)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Chargement du diagnostic...
          </div>
        </div>
      </AppLayout>
    );
  }

  if (notFound || !diag) {
    return (
      <AppLayout title="Détail du diagnostic">
        <div style={{ padding: 64, textAlign: 'center', background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 16 }}>
          <div style={{ fontSize: 15, color: '#0f172a', fontWeight: 700, marginBottom: 6 }}>Diagnostic introuvable</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>Ce diagnostic n'existe plus ou a été supprimé.</div>
          <button onClick={() => navigate('/diagnostics')} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Retour à la liste des diagnostics
          </button>
        </div>
      </AppLayout>
    );
  }

  const stadeCfg = STADE_COLORS[diag.stade_ajcc] || STADE_COLORS['U'];
  const localisation = diag.categorie_cancer === 'liquide' ? 'HEMATO' : diag.topographie_code;

  const patientContext = patientForSidebar ? {
    patient: patientForSidebar,
    sections: visiblePatientSections,
    activeKey: 'diagnostic',
    onSelect: handleSectionSelect,
    backPath: `/patients/${diag.patient}`,
    backLabel: 'Retour au dossier patient',
  } : undefined;

  return (
    <AppLayout
      title="Détail du diagnostic"
      patientContext={patientContext}
      breadcrumb={[
        { label: 'Diagnostics', onClick: () => navigate('/diagnostics') },
        { label: diag.patient_nom || 'Diagnostic' },
      ]}
    >
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .input-st { width: 100%; padding: 9px 12px; background: #f1f5f9; border: 1px solid rgba(37,99,235,0.15); border-radius: 9px; color: #0f172a; font-size: 13px; outline: none; box-sizing: border-box; font-family: var(--font-body); }
        .label-st { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; font-weight: 600; }
      `}</style>

      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 12.5, cursor: 'pointer', marginBottom: 14, padding: 0 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Retour
      </button>

      {/* ── En-tête ── */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${stadeCfg.color}, ${stadeCfg.color}aa)` }} />
        <div style={{ padding: '22px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <TNMBadge tnm={diag.tnm_complet} big />
              <StageBadge stade={diag.stade_ajcc} label={diag.stade_label} big />
              {diag.grade_label && (
                <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}>
                  Grade {diag.grade_label}
                </span>
              )}
            </div>
            {diag.patient ? (
              <Link to={`/patients/${diag.patient}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{diag.patient_nom || 'Patient'}</div>
              </Link>
            ) : (
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{diag.patient_nom || 'Patient'}</div>
            )}
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {diag.diagnostic_resume || diag.topographie_libelle || 'Diagnostic'}
              {diag.date_diagnostic ? ` — diagnostiqué le ${new Date(diag.date_diagnostic).toLocaleDateString('fr-DZ')}` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!editMode && can.writeDiagnostic && (
              <button onClick={openEdit} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                Modifier
              </button>
            )}
            {can.writeDiagnostic && (
              <button onClick={() => setShowDeleteModal(true)} style={{ padding: '8px 16px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, color: '#dc2626', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                Supprimer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 16, padding: 24 }}>
        {!editMode ? (
          <>
            <SectionLabel>Patient</SectionLabel>
            <Grid>
              <InfoRow label="Patient" value={diag.patient_nom} />
              <InfoRow label="N° dossier" value={diag.patient_numero} mono />
            </Grid>

            <SectionLabel style={{ marginTop: 28 }}>Localisation & Histologie</SectionLabel>
            <Grid>
              <InfoRow label="Catégorie" value={diag.categorie_cancer === 'liquide' ? 'Hémopathie maligne' : 'Tumeur solide'} />
              <InfoRow label="Code topographie (ICD-O-3)" value={localisation} mono />
              <InfoRow label="Libellé topographie" value={diag.topographie_libelle} full />
              <InfoRow label="Code morphologie" value={diag.morphologie_code} mono />
              <InfoRow label="Libellé morphologie" value={diag.morphologie_libelle} full />
            </Grid>

            <SectionLabel style={{ marginTop: 28 }}>Stadification</SectionLabel>
            <Grid>
              <InfoRow label="TNM complet" value={diag.tnm_complet} mono />
              <InfoRow label="Stade AJCC" value={diag.stade_label || diag.stade_ajcc} />
              <InfoRow label="Grade histologique" value={diag.grade_label || diag.grade} />
              <InfoRow label="Base du diagnostic" value={diag.base_diag_label || diag.base_diagnostic} />
            </Grid>

            <SectionLabel style={{ marginTop: 28 }}>Diagnostic</SectionLabel>
            <Grid>
              <InfoRow label="Date du diagnostic" value={diag.date_diagnostic ? new Date(diag.date_diagnostic).toLocaleDateString('fr-DZ') : '—'} />
              <InfoRow label="Enregistré le" value={diag.date_creation ? new Date(diag.date_creation).toLocaleString('fr-DZ') : '—'} />
              {diag.diagnostic_resume && <InfoRow label="Résumé du diagnostic" value={diag.diagnostic_resume} full />}
            </Grid>

            {diag.patient && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(37,99,235,0.12)' }}>
                <Link to={`/patients/${diag.patient}`} style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 12, color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Voir le dossier patient
                  </button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <SectionLabel>Modifier le diagnostic</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Date du diagnostic</label>
                <input type="date" className="input-st" value={form.date_diagnostic || ''} onChange={e => setForm({ ...form, date_diagnostic: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Catégorie</label>
                <select className="input-st" value={form.categorie_cancer || ''} onChange={e => setForm({ ...form, categorie_cancer: e.target.value })} style={{ cursor: 'pointer' }}>
                  <option value="">— Sélectionner —</option>
                  <option value="solide">Tumeur solide</option>
                  <option value="liquide">Hémopathie maligne</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Code topographie (ICD-O-3)</label>
                <input className="input-st" value={form.topographie_code || ''} onChange={e => setForm({ ...form, topographie_code: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Libellé topographie</label>
                <input className="input-st" value={form.topographie_libelle || ''} onChange={e => setForm({ ...form, topographie_libelle: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Code morphologie</label>
                <input className="input-st" value={form.morphologie_code || ''} onChange={e => setForm({ ...form, morphologie_code: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Libellé morphologie</label>
                <input className="input-st" value={form.morphologie_libelle || ''} onChange={e => setForm({ ...form, morphologie_libelle: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">TNM complet</label>
                <input className="input-st" placeholder="ex: T2N1M0" value={form.tnm_complet || ''} onChange={e => setForm({ ...form, tnm_complet: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Stade AJCC</label>
                <select className="input-st" value={form.stade_ajcc || ''} onChange={e => setForm({ ...form, stade_ajcc: e.target.value })} style={{ cursor: 'pointer' }}>
                  <option value="">— Sélectionner —</option>
                  {STADE_OPTIONS.map(s => <option key={s} value={s}>{s === 'U' ? 'Inconnu' : `Stade ${s}`}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Grade histologique</label>
                <input className="input-st" value={form.grade || ''} onChange={e => setForm({ ...form, grade: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Base du diagnostic</label>
                <input className="input-st" value={form.base_diagnostic || ''} onChange={e => setForm({ ...form, base_diagnostic: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16, gridColumn: '1 / -1' }}>
                <label className="label-st">Résumé du diagnostic</label>
                <textarea className="input-st" rows={3} style={{ resize: 'vertical' }} value={form.diagnostic_resume || ''} onChange={e => setForm({ ...form, diagnostic_resume: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 20, borderTop: '1px solid rgba(37,99,235,0.12)', justifyContent: 'flex-end' }}>
              <button onClick={handleCancelEdit} disabled={saving} style={{ padding: '10px 20px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 12, color: '#334155', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 26px', background: saving ? 'rgba(37,99,235,0.12)' : 'linear-gradient(135deg,#16a34a,#00b38a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <DeleteConfirmModal
          diag={diag}
          loading={deleteLoading}
          onClose={() => !deleteLoading && setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AppLayout>
  );
}