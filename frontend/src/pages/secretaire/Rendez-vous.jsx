import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { secretaryService } from '../../services/secretaryService';
import { AppLayout } from '../../components/layout/Sidebar';

const STATUS_LABELS = { confirme: 'Confirmé', en_attente: 'En attente', annule: 'Annulé', termine: 'Terminé', absent: 'Absent' };
const TYPE_LABELS = { consultation: 'Consultation', suivi: 'Suivi', chimio: 'Chimiothérapie', examen: 'Examen', rcp: 'RCP' };

export default function RendezVousPage() {
  const [searchParams] = useSearchParams();
  const [rdvs, setRdvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('patient') || '');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    secretaryService.getRendezVous({ patient: searchParams.get('patient') || undefined })
      .then(({ data }) => setRdvs(data))
      .catch(() => setRdvs([]))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const filtered = useMemo(() => rdvs.filter((rdv) => {
    const query = search.trim().toLowerCase();
    return (!query || rdv.patient_nom?.toLowerCase().includes(query) || String(rdv.patient_numero || '').includes(query))
      && (!date || rdv.date === date)
      && (!status || rdv.statut === status);
  }).sort((a, b) => `${b.date}${b.heure}`.localeCompare(`${a.date}${a.heure}`)), [rdvs, search, date, status]);

  return (
    <AppLayout title="Tous les rendez-vous">
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>Rendez-vous</h2><p style={subStyle}>{filtered.length} résultat(s)</p></div>
          <Link to="/secretaire/rendezvous/nouveau" style={{ ...buttonStyle, textDecoration: 'none' }}>+ Rendez-vous</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px 160px', gap: 12, marginBottom: 18 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un patient ou n° dossier" style={inputStyle} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}><option value="">Tous les statuts</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
        {loading ? <p style={subStyle}>Chargement…</p> : (
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Date', 'Heure', 'Patient', 'Type', 'Médecin', 'Statut'].map(h => <th key={h} style={headStyle}>{h}</th>)}</tr></thead><tbody>
            {filtered.map(rdv => <tr key={rdv.id} style={{ borderTop: '1px solid #e2e8f0' }}><td style={cellStyle}>{new Date(`${rdv.date}T00:00:00`).toLocaleDateString('fr-DZ')}</td><td style={cellStyle}>{rdv.heure}</td><td style={{ ...cellStyle, fontWeight: 600 }}>{rdv.patient_nom || '—'}</td><td style={cellStyle}>{TYPE_LABELS[rdv.type] || rdv.type}</td><td style={cellStyle}>{rdv.medecin_nom || '—'}</td><td style={cellStyle}>{STATUS_LABELS[rdv.statut] || rdv.statut}</td></tr>)}
            {!filtered.length && <tr><td colSpan="6" style={{ ...cellStyle, textAlign: 'center', color: '#64748b', padding: 28 }}>Aucun rendez-vous trouvé.</td></tr>}
          </tbody></table></div>
        )}
      </div>
    </AppLayout>
  );
}

const cardStyle = { background: '#fff', border: '1px solid rgba(37,99,235,.12)', borderRadius: 16, padding: 24 };
const subStyle = { color: '#64748b', fontSize: 12, margin: '5px 0 0' };
const buttonStyle = { background: '#2563eb', color: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600 };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 13, background: '#fff' };
const headStyle = { textAlign: 'left', padding: '10px 12px', color: '#64748b', fontSize: 11, textTransform: 'uppercase' };
const cellStyle = { padding: '12px', fontSize: 13, color: '#334155' };
