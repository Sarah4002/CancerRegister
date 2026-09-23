// PatientsEnAttentePage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import usePermissions from '../../hooks/usePermissions';
import useAuthStore from '../../hooks/useAuth';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS — même palette que PatientsPage
───────────────────────────────────────────────────────────────────────────── */
const SEXE_COLORS = {
  M: { bg: 'rgba(37,99,235,0.08)',   color: '#2563eb' },
  F: { bg: 'rgba(232,121,249,0.08)', color: '#d946ef' },
  U: { bg: 'rgba(100,116,139,0.08)', color: '#64748b' },
};

function urgenceInfo(dateEnregistrement) {
  if (!dateEnregistrement) return { jours: 0, label: '—', color: '#64748b', bg: 'rgba(100,116,139,0.08)' };
  const jours = Math.floor((Date.now() - new Date(dateEnregistrement).getTime()) / 86400000);
  if (jours >= 5) return { jours, label: `${jours} j — urgent`, color: '#dc2626', bg: 'rgba(220,38,38,0.08)' };
  if (jours >= 2) return { jours, label: `${jours} j`, color: '#d97706', bg: 'rgba(217,119,6,0.08)' };
  return { jours, label: jours <= 0 ? "Aujourd'hui" : `${jours} j`, color: '#2563eb', bg: 'rgba(37,99,235,0.08)' };
}

