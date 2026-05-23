import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rcpService } from '../../services/rcpService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

// ─── Constantes & Palette Harmonisée ─────────────────────────────────────────
const STATUT_CFG = {
  planifiee: { color: '#2563eb', label: 'Planifiée', bg: 'rgba(37,99,235,0.08)' },
  en_cours:  { color: '#16a34a', label: 'En cours',  bg: 'rgba(22,163,74,0.08)' },
  terminee:  { color: '#64748b', label: 'Terminée',  bg: 'rgba(100,116,139,0.08)' },
  annulee:   { color: '#dc2626', label: 'Annulée',   bg: 'rgba(220,38,38,0.08)' },
  reportee:  { color: '#d97706', label: 'Reportée',  bg: 'rgba(217,119,6,0.08)' },
};

const TYPE_META = {
  sein:       { label: 'Sein',         color: '#e879f9' },
  digestif:   { label: 'Digestif',     color: '#f97316' },
  poumon:     { label: 'Thoracique',   color: '#06b6d4' },
  orl:        { label: 'ORL',           color: '#8b5cf6' },
  gyneco:     { label: 'Gynécologique',color: '#ec4899' },
  uro:        { label: 'Urologique',   color: '#3b82f6' },
  hemato:     { label: 'Hématologique',color: '#ef4444' },
  neuro:      { label: 'Neurologique', color: '#a855f7' },
  dermato:    { label: 'Dermato',      color: '#f59e0b' },
  os:         { label: 'Os / Sarcomes',color: '#78716c' },
  pediatrique:{ label: 'Pédiatrique',  color: '#10b981' },
  palliative: { label: 'Soins Palliatifs', color: '#64748b' },
  generale:   { label: 'Générale',    color: '#2563eb' },
};

const FILTER_TAG_LABELS = {
  search:       v => `Recherche : "${v}"`,
  statutFilter: v => `Statut : ${STATUT_CFG[v]?.label || v}`,
  typeFilter:   v => `Type : ${TYPE_META[v]?.label || v}`,
};

const DEFAULT_FILTERS = { search: '', statutFilter: '', typeFilter: '' };

