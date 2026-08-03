import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { secretaryService } from '../../services/secretaryService';
import { suiviService } from '../../services/suiviService';
import { AppLayout } from '../../components/layout/Sidebar';

/* ── Palette (identique au Dashboard) ── */
const STATUT_RDV_COLORS = {
  confirme:   '#2563eb',
  en_attente: '#d97706',
  annule:     '#dc2626',
  termine:    '#16a34a',
  absent:     '#64748b',
};
const STATUT_RDV_LABELS = {
  confirme:   'Confirmé',
  en_attente: 'En attente',
  annule:     'Annulé',
  termine:    'Terminé',
  absent:     'Absent',
};
const TYPE_RDV_LABELS = {
  consultation: 'Consultation',
  rcp:          'RCP',
  suivi:        'Suivi',
  chimio:       'Chimiothérapie',
  examen:       'Examen',
};

const MOIS_LABELS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const JOURS_LABELS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

const todayISO = () => new Date().toISOString().slice(0, 10);

/* ══════════════════════════════════════════════
   Petits composants réutilisés du design system
   ══════════════════════════════════════════════ */

function KPICard({ label, value, sub, color, icon, link }) {
  const content = (
    <div
      style={{
        background:'#fff', border:'1px solid rgba(37,99,235,0.1)',
        borderRadius:14, padding:'18px 20px',
        position:'relative', overflow:'hidden',
        transition:'all 0.2s ease',
        cursor: link ? 'pointer' : 'default',
        boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
      }}
      onMouseEnter={e => { if (link) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px rgba(37,99,235,0.12)`; }}}
      onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 8px rgba(15,23,42,0.06)'; }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${color}, ${color}88)`, borderRadius:'14px 14px 0 0' }} />
      <div style={{ fontSize:22, lineHeight:1, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:30, fontWeight:800, fontFamily:'var(--font-display)', color, lineHeight:1, marginBottom:4 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize:12, fontWeight:600, color:'#334155', marginBottom: sub ? 2 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:'#94a3b8' }}>{sub}</div>}
    </div>
  );
  return link ? <Link to={link} style={{ textDecoration:'none' }}>{content}</Link> : content;
}

