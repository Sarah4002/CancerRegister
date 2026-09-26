import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { secretaryService } from '../../services/secretaryService';
import { medecinService } from '../../services/accountsService';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';
import useAuthStore from '../../hooks/useAuth';
import usePermissions from '../../hooks/usePermissions';

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
   Cette page suppose que `secretaryService` expose deux méthodes en plus de
   celles déjà utilisées dans RendezVousPage.js. Si elles n'existent pas encore,
   ajoutez-les dans services/secretaryService.js sur le même modèle que les
   autres appels (getRendezVous, updateStatut, deleteRendezVous) :

     getRendezVousById: (id) => api.get(`/secretaire/rendezvous/${id}/`),
     updateRendezVous:  (id, payload) => api.patch(`/secretaire/rendezvous/${id}/`, payload),

   Adaptez l'URL exacte à celle utilisée par vos autres endpoints RDV.
───────────────────────────────────────────────────────────────────────────── */

/* ── Mêmes tables de configuration que RendezVousPage.js, pour rester cohérent ── */
const STATUS_CFG = {
  confirme:   { bg:'rgba(37,99,235,0.08)',   color:'#2563eb', border:'rgba(37,99,235,0.2)',   label:'Confirmé' },
  en_attente: { bg:'rgba(217,119,6,0.08)',   color:'#d97706', border:'rgba(217,119,6,0.2)',   label:'En attente' },
  annule:     { bg:'rgba(220,38,38,0.08)',   color:'#dc2626', border:'rgba(220,38,38,0.2)',   label:'Annulé' },
  termine:    { bg:'rgba(22,163,74,0.08)',   color:'#16a34a', border:'rgba(22,163,74,0.2)',   label:'Terminé' },
  absent:     { bg:'rgba(100,116,139,0.08)', color:'#64748b', border:'rgba(100,116,139,0.2)', label:'Absent' },
};

const TYPE_CFG = {
  consultation: { color:'#2563eb', label:'Consultation' },
  suivi:        { color:'#0d9488', label:'Suivi' },
  chimio:       { color:'#7c3aed', label:'Chimiothérapie' },
  radiotherapie:{ color:'#9333ea', label:'Radiothérapie' },
  examen:       { color:'#0891b2', label:'Examen' },
  rcp:          { color:'#dc2626', label:'RCP' },
  chirurgie:    { color:'#d97706', label:'Chirurgie' },
  urgence:      { color:'#dc2626', label:'Urgence' },
  autre:        { color:'#64748b', label:'Autre' },
};

function isPastDue(rdv) {
  if (!rdv?.date || !rdv?.heure) return false;
  const dt = new Date(`${rdv.date}T${rdv.heure}:00`);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.getTime() < Date.now();
}

/* ─────────────────────────────────────────────────────────────────────────────
   MICRO-COMPONENTS — repris du langage visuel de PatientDossierPage.js
───────────────────────────────────────────────────────────────────────────── */
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

function StatusBadge({ statut }) {
  const c = STATUS_CFG[statut] || { bg:'rgba(100,116,139,0.08)', color:'#64748b', border:'rgba(100,116,139,0.2)', label:statut || '—' };
  return (
    <span style={{
      padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600,
      background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:'nowrap',
    }}>{c.label}</span>
  );
}

function TypeBadge({ type }) {
  const c = TYPE_CFG[type] || { color:'#64748b', label:type || '—' };
  return (
    <span style={{
      padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600,
      background:`${c.color}12`, color:c.color, border:`1px solid ${c.color}28`, whiteSpace:'nowrap',
    }}>{c.label}</span>
  );
}