// ─── Composant principal ─────────────────────────────────────────────────────
export default function RCPDashboard() {
  const navigate = useNavigate();
  const [reunions, setReunions] = useState([]);
  const [stats, setStats] = useState(null);
  const [prochaines, setProchaines] = useState([]);
  const [loading, setLoading] = useState(true);
  
  /* États des filtres synchronisés sur le modèle de DashboardPage */
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [view, setView] = useState('list'); // 'list' | 'grid'
  const [now] = useState(new Date());

  const fetchRCPData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.statutFilter) params.statut = filters.statutFilter;
      if (filters.typeFilter) params.type_rcp = filters.typeFilter;
      
      const { data } = await rcpService.reunions.list(params);
      setReunions(data.results || data);
    } catch { 
      toast.error('Erreur de chargement des réunions'); 
    } finally { 
      setLoading(false); 
    }
  }, [filters]);

  useEffect(() => { fetchRCPData(); }, [fetchRCPData]);

  useEffect(() => {
    rcpService.reunions.stats().then(({ data }) => setStats(data)).catch(() => {});
    rcpService.reunions.prochaines().then(({ data }) => setProchaines(data || [])).catch(() => {});
  }, []);

  const today = reunions.filter(r => {
    const d = new Date(r.date_reunion);
    return d.toDateString() === now.toDateString();
  });
  const urgent = reunions.filter(r => r.statut === 'en_cours');

  const handleApplyFilters = () => setFilters({ ...draft });
  const handleResetFilters = () => { setDraft(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); };

  return (
    <AppLayout title="Réunions de Concertation Pluridisciplinaire">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── HEADER & ACTION NOUVEAU ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 3 }}>
              RegistreCancer.dz — Espace RCP
            </h2>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Gestion et suivi des sessions d'évaluation pluridisciplinaire
            </div>
          </div>
          <Link to="/rcp/nouveau" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'all 0.15s' }}>
              + Nouvelle RCP
            </button>
          </Link>
        </div>

        {/* ── BANDEAU KPI PATIENTS & ACTIVITÉ ── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Statistiques des sessions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            <KPICard label="Aujourd'hui" value={today.length} color="#2563eb" sub="réunions prévues" />
            <KPICard label="En cours" value={urgent.length} color="#16a34a" sub="actives en ce moment" trend={urgent.length > 0 ? 1 : 0} />
            <KPICard label="Total Dossiers" value={stats?.total_dossiers} color="#8b5cf6" sub="soumis aux RCP" />
            <KPICard label="Décisions prises" value={stats?.total_decisions} color="#d97706" sub="validées" />
            <KPICard label="En attente" value={stats?.decisions_en_attente} color="#dc2626" sub="sans décision" />
            <KPICard label="Total Réunions" value={stats?.total} color="#64748b" sub="historique global" />
          </div>
        </div>

        {/* ── PROCHAINES RÉUNIONS PLANIFIÉES ── */}
        {prochaines.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', animation: 'pulse-glow 2s infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 }}>Prochaines sessions planifiées</span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {prochaines.slice(0, 5).map(r => {
                const meta = TYPE_META[r.type_rcp] || TYPE_META.generale;
                return (
                  <Link key={r.id} to={`/rcp/${r.id}`} style={{ textDecoration: 'none', flex: '1 1 180px', maxWidth: '240px' }}>
                    <div style={{ padding: '12px 14px', background: '#fff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(15,23,42,0.02)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${meta.color}15`; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.1)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{r.titre?.slice(0, 24)}{r.titre?.length > 24 ? '…' : ''}</span>
                      </div>
                      <div style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>
                        {new Date(r.date_reunion).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short' })} · {r.heure_debut?.slice(0, 5)}
                      </div>
                      {r.nombre_dossiers > 0 && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{r.nombre_dossiers} dossiers inscrits</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── COMPOSANT DE FILTRES EXPANDABLE (Modèle Dashboard) ── */}
        <FilterPanel 
          filters={filters} 
          draft={draft} 
          setDraft={setDraft} 
          onApply={handleApplyFilters} 
          onReset={handleResetFilters} 
          view={view}
          setView={setView}
        />

        {/* ── AFFICHAGE DU CONTENU (LISTE / GRILLE) ── */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 36, height: 36, border: '3px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ color: '#64748b', fontSize: 13 }}>Chargement des sessions RCP...</div>
            </div>
          </div>
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

// ── Component Filtre Intégré ─────────────────────────────────────────────────
function FilterPanel({ filters, draft, setDraft, onApply, onReset, view, setView }) {
  const [open, setOpen] = useState(false);
  const totalActive = Object.values(filters).filter((v) => v !== '').length;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: open ? '#eff6ff' : '#fff', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 2px 6px rgba(15,23,42,0.06)' }}>
            Filtres RCP
            {totalActive > 0 && <span style={{ background: '#2563eb', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 7px', marginLeft: 4 }}>{totalActive}</span>}
            <span style={{ fontSize: 9, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </button>

          {!open && totalActive > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(filters).filter(([,v]) => v).map(([k, v]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 10px', background: 'rgba(37,99,235,0.07)', color: '#2563eb', borderRadius: 99, border: '1px solid rgba(37,99,235,0.18)', fontWeight: 500 }}>
                  {FILTER_TAG_LABELS[k]?.(v) ?? v}
                </span>
              ))}
              <button onClick={onReset} style={{ fontSize: 11, padding: '3px 10px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 99, cursor: 'pointer' }}>Effacer</button>
            </div>
          )}
        </div>

        {/* Sélecteur de vue synchronisé */}
        <div style={{ display: 'flex', background: '#fff', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 10, padding: 3, boxShadow: '0 2px 6px rgba(15,23,42,0.04)' }}>
          {['list', 'grid'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '6px 14px', background: view === v ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'transparent', border: 'none', borderRadius: 8, color: view === v ? '#fff' : '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
              {v === 'list' ? 'Liste' : 'Grille'}
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div style={{ background: '#fff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 4px 20px rgba(15,23,42,0.08)', marginTop: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 220 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Recherche par mot-clé</span>
              <input value={draft.search} onChange={e => setDraft(d => ({ ...d, search: e.target.value }))} placeholder="Titre, ville, lieu..." style={{ fontSize: 12, padding: '7px 10px', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 9, outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Statut</span>
              <select value={draft.statutFilter} onChange={e => setDraft(d => ({ ...d, statutFilter: e.target.value }))} style={selSt}>
                <option value="">Tous les statuts</option>
                {Object.entries(STATUT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Spécialité / Organe</span>
              <select value={draft.typeFilter} onChange={e => setDraft(d => ({ ...d, typeFilter: e.target.value }))} style={selSt}>
                <option value="">Toutes les spécialités</option>
                {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid rgba(37,99,235,0.08)', paddingTop: 14 }}>
            <button onClick={() => { onApply(); setOpen(false); }} style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>Appliquer les filtres</button>
            <button onClick={() => { onReset(); setOpen(false); }} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Réinitialiser</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Liste Harmonisée ─────────────────────────────────────────────────────────
function ListView({ reunions, navigate }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reunions.map((r) => {
        const sc = STATUT_CFG[r.statut] || { color: '#64748b', label: '-', bg: 'transparent' };
        const meta = TYPE_META[r.type_rcp] || TYPE_META.generale;
        return (
          <div key={r.id} onClick={() => navigate(`/rcp/${r.id}`)}
            style={{ background: '#fff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 14, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.2)'; e.currentTarget.style.boxShadow = `0 4px 16px rgba(37,99,235,0.08)`; e.currentTarget.style.transform = 'translateX(2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(37,99,235,0.08)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.04)'; e.currentTarget.style.transform = 'none'; }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: meta.color + '12', border: `1px solid ${meta.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: meta.color, flexShrink: 0 }}>
                {meta.label.slice(0, 3).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 4 }}>{r.titre}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{meta.label}</span>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbd5e1' }} />
                  <Chip val={new Date(r.date_reunion).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })} />
                  <Chip val={`${r.heure_debut?.slice(0, 5)}${r.heure_fin ? ' – ' + r.heure_fin.slice(0, 5) : ''}`} />
                  {r.lieu && <Chip val={r.lieu} />}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#8b5cf6', fontFamily: 'var(--font-display)' }}>{r.nombre_dossiers}</div>
                <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>dossiers</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-display)' }}>{r.nombre_membres_presents}</div>
                <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>membres</div>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}20` }}>
                {sc.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Grille Harmonisée ────────────────────────────────────────────────────────
function GridView({ reunions, navigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
      {reunions.map((r) => {
        const sc = STATUT_CFG[r.statut] || { color: '#64748b', label: '-' };
        const meta = TYPE_META[r.type_rcp] || TYPE_META.generale;
        return (
          <div key={r.id} onClick={() => navigate(`/rcp/${r.id}`)}
            style={{ background: '#fff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 14, padding: '20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 8px 24px ${meta.color}18`; e.currentTarget.style.borderColor = meta.color + '40'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.06)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.08)'; }}>
            
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: meta.color }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.color + '10', padding: '2px 8px', borderRadius: 6 }}>{meta.label.toUpperCase()}</span>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}20` }}>{sc.label}</span>
            </div>
            
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 4, lineHeight: 1.3 }}>{r.titre}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginBottom: 14 }}>Spécialité : {meta.label}</div>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#8b5cf6' }}>{r.nombre_dossiers}</div>
                <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>dossiers</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb' }}>{r.nombre_membres_presents}</div>
                <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>membres</div>
              </div>
            </div>
            
            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>Date: {new Date(r.date_reunion).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short' })}</span>
              <span>•</span>
              <span>Heure: {r.heure_debut?.slice(0, 5)}</span>
            </div>
            {r.lieu && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Lieu: {r.lieu}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Mini-Composants Réutilisables & Harmonisés ───────────────────────────────
function KPICard({ label, value, sub, color, trend }) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: '14px 16px', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', flex: '1 1 150px' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color, lineHeight: 1 }}>{value ?? '0'}</div>
        {trend ? <span style={{ fontSize: 9, color: '#16a34a', background: 'rgba(22,163,74,0.1)', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>Actif</span> : null}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#334155', marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function Chip({ val }) {
  return (
    <span style={{ fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, fontWeight: 500 }}>
      {val}
    </span>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Aucune réunion RCP trouvée</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Ajustez vos filtres ou créez une nouvelle session de concertation.</div>
      <Link to="/rcp/nouveau" style={{ textDecoration: 'none' }}>
        <button style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.2)' }}>
          + Créer la première RCP
        </button>
      </Link>
    </div>
  );
}

const selSt = {
  fontSize: '12px', padding: '7px 10px',
  border: '1px solid rgba(37,99,235,0.18)', borderRadius: '9px',
  background: '#fff', color: '#334155', cursor: 'pointer',
  outline: 'none', boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
};