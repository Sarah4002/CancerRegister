import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rcpService } from '../../services/rcpService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

// ─── Constantes ──────────────────────────────────────────────────────────────
const STATUT_CFG = {
  planifiee: { color: '#0077cc', label: 'Planifiée', bg: 'rgba(0,119,204,0.1)' },
  en_cours:  { color: '#00c896', label: 'En cours',  bg: 'rgba(0,200,150,0.1)' },
  terminee:  { color: '#6b7280', label: 'Terminée',  bg: 'rgba(107,114,128,0.1)' },
  annulee:   { color: '#e45c5c', label: 'Annulée',   bg: 'rgba(228,92,92,0.1)' },
  reportee:  { color: '#e2a03f', label: 'Reportée',  bg: 'rgba(226,160,63,0.1)' },
};

const TYPE_META = {
  sein:       { icon: '', label: 'Sein',         color: '#e91e8c' },
  digestif:   { icon: '', label: 'Digestif',     color: '#f97316' },
  poumon:     { icon: '', label: 'Thoracique',   color: '#06b6d4' },
  orl:        { icon: '', label: 'ORL',           color: '#8b5cf6' },
  gyneco:     { icon: '', label: 'Gynécologique',color: '#ec4899' },
  uro:        { icon: '', label: 'Urologique',   color: '#3b82f6' },
  hemato:     { icon: '', label: 'Hématologique',color: '#ef4444' },
  neuro:      { icon: '', label: 'Neurologique', color: '#a855f7' },
  dermato:    { icon: '', label: 'Dermato',      color: '#f59e0b' },
  os:         { icon: '', label: 'Os / Sarcomes',color: '#78716c' },
  pediatrique:{ icon: '', label: 'Pédiatrique',  color: '#10b981' },
  palliative: { icon: '', label: 'Soins Palliatifs', color: '#6b7280' },
  generale:   { icon: '', label: 'Générale',    color: '#0077cc' },
};

const SPECIALITES = [
  { key: 'onco',    label: 'Oncologie',           color: '#0077cc' },
  { key: 'chir',    label: 'Chirurgie',            color: '#e45c5c' },
  { key: 'radio',   label: 'Radiologie',           color: '#e2a03f' },
  { key: 'radiot',  label: 'Radiothérapie',        color: '#f97316' },
  { key: 'anapath', label: 'Anatomopathologie',    color: '#8b5cf6' },
  { key: 'hemato',  label: 'Hématologie',          color: '#ec4899' },
  { key: 'ref',     label: 'Médecin référent',     color: '#00c896' },
];

// ─── Composant principal ─────────────────────────────────────────────────────
export default function RCPDashboard() {
  const navigate = useNavigate();
  const [reunions, setReunions] = useState([]);
  const [stats, setStats] = useState(null);
  const [prochaines, setProchaines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [view, setView] = useState('list'); // 'list' | 'grid' | 'agenda'
  const [now] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (search) params.search = search;
        if (statutFilter) params.statut = statutFilter;
        if (typeFilter) params.type_rcp = typeFilter;
        const { data } = await rcpService.reunions.list(params);
        setReunions(data.results || data);
      } catch { toast.error('Erreur de chargement'); }
      finally { setLoading(false); }
    };
    load();
  }, [search, statutFilter, typeFilter]);

  useEffect(() => {
    rcpService.reunions.stats().then(({ data }) => setStats(data)).catch(() => {});
    rcpService.reunions.prochaines().then(({ data }) => setProchaines(data || [])).catch(() => {});
  }, []);

  const today = reunions.filter(r => {
    const d = new Date(r.date_reunion);
    return d.toDateString() === now.toDateString();
  });
  const urgent = reunions.filter(r => r.statut === 'en_cours');

  return (
    <AppLayout title="RCP — Réunions de Concertation Pluridisciplinaire">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── KPI BAND ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { icon: '', label: "Aujourd'hui", value: today.length, color: '#0077cc', sub: 'réunions' },
            { icon: '', label: 'En cours',   value: urgent.length, color: '#00c896', sub: 'actives', pulse: urgent.length > 0 },
            { icon: '', label: 'Dossiers',   value: stats?.total_dossiers ?? '—', color: '#8b5cf6', sub: 'au total' },
            { icon: '', label: 'Décisions',  value: stats?.total_decisions ?? '—', color: '#e2a03f', sub: 'prises' },
            { icon: '', label: 'En attente', value: stats?.decisions_en_attente ?? '—', color: '#e45c5c', sub: 'sans décision' },
            { icon: '', label: 'Réunions',   value: stats?.total ?? '—', color: '#6b7280', sub: 'au total' },
          ].map(k => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        {/* ── PROCHAINES & ACTIONS RAPIDES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'start' }}>
          {prochaines.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0077cc', animation: 'pulse-glow 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0077cc', textTransform: 'uppercase', letterSpacing: 1 }}>Prochaines réunions</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {prochaines.slice(0, 5).map(r => {
                  const meta = TYPE_META[r.type_rcp] || TYPE_META.generale;
                  return (
                    <Link key={r.id} to={`/rcp/${r.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', minWidth: 160, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color + '60'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 14 }}>{meta.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{r.titre?.slice(0, 22)}{r.titre?.length > 22 ? '…' : ''}</span>
                        </div>
                        <div style={{ fontSize: 10, color: meta.color, fontWeight: 600 }}>
                          {new Date(r.date_reunion).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short' })} · {r.heure_debut?.slice(0, 5)}
                        </div>
                        {r.nombre_dossiers > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{r.nombre_dossiers} dossiers</div>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          <Link to="/rcp/nouveau" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '14px 24px', background: 'linear-gradient(135deg, #0077cc, #005fa3)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,119,204,0.3)', fontFamily: 'var(--font-display)' }}>
              <span style={{ fontSize: 16 }}>+</span> Nouvelle RCP
            </button>
          </Link>
        </div>

        {/* ── TOOLBAR ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput value={search} onChange={setSearch} />

          <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} style={selSt}>
            <option value="">Statut : Tous</option>
            {Object.entries(STATUT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selSt}>
            <option value="">Type : Tous</option>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {['list', 'grid'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '6px 12px', background: view === v ? '#0077cc' : 'var(--bg-elevated)', border: `1px solid ${view === v ? '#0077cc' : 'var(--border)'}`, borderRadius: 8, color: view === v ? '#fff' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
                {v === 'list' ? '≡ Liste' : '⊞ Grille'}
              </button>
            ))}
          </div>
        </div>

        {/* ── LISTE / GRILLE ── */}
        {loading ? (
          <LoadingSpinner />
        ) : reunions.length === 0 ? (
          <EmptyState />
        ) : view === 'grid' ? (
          <GridView reunions={reunions} navigate={navigate} />
        ) : (
          <ListView reunions={reunions} navigate={navigate} />
        )}
      </div>
    </AppLayout>
  );
}

