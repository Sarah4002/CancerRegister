import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { secretaryService } from '../../services/secretaryService';
import { suiviService } from '../../services/suiviService';
import { patientService } from '../../services/patientService';
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
const JOURS_LABELS_LONG = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const normalize = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/* Renvoie le lundi (ISO) de la semaine contenant dateStr */
function getWeekStart(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const offset = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}
function addDaysISO(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function getWeekDates(weekStartStr) {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStartStr, i));
}

/* Clé utilisée pour détecter les doubles réservations d'un même médecin */
function conflictKey(r) {
  return `${r.medecin_nom}__${r.date}__${r.heure}`;
}

/* Statuts considérés comme "actifs" : pas encore finalisés manuellement */
const STATUTS_ACTIFS = ['en_attente', 'confirme'];

/* Un RDV est en retard si sa date/heure est déjà passée et que personne
   (médecin ou secrétaire) n'a changé son statut depuis. */
function isPastDue(r) {
  if (!r.date || !r.heure) return false;
  const dt = new Date(`${r.date}T${r.heure}:00`);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.getTime() < Date.now();
}

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

function ChartCard({ title, sub, children, span = 1, actions, className }) {
  return (
    <div className={className} style={{
      background:'#fff', border:'1px solid rgba(37,99,235,0.08)',
      borderRadius:14, padding:'20px 22px',
      boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
      gridColumn: span === 2 ? '1 / -1' : 'auto',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
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

/* Champ de recherche rapide (patient / médecin) */
function SearchField({ value, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:220 }}>
      <span style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1 }}>Recherche</span>
      <div style={{ position:'relative' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.4"
          style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Nom du patient ou du médecin..."
          style={{
            width:'100%', fontSize:12, padding:'7px 10px 7px 30px',
            border:'1px solid rgba(37,99,235,0.18)', borderRadius:9,
            background:'#fff', color:'#334155', outline:'none',
            boxShadow:'0 1px 4px rgba(15,23,42,0.05)',
          }}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            style={{
              position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
              border:'none', background:'transparent', color:'#94a3b8', cursor:'pointer',
              fontSize:13, lineHeight:1, padding:2,
            }}
            aria-label="Effacer la recherche"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/* Petite pastille d'alerte générique (conflit médecin, doublon patient, etc.) */
function AlertFlag({ title, color = '#dc2626' }) {
  return (
    <span
      title={title}
      style={{
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        width:14, height:14, borderRadius:'50%', flexShrink:0,
        background:`${color}18`, color, fontSize:9, fontWeight:800,
        border:`1px solid ${color}40`,
      }}
    >
      !
    </span>
  );
}

/* Rétro-compatibilité : ancien nom utilisé partout dans le fichier pour le conflit médecin */
function ConflictFlag({ title = 'Conflit : ce médecin a un autre RDV à la même heure' }) {
  return <AlertFlag title={title} color="#dc2626" />;
}

/* Pastille pour un doublon de patient : le même patient a déjà un autre
   rendez-vous actif (en attente / confirmé) à venir. */
function DuplicatePatientFlag({ title = 'Ce patient a déjà un autre rendez-vous actif' }) {
  return <AlertFlag title={title} color="#d97706" />;
}

/* ══════════════════════════════════════════════
   Calendrier mensuel (avec drag & drop + conflits)
   ══════════════════════════════════════════════ */
function CalendarGrid({ year, month, rdvByDay, selectedDate, onSelectDay, conflictIds, patientDuplicateIds, onDropRdv, searchActive }) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = todayISO();
  const [dragOverDate, setDragOverDate] = useState(null);

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
          const isDragOver = dateStr === dragOverDate;
          const visible = dayRdv.slice(0, 3);
          const overflow = dayRdv.length - visible.length;

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDay(dateStr)}
              onDragOver={e => { e.preventDefault(); setDragOverDate(dateStr); }}
              onDragLeave={() => setDragOverDate(prev => (prev === dateStr ? null : prev))}
              onDrop={e => {
                e.preventDefault();
                setDragOverDate(null);
                const rdvId = e.dataTransfer.getData('text/rdv-id');
                if (rdvId) onDropRdv(rdvId, dateStr);
              }}
              style={{
                minHeight:78, borderRadius:10, padding:'6px 6px',
                cursor:'pointer',
                background: isDragOver ? '#dbeafe' : isSelected ? '#eff6ff' : '#fff',
                border: isDragOver ? '1.5px dashed #2563eb' : isSelected ? '1.5px solid #2563eb' : '1px solid rgba(37,99,235,0.08)',
                transition:'all 0.12s',
              }}
              onMouseEnter={e => { if (!isSelected && !isDragOver) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (!isSelected && !isDragOver) e.currentTarget.style.background = '#fff'; }}
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
                {visible.map(r => {
                  const isConflict = conflictIds.has(r.id);
                  const isDuplicate = patientDuplicateIds.has(r.id);
                  const isMatch = searchActive && searchActive(r);
                  return (
                    <div
                      key={r.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('text/rdv-id', String(r.id));
                        e.stopPropagation();
                      }}
                      onClick={e => e.stopPropagation()}
                      title={isConflict ? 'Conflit de planning pour ce médecin' : isDuplicate ? 'Ce patient a déjà un autre rendez-vous actif' : undefined}
                      style={{
                        display:'flex', alignItems:'center', gap:3,
                        fontSize:9, padding:'1px 5px', borderRadius:5,
                        background: `${STATUT_RDV_COLORS[r.statut] || '#94a3b8'}16`,
                        color: STATUT_RDV_COLORS[r.statut] || '#64748b',
                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                        fontWeight:600, cursor:'grab',
                        outline: isMatch ? '1.5px solid #7c3aed' : isConflict ? '1.5px solid #dc2626' : isDuplicate ? '1.5px solid #d97706' : 'none',
                      }}
                    >
                      {isConflict && <ConflictFlag />}
                      {!isConflict && isDuplicate && <DuplicatePatientFlag />}
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{r.heure} {r.patient_nom}</span>
                    </div>
                  );
                })}
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
   Vue semaine (avec drag & drop + conflits)
   ══════════════════════════════════════════════ */
function WeekGrid({ weekDates, rdvByDay, selectedDate, onSelectDay, conflictIds, patientDuplicateIds, onDropRdv, searchActive }) {
  const todayStr = todayISO();
  const [dragOverDate, setDragOverDate] = useState(null);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6 }}>
      {weekDates.map((dateStr, idx) => {
        const dayRdv = (rdvByDay[dateStr] || []).slice().sort((a, b) => a.heure.localeCompare(b.heure));
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedDate;
        const isDragOver = dateStr === dragOverDate;
        const dayNum = Number(dateStr.slice(8, 10));

        return (
          <div
            key={dateStr}
            onClick={() => onSelectDay(dateStr)}
            onDragOver={e => { e.preventDefault(); setDragOverDate(dateStr); }}
            onDragLeave={() => setDragOverDate(prev => (prev === dateStr ? null : prev))}
            onDrop={e => {
              e.preventDefault();
              setDragOverDate(null);
              const rdvId = e.dataTransfer.getData('text/rdv-id');
              if (rdvId) onDropRdv(rdvId, dateStr);
            }}
            style={{
              minHeight:260, borderRadius:10, padding:'8px 6px',
              cursor:'pointer', display:'flex', flexDirection:'column', gap:6,
              background: isDragOver ? '#dbeafe' : isSelected ? '#eff6ff' : '#fff',
              border: isDragOver ? '1.5px dashed #2563eb' : isSelected ? '1.5px solid #2563eb' : '1px solid rgba(37,99,235,0.08)',
              transition:'all 0.12s',
            }}
          >
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.5 }}>
                {JOURS_LABELS[idx]}
              </div>
              <div style={{
                display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:22, height:22, borderRadius:'50%', marginTop:2,
                fontSize:12, fontWeight:700,
                background: isToday ? '#2563eb' : 'transparent',
                color: isToday ? '#fff' : '#334155',
              }}>
                {dayNum}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:4, overflowY:'auto', flex:1 }}>
              {dayRdv.length === 0 && (
                <div style={{ fontSize:10, color:'#cbd5e1', textAlign:'center', marginTop:10 }}>—</div>
              )}
              {dayRdv.map(r => {
                const isConflict = conflictIds.has(r.id);
                const isDuplicate = patientDuplicateIds.has(r.id);
                const isMatch = searchActive && searchActive(r);
                return (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('text/rdv-id', String(r.id));
                      e.stopPropagation();
                    }}
                    onClick={e => e.stopPropagation()}
                    title={isConflict ? 'Conflit de planning pour ce médecin' : isDuplicate ? 'Ce patient a déjà un autre rendez-vous actif' : undefined}
                    style={{
                      display:'flex', flexDirection:'column', gap:1,
                      fontSize:10, padding:'4px 6px', borderRadius:7,
                      background: `${STATUT_RDV_COLORS[r.statut] || '#94a3b8'}14`,
                      border: isMatch ? '1.5px solid #7c3aed' : isConflict ? '1.5px solid #dc2626' : isDuplicate ? '1.5px solid #d97706' : `1px solid ${STATUT_RDV_COLORS[r.statut] || '#94a3b8'}30`,
                      cursor:'grab',
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:4, fontWeight:700, color: STATUT_RDV_COLORS[r.statut] || '#64748b' }}>
                      {isConflict && <ConflictFlag />}
                      {!isConflict && isDuplicate && <DuplicatePatientFlag />}
                      {r.heure}
                    </div>
                    <div style={{ color:'#0f172a', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.patient_nom}
                    </div>
                    <div style={{ color:'#94a3b8', fontSize:9 }}>Dr. {r.medecin_nom}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Liste des RDV d'une journée sélectionnée
   ══════════════════════════════════════════════ */
function RdvListPanel({ date, rdvs, onStatusChange, conflictIds, patientDuplicateIds, onSendReminder, reminderState, onPrint }) {
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
          <div style={{ display:'flex', gap:8 }}>
            {rdvs.length > 0 && (
              <button
                onClick={onPrint}
                title="Imprimer / exporter en PDF"
                style={{
                  padding:'7px 12px', background:'#fff', border:'1px solid rgba(37,99,235,0.18)',
                  borderRadius:9, color:'#2563eb', fontSize:12, fontWeight:600, cursor:'pointer',
                }}
              >
                Imprimer
              </button>
            )}
            <Link to={`/secretaire/rendezvous/nouveau?date=${date}`} style={{ textDecoration:'none' }}>
              <div style={{
                padding:'7px 14px', background:'linear-gradient(135deg,#3b82f6,#2563eb)',
                borderRadius:9, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
                boxShadow:'0 2px 8px rgba(37,99,235,0.25)',
              }}>
                + Nouveau RDV
              </div>
            </Link>
          </div>
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
            .map(r => {
              const isConflict = conflictIds.has(r.id);
              const isDuplicate = patientDuplicateIds.has(r.id);
              const rState = reminderState[r.id];
              return (
                <div key={r.id} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 12px', borderRadius:10,
                  border: isConflict ? '1px solid #dc262650' : isDuplicate ? '1px solid #d9770650' : '1px solid rgba(37,99,235,0.08)',
                  background: isConflict ? '#fef2f2' : isDuplicate ? '#fffbeb' : '#fbfcfe',
                }}>
                  <div style={{
                    fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700,
                    color:'#2563eb', minWidth:48, textAlign:'center',
                  }}>
                    {r.heure}
                  </div>
                  <div style={{ width:1, alignSelf:'stretch', background:'rgba(37,99,235,0.08)' }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {isConflict && <ConflictFlag />}
                      {!isConflict && isDuplicate && <DuplicatePatientFlag />}
                      <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {r.patient_nom}
                      </div>
                    </div>
                    <div style={{ fontSize:11, color:'#64748b' }}>
                      {TYPE_RDV_LABELS[r.type] || r.type} · Dr. {r.medecin_nom}
                      {isDuplicate && !isConflict && (
                        <span style={{ color:'#d97706', fontWeight:600 }}> · Doublon patient</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onSendReminder(r)}
                    disabled={rState === 'sending' || rState === 'sent'}
                    title="Envoyer un rappel SMS/email au patient"
                    style={{
                      fontSize:10, fontWeight:700, padding:'5px 9px', borderRadius:8,
                      border: '1px solid rgba(124,58,237,0.25)',
                      background: rState === 'sent' ? '#16a34a14' : '#7c3aed10',
                      color: rState === 'sent' ? '#16a34a' : rState === 'error' ? '#dc2626' : '#7c3aed',
                      cursor: rState === 'sending' || rState === 'sent' ? 'default' : 'pointer',
                      whiteSpace:'nowrap',
                    }}
                  >
                    {rState === 'sending' ? 'Envoi...' : rState === 'sent' ? '✓ Envoyé' : rState === 'error' ? 'Échec — réessayer' : 'Rappel'}
                  </button>
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
              );
            })}
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

function NotificationBell({ items, open, onToggle, onSelect, live }) {
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
        <span
          title={live ? 'Notifications en temps réel actives' : 'Rafraîchissement périodique (polling)'}
          style={{
            position:'absolute', bottom:-2, right:-2, width:8, height:8, borderRadius:'50%',
            background: live ? '#16a34a' : '#cbd5e1', border:'1.5px solid #fff',
          }}
        />
      </button>

      {open && (
        <div style={{
          position:'absolute', top:46, right:0, width:320, zIndex:20,
          background:'#fff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:14,
          boxShadow:'0 12px 32px rgba(15,23,42,0.14)', overflow:'hidden',
        }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(37,99,235,0.08)', fontSize:12, fontWeight:700, color:'#0f172a', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>Rendez-vous à venir (72h)</span>
            <span style={{ fontSize:9, fontWeight:700, color: live ? '#16a34a' : '#94a3b8', textTransform:'uppercase' }}>
              {live ? '● Live' : '○ Polling'}
            </span>
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
   Zone imprimable (masquée à l'écran, visible à l'impression)
   ══════════════════════════════════════════════ */
function PrintArea({ label, rdvs }) {
  const sorted = rdvs.slice().sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
  return (
    <div className="print-area">
      <h1 style={{ fontSize:18, marginBottom:4 }}>Planning — {label}</h1>
      <div style={{ fontSize:11, color:'#555', marginBottom:16 }}>
        Généré le {new Date().toLocaleDateString('fr-DZ')} à {new Date().toLocaleTimeString('fr-DZ', { hour:'2-digit', minute:'2-digit' })}
      </div>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
        <thead>
          <tr>
            {['Date','Heure','Patient','Médecin','Type','Statut'].map(h => (
              <th key={h} style={{ textAlign:'left', borderBottom:'1.5px solid #000', padding:'4px 6px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.id}>
              <td style={{ borderBottom:'1px solid #ccc', padding:'4px 6px' }}>{r.date}</td>
              <td style={{ borderBottom:'1px solid #ccc', padding:'4px 6px' }}>{r.heure}</td>
              <td style={{ borderBottom:'1px solid #ccc', padding:'4px 6px' }}>{r.patient_nom}</td>
              <td style={{ borderBottom:'1px solid #ccc', padding:'4px 6px' }}>Dr. {r.medecin_nom}</td>
              <td style={{ borderBottom:'1px solid #ccc', padding:'4px 6px' }}>{TYPE_RDV_LABELS[r.type] || r.type}</td>
              <td style={{ borderBottom:'1px solid #ccc', padding:'4px 6px' }}>{STATUT_RDV_LABELS[r.statut] || r.statut}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={6} style={{ padding:'10px 6px', color:'#777' }}>Aucun rendez-vous.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Hook temps réel : WebSocket si dispo, sinon polling
   ══════════════════════════════════════════════ */
function useRealtimeUpcoming(fetchUpcoming) {
  const [live, setLive] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    let interval;
    let cancelled = false;

    // Si le service expose une URL de WebSocket, on tente une connexion
    // temps réel ; sinon on retombe sur le polling classique (5 min).
    const wsUrlGetter = secretaryService.getRealtimeSocketUrl;
    const wsUrl = typeof wsUrlGetter === 'function' ? wsUrlGetter() : null;

    if (wsUrl) {
      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;
        socket.onopen = () => { if (!cancelled) setLive(true); };
        socket.onmessage = () => { if (!cancelled) fetchUpcoming(); };
        socket.onerror = () => { if (!cancelled) setLive(false); };
        socket.onclose = () => {
          if (cancelled) return;
          setLive(false);
          // repli sur le polling si le socket tombe
          interval = setInterval(fetchUpcoming, 5 * 60 * 1000);
        };
      } catch {
        interval = setInterval(fetchUpcoming, 5 * 60 * 1000);
      }
    } else {
      interval = setInterval(fetchUpcoming, 5 * 60 * 1000);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (socketRef.current) socketRef.current.close();
    };
  }, [fetchUpcoming]);

  return live;
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

  const [viewMode, setViewMode] = useState('mois'); // 'mois' | 'semaine'
  const [weekStart, setWeekStart] = useState(getWeekStart(todayISO()));

  const [filterMedecin, setFilterMedecin] = useState('');
  const [filterType, setFilterType]       = useState('');
  const [filterStatut, setFilterStatut]   = useState('');
  const [searchQuery, setSearchQuery]     = useState('');

  const [upcoming, setUpcoming]   = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [reminderState, setReminderState] = useState({}); // { [rdvId]: 'sending'|'sent'|'error' }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: r }, { data: s }, { data: p }] = await Promise.all([
        secretaryService.getRendezVous({ mois: month + 1, annee: year }),
        secretaryService.getStats(),
        patientService.getEnAttente(),
      ]);
      setRdvs(r);
      setStats(s);
      setPendingPatients(p.results || p || []);
    } catch (err) {
      console.error('Secrétaire error:', err);
    } finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Passage automatique en "Absent" ──
     Si l'heure du RDV est dépassée et que ni le médecin ni la secrétaire
     n'ont changé le statut (toujours "en_attente" ou "confirme"), le RDV
     passe automatiquement à "absent". Vérifié au chargement puis toutes
     les 60s, avec répercussion sur le backend en arrière-plan. */
  const checkNoShows = useCallback(() => {
    setRdvs(prev => {
      let changed = false;
      const next = prev.map(r => {
        if (STATUTS_ACTIFS.includes(r.statut) && isPastDue(r)) {
          changed = true;
          secretaryService.updateStatut(r.id, 'absent').catch(err => {
            console.error(`Erreur passage automatique en "absent" du RDV ${r.id}:`, err);
          });
          return { ...r, statut: 'absent' };
        }
        return r;
      });
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    checkNoShows();
    const interval = setInterval(checkNoShows, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkNoShows, rdvs.length]);

  /* Notifications : RDV secrétariat classiques + "prochaine_consultation"
     saisies depuis NewConsultationPage, fusionnés et triés sur les 72h à venir. */
  const fetchUpcoming = useCallback(async () => {
    try {
      const [{ data: rdvUpcoming }, { data: consultUpcoming }] = await Promise.all([
        secretaryService.getUpcoming({ jours: 3 }),
        suiviService.consultations.upcoming({ jours: 3 }),
      ]);

      const fromRdv = (rdvUpcoming || []).map(r => ({ ...r, source: 'rdv' }));

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

  useEffect(() => { fetchUpcoming(); }, [fetchUpcoming]);
  // Temps réel si le backend expose un WebSocket, sinon polling (5 min) en repli automatique.
  const isLive = useRealtimeUpcoming(fetchUpcoming);

  const handleNotifSelect = (dateStr) => {
    const [y, m] = dateStr.split('-').map(Number);
    setYear(y); setMonth(m - 1); setSelectedDate(dateStr);
    setWeekStart(getWeekStart(dateStr));
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

  /* Détection de conflits : même médecin + même date + même heure */
  const conflictIds = useMemo(() => {
    const counts = {};
    filteredRdvs.forEach(r => {
      if (!r.medecin_nom || !r.heure) return;
      const key = conflictKey(r);
      counts[key] = (counts[key] || 0) + 1;
    });
    const ids = new Set();
    filteredRdvs.forEach(r => {
      if (counts[conflictKey(r)] > 1) ids.add(r.id);
    });
    return ids;
  }, [filteredRdvs]);

  const conflictCount = useMemo(() => {
    const seen = new Set();
    let n = 0;
    filteredRdvs.forEach(r => {
      const key = conflictKey(r);
      if (conflictIds.has(r.id) && !seen.has(key)) { seen.add(key); n++; }
    });
    return n;
  }, [filteredRdvs, conflictIds]);

  /* Détection de doublons patient : un même patient a déjà un autre RDV
     actif (en_attente / confirme) à venir — sert à empêcher la création
     ou le déplacement d'un rendez-vous en double. Le(s) rendez-vous déjà
     existant(s) ne sont jamais modifiés automatiquement ; ils gardent
     leur statut (par ex. "En attente") tel quel. */
  const patientDuplicateIds = useMemo(() => {
    const today = todayISO();
    const counts = {};
    rdvs.forEach(r => {
      if (!r.patient_nom || !STATUTS_ACTIFS.includes(r.statut) || r.date < today) return;
      const key = normalize(r.patient_nom);
      counts[key] = (counts[key] || 0) + 1;
    });
    const ids = new Set();
    rdvs.forEach(r => {
      if (!r.patient_nom || !STATUTS_ACTIFS.includes(r.statut) || r.date < today) return;
      const key = normalize(r.patient_nom);
      if (counts[key] > 1) ids.add(r.id);
    });
    return ids;
  }, [rdvs]);

  const duplicatePatientCount = useMemo(() => {
    const today = todayISO();
    const seen = new Set();
    let n = 0;
    rdvs.forEach(r => {
      if (!r.patient_nom || !STATUTS_ACTIFS.includes(r.statut) || r.date < today) return;
      const key = normalize(r.patient_nom);
      if (patientDuplicateIds.has(r.id) && !seen.has(key)) { seen.add(key); n++; }
    });
    return n;
  }, [rdvs, patientDuplicateIds]);

  /* Recherche rapide : fonction de correspondance réutilisée pour le surlignage */
  const searchMatch = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return null;
    return (r) => normalize(r.patient_nom).includes(q) || normalize(r.medecin_nom).includes(q);
  }, [searchQuery]);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekLabel = useMemo(() => {
    const start = new Date(`${weekDates[0]}T00:00:00`);
    const end = new Date(`${weekDates[6]}T00:00:00`);
    const sameMonth = start.getMonth() === end.getMonth();
    const startStr = start.toLocaleDateString('fr-DZ', { day:'numeric', month: sameMonth ? undefined : 'short' });
    const endStr = end.toLocaleDateString('fr-DZ', { day:'numeric', month:'short', year:'numeric' });
    return `${startStr} – ${endStr}`;
  }, [weekDates]);

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else { setMonth(m => m - 1); }
  };
  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else { setMonth(m => m + 1); }
  };
  const handlePrevWeek = () => {
    const newStart = addDaysISO(weekStart, -7);
    setWeekStart(newStart);
    const d = new Date(`${newStart}T00:00:00`);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };
  const handleNextWeek = () => {
    const newStart = addDaysISO(weekStart, 7);
    setWeekStart(newStart);
    const d = new Date(`${newStart}T00:00:00`);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  };
  const handleToday = () => {
    const t = todayISO();
    setYear(now.getFullYear()); setMonth(now.getMonth());
    setSelectedDate(t); setWeekStart(getWeekStart(t));
  };

  const handleSelectDay = (dateStr) => {
    setSelectedDate(dateStr);
    if (viewMode === 'semaine') setWeekStart(getWeekStart(dateStr));
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

  /* Drag & drop : déplace un RDV vers une nouvelle date.
     Empêche le déplacement si le patient a déjà un autre RDV actif
     (en_attente / confirme) ce jour-là : le RDV existant garde son
     statut ("En attente") et le déplacement est refusé. */
  const handleDropRdv = async (rdvIdRaw, newDate) => {
    const rdvId = /^\d+$/.test(rdvIdRaw) ? Number(rdvIdRaw) : rdvIdRaw;
    const target = rdvs.find(r => String(r.id) === String(rdvId));
    if (!target || target.date === newDate) return;

    const patientKey = normalize(target.patient_nom);
    const hasActiveDuplicate = rdvs.some(r =>
      String(r.id) !== String(rdvId) &&
      normalize(r.patient_nom) === patientKey &&
      r.date === newDate &&
      STATUTS_ACTIFS.includes(r.statut)
    );
    if (hasActiveDuplicate) {
      window.alert(
        `Impossible de déplacer ce rendez-vous : ${target.patient_nom} a déjà un rendez-vous actif ce jour-là. ` +
        `Le rendez-vous existant reste "En attente".`
      );
      return;
    }

    const previousDate = target.date;
    setRdvs(prev => prev.map(r => (String(r.id) === String(rdvId) ? { ...r, date: newDate } : r)));

    try {
      // NOTE : adapter le nom de méthode à votre secretaryService réel.
      if (typeof secretaryService.moveRendezVous === 'function') {
        await secretaryService.moveRendezVous(rdvId, newDate);
      } else if (typeof secretaryService.updateRendezVous === 'function') {
        await secretaryService.updateRendezVous(rdvId, { date: newDate });
      } else {
        console.warn('Aucune méthode secretaryService trouvée pour déplacer un RDV — à implémenter côté backend.');
      }
    } catch (err) {
      console.error('Erreur lors du déplacement du RDV:', err);
      setRdvs(prev => prev.map(r => (String(r.id) === String(rdvId) ? { ...r, date: previousDate } : r)));
    }
  };

  /* Rappel SMS/email — nécessite un endpoint backend secretaryService.sendReminder */
  const handleSendReminder = async (rdv) => {
    setReminderState(prev => ({ ...prev, [rdv.id]: 'sending' }));
    try {
      if (typeof secretaryService.sendReminder === 'function') {
        await secretaryService.sendReminder(rdv.id);
      } else {
        throw new Error('secretaryService.sendReminder non implémenté côté backend.');
      }
      setReminderState(prev => ({ ...prev, [rdv.id]: 'sent' }));
    } catch (err) {
      console.error('Erreur envoi du rappel:', err);
      setReminderState(prev => ({ ...prev, [rdv.id]: 'error' }));
    }
  };

  const handlePrint = () => window.print();

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
  const printLabel = viewMode === 'semaine' ? `Semaine du ${weekLabel}` : `${MOIS_LABELS[month]} ${year}`;
  const printRdvs = viewMode === 'semaine'
    ? filteredRdvs.filter(r => weekDates.includes(r.date))
    : filteredRdvs;

  return (
    <AppLayout title="Secrétariat">

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
        }
        .print-area { display: none; }
      `}</style>

      <div className="no-print">
        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
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
              live={isLive}
            />
            <Link to="/secretaire/rendezvous/nouveau" style={{ textDecoration:'none' }}>
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

        {conflictCount > 0 && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background:'#fef2f2', border:'1px solid #dc262640', borderRadius:12,
            padding:'10px 16px', marginBottom:12, fontSize:12, color:'#991b1b', fontWeight:600,
          }}>
            <ConflictFlag title="" />
            {conflictCount} conflit{conflictCount > 1 ? 's' : ''} de planning détecté{conflictCount > 1 ? 's' : ''} (un médecin avec deux RDV à la même heure).
          </div>
        )}

        {duplicatePatientCount > 0 && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background:'#fffbeb', border:'1px solid #d9770640', borderRadius:12,
            padding:'10px 16px', marginBottom:16, fontSize:12, color:'#92400e', fontWeight:600,
          }}>
            <DuplicatePatientFlag title="" />
            {duplicatePatientCount} patient{duplicatePatientCount > 1 ? 's ont' : ' a'} déjà un rendez-vous actif en double. La création ou le déplacement d'un nouveau RDV pour ce{duplicatePatientCount > 1 ? 's patients' : ' patient'} est bloqué tant que le doublon n'est pas résolu.
          </div>
        )}

        {/* ── Filtres + recherche ── */}
        <div style={{
          display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end',
          background:'#fff', border:'1px solid rgba(37,99,235,0.1)', borderRadius:14,
          padding:'16px 20px', marginBottom:16,
          boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
        }}>
          <SearchField value={searchQuery} onChange={setSearchQuery} />
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
          {(filterMedecin || filterType || filterStatut || searchQuery) && (
            <button
              onClick={() => { setFilterMedecin(''); setFilterType(''); setFilterStatut(''); setSearchQuery(''); }}
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
            title={viewMode === 'semaine' ? `Semaine du ${weekLabel}` : `${MOIS_LABELS[month]} ${year}`}
            sub={viewMode === 'semaine' ? 'Glissez-déposez un RDV pour changer son jour' : 'Cliquez sur un jour pour voir le détail des rendez-vous'}
            actions={
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <div style={{ display:'flex', border:'1px solid rgba(37,99,235,0.18)', borderRadius:9, overflow:'hidden' }}>
                  {['mois','semaine'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      style={{
                        padding:'6px 12px', fontSize:11, fontWeight:700, border:'none', cursor:'pointer',
                        background: viewMode === mode ? '#2563eb' : '#fff',
                        color: viewMode === mode ? '#fff' : '#2563eb',
                      }}
                    >
                      {mode === 'mois' ? 'Mois' : 'Semaine'}
                    </button>
                  ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <button onClick={viewMode === 'semaine' ? handlePrevWeek : handlePrevMonth} style={navBtnStyle}>‹</button>
                  <button onClick={handleToday} style={{ ...navBtnStyle, width:'auto', padding:'0 12px', fontSize:11, fontWeight:700 }}>Aujourd'hui</button>
                  <button onClick={viewMode === 'semaine' ? handleNextWeek : handleNextMonth} style={navBtnStyle}>›</button>
                </div>
              </div>
            }
          >
            {viewMode === 'semaine' ? (
              <WeekGrid
                weekDates={weekDates}
                rdvByDay={rdvByDay}
                selectedDate={selectedDate}
                onSelectDay={handleSelectDay}
                conflictIds={conflictIds}
                patientDuplicateIds={patientDuplicateIds}
                onDropRdv={handleDropRdv}
                searchActive={searchMatch}
              />
            ) : (
              <CalendarGrid
                year={year} month={month}
                rdvByDay={rdvByDay}
                selectedDate={selectedDate}
                onSelectDay={handleSelectDay}
                conflictIds={conflictIds}
                patientDuplicateIds={patientDuplicateIds}
                onDropRdv={handleDropRdv}
                searchActive={searchMatch}
              />
            )}
            {/* Légende */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', marginTop:16, paddingTop:14, borderTop:'1px solid rgba(37,99,235,0.08)' }}>
              {Object.entries(STATUT_RDV_LABELS).map(([k2, l]) => (
                <div key={k2} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#64748b' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:STATUT_RDV_COLORS[k2] }} />
                  {l}
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#64748b' }}>
                <ConflictFlag title="" /> Conflit de planning
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#64748b' }}>
                <DuplicatePatientFlag title="" /> Doublon patient
              </div>
              {searchQuery && (
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#64748b' }}>
                  <div style={{ width:9, height:9, borderRadius:3, border:'1.5px solid #7c3aed' }} /> Correspond à « {searchQuery} »
                </div>
              )}
            </div>
          </ChartCard>

          <RdvListPanel
            date={selectedDate}
            rdvs={rdvByDay[selectedDate] || []}
            onStatusChange={handleStatusChange}
            conflictIds={conflictIds}
            patientDuplicateIds={patientDuplicateIds}
            onSendReminder={handleSendReminder}
            reminderState={reminderState}
            onPrint={handlePrint}
          />
        </div>

        {/* ── Patients en attente ── */}
        <div style={{ background:'#fff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:14, padding:'18px 22px', boxShadow:'0 2px 8px rgba(15,23,42,0.06)', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.2 }}>Patients en attente</div>
            <Link to="/patients/en-attente" style={{ textDecoration:'none', fontSize:12, fontWeight:700, color:'#2563eb' }}>
              Voir tout
            </Link>
          </div>

          {pendingPatients.length === 0 ? (
            <div style={{ padding:'24px 0', textAlign:'center', color:'#94a3b8', fontSize:12 }}>
              Aucun dossier en attente de validation.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {pendingPatients.slice(0, 5).map((patient) => (
                <div key={patient.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, border:'1px solid rgba(37,99,235,0.08)', borderRadius:10, padding:'10px 12px', background:'#f8fafc' }}>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {patient.full_name || `${patient.nom || ''} ${patient.prenom || ''}`.trim() || 'Patient'}
                    </div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>
                      {patient.registration_number || '—'} · Ajouté le {new Date(patient.date_enregistrement).toLocaleDateString('fr-DZ')}
                    </div>
                  </div>
                  <Link to={`/patients/${patient.id}`} style={{ textDecoration:'none' }}>
                    <button style={{ padding:'7px 12px', background:'#fff', border:'1px solid rgba(37,99,235,0.18)', borderRadius:8, color:'#2563eb', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                      Ouvrir
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Accès rapides ── */}
        <div style={{ background:'#fff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:14, padding:'18px 22px', boxShadow:'0 2px 8px rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1.2, marginBottom:14 }}>Accès rapides</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { to:'/secretaire/rendezvous/nouveau',   label:'+ Nouveau rendez-vous', color:'#2563eb' },
              { to:'/secretaire',                      label:'Tous les rendez-vous',  color:'#7c3aed' },
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
      </div>

      <PrintArea label={printLabel} rdvs={printRdvs} />

    </AppLayout>
  );
}

const navBtnStyle = {
  width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
  background:'#fff', border:'1px solid rgba(37,99,235,0.18)', borderRadius:8,
  color:'#2563eb', fontSize:15, fontWeight:700, cursor:'pointer',
  boxShadow:'0 1px 4px rgba(15,23,42,0.05)',
};