/* Menu déroulant de changement de statut, même comportement que sur la liste */
function StatusChangeMenu({ statut, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(37,99,235,0.2)',
          background: '#fff', color: '#2563eb', fontSize: 12.5, fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        Changer le statut
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 50,
          background: '#fff', border: '1px solid rgba(37,99,235,0.14)',
          borderRadius: 10, boxShadow: '0 10px 28px rgba(15,23,42,0.14)',
          minWidth: 180, overflow: 'hidden',
        }}>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setOpen(false); if (key !== statut) onChange(key); }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 14px',
                fontSize: 12.5, fontWeight: statut === key ? 700 : 500, color: cfg.color,
                border: 'none', background: statut === key ? `${cfg.color}0c` : 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}10`; }}
              onMouseLeave={e => { e.currentTarget.style.background = statut === key ? `${cfg.color}0c` : 'transparent'; }}
            >
              {statut === key && <span style={{ fontSize: 10 }}>✓</span>}
              {cfg.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL — Confirmation de suppression (identique RendezVousPage.js)
───────────────────────────────────────────────────────────────────────────── */
function DeleteConfirmModal({ rdv, onClose, onConfirm, loading }) {
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
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Supprimer ce rendez-vous ?</div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 6 }}>
            Vous êtes sur le point de supprimer définitivement le rendez-vous de :
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{rdv?.patient_nom || 'Patient'}</div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
              {rdv?.date && new Date(`${rdv.date}T00:00:00`).toLocaleDateString('fr-DZ')} à {rdv?.heure}
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
export default function RendezVousDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { user } = useAuthStore();
  const isSecretary = user?.role === 'secretaire';

  const [rdv, setRdv]           = useState(null);
  const [patient, setPatient]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);

  const [medecins, setMedecins] = useState([]);

  const [statusLoading, setStatusLoading]   = useState(false);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchRdv = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      let data;
      if (typeof secretaryService.getRendezVousById === 'function') {
        const res = await secretaryService.getRendezVousById(id);
        data = res.data;
      } else {
        // Repli si la méthode dédiée n'existe pas encore côté service :
        // on recharge la liste complète et on filtre par id.
        const res = await secretaryService.getRendezVous({});
        data = (res.data || []).find(r => String(r.id) === String(id));
      }
      if (!data) { setNotFound(true); return; }
      setRdv(data);
      if (data.patient) {
        patientService.get(data.patient).then(res => setPatient(res.data)).catch(() => {});
      }
    } catch (err) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRdv(); }, [fetchRdv]);

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
    if (!rdv?.patient) return;
    navigate(`/patients/${rdv.patient}`, { state: { returnSection: key } });
  };

  // Tant que le patient complet n'est pas encore chargé, on affiche une
  // version minimale (à partir des champs dénormalisés du RDV) pour éviter
  // que le sidebar bascule du mode global au mode patient une fois le
  // patient arrivé.
  const patientForSidebar = patient || (rdv?.patient ? {
    id: rdv.patient,
    nom: rdv.patient_nom || '',
    prenom: '',
    full_name: rdv.patient_nom || 'Patient',
    registration_number: rdv.patient_numero || '',
  } : null);

  const openEdit = async () => {
    setForm({
      date: rdv.date || '',
      heure: rdv.heure || '',
      type: rdv.type || 'consultation',
      medecin: rdv.medecin || '',
      motif: rdv.motif || rdv.note || '',
    });
    setEditMode(true);
    if (medecins.length === 0) {
      try {
        const { data } = await medecinService.list();
        setMedecins(data?.results || data || []);
      } catch {
        toast.error('Impossible de charger la liste des médecins');
      }
    }
  };

  const handleCancelEdit = () => { setEditMode(false); setForm({}); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (typeof secretaryService.updateRendezVous !== 'function') {
        toast.error("La fonction de mise à jour n'est pas encore disponible côté service.");
        return;
      }
      await secretaryService.updateRendezVous(id, form);
      toast.success('Rendez-vous mis à jour');
      setEditMode(false);
      await fetchRdv();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatut) => {
    const previous = rdv;
    setStatusLoading(true);
    setRdv(prev => ({ ...prev, statut: newStatut }));
    try {
      await secretaryService.updateStatut(id, newStatut);
      toast.success('Statut mis à jour.');
    } catch (err) {
      setRdv(previous);
      toast.error(err.response?.data?.error || 'Échec de la mise à jour du statut.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await secretaryService.deleteRendezVous(id);
      toast.success('Rendez-vous supprimé avec succès');
      navigate('/secretaire/rendezvous');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Détail du rendez-vous">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(37,99,235,0.12)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Chargement du rendez-vous...
          </div>
        </div>
      </AppLayout>
    );
  }

  if (notFound || !rdv) {
    return (
      <AppLayout title="Détail du rendez-vous">
        <div style={{ padding: 64, textAlign: 'center', background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 16 }}>
          <div style={{ fontSize: 15, color: '#0f172a', fontWeight: 700, marginBottom: 6 }}>Rendez-vous introuvable</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>Ce rendez-vous n'existe plus ou a été supprimé.</div>
          <button onClick={() => navigate('/secretaire/rendezvous')} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Retour à la liste des rendez-vous
          </button>
        </div>
      </AppLayout>
    );
  }

  const patientContext = patientForSidebar ? {
    patient: patientForSidebar,
    sections: visiblePatientSections,
    activeKey: 'rendezvous',
    onSelect: handleSectionSelect,
    backPath: `/patients/${rdv.patient}`,
    backLabel: 'Retour au dossier patient',
  } : undefined;

  const past = isPastDue(rdv);
  const stCfg = STATUS_CFG[rdv.statut] || STATUS_CFG.en_attente;
  const tyCfg = TYPE_CFG[rdv.type] || TYPE_CFG.autre;

  return (
    <AppLayout
      title="Détail du rendez-vous"
      patientContext={patientContext}
      breadcrumb={[
        { label: 'Rendez-vous', onClick: () => navigate('/secretaire/rendezvous') },
        { label: rdv.patient_nom || 'Rendez-vous' },
      ]}
    >
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .input-st    { width: 100%; padding: 9px 12px; background: #f1f5f9; border: 1px solid rgba(37,99,235,0.15); border-radius: 9px; color: #0f172a; font-size: 13px; outline: none; box-sizing: border-box; font-family: var(--font-body); }
        .label-st    { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; font-weight: 600; }
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

      

      {/* ── Contenu ── */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 16, padding: 24 }}>
        {!editMode ? (
          
          <> <button onClick={openEdit} style={{ padding:'10px 18px', background:'#2563eb', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600 }}>
            <SectionLabel>Informations du rendez-vous</SectionLabel>
            <Grid>
              <InfoRow label="Patient" value={rdv.patient_nom} />
              <InfoRow label="N° dossier" value={rdv.patient_numero} mono />
              <InfoRow label="Date" value={rdv.date ? new Date(`${rdv.date}T00:00:00`).toLocaleDateString('fr-DZ') : '—'} />
              <InfoRow label="Heure" value={rdv.heure} mono />
              <InfoRow label="Type" value={tyCfg.label} />
              <InfoRow label="Statut" value={stCfg.label} />
              <InfoRow label="Médecin" value={rdv.medecin_nom || '—'} />
              <InfoRow label="Créé le" value={rdv.date_creation ? new Date(rdv.date_creation).toLocaleString('fr-DZ') : '—'} />
              {(rdv.motif || rdv.note) && <InfoRow label="Motif / Note" value={rdv.motif || rdv.note} full />}
            </Grid>

            {rdv.patient && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(37,99,235,0.12)' }}>
                <Link to={`/patients/${rdv.patient}`} style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 12, color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Voir le dossier patient
                  </button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <SectionLabel>Modifier le rendez-vous</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Date</label>
                <input type="date" className="input-st" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Heure</label>
                <input type="time" className="input-st" value={form.heure || ''} onChange={e => setForm({ ...form, heure: e.target.value })} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Type</label>
                <select className="input-st" value={form.type || ''} onChange={e => setForm({ ...form, type: e.target.value })} style={{ cursor: 'pointer' }}>
                  {Object.entries(TYPE_CFG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="label-st">Médecin</label>
                <select className="input-st" value={form.medecin || ''} onChange={e => setForm({ ...form, medecin: e.target.value })} style={{ cursor: 'pointer' }}>
                  <option value="">— Sélectionner —</option>
                  {medecins.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim()}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16, gridColumn: '1 / -1' }}>
                <label className="label-st">Motif / Note</label>
                <textarea className="input-st" rows={3} style={{ resize: 'vertical' }} value={form.motif || ''} onChange={e => setForm({ ...form, motif: e.target.value })} />
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
          rdv={rdv}
          loading={deleteLoading}
          onClose={() => !deleteLoading && setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AppLayout>
  );
}