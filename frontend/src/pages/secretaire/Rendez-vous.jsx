import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { secretaryService } from '../../services/secretaryService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
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
   BADGES
───────────────────────────────────────────────────────────────────────────── */
function StatusBadge({ statut }) {
  const c = STATUS_CFG[statut] || { bg:'rgba(100,116,139,0.08)', color:'#64748b', border:'rgba(100,116,139,0.2)', label:statut || '—' };
  return (
    <span style={{
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500,
      background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:'nowrap',
    }}>{c.label}</span>
  );
}

function TypeBadge({ type }) {
  const c = TYPE_CFG[type] || { color:'#64748b', label:type || '—' };
  return (
    <span style={{
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500,
      background:`${c.color}12`, color:c.color, border:`1px solid ${c.color}28`, whiteSpace:'nowrap',
    }}>{c.label}</span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ICON BUTTONS (même langage visuel que PatientsPage)
───────────────────────────────────────────────────────────────────────────── */
function StatusChangeButton({ rdv, onChange }) {
  const [open, setOpen]       = useState(false);
  const [hovered, setHovered] = useState(false);
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Changer le statut"
        style={{
          width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
          borderRadius:8, border: hovered || open ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
          background: hovered || open ? 'rgba(37,99,235,0.08)' : 'transparent', cursor:'pointer', transition:'all .15s', flexShrink:0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hovered || open ? '#2563eb' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'stroke .15s' }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>

      {open && (
        <div style={{
          position:'absolute', right:0, top:'110%', zIndex:50,
          background:'#fff', border:'1px solid rgba(37,99,235,0.14)',
          borderRadius:10, boxShadow:'0 10px 28px rgba(15,23,42,0.14)',
          minWidth:160, overflow:'hidden',
        }}>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setOpen(false); if (key !== rdv.statut) onChange(rdv, key); }}
              style={{
                width:'100%', textAlign:'left', padding:'9px 13px',
                fontSize:12.5, fontWeight: rdv.statut === key ? 700 : 500, color: cfg.color,
                border:'none', background: rdv.statut === key ? `${cfg.color}0c` : 'transparent', cursor:'pointer',
                display:'flex', alignItems:'center', gap:8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${cfg.color}10`; }}
              onMouseLeave={e => { e.currentTarget.style.background = rdv.statut === key ? `${cfg.color}0c` : 'transparent'; }}
            >
              {rdv.statut === key && <span style={{ fontSize:10 }}>✓</span>}
              {cfg.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteIconButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Supprimer ce rendez-vous"
      style={{
        width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:8, border: hovered ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
        background: hovered ? 'rgba(220,38,38,0.07)' : 'transparent', cursor:'pointer', transition:'all .15s', flexShrink:0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hovered ? '#dc2626' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'stroke .15s' }}>
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE CONFIRM MODAL (identique PatientsPage)
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
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function RendezVousPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rdvs,          setRdvs]          = useState([]);
  const [stats,         setStats]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState(searchParams.get('patient') || '');
  const [dateFilter,    setDateFilter]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [page,          setPage]          = useState(1);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const PAGE_SIZE = 20;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await secretaryService.getRendezVous({});
      setRdvs(data);
    } catch {
      toast.error('Erreur lors du chargement des rendez-vous');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(() => {
    secretaryService.getStats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const timer = setTimeout(fetchAll, 300);
    return () => clearTimeout(timer);
  }, [fetchAll]);

  useEffect(() => { setPage(1); }, [search, dateFilter, statusFilter, typeFilter]);

  const filtered = rdvs.filter((rdv) => {
    const query = search.trim().toLowerCase();
    return (!query || rdv.patient_nom?.toLowerCase().includes(query) || String(rdv.patient_numero || '').includes(query))
      && (!dateFilter || rdv.date === dateFilter)
      && (!statusFilter || rdv.statut === statusFilter)
      && (!typeFilter || rdv.type === typeFilter);
  }).sort((a, b) => `${b.date}${b.heure}`.localeCompare(`${a.date}${a.heure}`));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange = async (rdv, newStatut) => {
    const previous = rdvs;
    setRdvs(prev => prev.map(r => r.id === rdv.id ? { ...r, statut: newStatut } : r));
    try {
      await secretaryService.updateStatut(rdv.id, newStatut);
      toast.success('Statut mis à jour.');
      fetchStats();
    } catch (err) {
      setRdvs(previous);
      toast.error(err.response?.data?.error || 'Échec de la mise à jour du statut.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await secretaryService.deleteRendezVous(deleteTarget.id);
      toast.success('Rendez-vous supprimé avec succès');
      setDeleteTarget(null);
      fetchAll();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AppLayout title="Rendez-vous">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Stats strip */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:"Aujourd'hui",    val:stats.rdv_aujourdhui, color:'#2563eb' },
            { label:'Cette semaine',  val:stats.rdv_semaine,    color:'#0891b2' },
            { label:'En attente',     val:stats.rdv_en_attente, color:'#d97706' },
            { label:'Confirmés',      val:stats.rdv_confirmes,  color:'#16a34a' },
            { label:'Annulés',        val:stats.rdv_annules,    color:'#dc2626' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background:'#fff', border:'1px solid rgba(37,99,235,0.1)',
              borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden',
              boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:'14px 14px 0 0' }} />
              <div style={{ minHeight:22, marginBottom:6 }} />
              <div style={{ fontSize:30, fontWeight:800, color, fontFamily:'var(--font-display)', lineHeight:1, marginBottom:4 }}>{val ?? '—'}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#334155' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border-light)',
        borderRadius:'var(--radius-md)', padding:'14px 18px',
        display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap',
      }}>
        {/* Search */}
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
            placeholder="Nom patient, n° dossier..."
            style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:13, color:'#0f172a', fontFamily:'var(--font-body)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b' }}>✕</button>
          )}
        </div>

        {/* Date */}
        <input
          type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          style={{
            padding:'8px 12px', background:'var(--bg-elevated)',
            border:'1px solid var(--border)', borderRadius:'var(--radius-md)',
            color:'#334155', fontSize:12.5, cursor:'pointer', outline:'none',
          }}
        />

        {/* Statut */}
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding:'8px 12px', background:'var(--bg-elevated)',
            border:'1px solid var(--border)', borderRadius:'var(--radius-md)',
            color:'#334155', fontSize:12.5, cursor:'pointer', outline:'none',
          }}
        >
          <option value="">Statut : Tous</option>
          {Object.entries(STATUS_CFG).map(([k, cfg]) => (
            <option key={k} value={k}>{cfg.label}</option>
          ))}
        </select>

        {/* Type */}
        <select
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{
            padding:'8px 12px', background:'var(--bg-elevated)',
            border:'1px solid var(--border)', borderRadius:'var(--radius-md)',
            color:'#334155', fontSize:12.5, cursor:'pointer', outline:'none',
          }}
        >
          <option value="">Type : Tous</option>
          {Object.entries(TYPE_CFG).map(([k, cfg]) => (
            <option key={k} value={k}>{cfg.label}</option>
          ))}
        </select>

        {(search || dateFilter || statusFilter || typeFilter) && (
          <button
            onClick={() => { setSearch(''); setDateFilter(''); setStatusFilter(''); setTypeFilter(''); }}
            style={{ padding:'8px 14px', background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'var(--radius-md)', color:'#dc2626', fontSize:12, cursor:'pointer' }}
          >
            Réinitialiser
          </button>
        )}

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <button
            onClick={() => { fetchAll(); fetchStats(); }}
            style={{
              padding:'9px 16px', background:'#fff', border:'1px solid rgba(37,99,235,0.2)',
              borderRadius:'var(--radius-md)', color:'#2563eb', fontSize:13, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 6px rgba(15,23,42,0.06)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 12a8 8 0 018-8M12 4l-2 2 2 2M20 12a8 8 0 01-8 8M12 20l2-2-2-2"/>
            </svg>
            Actualiser
          </button>

          <Link to="/secretaire/rendezvous/nouveau" style={{ textDecoration:'none' }}>
            <button style={{
              padding:'9px 18px',
              background:'linear-gradient(135deg,#3b82f6,#2563eb)',
              border:'none', borderRadius:'var(--radius-md)',
              color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
              fontFamily:'var(--font-display)',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Nouveau rendez-vous
            </button>
          </Link>
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
        ) : paginated.length === 0 ? (
          <div style={{ padding:64, textAlign:'center' }}>
            <div style={{ fontSize:14, color:'#64748b' }}>Aucun rendez-vous trouvé</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-elevated)' }}>
                {['Date','Heure','Patient','Type','Médecin','Statut','','',''].map((h, idx) => (
                  <th key={idx} style={{
                    padding:'10px 14px', textAlign:'left',
                    fontSize:11, fontWeight:600, letterSpacing:.5,
                    color:'#94a3b8', textTransform:'uppercase',
                    borderBottom:'1px solid rgba(37,99,235,0.06)', whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((rdv, i) => (
                <tr key={rdv.id}
                  onClick={() => rdv.patient && navigate(`/patients/${rdv.patient}`)}
                  style={{
                    cursor: rdv.patient ? 'pointer' : 'default', borderBottom:'1px solid rgba(37,99,235,0.06)', transition:'background .1s',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding:'12px 14px', fontSize:12.5, color:'#0f172a', fontWeight:600, whiteSpace:'nowrap' }}>
                    {rdv.date ? new Date(`${rdv.date}T00:00:00`).toLocaleDateString('fr-DZ') : '—'}
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:12.5, color:'#334155', fontFamily:'var(--font-mono)' }}>{rdv.heure}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{rdv.patient_nom || '—'}</div>
                  </td>
                  <td style={{ padding:'12px 14px' }}><TypeBadge type={rdv.type} /></td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'#64748b' }}>{rdv.medecin_nom || '—'}</td>
                  <td style={{ padding:'12px 14px' }}><StatusBadge statut={rdv.statut} /></td>
                  <td style={{ padding:'12px 8px 12px 14px' }} onClick={e => e.stopPropagation()}>
                    <Link to={`/secretaire/rendezvous/${rdv.id}`} style={{ textDecoration:'none' }}>
                      <button style={{ padding:'5px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'#334155', fontSize:11.5, cursor:'pointer' }}>
                        Voir
                      </button>
                    </Link>
                  </td>
                  <td style={{ padding:'12px 4px' }} onClick={e => e.stopPropagation()}>
                    <StatusChangeButton rdv={rdv} onChange={handleStatusChange} />
                  </td>
                  <td style={{ padding:'12px 14px 12px 4px' }} onClick={e => e.stopPropagation()}>
                    <DeleteIconButton onClick={() => setDeleteTarget(rdv)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'#64748b' }}>{filtered.length} rendez-vous au total</span>
            <div style={{ display:'flex', gap:8 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding:'6px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'#334155', fontSize:12, cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page > 1 ? 1 : .4 }}
              >← Précédent</button>
              <span style={{ fontSize:12, color:'#94a3b8', alignSelf:'center' }}>{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{ padding:'6px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'#334155', fontSize:12, cursor: page < totalPages ? 'pointer' : 'not-allowed', opacity: page < totalPages ? 1 : .4 }}
              >Suivant →</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          rdv={deleteTarget}
          loading={deleteLoading}
          onClose={() => !deleteLoading && setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AppLayout>
  );
}