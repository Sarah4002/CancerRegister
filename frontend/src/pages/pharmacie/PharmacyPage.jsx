import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { AppLayout } from '../../components/layout/Sidebar';
import AccessDenied from '../../components/auth/AccessDenied';
import usePermissions from '../../hooks/usePermissions';
import { pharmacyService } from '../../services/pharmacyService';
import { dashboardService } from '../../services/dashboardService';

/* ── Design system (aligné sur DashboardPage / NewPatientPage / PatientsPage) ── */
const card = {
  background: '#fff',
  border: '1px solid rgba(37,99,235,0.08)',
  borderRadius: 14,
  padding: '20px 22px',
  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
};

const sectionLabel = {
  fontSize: 10, fontWeight: 700, color: '#94a3b8',
  textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10,
};

const inputStyle = (err) => ({
  width: '100%', padding: '10px 12px', background: '#f1f5f9',
  border: '1px solid ' + (err ? '#dc2626' : 'rgba(37,99,235,0.08)'),
  borderRadius: 12, color: '#0f172a', fontSize: 13.5,
  outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
});
const selectStyle = (err) => ({ ...inputStyle(err), cursor: 'pointer' });

/* ── Palette (reprise du dashboard pour les graphes) ── */
const CHART_COLORS = ['#2563eb', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#0d9488', '#ca8a04', '#9333ea'];
const REPONSE_COLORS = { RC: '#16a34a', RP: '#2563eb', SD: '#d97706', PD: '#dc2626', NE: '#94a3b8' };
const REPONSE_LABELS = { RC: 'Réponse complète', RP: 'Réponse partielle', SD: 'Maladie stable', PD: 'Progression', NE: 'Non évaluable' };

/* ── Photos de la pharmacie (bannière + galerie) ──
   Sources Unsplash — repli automatique sur un dégradé si l'image ne charge pas. */
const PHARMACY_PHOTOS = {
  hero: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1400&q=80',
  gallery: [
    { url: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=500&q=80', label: 'Rayonnage des médicaments' },
    { url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=500&q=80', label: 'Préparation des ordonnances' },
    { url: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=500&q=80', label: 'Contrôle du stock' },
  ],
};

function PhotoWithFallback({ src, alt, style }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{ ...style, background: 'linear-gradient(135deg,#dbeafe,#eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
        💊
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} style={{ ...style, objectFit: 'cover' }} />;
}

/* ── Bannière hero avec photo de pharmacie ── */
function PharmacyHero({ stats }) {
  return (
    <div style={{
      position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 20,
      boxShadow: '0 6px 20px rgba(15,23,42,0.12)', minHeight: 150,
    }}>
      <PhotoWithFallback
        src={PHARMACY_PHOTOS.hero}
        alt="Pharmacie hospitalière"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(100deg, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.55) 45%, rgba(37,99,235,0.25) 100%)',
      }} />
      <div style={{ position: 'relative', padding: '26px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ color: '#bfdbfe', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 6 }}>
            Pharmacie hospitalière
          </div>
          <div style={{ color: '#fff', fontSize: 21, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            Stock, dispensation et suivi des traitements
          </div>
          <div style={{ color: '#dbeafe', fontSize: 12.5 }}>
            Le stock est automatiquement décrémenté à chaque administration de traitement.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            ['Références', stats.refs],
            ['Unités', stats.units],
            ['Alertes', stats.alerts],
          ].map(([label, val]) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 12, padding: '10px 16px', backdropFilter: 'blur(6px)', textAlign: 'center', minWidth: 84,
            }}>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>{val ?? '—'}</div>
              <div style={{ color: '#dbeafe', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Galerie de photos ── */
function PhotoGallery() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
      {PHARMACY_PHOTOS.gallery.map((p) => (
        <div key={p.label} style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', height: 110, boxShadow: '0 2px 8px rgba(15,23,42,0.08)' }}>
          <PhotoWithFallback src={p.url} alt={p.label} style={{ width: '100%', height: '100%' }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(0deg, rgba(15,23,42,0.75), transparent)',
            color: '#fff', fontSize: 11, fontWeight: 600, padding: '18px 12px 8px',
          }}>{p.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Custom tooltip recharts (repris du dashboard) ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(37,99,235,0.15)',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(15,23,42,0.12)', fontSize: 12,
    }}>
      {label && <div style={{ color: '#64748b', marginBottom: 6, fontWeight: 600, fontSize: 11 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.payload?.fill || '#2563eb', marginBottom: 2, fontWeight: 500 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Chart Card (repris du dashboard) ── */
function ChartCard({ title, sub, children, span = 1 }) {
  return (
    <div style={{ ...card, gridColumn: span === 2 ? '1 / -1' : 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Barre horizontale (repris du dashboard) ── */
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: '#334155', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: 999, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

/* ── KPI Card (repris du dashboard) ── */
function KPICard({ label, value, sub, color, icon }) {
  return (
    <div
      style={{
        background: '#fff', border: '1px solid rgba(37,99,235,0.1)',
        borderRadius: 14, padding: '18px 20px', position: 'relative',
        overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.06)'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-display)', color, lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: sub ? 2 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#94a3b8' }}>{sub}</div>}
    </div>
  );
}

/* ── Badge de statut de stock ── */
function StockBadge({ item }) {
  const low = item.stock <= item.seuil;
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: low ? '#b45309' : '#15803d',
      background: low ? 'rgba(217,119,6,0.1)' : 'rgba(22,163,74,0.1)',
      border: `1px solid ${low ? 'rgba(217,119,6,0.2)' : 'rgba(22,163,74,0.2)'}`,
    }}>
      {low ? '⚠ Stock faible' : '✓ Disponible'}
    </span>
  );
}

/* ── Onglets ── */
function Tabs({ tab, setTab, counts }) {
  const items = [
    ['dashboard', 'Tableau de bord'],
    ['medicaments', 'Médicaments'],
    ['stock', 'Gestion du stock'],
  ];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      {items.map(([key, label]) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(37,99,235,0.2)',
            background: tab === key ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : '#fff',
            color: tab === key ? '#fff' : '#2563eb',
            fontWeight: 600, fontSize: 12.5,
            boxShadow: tab === key ? '0 2px 8px rgba(37,99,235,0.25)' : '0 2px 6px rgba(15,23,42,0.06)',
            transition: 'all 0.15s',
          }}
        >
          {label}
          {counts?.[key] != null && (
            <span style={{
              background: tab === key ? 'rgba(255,255,255,0.25)' : 'rgba(37,99,235,0.1)',
              color: tab === key ? '#fff' : '#2563eb',
              borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 7px', lineHeight: '16px',
            }}>{counts[key]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MODALE — Ajouter un médicament
   (même habillage que ExportModal / DeleteConfirmModal de PatientsPage,
    mêmes helpers Field / Row / SectionTitle que NewPatientPage)
   ══════════════════════════════════════════════ */
function SectionTitle({ children, style: s }) {
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 18, fontFamily: 'var(--font-display)', ...s }}>{children}</h3>;
}
function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>{children}</div>;
}
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#334155', marginBottom: 6, letterSpacing: 0.3 }}>{label}</label>
      {children}
      {error && <p style={{ marginTop: 4, fontSize: 11.5, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}
function Spinner({ light }) {
  return <div style={{ width: 14, height: 14, border: `2px solid ${light ? 'rgba(255,255,255,0.3)' : '#dbeafe'}`, borderTopColor: light ? '#fff' : '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function AddMedicineModal({ onClose, onSubmit }) {
  const overlayRef = useRef(null);
  const [form, setForm] = useState({ dci: '', forme: '', lot: '', stock: '', seuil: '', expiration: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleOverlay = (e) => { if (e.target === overlayRef.current) onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.dci.trim()) nextErrors.dci = 'DCI requise';
    if (!form.forme.trim()) nextErrors.forme = 'Présentation requise';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        animation: 'fadeIn .15s ease',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
        animation: 'slideUp .2s ease',
      }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#3b82f6,#2563eb)' }} />
        <div style={{ padding: '24px 28px 8px', borderBottom: '1px solid rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 3 }}>Ajouter un médicament</div>
            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>Le médicament sera ajouté au catalogue et au stock de la pharmacie.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#94a3b8', lineHeight: 1, padding: '2px 6px', borderRadius: 6, marginBottom: 18 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 28px 28px' }}>
          <SectionTitle>Identification</SectionTitle>
          <Row>
            <Field label="DCI *" error={errors.dci}>
              <input
                value={form.dci}
                onChange={(e) => setForm({ ...form, dci: e.target.value })}
                placeholder="Ex: Paracétamol"
                style={inputStyle(errors.dci)}
              />
            </Field>
            <Field label="Présentation *" error={errors.forme}>
              <input
                value={form.forme}
                onChange={(e) => setForm({ ...form, forme: e.target.value })}
                placeholder="Ex: Comprimé 500mg"
                style={inputStyle(errors.forme)}
              />
            </Field>
          </Row>
          <Field label="N° de lot">
            <input
              value={form.lot}
              onChange={(e) => setForm({ ...form, lot: e.target.value })}
              placeholder="Ex: LOT-2026-014"
              style={inputStyle()}
            />
          </Field>

          <SectionTitle style={{ marginTop: 20 }}>Stock initial</SectionTitle>
          <Row>
            <Field label="Quantité initiale">
              <input
                type="number" min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
                style={inputStyle()}
              />
            </Field>
            <Field label="Seuil d'alerte">
              <input
                type="number" min="0"
                value={form.seuil}
                onChange={(e) => setForm({ ...form, seuil: e.target.value })}
                placeholder="0"
                style={inputStyle()}
              />
            </Field>
          </Row>
          <Field label="Date d'expiration">
            <input
              type="date"
              value={form.expiration}
              onChange={(e) => setForm({ ...form, expiration: e.target.value })}
              style={inputStyle()}
            />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(37,99,235,0.1)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: '0 0 110px', padding: '12px', background: '#f1f5f9',
                border: '1px solid rgba(37,99,235,0.12)', borderRadius: 12,
                color: '#334155', fontSize: 13.5, cursor: 'pointer',
                opacity: submitting ? 0.6 : 1,
              }}
            >Annuler</button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 13.5, fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: submitting ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              {submitting ? <><Spinner light /> Enregistrement…</> : 'Enregistrer le médicament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN — PharmacyPage
   ══════════════════════════════════════════════ */
export default function PharmacyPage() {
  const { role } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Données d'analyse traitements — réutilise le même endpoint que le tableau
  // de bord global (dashboardService.global) : traitements_types (usage) et
  // reponses_chimio (efficacité), pour rester cohérent avec le reste de
  // l'application plutôt que de dupliquer une source de données.
  const [analytics, setAnalytics] = useState({ traitements_types: [], reponses_chimio: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const tab = ['dashboard', 'medicaments', 'stock'].includes(params.get('vue')) ? params.get('vue') : 'dashboard';
  const setTab = (vue) => setParams({ vue });

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await pharmacyService.stock();
      setItems(data.results || data);
    } catch {
      toast.error('Impossible de charger le stock de la pharmacie.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadStock(); }, [loadStock]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAnalyticsLoading(true);
      try {
        const { data } = await dashboardService.global({});
        if (!cancelled) {
          setAnalytics({
            traitements_types: data.traitements_types || [],
            reponses_chimio: data.reponses_chimio || [],
          });
        }
      } catch {
        // Les graphes affichent simplement un état vide si l'API n'est pas disponible.
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const lowStock = useMemo(() => items.filter((item) => item.stock <= item.seuil), [items]);
  const filtered = items.filter((item) => `${item.dci} ${item.forme} ${item.lot}`.toLowerCase().includes(search.toLowerCase()));

  const changeStock = async (id, amount) => {
    try {
      const { data } = await pharmacyService.adjustStock(id, amount);
      setItems((list) => list.map((item) => item.id === id ? data : item));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Mouvement de stock impossible.');
    }
  };

  const addMedicine = async (form) => {
    try {
      await pharmacyService.addStock({
        medicament_dci: form.dci,
        presentation: form.forme,
        numero_lot: form.lot,
        quantite: Number(form.stock) || 0,
        seuil_alerte: Number(form.seuil) || 0,
        date_expiration: form.expiration || null,
      });
      toast.success('Médicament ajouté au stock.');
      loadStock();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ajout au stock impossible.');
      throw error;
    }
  };

  // Traitement le plus utilisé — tri décroissant par nombre d'administrations
  const traitementsUsage = useMemo(
    () => [...(analytics.traitements_types || [])].sort((a, b) => b.count - a.count),
    [analytics.traitements_types]
  );
  const maxTraitement = Math.max(...traitementsUsage.map((t) => t.count), 1);

  // Traitement le plus efficace — proportion de réponses complètes + partielles
  const reponsesData = (analytics.reponses_chimio || []).map((r) => ({
    name: REPONSE_LABELS[r.reponse_tumorale] || r.reponse_tumorale,
    value: r.count,
    color: REPONSE_COLORS[r.reponse_tumorale] || '#94a3b8',
  }));
  const totalReponses = reponsesData.reduce((sum, r) => sum + r.value, 0);
  const tauxReponse = totalReponses > 0
    ? Math.round((((analytics.reponses_chimio || []).find(r => r.reponse_tumorale === 'RC')?.count || 0)
      + ((analytics.reponses_chimio || []).find(r => r.reponse_tumorale === 'RP')?.count || 0)) / totalReponses * 100)
    : null;

  if (role !== 'pharmacist') return <AccessDenied message="Cet espace est réservé au service de pharmacie." />;

  return (
    <AppLayout title="Pharmacie hospitalière">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <PharmacyHero stats={{ refs: items.length, units: items.reduce((t, i) => t + i.stock, 0), alerts: lowStock.length }} />

      <Tabs tab={tab} setTab={setTab} counts={{ medicaments: items.length, stock: lowStock.length || null }} />

      {loading && <div style={{ ...card, marginBottom: 16, color: '#64748b', fontSize: 13 }}>Chargement du stock…</div>}

      {tab === 'dashboard' && (
        <>
          <PhotoGallery />

          <div style={{ marginBottom: 8 }}>
            <div style={sectionLabel}>Vue d'ensemble</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              <KPICard label="Références actives" value={items.length} color="#2563eb" icon="💊" />
              <KPICard label="Unités en stock" value={items.reduce((total, item) => total + item.stock, 0)} color="#16a34a" icon="📦" />
              <KPICard label="Alertes de stock" value={lowStock.length} color="#d97706" icon="⚠️" />
              <KPICard
                label="Lots à surveiller"
                value={items.filter((item) => item.expiration !== '—' && new Date(item.expiration) < new Date('2027-01-01')).length}
                color="#dc2626"
                icon="⏳"
                sub="Expiration < 2027"
              />
            </div>
          </div>

          {/* ── Graphes traitements : usage & efficacité ── */}
          <div style={sectionLabel}>Traitements</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <ChartCard title="Traitement le plus utilisé" sub="Nombre d'administrations par type de traitement">
              {analyticsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Chargement…</div>
              ) : traitementsUsage.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Aucune donnée de traitement disponible</div>
              ) : (
                <div style={{ marginTop: 4 }}>
                  {traitementsUsage.slice(0, 8).map((t, i) => (
                    <HBar key={t.type} label={t.type} value={t.count} max={maxTraitement} color={t.color || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </div>
              )}
            </ChartCard>

            <ChartCard
              title="Efficacité des traitements"
              sub={tauxReponse !== null ? `${tauxReponse}% de réponses complètes ou partielles` : 'Répartition des réponses tumorales'}
            >
              {analyticsLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Chargement…</div>
              ) : reponsesData.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Aucune évaluation enregistrée</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={reponsesData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                        {reponsesData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} formatter={(v, n, p) => [v, p.payload.name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', justifyContent: 'center', marginTop: 4 }}>
                    {reponsesData.map((r) => (
                      <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.color }} />
                        <span style={{ color: '#64748b' }}>{r.name} <strong style={{ color: r.color }}>{r.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ChartCard>
          </div>

          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 14 }}>
              Alertes prioritaires
            </div>
            {lowStock.length ? lowStock.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #eef2f7' }}>
                <div>
                  <strong style={{ color: '#0f172a', fontSize: 13.5 }}>{item.dci}</strong>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>{item.forme} · seuil : {item.seuil} unités</div>
                </div>
                <span style={{ color: '#b45309', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{item.stock} unités</span>
              </div>
            )) : (
              <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Aucune alerte de stock.</div>
            )}
          </div>
        </>
      )}

      {tab === 'medicaments' && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>Catalogue des médicaments</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un médicament ou un lot"
                style={{ ...inputStyle(), minWidth: 260, padding: '9px 12px' }}
              />
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '9px 16px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                  border: 'none', borderRadius: 10, color: '#fff', fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau médicament
              </button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['DCI', 'Présentation', 'Lot', 'Expiration', 'Statut'].map((name) => (
                  <th key={name} style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid #eef2f7' }}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: '12px 8px', fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{item.dci}</td>
                  <td style={{ padding: '12px 8px', color: '#334155', fontSize: 13 }}>{item.forme}</td>
                  <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', color: '#64748b', fontSize: 12.5 }}>{item.lot || '—'}</td>
                  <td style={{ padding: '12px 8px', color: '#334155', fontSize: 13 }}>{item.expiration}</td>
                  <td style={{ padding: '12px 8px' }}><StockBadge item={item} /></td>
                </tr>
              )) : (
                <tr><td colSpan={5} style={{ padding: '32px 8px', textAlign: 'center', color: '#94a3b8', fontSize: 12.5 }}>Aucun médicament trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'stock' && (
        <>
          {/* Stats strip — même style que la page Patients */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              ['Références', items.length, '#2563eb'],
              ['Unités en stock', items.reduce((t, i) => t + i.stock, 0), '#16a34a'],
              ['Stock faible', lowStock.length, '#d97706'],
              ['Disponibles', items.length - lowStock.length, '#0891b2'],
            ].map(([label, val, color]) => (
              <div key={label} style={{
                background: '#fff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14,
                padding: '18px 20px', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${color}88)`, borderRadius: '14px 14px 0 0' }} />
                <div style={{ fontSize: 30, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1, marginBottom: 4 }}>{val}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar — même habillage que PatientsPage */}
          <div style={{
            background: '#fff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 14, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 8,
              background: '#f8fafc', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 10, padding: '8px 12px',
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#94a3b8">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un médicament ou un lot"
                style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: '#0f172a', fontFamily: 'var(--font-body)' }}
              />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: '9px 18px', background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                  border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)',
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un médicament
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16 }}>
            <div style={{ ...card, overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '18px 22px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>
                  Mouvements de stock
                </div>
                <div style={{ fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic' }}>
                  Décrémenté automatiquement lors de chaque administration de traitement
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr>
                    {['DCI', 'Présentation', 'Stock actuel', 'Statut', 'Ajustement'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 22px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid #eef2f7' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length ? filtered.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #eef2f7' }}>
                      <td style={{ padding: '12px 22px', fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{item.dci}</td>
                      <td style={{ padding: '12px 22px', color: '#334155', fontSize: 13 }}>{item.forme}</td>
                      <td style={{ padding: '12px 22px', fontFamily: 'var(--font-mono)', color: '#334155', fontSize: 13 }}>{item.stock}</td>
                      <td style={{ padding: '12px 22px' }}><StockBadge item={item} /></td>
                      <td style={{ padding: '12px 22px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => changeStock(item.id, -1)}
                            style={{ padding: '6px 12px', border: '1px solid rgba(37,99,235,0.16)', background: '#fff', color: '#64748b', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                          >−</button>
                          <button
                            onClick={() => changeStock(item.id, 1)}
                            style={{ padding: '6px 12px', border: 'none', borderRadius: 8, cursor: 'pointer', background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontWeight: 700, fontSize: 13 }}
                          >+1</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} style={{ padding: '32px 22px', textAlign: 'center', color: '#94a3b8', fontSize: 12.5 }}>Aucun médicament trouvé.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <AddMedicineModal
          onClose={() => setShowAddModal(false)}
          onSubmit={addMedicine}
        />
      )}
    </AppLayout>
  );
}