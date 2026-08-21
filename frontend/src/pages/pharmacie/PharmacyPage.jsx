import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import AccessDenied from '../../components/auth/AccessDenied';
import usePermissions from '../../hooks/usePermissions';
import { pharmacyService } from '../../services/pharmacyService';

/* ── Design system (aligné sur DashboardPage / NewPatientPage) ── */
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

/* ── Badge de statut de stock (palette alignée sur STATUT_COLORS du dashboard) ── */
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

/* ── Onglets (même pattern que le bouton "Filtres" du dashboard) ── */
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

export default function PharmacyPage() {
  const { role } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ dci: '', forme: '', lot: '', stock: '', seuil: '', expiration: '' });
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
  const addMedicine = async (event) => {
    event.preventDefault();
    if (!form.dci.trim() || !form.forme.trim()) return;
    try {
      await pharmacyService.addStock({ medicament_dci: form.dci, presentation: form.forme, numero_lot: form.lot, quantite: Number(form.stock) || 0, seuil_alerte: Number(form.seuil) || 0, date_expiration: form.expiration || null });
      toast.success('Médicament ajouté au stock.');
      setForm({ dci: '', forme: '', lot: '', stock: '', seuil: '', expiration: '' });
      setTab('medicaments');
      loadStock();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ajout au stock impossible.');
    }
  };

  if (role !== 'pharmacist') return <AccessDenied message="Cet espace est réservé au service de pharmacie." />;

  return (
    <AppLayout title="Pharmacie hospitalière">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <Tabs tab={tab} setTab={setTab} counts={{ medicaments: items.length, stock: lowStock.length || null }} />

      {loading && <div style={{ ...card, marginBottom: 16, color: '#64748b', fontSize: 13 }}>Chargement du stock…</div>}

      {tab === 'dashboard' && (
        <>
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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un médicament ou un lot"
              style={{ ...inputStyle(), minWidth: 260, padding: '9px 12px' }}
            />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 14 }}>
              Mouvements de stock
            </div>
            {items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #eef2f7' }}>
                <div>
                  <strong style={{ color: '#0f172a', fontSize: 13.5 }}>{item.dci}</strong>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{item.forme} · <span style={{ fontFamily: 'var(--font-mono)' }}>{item.stock}</span> en stock</div>
                </div>
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
              </div>
            ))}
          </div>

          <form onSubmit={addMedicine} style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)', marginBottom: 16 }}>
              Ajouter au stock
            </div>
            {[
              ['dci', 'DCI', 'text'],
              ['forme', 'Présentation', 'text'],
              ['lot', 'N° lot', 'text'],
              ['stock', 'Quantité initiale', 'number'],
              ['seuil', 'Seuil d\u2019alerte', 'number'],
              ['expiration', 'Expiration', 'date'],
            ].map(([key, label, type]) => (
              <label key={key} style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#334155', letterSpacing: 0.3, marginBottom: 14 }}>
                {label}{(key === 'dci' || key === 'forme') && ' *'}
                <input
                  required={key === 'dci' || key === 'forme'}
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  style={{ ...inputStyle(), marginTop: 6 }}
                />
              </label>
            ))}
            <button
              style={{
                marginTop: 6, width: '100%', border: 'none', padding: '12px',
                borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              Ajouter le médicament
            </button>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
