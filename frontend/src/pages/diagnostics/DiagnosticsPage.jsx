import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { diagnosticService } from '../../services/diagnosticService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

const STADE_COLORS = {
  '0':    { bg: 'rgba(0,229,160,0.1)',   color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'I':    { bg: 'rgba(0,229,160,0.12)',  color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'IA':   { bg: 'rgba(0,229,160,0.12)',  color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'IB':   { bg: 'rgba(0,229,160,0.12)',  color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'II':   { bg: 'rgba(245,166,35,0.12)', color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  'IIA':  { bg: 'rgba(245,166,35,0.12)', color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  'IIB':  { bg: 'rgba(245,166,35,0.12)', color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  'III':  { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIA': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIB': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIC': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IV':   { bg: 'rgba(255,77,106,0.12)', color: '#dc2626', border: 'rgba(255,77,106,0.3)' },
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
  if (!tnm || tnm === '—') return <span style={{ color: '#64748b', fontSize: 12 }}>—</span>;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11,
      background: 'rgba(0,168,255,0.08)',
      border: '1px solid rgba(0,168,255,0.2)',
      color: '#2563eb', fontFamily: 'var(--font-mono)', fontWeight: 600,
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
          <StatCard label="Total diagnostics" sub="Tous les dossiers diagnostiques" value={stats.total} color="#2563eb" />
          <StatCard label="Stade I-II (localisé)" value={(stats.par_stade || []).filter(s => ['I','IA','IB','II','IIA','IIB','IIC'].includes(s.stade_ajcc)).reduce((a,b) => a + b.count, 0)} color="#16a34a" />
          <StatCard label="Stade III-IV (avancé)"  value={(stats.par_stade || []).filter(s => ['III','IIIA','IIIB','IIIC','IV'].includes(s.stade_ajcc)).reduce((a,b) => a + b.count, 0)} color="#ff7832" />
          <StatCard label="Stade inconnu"           value={(stats.par_stade || []).filter(s => s.stade_ajcc === 'U').reduce((a,b) => a + b.count, 0)} color="#9ca3af" />
        </div>
      )}

      {/* Top topographies */}
      {stats?.par_topographie?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <ChartCard title="Top localisations (ICD-O-3)" data={stats.par_topographie.slice(0,6)} labelKey="topographie_libelle" valueKey="count" color="#2563eb" />
          <ChartCard title="Distribution par stade"      data={stats.par_stade?.filter(s => s.count > 0)} labelKey="stade_ajcc" valueKey="count" color="#7c3aed" />
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)',
        borderRadius: '12px', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Rechercher par topographie, hémopathie, patient, morphologie..." />
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
      <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? <Loader /> : diagnostics.length === 0 ? <Empty /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Patient', 'Date', 'Diagnostic / Localisation', 'Morphologie', 'TNM', 'Stade', 'Grade', 'Base Diag.', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diagnostics.map((d, i) => (
                <tr key={d.id}
                  onClick={() => navigate(`/diagnostics/${d.id}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid rgba(37,99,235,0.12)', background: i%2===0?'transparent':'rgba(255,255,255,0.01)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                  onMouseLeave={e => e.currentTarget.style.background = i%2===0?'transparent':'rgba(255,255,255,0.01)'}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{d.patient_nom}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#2563eb' }}>{d.patient_numero}</div>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {new Date(d.date_diagnostic).toLocaleDateString('fr-DZ')}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#2563eb', marginBottom: 2 }}>{d.categorie_cancer === 'liquide' ? 'HEMATO' : d.topographie_code}</div>
                    <div style={{ fontSize: 11.5, color: '#334155', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.diagnostic_resume || d.topographie_libelle || '—'}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7c3aed', marginBottom: 2 }}>{d.morphologie_code}</div>
                    <div style={{ fontSize: 11, color: '#64748b', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.morphologie_libelle || '—'}</div>
                  </td>
                  <td style={tdStyle}><TNMBadge tnm={d.tnm_complet} /></td>
                  <td style={tdStyle}><StageBadge stade={d.stade_ajcc} label={d.stade_label} /></td>
                  <td style={{ ...tdStyle, fontSize: 11, color: '#64748b' }}>{d.grade_label || '—'}</td>
                  <td style={{ ...tdStyle, fontSize: 11, color: '#64748b' }}>{d.base_diag_label || '—'}</td>
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <Link to={`/diagnostics/${d.id}`} style={{ textDecoration: 'none' }}>
                      <button style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#334155', fontSize: 11.5, cursor: 'pointer' }}>Voir</button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination.count > 20 && (
          <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(37,99,235,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{pagination.count} diagnostics</span>
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
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '14px 14px 0 0' }} />
      <div style={{ minHeight: 22, marginBottom: 6 }} />
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'var(--font-display)', marginBottom: 2 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: sub ? 2 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, data = [], labelKey, valueKey, color }) {
  const max = Math.max(...(data || []).map(d => d[valueKey]), 1);
  return (
    <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', padding: '16px 18px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</div>
      {(data || []).slice(0, 6).map((item, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: '#334155', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item[labelKey] || '—'}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color }}>{item[valueKey]}</span>
          </div>
          <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(item[valueKey] / max) * 100}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px', padding: '8px 12px' }}>
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#64748b"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: '#0f172a', fontFamily: 'var(--font-body)' }} />
      {value && <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>}
    </div>
  );
}

function PageBtn({ children, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: '6px 14px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#334155', fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  );
}

function Loader() {
  return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
    <div style={{ width: 32, height: 32, border: '3px solid rgba(37,99,235,0.12)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
    Chargement...
  </div>;
}

function Empty() {
  return <div style={{ padding: 64, textAlign: 'center' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>🔬</div>
    <div style={{ fontSize: 14, color: '#64748b' }}>Aucun diagnostic trouvé</div>
  </div>;
}

// ── Styles ────────────────────────────────────────────────────────
const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid rgba(37,99,235,0.12)', whiteSpace: 'nowrap' };
const tdStyle = { padding: '11px 12px', verticalAlign: 'middle' };
const selectStyle = { padding: '8px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px', color: '#334155', fontSize: 12.5, cursor: 'pointer', outline: 'none' };
const addBtnStyle = { padding: '9px 18px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)' };