// ── Liste ──────────────────────────────────────────────────────────────────────
function ListView({ reunions, navigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {reunions.map((r, i) => {
        const sc = STATUT_CFG[r.statut] || { color: '#9ca3af', label: '-', bg: 'transparent' };
        const meta = TYPE_META[r.type_rcp] || TYPE_META.generale;
        return (
          <div key={r.id} onClick={() => navigate(`/rcp/${r.id}`)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s', animation: `fadeUp 0.3s ease ${i * 0.04}s both`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color + '40'; e.currentTarget.style.boxShadow = `0 4px 20px ${meta.color}12`; e.currentTarget.style.transform = 'translateX(2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
            {/* Left: Type icon + info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: meta.color + '15', border: `1px solid ${meta.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {meta.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 4 }}>{r.titre}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Chip icon="" val={new Date(r.date_reunion).toLocaleDateString('fr-DZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} />
                  <Chip icon="" val={`${r.heure_debut?.slice(0, 5)}${r.heure_fin ? ' – ' + r.heure_fin.slice(0, 5) : ''}`} />
                  {r.lieu && <Chip icon="" val={r.lieu} />}
                  {r.coordinateur_nom && <Chip icon="" val={r.coordinateur_nom} />}
                </div>
              </div>
            </div>
            {/* Right: metrics + statut */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <MetricPill val={r.nombre_dossiers} label="dossiers" color="#8b5cf6" />
              <MetricPill val={r.nombre_membres_presents} label="membres" color="#0077cc" />
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30` }}>
                {sc.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Grille ──────────────────────────────────────────────────────────────────────
function GridView({ reunions, navigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {reunions.map((r, i) => {
        const sc = STATUT_CFG[r.statut] || { color: '#9ca3af', label: '-' };
        const meta = TYPE_META[r.type_rcp] || TYPE_META.generale;
        return (
          <div key={r.id} onClick={() => navigate(`/rcp/${r.id}`)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', animation: `fadeUp 0.3s ease ${i * 0.05}s both`, position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${meta.color}20`; e.currentTarget.style.borderColor = meta.color + '40'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: meta.color + '08', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 28 }}>{meta.icon}</div>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: sc.color + '15', color: sc.color, border: `1px solid ${sc.color}25` }}>{sc.label}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 6, lineHeight: 1.3 }}>{r.titre}</div>
            <div style={{ fontSize: 11, color: meta.color, fontWeight: 600, marginBottom: 10 }}>{meta.label}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '6px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#8b5cf6' }}>{r.nombre_dossiers}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>dossiers</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '6px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0077cc' }}>{r.nombre_membres_presents}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>membres</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(r.date_reunion).toLocaleDateString('fr-DZ', { weekday: 'short', day: 'numeric', month: 'short' })} · {r.heure_debut?.slice(0, 5)}
            </div>
            {r.lieu && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{r.lieu}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color, sub, pulse }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -10, top: -10, width: 60, height: 60, borderRadius: '50%', background: color + '08' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        {pulse && <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: 'pulse-glow 1.5s infinite' }} />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)', color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span> {sub}</div>
    </div>
  );
}

function Chip({ icon, val }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
      <span style={{ fontSize: 10 }}>{icon}</span>{val}
    </span>
  );
}

function MetricPill({ val, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{val}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function SearchInput({ value, onChange }) {
  return (
    <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="Rechercher par titre, lieu, type..."
        style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }} />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: '#0077cc', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
      <div style={{ fontSize: 13 }}>Chargement des réunions…</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: 60, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}></div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Aucune réunion RCP trouvée</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Commencez par créer une nouvelle réunion de concertation pluridisciplinaire.</div>
      <Link to="/rcp/nouveau" style={{ textDecoration: 'none' }}>
        <button style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #0077cc, #005fa3)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Créer la première RCP
        </button>
      </Link>
    </div>
  );
}

const selSt = {
  padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
};
