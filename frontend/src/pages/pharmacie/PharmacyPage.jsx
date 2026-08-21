import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '../../components/layout/Sidebar';
import AccessDenied from '../../components/auth/AccessDenied';
import usePermissions from '../../hooks/usePermissions';

const INITIAL_MEDICINES = [
  { id: 1, dci: 'Doxorubicine', forme: 'Flacon 50 mg', lot: 'DOX-2604', stock: 34, seuil: 15, expiration: '2027-04-30' },
  { id: 2, dci: 'Cisplatine', forme: 'Flacon 50 mg', lot: 'CIS-2511', stock: 9, seuil: 12, expiration: '2026-11-15' },
  { id: 3, dci: 'Paclitaxel', forme: 'Flacon 100 mg', lot: 'PAC-2602', stock: 18, seuil: 10, expiration: '2027-02-28' },
  { id: 4, dci: 'Trastuzumab', forme: 'Flacon 150 mg', lot: 'TRA-2508', stock: 5, seuil: 8, expiration: '2026-09-30' },
  { id: 5, dci: 'Ondansétron', forme: 'Ampoule 8 mg', lot: 'OND-2601', stock: 120, seuil: 40, expiration: '2028-01-31' },
];

const storageKey = 'cancer-register-pharmacy-stock';
const card = { background: '#fff', border: '1px solid rgba(37,99,235,.1)', borderRadius: 14, padding: 20, boxShadow: '0 2px 8px rgba(15,23,42,.04)' };

function StockBadge({ item }) {
  const low = item.stock <= item.seuil;
  return <span style={{ padding: '4px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: low ? '#b45309' : '#15803d', background: low ? '#fef3c7' : '#dcfce7' }}>{low ? 'Stock faible' : 'Disponible'}</span>;
}

export default function PharmacyPage() {
  const { role } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || INITIAL_MEDICINES; } catch { return INITIAL_MEDICINES; }
  });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ dci: '', forme: '', lot: '', stock: '', seuil: '', expiration: '' });
  const tab = ['dashboard', 'medicaments', 'stock'].includes(params.get('vue')) ? params.get('vue') : 'dashboard';
  const setTab = (vue) => setParams({ vue });

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(items)); }, [items]);
  const lowStock = useMemo(() => items.filter((item) => item.stock <= item.seuil), [items]);
  const filtered = items.filter((item) => `${item.dci} ${item.forme} ${item.lot}`.toLowerCase().includes(search.toLowerCase()));
  const changeStock = (id, amount) => setItems((list) => list.map((item) => item.id === id ? { ...item, stock: Math.max(0, item.stock + amount) } : item));
  const addMedicine = (event) => {
    event.preventDefault();
    if (!form.dci.trim() || !form.forme.trim()) return;
    setItems((list) => [...list, { ...form, id: Date.now(), stock: Number(form.stock) || 0, seuil: Number(form.seuil) || 0, expiration: form.expiration || '—' }]);
    setForm({ dci: '', forme: '', lot: '', stock: '', seuil: '', expiration: '' });
    setTab('medicaments');
  };

  if (role !== 'pharmacist') return <AccessDenied message="Cet espace est réservé au service de pharmacie." />;

  return (
    <AppLayout title="Pharmacie hospitalière">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['dashboard', 'Tableau de bord'], ['medicaments', 'Médicaments'], ['stock', 'Gestion du stock']].map(([key, label]) => <button key={key} onClick={() => setTab(key)} style={{ padding: '9px 15px', borderRadius: 9, cursor: 'pointer', border: '1px solid rgba(37,99,235,.14)', background: tab === key ? '#2563eb' : '#fff', color: tab === key ? '#fff' : '#334155', fontWeight: 700, fontSize: 12 }}>{label}</button>)}
      </div>

      {tab === 'dashboard' && <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
          {[
            ['Références actives', items.length, '#2563eb'], ['Unités en stock', items.reduce((total, item) => total + item.stock, 0), '#16a34a'], ['Alertes de stock', lowStock.length, '#d97706'], ['Lots à surveiller', items.filter((item) => item.expiration !== '—' && new Date(item.expiration) < new Date('2027-01-01')).length, '#dc2626'],
          ].map(([label, value, color]) => <div key={label} style={{ ...card, borderTop: `3px solid ${color}` }}><div style={{ fontSize: 25, fontWeight: 800, color }}>{value}</div><div style={{ fontSize: 12, color: '#64748b', marginTop: 5 }}>{label}</div></div>)}
        </div>
        <div style={card}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>Alertes prioritaires</h2>
          {lowStock.length ? lowStock.map((item) => <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid #eef2f7' }}><div><strong>{item.dci}</strong><div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>{item.forme} · seuil : {item.seuil} unités</div></div><span style={{ color: '#b45309', fontWeight: 800 }}>{item.stock} unités</span></div>) : <div style={{ color: '#64748b', fontSize: 13 }}>Aucune alerte de stock.</div>}
        </div>
      </>}

      {tab === 'medicaments' && <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}><h2 style={{ margin: 0, fontSize: 16 }}>Catalogue des médicaments</h2><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un médicament ou un lot" style={{ padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 8, minWidth: 240 }} /></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['DCI', 'Présentation', 'Lot', 'Expiration', 'Statut'].map((name) => <th key={name} style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{name}</th>)}</tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td style={{ padding: '12px 8px', fontWeight: 700 }}>{item.dci}</td><td style={{ padding: '12px 8px' }}>{item.forme}</td><td style={{ padding: '12px 8px', fontFamily: 'monospace' }}>{item.lot || '—'}</td><td style={{ padding: '12px 8px' }}>{item.expiration}</td><td style={{ padding: '12px 8px' }}><StockBadge item={item} /></td></tr>)}</tbody></table>
      </div>}

      {tab === 'stock' && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 16 }}>
        <div style={card}><h2 style={{ margin: '0 0 14px', fontSize: 16 }}>Mouvements de stock</h2>{items.map((item) => <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid #eef2f7' }}><div><strong>{item.dci}</strong><div style={{ color: '#64748b', fontSize: 12 }}>{item.forme} · {item.stock} en stock</div></div><div style={{ display: 'flex', gap: 6 }}><button onClick={() => changeStock(item.id, -1)} style={{ padding: '5px 10px', border: 0, borderRadius: 6, cursor: 'pointer' }}>−</button><button onClick={() => changeStock(item.id, 1)} style={{ padding: '5px 10px', border: 0, borderRadius: 6, cursor: 'pointer', background: '#dbeafe', color: '#1d4ed8' }}>+1</button></div></div>)}</div>
        <form onSubmit={addMedicine} style={card}><h2 style={{ margin: '0 0 14px', fontSize: 16 }}>Ajouter au stock</h2>{[['dci', 'DCI'], ['forme', 'Présentation'], ['lot', 'N° lot'], ['stock', 'Quantité initiale'], ['seuil', 'Seuil d’alerte'], ['expiration', 'Expiration']].map(([key, label]) => <label key={key} style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 9 }}>{label}<input required={key === 'dci' || key === 'forme'} type={['stock', 'seuil'].includes(key) ? 'number' : key === 'expiration' ? 'date' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={{ boxSizing: 'border-box', width: '100%', marginTop: 4, padding: '8px', border: '1px solid #cbd5e1', borderRadius: 7 }} /></label>)}<button style={{ marginTop: 5, width: '100%', border: 0, padding: 10, borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Ajouter le médicament</button></form>
      </div>}
    </AppLayout>
  );
}