function ChartCard({ title, sub, children, span = 1, actions }) {
  return (
    <div style={{
      background:'#fff', border:'1px solid rgba(37,99,235,0.08)',
      borderRadius:14, padding:'20px 22px',
      boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
      gridColumn: span === 2 ? '1 / -1' : 'auto',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', fontFamily:'var(--font-display)' }}>{title}</div>
          {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{sub}</div>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function StatutBadge({ statut }) {
  const color = STATUT_RDV_COLORS[statut] || '#94a3b8';
  return (
    <span style={{
      fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:99,
      background:`${color}14`, color, border:`1px solid ${color}30`,
      textTransform:'uppercase', letterSpacing:0.4,
    }}>
      {STATUT_RDV_LABELS[statut] || statut}
    </span>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          fontSize:12, padding:'7px 10px',
          border:'1px solid rgba(37,99,235,0.18)', borderRadius:9,
          background:'#fff', color:'#334155', cursor:'pointer',
          minWidth:150, outline:'none',
          boxShadow:'0 1px 4px rgba(15,23,42,0.05)',
        }}
      >
        {children}
      </select>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Calendrier mensuel
   ══════════════════════════════════════════════ */
function CalendarGrid({ year, month, rdvByDay, selectedDate, onSelectDay }) {
  const firstOfMonth = new Date(year, month, 1);
  // Lundi = 0 ... Dimanche = 6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = todayISO();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:6 }}>
        {JOURS_LABELS.map(j => (
          <div key={j} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.6, padding:'4px 0' }}>
            {j}
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const dayRdv = rdvByDay[dateStr] || [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const visible = dayRdv.slice(0, 3);
          const overflow = dayRdv.length - visible.length;

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDay(dateStr)}
              style={{
                minHeight:78, borderRadius:10, padding:'6px 6px',
                cursor:'pointer',
                background: isSelected ? '#eff6ff' : '#fff',
                border: isSelected ? '1.5px solid #2563eb' : '1px solid rgba(37,99,235,0.08)',
                transition:'all 0.12s',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
            >
              <div style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:20, height:20, borderRadius:'50%',
                fontSize:11, fontWeight:700, marginBottom:4,
                background: isToday ? '#2563eb' : 'transparent',
                color: isToday ? '#fff' : '#334155',
              }}>
                {d}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {visible.map(r => (
                  <div key={r.id} style={{
                    fontSize:9, padding:'1px 5px', borderRadius:5,
                    background: `${STATUT_RDV_COLORS[r.statut] || '#94a3b8'}16`,
                    color: STATUT_RDV_COLORS[r.statut] || '#64748b',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    fontWeight:600,
                  }}>
                    {r.heure} {r.patient_nom}
                  </div>
                ))}
                {overflow > 0 && (
                  <div style={{ fontSize:9, color:'#94a3b8', fontWeight:600, paddingLeft:5 }}>+{overflow} autre(s)</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Liste des RDV d'une journée sélectionnée
   ══════════════════════════════════════════════ */
function RdvListPanel({ date, rdvs, onStatusChange }) {
  const dateObj = date ? new Date(`${date}T00:00:00`) : null;
  const dateLabel = dateObj
    ? dateObj.toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    : '';

  return (
    <ChartCard
      title={date ? dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1) : 'Sélectionnez un jour'}
      sub={date ? `${rdvs.length} rendez-vous` : 'Cliquez sur une date dans le calendrier'}
      actions={
        date && (
          <Link to={`/rendezvous/nouveau?date=${date}`} style={{ textDecoration:'none' }}>
            <div style={{
              padding:'7px 14px', background:'linear-gradient(135deg,#3b82f6,#2563eb)',
              borderRadius:9, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
              boxShadow:'0 2px 8px rgba(37,99,235,0.25)',
            }}>
              + Nouveau RDV
            </div>
          </Link>
        )
      }
    >
      {!date ? (
        <div style={{ padding:'40px 0', textAlign:'center', color:'#94a3b8', fontSize:12 }}>
          Aucune date sélectionnée.
        </div>
      ) : rdvs.length === 0 ? (
        <div style={{ padding:'40px 0', textAlign:'center', color:'#94a3b8', fontSize:12 }}>
          Aucun rendez-vous ce jour-là.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:420, overflowY:'auto' }}>
          {rdvs
            .slice()
            .sort((a, b) => a.heure.localeCompare(b.heure))
            .map(r => (
              <div key={r.id} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 12px', borderRadius:10,
                border:'1px solid rgba(37,99,235,0.08)',
                background:'#fbfcfe',
              }}>
                <div style={{
                  fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700,
                  color:'#2563eb', minWidth:48, textAlign:'center',
                }}>
                  {r.heure}
                </div>
                <div style={{ width:1, alignSelf:'stretch', background:'rgba(37,99,235,0.08)' }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {r.patient_nom}
                  </div>
                  <div style={{ fontSize:11, color:'#64748b' }}>
                    {TYPE_RDV_LABELS[r.type] || r.type} · Dr. {r.medecin_nom}
                  </div>
                </div>
                <select
                  value={r.statut}
                  onChange={e => onStatusChange(r.id, e.target.value)}
                  style={{
                    fontSize:10, fontWeight:700, padding:'4px 8px', borderRadius:99,
                    border:`1px solid ${STATUT_RDV_COLORS[r.statut]}30`,
                    background:`${STATUT_RDV_COLORS[r.statut]}10`,
                    color: STATUT_RDV_COLORS[r.statut], cursor:'pointer', outline:'none',
                  }}
                >
                  {Object.entries(STATUT_RDV_LABELS).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </div>
            ))}
        </div>
      )}
    </ChartCard>
  );
}

/* ══════════════════════════════════════════════
   Cloche de notifications — RDV à venir
   ══════════════════════════════════════════════ */
function formatJourRelatif(dateStr) {
  const today = todayISO();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return "Aujourd'hui";
  if (dateStr === tomorrow) return 'Demain';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-DZ', { weekday:'short', day:'numeric', month:'short' });
}

function NotificationBell({ items, open, onToggle, onSelect }) {
  return (
    <div style={{ position:'relative' }}>
      <button
        onClick={onToggle}
        style={{
          width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center',
          background:'#fff', border:'1px solid rgba(37,99,235,0.18)', borderRadius:10,
          cursor:'pointer', position:'relative', boxShadow:'0 2px 6px rgba(15,23,42,0.06)',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {items.length > 0 && (
          <span style={{
            position:'absolute', top:-4, right:-4,
            background:'#dc2626', color:'#fff', fontSize:9, fontWeight:800,
            borderRadius:99, minWidth:17, height:17, padding:'0 4px',
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'2px solid #fff',
          }}>
            {items.length > 9 ? '9+' : items.length}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position:'absolute', top:46, right:0, width:320, zIndex:20,
          background:'#fff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:14,
          boxShadow:'0 12px 32px rgba(15,23,42,0.14)', overflow:'hidden',
        }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(37,99,235,0.08)', fontSize:12, fontWeight:700, color:'#0f172a' }}>
            Rendez-vous à venir (72h)
          </div>
          {items.length === 0 ? (
            <div style={{ padding:'24px 16px', textAlign:'center', color:'#94a3b8', fontSize:12 }}>
              Aucun rendez-vous dans les 3 prochains jours.
            </div>
          ) : (
            <div style={{ maxHeight:320, overflowY:'auto' }}>
              {items.map(r => (
                <div
                  key={r.id}
                  onClick={() => onSelect(r.date)}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'10px 16px', cursor:'pointer',
                    borderBottom:'1px solid rgba(37,99,235,0.06)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width:6, height:6, borderRadius:'50%', flexShrink:0,
                    background: STATUT_RDV_COLORS[r.statut] || '#94a3b8',
                  }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.patient_nom}
                    </div>
                    <div style={{ fontSize:11, color:'#64748b' }}>
                      {formatJourRelatif(r.date)} à {r.heure} · {TYPE_RDV_LABELS[r.type] || r.type}
                    </div>
                  </div>
                  {r.source === 'consultation' && (
                    <span style={{ fontSize:9, fontWeight:700, color:'#7c3aed', background:'#7c3aed14', padding:'2px 6px', borderRadius:6 }}>
                      Suivi
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN — SecretairePage
   ══════════════════════════════════════════════ */
export default function SecretairePage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [rdvs, setRdvs]   = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const [filterMedecin, setFilterMedecin] = useState('');
  const [filterType, setFilterType]       = useState('');
  const [filterStatut, setFilterStatut]   = useState('');

  const [upcoming, setUpcoming]   = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: r }, { data: s }] = await Promise.all([
        secretaryService.getRendezVous({ mois: month + 1, annee: year }),
        secretaryService.getStats(),
      ]);
      setRdvs(r);
      setStats(s);
    } catch (err) {
      console.error('Secrétaire error:', err);
    } finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Notifications : RDV secrétariat classiques + "prochaine_consultation"
     saisies depuis NewConsultationPage, fusionnés et triés sur les 72h à venir. */
  const fetchUpcoming = useCallback(async () => {
    try {
      const [{ data: rdvUpcoming }, { data: consultUpcoming }] = await Promise.all([
        secretaryService.getUpcoming({ jours: 3 }),
        suiviService.consultations.upcoming({ jours: 3 }),
      ]);

      const fromRdv = (rdvUpcoming || []).map(r => ({ ...r, source: 'rdv' }));

      // Les consultations avec une "prochaine_consultation" renseignée sont
      // affichées comme RDV même tant qu'elles n'ont pas encore été
      // formellement créées dans le module secrétariat.
      const fromConsultations = (consultUpcoming || []).map(c => ({
        id: `consult-${c.id}`,
        date: c.prochaine_consultation,
        heure: c.heure_prochaine_consultation || '--:--',
        patient_nom: c.patient_nom,
        medecin_nom: c.medecin_nom,
        type: 'suivi',
        statut: 'confirme',
        source: 'consultation',
      }));

      const merged = [...fromRdv, ...fromConsultations]
        .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));

      setUpcoming(merged);
    } catch (err) {
      console.error('Erreur chargement notifications RDV:', err);
    }
  }, []);

  useEffect(() => {
    fetchUpcoming();
    const interval = setInterval(fetchUpcoming, 5 * 60 * 1000); // rafraîchi toutes les 5 min
    return () => clearInterval(interval);
  }, [fetchUpcoming]);

  const handleNotifSelect = (dateStr) => {
    const [y, m] = dateStr.split('-').map(Number);
    setYear(y); setMonth(m - 1); setSelectedDate(dateStr);
    setNotifOpen(false);
  };

  const medecinsOptions = useMemo(
    () => [...new Set(rdvs.map(r => r.medecin_nom))].filter(Boolean).sort(),
    [rdvs]
  );

  const filteredRdvs = useMemo(() => rdvs.filter(r =>
    (!filterMedecin || r.medecin_nom === filterMedecin) &&
    (!filterType    || r.type === filterType) &&
    (!filterStatut  || r.statut === filterStatut)
  ), [rdvs, filterMedecin, filterType, filterStatut]);

  const rdvByDay = useMemo(() => {
    const map = {};
    filteredRdvs.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [filteredRdvs]);

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else { setMonth(m => m - 1); }
  };
  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else { setMonth(m => m + 1); }
  };
  const handleToday = () => {
    setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDate(todayISO());
  };

  const handleStatusChange = async (id, statut) => {
    setRdvs(prev => prev.map(r => r.id === id ? { ...r, statut } : r));
    try {
      await secretaryService.updateStatut(id, statut);
    } catch (err) {
      console.error('Erreur mise à jour statut:', err);
      fetchData();
    }
  };

  if (loading && !stats) return (
    <AppLayout title="Secrétariat">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:44, height:44, border:'3px solid #dbeafe', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }} />
          <div style={{ color:'#64748b', fontSize:14 }}>Chargement du calendrier...</div>
        </div>
      </div>
    </AppLayout>
  );

  const k = stats || {};

  return (
    <AppLayout title="Secrétariat">

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:3 }}>
            Secrétariat — Rendez-vous
          </h2>
          <div style={{ fontSize:11, color:'#94a3b8' }}>
            Gestion des rendez-vous et du planning des consultations
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <NotificationBell
            items={upcoming}
            open={notifOpen}
            onToggle={() => setNotifOpen(o => !o)}
            onSelect={handleNotifSelect}
          />
          <Link to="/rendezvous/nouveau" style={{ textDecoration:'none' }}>
            <button style={{
              padding:'9px 18px', background:'linear-gradient(135deg,#3b82f6,#2563eb)',
              border:'none', borderRadius:10, color:'#fff',
              fontSize:12, fontWeight:600, cursor:'pointer',
              boxShadow:'0 2px 8px rgba(37,99,235,0.25)',
            }}>
              + Nouveau rendez-vous
            </button>
          </Link>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        <KPICard label="RDV aujourd'hui"     value={k.rdv_aujourdhui}   color="#2563eb" icon="" />
        <KPICard label="Cette semaine"        value={k.rdv_semaine}     color="#7c3aed" icon="" />
        <KPICard label="En attente"           value={k.rdv_en_attente}  color="#d97706" icon="" />
        <KPICard label="Confirmés"            value={k.rdv_confirmes}   color="#16a34a" icon="" />
        <KPICard label="Annulés (ce mois)"    value={k.rdv_annules}     color="#dc2626" icon="" />
      </div>

      {/* ── Filtres ── */}
      <div style={{
        display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end',
        background:'#fff', border:'1px solid rgba(37,99,235,0.1)', borderRadius:14,
        padding:'16px 20px', marginBottom:16,
        boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
      }}>
        <FilterSelect label="Médecin" value={filterMedecin} onChange={setFilterMedecin}>
          <option value="">Tous les médecins</option>
          {medecinsOptions.map(m => <option key={m} value={m}>Dr. {m}</option>)}
        </FilterSelect>
        <FilterSelect label="Type" value={filterType} onChange={setFilterType}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_RDV_LABELS).map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}
        </FilterSelect>
        <FilterSelect label="Statut" value={filterStatut} onChange={setFilterStatut}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_RDV_LABELS).map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}
        </FilterSelect>
        {(filterMedecin || filterType || filterStatut) && (
          <button
            onClick={() => { setFilterMedecin(''); setFilterType(''); setFilterStatut(''); }}
            style={{
              fontSize:11, padding:'7px 14px',
              background:'transparent', color:'#94a3b8',
              border:'1px solid rgba(148,163,184,0.3)', borderRadius:9,
              cursor:'pointer',
            }}
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* ── Calendrier + Panneau du jour ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16, marginBottom:16, alignItems:'start' }}>

        <ChartCard
          title={`${MOIS_LABELS[month]} ${year}`}
          sub="Cliquez sur un jour pour voir le détail des rendez-vous"
          actions={
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={handlePrevMonth} style={navBtnStyle}>‹</button>
              <button onClick={handleToday} style={{ ...navBtnStyle, width:'auto', padding:'0 12px', fontSize:11, fontWeight:700 }}>Aujourd'hui</button>
              <button onClick={handleNextMonth} style={navBtnStyle}>›</button>
            </div>
          }
        >
          <CalendarGrid
            year={year} month={month}
            rdvByDay={rdvByDay}
            selectedDate={selectedDate}
            onSelectDay={setSelectedDate}
          />
          {/* Légende */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', marginTop:16, paddingTop:14, borderTop:'1px solid rgba(37,99,235,0.08)' }}>
            {Object.entries(STATUT_RDV_LABELS).map(([k2, l]) => (
              <div key={k2} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#64748b' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:STATUT_RDV_COLORS[k2] }} />
                {l}
              </div>
            ))}
          </div>
        </ChartCard>

        <RdvListPanel
          date={selectedDate}
          rdvs={rdvByDay[selectedDate] || []}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* ── Accès rapides ── */}
      <div style={{ background:'#fff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:14, padding:'18px 22px', boxShadow:'0 2px 8px rgba(15,23,42,0.06)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.2, marginBottom:14 }}>Accès rapides</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { to:'/rendezvous/nouveau',              label:'+ Nouveau rendez-vous', color:'#2563eb' },
            { to:'/rendezvous',                      label:'Tous les rendez-vous',  color:'#7c3aed' },
            { to:'/patients/nouveau',                label:'+ Nouveau patient',     color:'#16a34a' },
            { to:'/patients',                        label:'Liste patients',        color:'#0891b2' },
          ].map(item => (
            <Link key={item.to} to={item.to} style={{ textDecoration:'none' }}>
              <div
                style={{ padding:'8px 16px', background:`${item.color}08`, border:`1px solid ${item.color}20`, borderRadius:10, color:item.color, fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background=`${item.color}18`; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background=`${item.color}08`; e.currentTarget.style.transform='none'; }}
              >
                {item.label}
              </div>
            </Link>
          ))}
        </div>
      </div>

    </AppLayout>
  );
}

const navBtnStyle = {
  width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
  background:'#fff', border:'1px solid rgba(37,99,235,0.18)', borderRadius:8,
  color:'#2563eb', fontSize:15, fontWeight:700, cursor:'pointer',
  boxShadow:'0 1px 4px rgba(15,23,42,0.05)',
};