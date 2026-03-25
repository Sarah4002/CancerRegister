import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { diagnosticService } from '../../services/diagnosticService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

const STADE_COLORS = {
  '0':    { bg: 'rgba(0,229,160,0.1)',   color: '#00e5a0', border: 'rgba(0,229,160,0.3)' },
  'I':    { bg: 'rgba(0,229,160,0.12)',  color: '#00e5a0', border: 'rgba(0,229,160,0.3)' },
  'IA':   { bg: 'rgba(0,229,160,0.12)',  color: '#00e5a0', border: 'rgba(0,229,160,0.3)' },
  'IB':   { bg: 'rgba(0,229,160,0.12)',  color: '#00e5a0', border: 'rgba(0,229,160,0.3)' },
  'II':   { bg: 'rgba(245,166,35,0.12)', color: '#f5a623', border: 'rgba(245,166,35,0.3)' },
  'IIA':  { bg: 'rgba(245,166,35,0.12)', color: '#f5a623', border: 'rgba(245,166,35,0.3)' },
  'IIB':  { bg: 'rgba(245,166,35,0.12)', color: '#f5a623', border: 'rgba(245,166,35,0.3)' },
  'III':  { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIA': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIB': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIC': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IV':   { bg: 'rgba(255,77,106,0.12)', color: '#ff4d6a', border: 'rgba(255,77,106,0.3)' },
  'U':    { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: 'rgba(107,114,128,0.2)' },
};

function StageBadge({ stade, label }) {
  const c = STADE_COLORS[stade] || STADE_COLORS['U'];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontFamily: 'var(--font-mono)',
    }}>{label || stade}</span>
  );
}

function TNMBadge({ tnm }) {
  if (!tnm || tnm === '—') return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11,
      background: 'rgba(0,168,255,0.08)',
      border: '1px solid rgba(0,168,255,0.2)',
      color: '#00a8ff', fontFamily: 'var(--font-mono)', fontWeight: 600,
    }}>{tnm}</span>
  );
}

export default function DiagnosticsPage() {
  const navigate = useNavigate();
  const [diagnostics, setDiagnostics] = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [stadeFilter, setStadeFilter] = useState('');
  const [pagination,  setPagination]  = useState({ count: 0, next: null, previous: null, page: 1 });

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page };
      if (search)      params.search      = search;
      if (stadeFilter) params.stade_ajcc  = stadeFilter;
      const { data } = await diagnosticService.list(params);
      setDiagnostics(data.results || data);
      if (data.count !== undefined)
        setPagination(p => ({ ...p, count: data.count, next: data.next, previous: data.previous }));
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [search, stadeFilter, pagination.page]);

  useEffect(() => { fetchDiagnostics(); }, [fetchDiagnostics]);
  useEffect(() => {
    diagnosticService.stats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <AppLayout title="Diagnostics – ICD-O-3 · TNM">

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total diagnostics" value={stats.total} color="#00a8ff" />
          <StatCard label="Stade I-II (localisé)" value={(stats.par_stade || []).filter(s => ['I','IA','IB','II','IIA','IIB','IIC'].includes(s.stade_ajcc)).reduce((a,b) => a + b.count, 0)} color="#00e5a0" />
          <StatCard label="Stade III-IV (avancé)"  value={(stats.par_stade || []).filter(s => ['III','IIIA','IIIB','IIIC','IV'].includes(s.stade_ajcc)).reduce((a,b) => a + b.count, 0)} color="#ff7832" />
          <StatCard label="Stade inconnu"           value={(stats.par_stade || []).filter(s => s.stade_ajcc === 'U').reduce((a,b) => a + b.count, 0)} color="#9ca3af" />
        </div>
      )}

      {/* Top topographies */}
      {stats?.par_topographie?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <ChartCard title="Top localisations (ICD-O-3)" data={stats.par_topographie.slice(0,6)} labelKey="topographie_libelle" valueKey="count" color="#00a8ff" />
          <ChartCard title="Distribution par stade"      data={stats.par_stade?.filter(s => s.count > 0)} labelKey="stade_ajcc" valueKey="count" color="#9b8afb" />
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Rechercher par topographie, patient, morphologie..." />
        <select value={stadeFilter} onChange={e => setStadeFilter(e.target.value)} style={selectStyle}>
          <option value="">Stade : Tous</option>
          {['0','I','IA','IB','II','IIA','IIB','IIC','III','IIIA','IIIB','IIIC','IV','U'].map(s => (
            <option key={s} value={s}>Stade {s === 'U' ? 'Inconnu' : s}</option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <Link to="/diagnostics/nouveau" style={{ textDecoration: 'none' }}>
            <button style={addBtnStyle}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Nouveau diagnostic
            </button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {loading ? <Loader /> : diagnostics.length === 0 ? <Empty /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Patient', 'Date', 'Topographie (ICD-O-3)', 'Morphologie', 'TNM', 'Stade', 'Grade', 'Base Diag.', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diagnostics.map((d, i) => (
                <tr key={d.id}
                  onClick={() => navigate(`/diagnostics/${d.id}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)', background: i%2===0?'transparent':'rgba(255,255,255,0.01)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = i%2===0?'transparent':'rgba(255,255,255,0.01)'}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{d.patient_nom}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>{d.patient_numero}</div>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {new Date(d.date_diagnostic).toLocaleDateString('fr-DZ')}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', marginBottom: 2 }}>{d.topographie_code}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.topographie_libelle || '—'}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9b8afb', marginBottom: 2 }}>{d.morphologie_code}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.morphologie_libelle || '—'}</div>
                  </td>
                  <td style={tdStyle}><TNMBadge tnm={d.tnm_complet} /></td>
                  <td style={tdStyle}><StageBadge stade={d.stade_ajcc} label={d.stade_label} /></td>
                  <td style={{ ...tdStyle, fontSize: 11, color: 'var(--text-muted)' }}>{d.grade_label || '—'}</td>
                  <td style={{ ...tdStyle, fontSize: 11, color: 'var(--text-muted)' }}>{d.base_diag_label || '—'}</td>
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <Link to={`/diagnostics/${d.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{ padding: '5px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 11.5, cursor: 'pointer' }}>Voir</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination.count > 20 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pagination.count} diagnostics</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <PageBtn disabled={!pagination.previous} onClick={() => setPagination(p => ({...p, page: p.page-1}))}>← Précédent</PageBtn>
              <PageBtn disabled={!pagination.next} onClick={() => setPagination(p => ({...p, page: p.page+1}))}>Suivant →</PageBtn>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'var(--font-display)', marginBottom: 2 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function ChartCard({ title, data = [], labelKey, valueKey, color }) {
  const max = Math.max(...(data || []).map(d => d[valueKey]), 1);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px 18px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      {(data || []).slice(0, 6).map((item, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item[labelKey] || '—'}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color }}>{item[valueKey]}</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(item[valueKey] / max) * 100}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }} />
      {value && <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>}
    </div>
  );
}

function PageBtn({ children, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '6px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  );
}

function Loader() {
  return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
    <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
    Chargement...
  </div>;
}

function Empty() {
  return <div style={{ padding: 64, textAlign: 'center' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>🔬</div>
    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Aucun diagnostic trouvé</div>
  </div>;
}

// ── Styles ────────────────────────────────────────────────────────
const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const tdStyle = { padding: '11px 12px', verticalAlign: 'middle' };
const selectStyle = { padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 12.5, cursor: 'pointer', outline: 'none' };
const addBtnStyle = { padding: '9px 18px', background: 'linear-gradient(135deg, #9b8afb, #7c6fcd)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)' };