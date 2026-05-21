import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';
import CanRegImportExport from '../../components/patients/CanRegImportExport';

const STATUT_COLORS = {
  nouveau:    { bg: 'rgba(37,99,235,0.08)',   color: '#2563eb', border: 'rgba(37,99,235,0.2)'  },
  traitement: { bg: 'rgba(124,58,237,0.08)',  color: '#7c3aed', border: 'rgba(124,58,237,0.2)' },
  remission:  { bg: 'rgba(22,163,74,0.08)',   color: '#16a34a', border: 'rgba(22,163,74,0.2)'  },
  perdu:      { bg: 'rgba(217,119,6,0.08)',   color: '#d97706', border: 'rgba(217,119,6,0.2)'  },
  decede:     { bg: 'rgba(220,38,38,0.08)',   color: '#dc2626', border: 'rgba(220,38,38,0.2)'  },
  archive:    { bg: 'rgba(100,116,139,0.08)', color: '#64748b', border: 'rgba(100,116,139,0.2)'},
};

const SEXE_COLORS = {
  M: { bg: 'rgba(37,99,235,0.08)',   color: '#2563eb' },
  F: { bg: 'rgba(232,121,249,0.08)', color: '#d946ef' },
  U: { bg: 'rgba(100,116,139,0.08)', color: '#64748b' },
};

function StatusBadge({ statut, label }) {
  const c = STATUT_COLORS[statut] || STATUT_COLORS.archive;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function PatientStatCard({ label, value, sub, color }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(37,99,235,0.1)',
        borderRadius: 14,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
        borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ minHeight: 22, marginBottom: 6 }} />
      <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1, marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: sub ? 2 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</div>}
    </div>
  );
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients,   setPatients]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filters,    setFilters]    = useState({ sexe: '', statut_dossier: '', wilaya: '' });
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null, page: 1 });

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, search };
      if (filters.sexe)           params.sexe           = filters.sexe;
      if (filters.statut_dossier) params.statut_dossier = filters.statut_dossier;
      if (filters.wilaya)         params.wilaya         = filters.wilaya;

      const { data } = await patientService.list(params);
      setPatients(data.results || data);
      if (data.count !== undefined) {
        setPagination(p => ({ ...p, count: data.count, next: data.next, previous: data.previous }));
      }
    } catch {
      toast.error('Erreur lors du chargement des patients');
    } finally {
      setLoading(false);
    }
  }, [search, filters, pagination.page]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  useEffect(() => {
    patientService.stats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchPatients(), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <AppLayout title="Gestion des Patients">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Stats strip */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total patients', val: stats.total,      color: '#2563eb' },
            { label: 'En traitement',  val: stats.traitement,  color: '#7c3aed' },
            { label: 'En rémission',   val: stats.remission,   color: '#16a34a' },
            { label: 'Perdus de vue',  val: stats.perdu_vue,   color: '#d97706' },
            { label: 'Décédés',        val: stats.decede,      color: '#dc2626' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background: '#fff', border: '1px solid rgba(37,99,235,0.1)',
              borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '14px 14px 0 0' }} />
              <div style={{ minHeight: 22, marginBottom: 6 }} />
              <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1, marginBottom: 4 }}>
                {val ?? '—'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{
          flex: 1, minWidth: 220,
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#f8fafc', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '8px 12px',
        }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, N° dossier, téléphone..."
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: '#0f172a', fontFamily: 'var(--font-body)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
          )}
        </div>

        {/* Filters */}
        {[
          { key: 'sexe', label: 'Sexe', opts: [['', 'Tous'], ['M', 'Masculin'], ['F', 'Féminin']] },
          { key: 'statut_dossier', label: 'Statut', opts: [['', 'Tous'], ['nouveau', 'Nouveau'], ['traitement', 'Traitement'], ['remission', 'Rémission'], ['perdu', 'Perdu de vue'], ['decede', 'Décédé']] },
        ].map(({ key, label, opts }) => (
          <select key={key}
            value={filters[key]}
            onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
            style={{
              padding: '8px 12px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
              color: '#334155', fontSize: 12.5, cursor: 'pointer', outline: 'none',
            }}
          >
            {opts.map(([v, l]) => <option key={v} value={v}>{l === 'Tous' ? `${label}: Tous` : l}</option>)}
          </select>
        ))}

        {/* ✅ Bouton CanReg5 + Nouveau patient */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Bouton CanReg5 Import/Export */}
          <CanRegImportExport onImportDone={() => fetchPatients()} />

          {/* Bouton Nouveau patient */}
          <Link to="/patients/nouveau" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-display)',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Nouveau patient
            </button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Chargement...
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#64748b' }}>Aucun patient trouvé</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['N° Dossier', 'Patient', 'Sexe', 'Âge', 'Wilaya', 'Statut', 'Médecin', 'Enregistré le', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                    color: '#94a3b8', textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(37,99,235,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map((p, i) => (
                <tr key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  style={{
                    cursor: 'pointer', borderBottom: '1px solid rgba(37,99,235,0.06)', transition: 'background 0.1s',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#2563eb' }}>
                      {p.registration_number}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{p.full_name}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, ...(SEXE_COLORS[p.sexe] || SEXE_COLORS.U) }}>
                      {p.sexe_label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>
                    {p.age ?? '—'} ans
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12.5, color: '#334155' }}>
                    {p.wilaya || '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <StatusBadge statut={p.statut_dossier} label={p.statut_label} />
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
                    {p.medecin_nom || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                    {new Date(p.date_enregistrement).toLocaleDateString('fr-DZ')}
                  </td>
                  <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                    <Link to={`/patients/${p.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{
                        padding: '5px 12px', background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)', borderRadius: 6,
                        color: '#334155', fontSize: 11.5, cursor: 'pointer',
                      }}>Voir</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.count > 20 && (
          <div style={{
            padding: '12px 18px', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {pagination.count} patients au total
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={!pagination.previous}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                style={{ padding: '6px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: '#334155', fontSize: 12, cursor: pagination.previous ? 'pointer' : 'not-allowed', opacity: pagination.previous ? 1 : 0.4 }}
              >← Précédent</button>
              <button
                disabled={!pagination.next}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                style={{ padding: '6px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: '#334155', fontSize: 12, cursor: pagination.next ? 'pointer' : 'not-allowed', opacity: pagination.next ? 1 : 0.4 }}
              >Suivant →</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