/* ─────────────────────────────────────────────────────────────────────────────
   BADGE — cohérent avec StatusBadge de PatientsPage
───────────────────────────────────────────────────────────────────────────── */
function UrgenceBadge({ dateEnregistrement }) {
  const u = urgenceInfo(dateEnregistrement);
  return (
    <span style={{
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600,
      background:u.bg, color:u.color, border:`1px solid ${u.color}30`, whiteSpace:'nowrap',
    }}>{u.label}</span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONFIRM ICON BUTTON — check vert, même gabarit que DeleteIconButton
───────────────────────────────────────────────────────────────────────────── */
function ConfirmIconButton({ onClick, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={loading}
      title="Confirmer le diagnostic (cancer)"
      style={{
        width:32, height:32,
        display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:8,
        border: hovered ? '1px solid rgba(22,163,74,0.35)' : '1px solid rgba(22,163,74,0.15)',
        background: hovered ? 'rgba(22,163,74,0.1)' : 'rgba(22,163,74,0.05)',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition:'all .15s',
        flexShrink:0,
        opacity: loading ? .6 : 1,
      }}
    >
      {loading ? (
        <span style={{ width:13, height:13, border:'2px solid rgba(22,163,74,0.3)', borderTopColor:'#16a34a', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }} />
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   REFUSE ICON BUTTON — croix rouge, même gabarit que DeleteIconButton
───────────────────────────────────────────────────────────────────────────── */
function RefuseIconButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Refuser le diagnostic"
      style={{
        width:32, height:32,
        display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:8,
        border: hovered ? '1px solid rgba(220,38,38,0.35)' : '1px solid rgba(220,38,38,0.15)',
        background: hovered ? 'rgba(220,38,38,0.1)' : 'rgba(220,38,38,0.05)',
        cursor:'pointer',
        transition:'all .15s',
        flexShrink:0,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   VOIR ICON BUTTON — oeil, même gabarit
───────────────────────────────────────────────────────────────────────────── */
function VoirIconButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Voir le dossier"
      style={{
        width:32, height:32,
        display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:8,
        border: hovered ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(37,99,235,0.12)',
        background: hovered ? 'rgba(37,99,235,0.08)' : 'transparent',
        cursor:'pointer',
        transition:'all .15s',
        flexShrink:0,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={hovered ? '#2563eb' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'stroke .15s' }}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   REFUS MODAL — même gabarit que DeleteConfirmModal (PatientsPage)
───────────────────────────────────────────────────────────────────────────── */
function RefusModal({ patient, onClose, onConfirm, loading }) {
  const overlayRef = useRef(null);
  const [motif, setMotif] = useState('');
  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      style={{
        position:'fixed', inset:0,
        background:'rgba(15,23,42,0.6)',
        backdropFilter:'blur(4px)',
        zIndex:2000,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:16,
        animation:'fadeIn .15s ease',
      }}
    >
      <div style={{
        background:'#fff',
        borderRadius:18,
        width:'100%',
        maxWidth:460,
        boxShadow:'0 24px 64px rgba(220,38,38,0.18)',
        overflow:'hidden',
        animation:'slideUp .2s ease',
      }}>
        <div style={{ height:4, background:'linear-gradient(90deg,#ef4444,#dc2626)' }} />

        <div style={{ padding:'28px 28px 24px' }}>
          <div style={{
            width:52, height:52,
            background:'rgba(220,38,38,0.08)',
            borderRadius:14,
            display:'flex', alignItems:'center', justifyContent:'center',
            marginBottom:16,
            border:'1px solid rgba(220,38,38,0.15)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>

          <div style={{ fontSize:17, fontWeight:800, color:'#0f172a', marginBottom:8 }}>
            Refuser ce dossier ?
          </div>
          <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6, marginBottom:6 }}>
            Le diagnostic de cancer n'est pas confirmé pour :
          </div>
          <div style={{
            padding:'10px 14px',
            background:'rgba(220,38,38,0.05)',
            border:'1px solid rgba(220,38,38,0.15)',
            borderRadius:10,
            marginBottom:16,
          }}>
            <div style={{ fontWeight:700, color:'#0f172a', fontSize:14 }}>{patient?.full_name}</div>
            <div style={{ fontSize:11.5, color:'#64748b', marginTop:2, fontFamily:'monospace' }}>
              {patient?.registration_number}
            </div>
          </div>

          <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.8, marginBottom:8, display:'block' }}>
            Motif du refus
          </div>
          <textarea
            value={motif}
            onChange={e => setMotif(e.target.value)}
            placeholder="Ex: résultats anapath négatifs, absence de lésion..."
            style={{
              width:'100%', minHeight:90, padding:'10px 12px', borderRadius:10,
              border:'1px solid rgba(37,99,235,0.18)', background:'#f8fafc',
              color:'#334155', fontSize:12.5, outline:'none', resize:'vertical',
              fontFamily:'var(--font-body)', marginBottom:20,
            }}
          />

          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex:1, padding:'11px', borderRadius:10,
                border:'1px solid rgba(37,99,235,0.2)',
                background:'transparent', color:'#64748b',
                fontSize:13, fontWeight:600, cursor:'pointer',
                opacity: loading ? .5 : 1,
              }}
            >
              Annuler
            </button>
            <button
              onClick={() => onConfirm(motif)}
              disabled={loading || !motif.trim()}
              style={{
                flex:1, padding:'11px', borderRadius:10,
                border:'none',
                background: (loading || !motif.trim()) ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                color:'#fff',
                fontSize:13, fontWeight:700, cursor: (loading || !motif.trim()) ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow:'0 4px 12px rgba(220,38,38,0.3)',
              }}
            >
              {loading ? (
                <>
                  <span style={{ width:13, height:13, border:'2px solid #ffffff44', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }} />
                  Envoi…
                </>
              ) : 'Confirmer le refus'}
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
export default function PatientsEnAttentePage() {
  const { can } = usePermissions();
  const { user } = useAuthStore();
  const canValidate = can.validateDiagnosis || can.confirmDiagnostic;
  const canAccess   = canValidate || user?.role === 'secretaire';

  const [patients,      setPatients]      = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [search,         setSearch]        = useState('');
  const [motifModal,     setMotifModal]    = useState(null); // { patient }
  const [refusLoading,   setRefusLoading]  = useState(false);
  const [confirmingId,   setConfirmingId]  = useState(null);

  const fetchEnAttente = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await patientService.getEnAttente();
      let results = data.results || data;
      if (!Array.isArray(results)) results = [];
      setPatients(results);
    } catch {
      toast.error('Erreur lors du chargement des dossiers en attente');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEnAttente(); }, [fetchEnAttente]);

  const handleConfirm = async (patient) => {
    setConfirmingId(patient.id);
    try {
      await patientService.confirmPatient(patient.id, { decision: 'confirme' });
      toast.success(`${patient.full_name} confirmé — ajouté au registre patients`);
      fetchEnAttente();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la confirmation');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRefuse = async (motif) => {
    if (!motifModal) return;
    setRefusLoading(true);
    try {
      await patientService.confirmPatient(motifModal.patient.id, { decision: 'refuse', motif_refus: motif });
      toast.success('Dossier refusé');
      setMotifModal(null);
      fetchEnAttente();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors du refus');
    } finally {
      setRefusLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.full_name || '').toLowerCase().includes(s)
      || (p.registration_number || '').toLowerCase().includes(s)
      || (p.secretaire_nom || '').toLowerCase().includes(s);
  });

  const stats = {
    total:   patients.length,
    urgent:  patients.filter(p => urgenceInfo(p.date_enregistrement).jours >= 5).length,
    attente: patients.filter(p => { const j = urgenceInfo(p.date_enregistrement).jours; return j >= 2 && j < 5; }).length,
    recent:  patients.filter(p => urgenceInfo(p.date_enregistrement).jours < 2).length,
  };

  if (!canAccess) {
    return (
      <AppLayout title="Accès refusé">
        <div style={{ padding: 64, textAlign: 'center' }}>
          <div style={{ fontSize:14, color:'#64748b' }}>
            Cette page est réservée aux médecins, au médecin chef et à la secrétaire.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dossiers en attente de confirmation">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Stats strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[
          { label:'Total en attente',  val:stats.total,   color:'#2563eb' },
          { label:'Urgent (≥ 5 j)',    val:stats.urgent,  color:'#dc2626' },
          { label:'En attente (2-4 j)',val:stats.attente, color:'#d97706' },
          { label:'Récents (< 2 j)',   val:stats.recent,  color:'#16a34a' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            background:'#fff', border:'1px solid rgba(37,99,235,0.1)',
            borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden',
            boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
          }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:'14px 14px 0 0' }} />
            <div style={{ minHeight:22, marginBottom:6 }} />
            <div style={{ fontSize:30, fontWeight:800, color, fontFamily:'var(--font-display)', lineHeight:1, marginBottom:4 }}>{val}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#334155' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border-light)',
        borderRadius:'var(--radius-md)', padding:'14px 18px',
        display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap',
      }}>
        <div style={{
          flex:1, minWidth:220,
          display:'flex', alignItems:'center', gap:8,
          background:'#f8fafc', border:'1px solid var(--border)',
          borderRadius:'var(--radius-md)', padding:'8px 12px',
        }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nom, N° dossier, secrétaire..."
            style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:13, color:'#0f172a', fontFamily:'var(--font-body)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b' }}>✕</button>
          )}
        </div>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{
            padding:'9px 14px', borderRadius:'var(--radius-md)',
            border:'1px solid rgba(37,99,235,0.2)', background:'rgba(37,99,235,0.06)',
            color:'#2563eb', fontSize:13, fontWeight:600,
          }}>
            {filteredPatients.length} dossier{filteredPatients.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border-light)',
        borderRadius:'var(--radius-md)', overflow:'hidden',
      }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'#64748b' }}>
            <div style={{ width:32, height:32, border:'3px solid #dbeafe', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
            Chargement...
          </div>
        ) : filteredPatients.length === 0 ? (
          <div style={{ padding:64, textAlign:'center' }}>
            <div style={{ fontSize:14, color:'#64748b' }}>Aucun dossier en attente de confirmation</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-elevated)' }}>
                {['N° Dossier','Patient','Sexe','Âge','Ajouté par','Délai','Résultats',''].map((h,idx) => (
                  <th key={idx} style={{
                    padding:'10px 14px', textAlign:'left',
                    fontSize:11, fontWeight:600, letterSpacing:.5,
                    color:'#94a3b8', textTransform:'uppercase',
                    borderBottom:'1px solid rgba(37,99,235,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p, i) => (
                <tr key={p.id}
                  style={{
                    borderBottom:'1px solid rgba(37,99,235,0.06)', transition:'background .1s',
                    background: i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background= i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'#2563eb' }}>{p.registration_number}</span>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{p.full_name}</div>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600, ...(SEXE_COLORS[p.sexe]||SEXE_COLORS.U) }}>
                      {p.sexe_label}
                    </span>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#334155' }}>{p.age??'—'} ans</td>
                  <td style={{ padding:'12px 14px', fontSize:12.5, color:'#334155' }}>{p.secretaire_nom || '—'}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <UrgenceBadge dateEnregistrement={p.date_enregistrement} />
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:11.5, color:'#64748b', maxWidth:220 }}>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      Labo: {p.resume_labo || '—'} · Radio: {p.resume_radio || '—'} · Anapath: {p.resume_anapath || '—'}
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      {canValidate ? (
                        <>
                          <ConfirmIconButton
                            onClick={() => handleConfirm(p)}
                            loading={confirmingId === p.id}
                          />
                          <RefuseIconButton
                            onClick={() => setMotifModal({ patient: p })}
                          />
                        </>
                      ) : (
                        <Link to={`/patients/${p.id}`} style={{ textDecoration:'none' }}>
                          <VoirIconButton />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {motifModal && (
        <RefusModal
          patient={motifModal.patient}
          loading={refusLoading}
          onClose={() => !refusLoading && setMotifModal(null)}
          onConfirm={handleRefuse}
        />
      )}
    </AppLayout>
  );
}