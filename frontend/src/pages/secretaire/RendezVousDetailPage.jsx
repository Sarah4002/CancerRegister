import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { secretaryService } from '../../services/secretaryService';
import { medecinService } from '../../services/accountsService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS (identiques à RendezVousPage.jsx)
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   BADGES (identiques à RendezVousPage.jsx)
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   STATUS CHANGE DROPDOWN (identique à RendezVousPage.jsx, version large)
───────────────────────────────────────────────────────────────────────────── */
function StatusChangeButton({ statut, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding:'9px 16px', background:'#fff', border:'1px solid rgba(37,99,235,0.2)',
          borderRadius:'var(--radius-md)', color:'#2563eb', fontSize:13, fontWeight:600, cursor:'pointer',
          display:'flex', alignItems:'center', gap:8, boxShadow:'0 2px 6px rgba(15,23,42,0.06)',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Changer le statut
      </button>

      {open && (
        <div style={{
          position:'absolute', right:0, top:'110%', zIndex:50,
          background:'#fff', border:'1px solid rgba(37,99,235,0.14)',
          borderRadius:10, boxShadow:'0 10px 28px rgba(15,23,42,0.14)',
          minWidth:180, overflow:'hidden',
        }}>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setOpen(false); if (key !== statut) onChange(key); }}
              style={{
                width:'100%', textAlign:'left', padding:'10px 14px',
                fontSize:12.5, fontWeight: statut === key ? 700 : 500, color: cfg.color,
                border:'none', background: statut === key ? `${cfg.color}0c` : 'transparent', cursor:'pointer',
                display:'flex', alignItems:'center', gap:8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}10`; }}
              onMouseLeave={e => { e.currentTarget.style.background = statut === key ? `${cfg.color}0c` : 'transparent'; }}
            >
              {statut === key && <span style={{ fontSize:10 }}>✓</span>}
              {cfg.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE CONFIRM MODAL (identique à RendezVousPage.jsx)
───────────────────────────────────────────────────────────────────────────── */
function DeleteConfirmModal({ rdv, onClose, onConfirm, loading }) {
  const overlayRef = useRef(null);
  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };

  return (
    <div ref={overlayRef} onClick={handleOverlay} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(4px)',
      zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .15s ease',
    }}>
      <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:420, boxShadow:'0 24px 64px rgba(220,38,38,0.18)', overflow:'hidden', animation:'slideUp .2s ease' }}>
        <div style={{ height:4, background:'linear-gradient(90deg,#ef4444,#dc2626)' }} />
        <div style={{ padding:'28px 28px 24px' }}>
          <div style={{ width:52, height:52, background:'rgba(220,38,38,0.08)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, border:'1px solid rgba(220,38,38,0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <div style={{ fontSize:17, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Supprimer ce rendez-vous ?</div>
          <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6, marginBottom:6 }}>
            Vous êtes sur le point de supprimer définitivement le rendez-vous de :
          </div>
          <div style={{ padding:'10px 14px', background:'rgba(220,38,38,0.05)', border:'1px solid rgba(220,38,38,0.15)', borderRadius:10, marginBottom:16 }}>
            <div style={{ fontWeight:700, color:'#0f172a', fontSize:14 }}>{rdv?.patient_nom || 'Patient'}</div>
            <div style={{ fontSize:11.5, color:'#64748b', marginTop:2 }}>
              {rdv?.date && new Date(`${rdv.date}T00:00:00`).toLocaleDateString('fr-DZ')} à {rdv?.heure}
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} disabled={loading} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid rgba(37,99,235,0.2)', background:'transparent', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer', opacity: loading ? .5 : 1 }}>Annuler</button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background: loading ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontSize:13, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 12px rgba(220,38,38,0.3)' }}
            >
              {loading ? (
                <><span style={{ width:13, height:13, border:'2px solid #ffffff44', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }} /> Suppression…</>
              ) : 'Supprimer définitivement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MINI HELPERS UI
───────────────────────────────────────────────────────────────────────────── */
function InfoBlock({ icon, label, value, mono }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
      <div style={{
        width:36, height:36, borderRadius:10, background:'rgba(37,99,235,0.07)',
        border:'1px solid rgba(37,99,235,0.14)', display:'flex', alignItems:'center',
        justifyContent:'center', flexShrink:0, color:'#2563eb',
      }}>{icon}</div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:10.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5, marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:13.5, fontWeight:600, color:'#0f172a', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)', wordBreak:'break-word' }}>{value || '—'}</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.8, marginBottom:14, paddingBottom:8, borderBottom:'1px solid rgba(37,99,235,0.12)' }}>{title}</div>
      {children}
    </div>
  );
}

const ICONS = {
  calendar: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  clock:    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  user:     <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  doctor:   <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12h6M12 9v6"/><circle cx="12" cy="12" r="9"/></svg>,
  building: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M6 21V7l6-4 6 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1"/></svg>,
  note:     <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 3v4a1 1 0 001 1h4"/><path d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"/><path d="M9 13h6M9 17h4"/></svg>,
  bell:     <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function RendezVousDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rdv, setRdv]                 = useState(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [medecins, setMedecins]       = useState([]);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusSaving, setStatusSaving]   = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const { data } = await secretaryService.getRendezVousDetail(id);
      setRdv(data);
    } catch {
      setNotFound(true);
      toast.error("Impossible de charger ce rendez-vous");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => {
    medecinService.list({ page_size: 200 }).then(({ data }) => {
      const list = data.medecins || data.results || data || [];
      setMedecins(list);
    }).catch(() => {});
  }, []);

  const medecinNom = rdv?.medecin_nom || medecins.find(m => String(m.id) === String(rdv?.medecin))?.full_name;

  const handleStatusChange = async (newStatut) => {
    if (!rdv) return;
    const previous = rdv;
    setRdv(prev => ({ ...prev, statut: newStatut }));
    setStatusSaving(true);
    try {
      await secretaryService.updateStatut(rdv.id, newStatut);
      toast.success('Statut mis à jour.');
    } catch (err) {
      setRdv(previous);
      toast.error(err.response?.data?.error || 'Échec de la mise à jour du statut.');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!rdv) return;
    setDeleteLoading(true);
    try {
      await secretaryService.deleteRendezVous(rdv.id);
      toast.success('Rendez-vous supprimé avec succès');
      navigate('/secretaire/rendezvous');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AppLayout
      title="Détail du rendez-vous"
      patientContext={rdv?.patient ? {
        patient: { id: rdv.patient, full_name: rdv.patient_nom, registration_number: rdv.patient_numero },
        backPath: `/patients/${rdv.patient}`,
        backLabel: 'Retour au patient',
      } : undefined}
    >
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {loading ? (
        <div style={{ padding:64, textAlign:'center', color:'#64748b', background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)' }}>
          <div style={{ width:32, height:32, border:'3px solid #dbeafe', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
          Chargement...
        </div>
      ) : notFound || !rdv ? (
        <div style={{ padding:64, textAlign:'center', background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)' }}>
          <div style={{ fontSize:14, color:'#64748b', marginBottom:16 }}>Rendez-vous introuvable.</div>
          <button onClick={() => navigate('/secretaire/rendezvous')} style={{ padding:'9px 18px', background:'#fff', border:'1px solid rgba(37,99,235,0.2)', borderRadius:'var(--radius-md)', color:'#2563eb', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            ← Retour à la liste
          </button>
        </div>
      ) : (
        <div style={{ maxWidth:860, margin:'0 auto' }}>

          {/* Toolbar */}
          <div style={{
            background:'var(--bg-card)', border:'1px solid var(--border-light)',
            borderRadius:'var(--radius-md)', padding:'14px 18px',
            display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap',
          }}>
            <Link to="/secretaire/rendezvous" style={{ textDecoration:'none' }}>
              <button style={{ padding:'9px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'#334155', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                ← Retour
              </button>
            </Link>

            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
              {statusSaving && <span style={{ fontSize:11.5, color:'#94a3b8' }}>Mise à jour…</span>}
              <StatusChangeButton statut={rdv.statut} onChange={handleStatusChange} />

              <Link to={`/secretaire/rendezvous/${rdv.id}/modifier`} style={{ textDecoration:'none' }}>
                <button style={{
                  padding:'9px 18px', background:'linear-gradient(135deg,#3b82f6,#2563eb)',
                  border:'none', borderRadius:'var(--radius-md)', color:'#fff', fontSize:13, fontWeight:600,
                  cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'var(--font-display)',
                }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Modifier
                </button>
              </Link>

              <button
                onClick={() => setDeleteOpen(true)}
                style={{ padding:'9px 14px', background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'var(--radius-md)', color:'#dc2626', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Supprimer
              </button>
            </div>
          </div>

          {/* Carte principale */}
          <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'16px', padding:'28px 32px' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:24, paddingBottom:20, borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
              <div>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, color:'#0f172a', marginBottom:8 }}>
                  {rdv.patient_nom || 'Patient'}
                </h2>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <TypeBadge type={rdv.type} />
                  <StatusBadge statut={rdv.statut} />
                  {rdv.premiere_visite && (
                    <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, background:'rgba(13,148,136,0.08)', color:'#0d9488', border:'1px solid rgba(13,148,136,0.2)' }}>
                      Première visite
                    </span>
                  )}
                </div>
              </div>
              {rdv.patient && (
                <Link to={`/patients/${rdv.patient}`} style={{ textDecoration:'none' }}>
                  <button style={{ padding:'9px 16px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'#334155', fontSize:12.5, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                    Voir le dossier patient
                  </button>
                </Link>
              )}
            </div>

            {/* Date & Heure */}
            <Section title="Date & Heure">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }}>
                <InfoBlock icon={ICONS.calendar} label="Date" value={rdv.date ? new Date(`${rdv.date}T00:00:00`).toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : '—'} />
                <InfoBlock icon={ICONS.clock} label="Heure" value={rdv.heure} mono />
                <InfoBlock icon={ICONS.clock} label="Durée" value={rdv.duree_minutes ? `${rdv.duree_minutes} min` : '—'} />
              </div>
            </Section>

            {/* Praticien & Contexte */}
            <Section title="Praticien & Contexte">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:20 }}>
                <InfoBlock icon={ICONS.doctor} label="Médecin / Praticien" value={medecinNom ? `Dr. ${medecinNom}` : '—'} />
                <InfoBlock icon={ICONS.building} label="Établissement / Salle" value={rdv.salle} />
                <InfoBlock icon={ICONS.user} label="N° dossier patient" value={rdv.patient_numero} mono />
                {rdv.type === 'autre' && rdv.type_autre_detail && (
                  <InfoBlock icon={ICONS.note} label="Précision du type" value={rdv.type_autre_detail} />
                )}
              </div>
            </Section>

            {/* Rappels */}
            <Section title="Rappels au patient">
              <div style={{ display:'flex', gap:20 }}>
                <InfoBlock icon={ICONS.bell} label="Rappel SMS" value={rdv.rappel_sms ? 'Activé' : 'Désactivé'} />
                <InfoBlock icon={ICONS.bell} label="Rappel Email" value={rdv.rappel_email ? 'Activé' : 'Désactivé'} />
              </div>
            </Section>

            {/* Notes */}
            {(rdv.motif || rdv.notes) && (
              <Section title="Notes complémentaires">
                {rdv.motif && (
                  <div style={{ marginBottom: rdv.notes ? 14 : 0 }}>
                    <div style={{ fontSize:10.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>Motif du rendez-vous</div>
                    <div style={{ fontSize:13.5, color:'#334155', lineHeight:1.6 }}>{rdv.motif}</div>
                  </div>
                )}
                {rdv.notes && (
                  <div>
                    <div style={{ fontSize:10.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5, marginBottom:5 }}>Notes internes (secrétariat)</div>
                    <div style={{ fontSize:13.5, color:'#334155', lineHeight:1.6, background:'#f8fafc', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' }}>{rdv.notes}</div>
                  </div>
                )}
              </Section>
            )}
          </div>
        </div>
      )}

      {deleteOpen && (
        <DeleteConfirmModal
          rdv={rdv}
          loading={deleteLoading}
          onClose={() => !deleteLoading && setDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AppLayout>
  );
}