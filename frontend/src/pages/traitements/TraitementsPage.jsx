import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { traitementService } from '../../services/traitementService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

// ── Config des types de traitement ───────────────────────────────
const TYPES = [
  {
    key:   'chimio',
    label: 'Chimiothérapie',
    color: '#00a8ff',
    endpoint: 'chimio',
    cols: ['Patient', 'Protocole', 'Ligne', 'Cycles', 'Statut', 'Réponse', 'Début'],
    row: (d) => [
      { main: d.patient_nom, sub: d.patient_numero },
      { mono: d.protocole || '—' },
      { badge: `L${d.ligne}`, color: '#9b8afb' },
      { text: `${d.cycles_realises ?? 0}/${d.nombre_cycles ?? '?'}` },
      { statut: d.statut, label: d.statut_label },
      { reponse: d.reponse_tumorale, label: d.reponse_label },
      { date: d.date_debut },
    ],
  },
  {
    key:   'radio',
    label: 'Radiothérapie',
    color: '#f5a623',
    endpoint: 'radio',
    cols: ['Patient', 'Site irradié', 'Technique', 'Dose totale', 'Séances', 'Statut', 'Début'],
    row: (d) => [
      { main: d.patient_nom, sub: d.patient_numero },
      { text: d.site_irradie || '—' },
      { badge: d.technique, color: '#f5a623' },
      { mono: d.dose_totale_gy ? `${d.dose_totale_gy} Gy` : '—' },
      { text: `${d.seances_realisees ?? 0}/${d.nombre_seances ?? '?'}` },
      { statut: d.statut, label: d.statut_label },
      { date: d.date_debut },
    ],
  },
  {
    key:   'chirurgie',
    label: 'Chirurgie',
    color: '#ff4d6a',
    endpoint: 'chirurgie',
    cols: ['Patient', 'Acte', 'Type', 'Voie', 'Marges', 'Statut', 'Date'],
    row: (d) => [
      { main: d.patient_nom, sub: d.patient_numero },
      { text: d.intitule_acte?.substring(0, 40) + (d.intitule_acte?.length > 40 ? '…' : '') },
      { badge: d.type_label, color: '#ff4d6a' },
      { text: d.voie_label || '—' },
      { marges: d.marges_resection },
      { statut: d.statut, label: d.statut_label },
      { date: d.date_debut },
    ],
  },
  {
    key:   'hormono',
    label: 'Hormonothérapie',
    color: '#00e5a0',
    endpoint: 'hormono',
    cols: ['Patient', 'Molécule', 'Type', 'Dose / j', 'Durée prévue', 'Statut', 'Début'],
    row: (d) => [
      { main: d.patient_nom, sub: d.patient_numero },
      { mono: d.molecule || '—' },
      { badge: d.type_label, color: '#00e5a0' },
      { text: d.dose_mg_jour ? `${d.dose_mg_jour} mg` : '—' },
      { text: d.duree_mois_prevue ? `${d.duree_mois_prevue} mois` : '—' },
      { statut: d.statut, label: d.statut_label },
      { date: d.date_debut },
    ],
  },
  {
    key:   'immuno',
    label: 'Immunothérapie',
    color: '#c084fc',
    endpoint: 'immuno',
    cols: ['Patient', 'Molécule', 'Type', 'Biomarqueur', 'Cycles', 'Statut', 'Début'],
    row: (d) => [
      { main: d.patient_nom, sub: d.patient_numero },
      { mono: d.molecule || '—' },
      { badge: d.type_label, color: '#c084fc' },
      { text: d.biomarqueur_cible || '—' },
      { text: d.nombre_cycles ?? '—' },
      { statut: d.statut, label: d.statut_label },
      { date: d.date_debut },
    ],
  },
  {
    key:   'ciblee',
    label: 'Thérapie ciblée',
    color: '#8b5cf6',
    endpoint: 'ciblee',
    cols: ['Patient', 'Molécule', 'Type', 'Biomarqueur', 'Cycles', 'Statut', 'Début'],
    row: (d) => [
      { main: d.patient_nom, sub: d.patient_numero },
      { mono: d.molecule || '—' },
      { badge: d.type_label, color: '#8b5cf6' },
      { text: d.biomarqueur_cible || '—' },
      { text: d.nombre_cycles ?? '—' },
      { statut: d.statut, label: d.statut_label },
      { date: d.date_debut },
    ],
  },
];

const STATUT_COLORS = {
  planifie:  { bg:'rgba(155,138,251,0.12)', color:'#9b8afb' },
  en_cours:  { bg:'rgba(0,168,255,0.12)',   color:'#00a8ff' },
  termine:   { bg:'rgba(0,229,160,0.12)',   color:'#00e5a0' },
  suspendu:  { bg:'rgba(245,166,35,0.12)',  color:'#f5a623' },
  abandonne: { bg:'rgba(255,77,106,0.12)',  color:'#ff4d6a' },
};

const REPONSE_COLORS = {
  RC: '#00e5a0', RP: '#00a8ff', SD: '#f5a623', PD: '#ff4d6a', NE: '#9ca3af', NA: '#6b7280',
};

const MARGES_COLORS = {
  R0: '#00e5a0', R1: '#f5a623', R2: '#ff4d6a', RX: '#9ca3af',
};

