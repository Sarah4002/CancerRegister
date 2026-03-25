import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';
import CanRegImportExport from '../../components/patients/CanRegImportExport';

const STATUT_COLORS = {
  nouveau:    { bg: 'rgba(155,138,251,0.15)', color: '#9b8afb', border: 'rgba(155,138,251,0.3)' },
  traitement: { bg: 'rgba(0,168,255,0.12)',   color: '#00a8ff', border: 'rgba(0,168,255,0.3)'  },
  remission:  { bg: 'rgba(0,229,160,0.12)',   color: '#00e5a0', border: 'rgba(0,229,160,0.3)'  },
  perdu:      { bg: 'rgba(245,166,35,0.12)',  color: '#f5a623', border: 'rgba(245,166,35,0.3)' },
  decede:     { bg: 'rgba(255,77,106,0.12)',  color: '#ff4d6a', border: 'rgba(255,77,106,0.3)' },
  archive:    { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)'},
};

const SEXE_COLORS = {
  M: { bg: 'rgba(0,168,255,0.1)',    color: '#00a8ff' },
  F: { bg: 'rgba(245,101,196,0.1)', color: '#f565c4' },
  U: { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af' },
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
            { label: 'Total patients', val: stats.total,      color: '#00a8ff' },
            { label: 'En traitement',  val: stats.traitement,  color: '#9b8afb' },
            { label: 'En rémission',   val: stats.remission,   color: '#00e5a0' },
            { label: 'Perdus de vue',  val: stats.perdu_vue,   color: '#f5a623' },
            { label: 'Décédés',        val: stats.decede,      color: '#ff4d6a' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', padding: '14px 16px',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--font-display)', marginBottom: 2 }}>
                {val ?? '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
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
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '8px 12px',
        }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, N° dossier, téléphone..."
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
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
              color: 'var(--text-secondary)', fontSize: 12.5, cursor: 'pointer', outline: 'none',
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
              background: 'linear-gradient(135deg, #00a8ff, #0080cc)',
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
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Chargement...
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Aucun patient trouvé</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['N° Dossier', 'Patient', 'Sexe', 'Âge', 'Wilaya', 'Statut', 'Médecin', 'Enregistré le', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
                    color: 'var(--text-muted)', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map((p, i) => (
                <tr key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  style={{
                    cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.1s',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
                      {p.registration_number}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{p.full_name}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, ...(SEXE_COLORS[p.sexe] || SEXE_COLORS.U) }}>
                      {p.sexe_label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {p.age ?? '—'} ans
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {p.wilaya || '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <StatusBadge statut={p.statut_dossier} label={p.statut_label} />
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {p.medecin_nom || '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(p.date_enregistrement).toLocaleDateString('fr-DZ')}
                  </td>
                  <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                    <Link to={`/patients/${p.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{
                        padding: '5px 12px', background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)', borderRadius: 6,
                        color: 'var(--text-secondary)', fontSize: 11.5, cursor: 'pointer',
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
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {pagination.count} patients au total
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={!pagination.previous}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                style={{ padding: '6px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, cursor: pagination.previous ? 'pointer' : 'not-allowed', opacity: pagination.previous ? 1 : 0.4 }}
              >← Précédent</button>
              <button
                disabled={!pagination.next}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                style={{ padding: '6px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, cursor: pagination.next ? 'pointer' : 'not-allowed', opacity: pagination.next ? 1 : 0.4 }}
              >Suivant →</button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}