function CellContent({ cell }) {
  if (cell.main) return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{cell.main}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>{cell.sub}</div>
    </div>
  );
  if (cell.mono) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>{cell.mono}</span>;
  if (cell.badge) return (
    <span style={{ padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600, background:`${cell.color}18`, color:cell.color, border:`1px solid ${cell.color}30` }}>
      {cell.badge}
    </span>
  );
  if (cell.statut) {
    const c = STATUT_COLORS[cell.statut] || STATUT_COLORS.planifie;
    return <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, ...c, border:`1px solid ${c.color}30` }}>{cell.label}</span>;
  }
  if (cell.reponse) return (
    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, color: REPONSE_COLORS[cell.reponse] || '#9ca3af' }}>
      {cell.reponse || '—'}
    </span>
  );
  if (cell.marges) return (
    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, color: MARGES_COLORS[cell.marges] || '#9ca3af' }}>
      {cell.marges || '—'}
    </span>
  );
  if (cell.date) return <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>{new Date(cell.date).toLocaleDateString('fr-DZ')}</span>;
  return <span style={{ fontSize:13, color:'var(--text-secondary)' }}>{cell.text ?? '—'}</span>;
}

export default function TraitementsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]   = useState('chimio');
  const [data, setData]             = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  const typeConfig = TYPES.find(t => t.key === activeTab);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (statutFilter) params.statut = statutFilter;
      const { data: result } = await traitementService[typeConfig.endpoint].list(params);
      setData(result.results || result);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, [activeTab, search, statutFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    traitementService.stats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  // Reset search when tab changes
  useEffect(() => { setSearch(''); setStatutFilter(''); }, [activeTab]);

  return (
    <AppLayout title="Traitements">

      {/* Stats strip */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {TYPES.map(t => (
            <div key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{ background:'var(--bg-card)', border:`1px solid ${activeTab===t.key ? t.color+'40' : 'var(--border-light)'}`, borderRadius:'var(--radius-md)', padding:'12px 14px', cursor:'pointer', transition:'all 0.15s', boxShadow: activeTab===t.key ? `0 0 0 2px ${t.color}20` : 'none' }}
            >
              <div style={{ fontSize:22, fontWeight:700, color:t.color, fontFamily:'var(--font-display)', marginBottom:2 }}>
                {stats[t.key === 'chimio' ? 'chimiotherapies' : t.key === 'radio' ? 'radiotherapies' : t.key === 'chirurgie' ? 'chirurgies' : t.key === 'hormono' ? 'hormonotherapies' : 'immunotherapies'] ?? '—'}
              </div>
              <div style={{ fontSize:10, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}>
                <span>{t.icon}</span> {t.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', overflow:'hidden', marginBottom:16 }}>
        {TYPES.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom:`2px solid ${activeTab===t.key ? t.color : 'transparent'}`, color: activeTab===t.key ? t.color : 'var(--text-muted)', fontSize:12, fontWeight: activeTab===t.key ? 600 : 400, cursor:'pointer', fontFamily:'var(--font-body)', display:'flex', alignItems:'center', justifyContent:'center', gap:5, transition:'all 0.15s' }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', padding:'12px 16px', display:'flex', gap:12, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'7px 12px' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Rechercher par patient, ${activeTab === 'chimio' ? 'protocole' : activeTab === 'radio' ? 'site irradié' : activeTab === 'chirurgie' ? 'acte' : 'molécule'}...`}
            style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:12.5, color:'var(--text-primary)', fontFamily:'var(--font-body)' }} />
        </div>
        <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)}
          style={{ padding:'7px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:12, cursor:'pointer', outline:'none' }}>
          <option value="">Statut : Tous</option>
          <option value="planifie">Planifié</option>
          <option value="en_cours">En cours</option>
          <option value="termine">Terminé</option>
          <option value="suspendu">Suspendu</option>
          <option value="abandonne">Abandonné</option>
        </select>
        <div style={{ marginLeft:'auto' }}>
          <Link to={`/traitements/nouveau?type=${activeTab}`} style={{ textDecoration:'none' }}>
            <button style={{ padding:'8px 16px', background:`linear-gradient(135deg, ${typeConfig.color}, ${typeConfig.color}cc)`, border:'none', borderRadius:'var(--radius-md)', color:'#fff', fontSize:12.5, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'var(--font-display)' }}>
              <span style={{ fontSize:14 }}>+</span> Nouveau {typeConfig.label.toLowerCase()}
            </button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>
            <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:typeConfig.color, borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
            Chargement...
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding:56, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>{typeConfig.icon}</div>
            <div style={{ fontSize:14, color:'var(--text-muted)' }}>Aucun {typeConfig.label.toLowerCase()} trouvé</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-elevated)' }}>
                {typeConfig.cols.map(h => (
                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:600, letterSpacing:0.5, color:'var(--text-muted)', textTransform:'uppercase', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
                <th style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }} />
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => {
                const cells = typeConfig.row(item);
                return (
                  <tr key={item.id}
                    onClick={() => navigate(`/traitements/${activeTab}/${item.id}`)}
                    style={{ cursor:'pointer', borderBottom:'1px solid var(--border)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background=i%2===0?'transparent':'rgba(255,255,255,0.01)'}
                  >
                    {cells.map((cell, ci) => (
                      <td key={ci} style={{ padding:'11px 12px', verticalAlign:'middle' }}>
                        <CellContent cell={cell} />
                      </td>
                    ))}
                    <td style={{ padding:'11px 12px' }} onClick={e => e.stopPropagation()}>
                      <Link to={`/traitements/${activeTab}/${item.id}`} style={{ textDecoration:'none' }}>
                        <button style={{ padding:'4px 10px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-secondary)', fontSize:11, cursor:'pointer' }}>Voir</button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
