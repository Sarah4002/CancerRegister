import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import { sigService } from '../../services/sigService';
import SigAiAnalysisPanel, { COMMUNES_RISK_ANALYSIS } from './SigAiAnalysisPanel';

const STYLES = `
  .sig-wrap { display: flex; flex-direction: column; height: calc(100vh - 60px); background: #f8fafc; }
  .sig-header { padding: 20px 24px; border-bottom: 1px solid rgba(37,99,235,0.1); background: #ffffff; box-shadow: 0 1px 3px rgba(15,23,42,0.05); }
  .sig-title { font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 0; font-family: var(--font-display, sans-serif); }
  .sig-subtitle { font-size: 0.85rem; color: #64748b; margin: 6px 0 0; font-weight: 500; }

  .sig-container { display: grid; grid-template-columns: minmax(0, 70%) minmax(0, 30%); gap: 0; flex: 1; overflow: hidden; }
  .sig-map-section { display: flex; flex-direction: column; border-right: 1px solid rgba(37,99,235,0.08); position: relative; background: #fff; }
  #sig-map { flex: 1; min-height: 0; }

  .sig-side-panel { display: flex; flex-direction: column; background: #ffffff; overflow: hidden; border-right: 1px solid rgba(37,99,235,0.08); }
  .sig-side-panel.right { border-right: none; border-left: 1px solid rgba(37,99,235,0.08); width: auto; min-width: 0; }

  .ss-tabs { display: flex; border-bottom: 1px solid rgba(37,99,235,0.08); background: #f8fafc; }
  .ss-tab { flex: 1; padding: 12px; background: none; border: none; color: #64748b; font-size: 0.8rem;
     font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all .2s ease; text-align: center; }
  .ss-tab:hover { color: #2563eb; }
  .ss-tab.active { color: #2563eb; border-bottom-color: #2563eb; background: #ffffff; }
  .ss-body { flex: 1; overflow-y: auto; padding: 16px; background: #ffffff; }
  .ss-body::-webkit-scrollbar { width: 4px; }
  .ss-body::-webkit-scrollbar-track { background: transparent; }
  .ss-body::-webkit-scrollbar-thumb { background: rgba(37,99,235,0.15); border-radius: 2px; }
  .ss-body::-webkit-scrollbar-thumb:hover { background: rgba(37,99,235,0.25); }

  .stat-card { background: #ffffff; border: 1px solid rgba(37,99,235,0.1); border-radius: 14px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(15,23,42,0.06); transition: all 0.2s ease; }
  .stat-card:hover { box-shadow: 0 4px 12px rgba(15,23,42,0.08); }
  .sc-title { font-size: 0.85rem; font-weight: 700; color: #0f172a; margin-bottom: 10px; letter-spacing: 0.3px; }
  .sc-count { font-size: 1.6rem; font-weight: 800; color: #2563eb; font-family: var(--font-display, sans-serif); }
  .sc-pct { font-size: 0.75rem; color: #64748b; margin-top: 6px; }

  .cancer-item { background: #ffffff; border: 1px solid rgba(37,99,235,0.1); border-radius: 12px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(15,23,42,0.04); transition: all 0.15s ease; }
  .cancer-item:hover { border-color: rgba(37,99,235,0.2); box-shadow: 0 2px 8px rgba(15,23,42,0.06); }
  .ci-name { font-size: 0.8rem; font-weight: 600; color: #0f172a; }
  .ci-value { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
  .ci-count { font-size: 1.2rem; font-weight: 700; color: #2563eb; }
  .ci-pct { font-size: 0.7rem; background: rgba(37,99,235,0.1); color: #2563eb; padding: 3px 8px; border-radius: 20px; font-weight: 600; border: 1px solid rgba(37,99,235,0.2); }

  .hypothesis-card { background: rgba(37,99,235,0.05); border: 1px solid rgba(37,99,235,0.15); padding: 14px; border-radius: 12px; margin-top: 12px; }
  .ht-title { font-size: 0.8rem; font-weight: 700; color: #2563eb; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
  .ht-text { font-size: 0.75rem; color: #475569; line-height: 1.5; }

  .loading { display: flex; align-items: center; justify-content: center; height: 100%; gap: 12px; color: #64748b; }
  .loader { width: 20px; height: 20px; border: 2px solid rgba(37,99,235,0.15); border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .zone-item { background: #ffffff; border: 1px solid rgba(37,99,235,0.1); border-radius: 12px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(15,23,42,0.04); transition: all 0.15s ease; cursor: pointer; }
  .zone-item:hover { border-color: rgba(37,99,235,0.2); box-shadow: 0 2px 8px rgba(15,23,42,0.06); }
  .zone-info { flex: 1; cursor: pointer; }
  .zone-name { font-size: 0.85rem; font-weight: 600; color: #0f172a; }
  .zone-meta { font-size: 0.7rem; color: #64748b; margin-top: 2px; }
  .zone-actions { display: flex; gap: 8px; }

  .sig-map-actions { position: absolute; top: 16px; right: 16px; z-index: 1000; display: flex; gap: 8px; }
  .sig-map-action { background: #ffffff; color: #0f172a; border: 1px solid rgba(37,99,235,0.2); border-radius: 10px; padding: 10px 14px; font-size: 0.75rem; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(15,23,42,0.1); transition: all 0.2s ease; }
  .sig-map-action:hover { background: #eff6ff; border-color: rgba(37,99,235,0.3); box-shadow: 0 4px 12px rgba(15,23,42,0.12); }

  .leaflet-popup-content-wrapper { background: #ffffff !important; border: 1px solid rgba(37,99,235,0.1) !important; border-radius: 12px !important; box-shadow: 0 4px 16px rgba(15,23,42,0.12) !important; }
  .leaflet-popup-content { color: #0f172a !important; font-size: 0.75rem !important; }
  .leaflet-popup-tip { background: #ffffff !important; border: 1px solid rgba(37,99,235,0.1) !important; }
  
  .zone-tooltip { background: rgba(37,99,235,0.9) !important; color: white !important; border: none !important; font-weight: 700 !important; font-size: 0.7rem !important; border-radius: 6px !important; }
  @media(max-width:1100px) { .sig-container { grid-template-columns: 1fr; } .sig-side-panel.right { width: 100%; max-height: 350px; border-top: 1px solid rgba(37,99,235,0.08); border-left: none; } }
`;

const SIG_FILTER_TAG_LABELS = {
  type_cancer: (v) => `Cancer : ${v}`,
  age_min: (v) => `Age min : ${v}`,
  age_max: (v) => `Age max : ${v}`,
};

function getPolygonCentroid(points, fallback = null) {
  if (!Array.isArray(points) || points.length === 0) return fallback;
  const total = points.reduce((acc, pt) => {
    const lat = Array.isArray(pt) ? Number(pt[0]) : Number(pt?.lat);
    const lng = Array.isArray(pt) ? Number(pt[1]) : Number(pt?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return acc;
    acc.lat += lat;
    acc.lng += lng;
    acc.count += 1;
    return acc;
  }, { lat: 0, lng: 0, count: 0 });
  if (!total.count) return fallback;
  return { lat: total.lat / total.count, lng: total.lng / total.count };
}

function getPolygonApproxRadiusMeters(points, fallback = 0) {
  if (!Array.isArray(points) || points.length < 2 || !window?.L) return fallback;
  const centroid = getPolygonCentroid(points);
  if (!centroid) return fallback;
  const center = window.L.latLng(centroid.lat, centroid.lng);
  let maxDistance = 0;
  points.forEach((pt) => {
    const lat = Array.isArray(pt) ? Number(pt[0]) : Number(pt?.lat);
    const lng = Array.isArray(pt) ? Number(pt[1]) : Number(pt?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    maxDistance = Math.max(maxDistance, center.distanceTo(window.L.latLng(lat, lng)));
  });
  return maxDistance || fallback;
}

function SigFilterBar({ filters, draft, setDraft, onApply, onReset, wilayaOptions }) {
  const [open, setOpen] = useState(false);
  const totalActive = Object.values(filters).filter((v) => v && v !== 'all' && v !== '').length;
  const setDraftField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div style={{
      marginTop: 18,
      background: 'rgba(255,255,255,0.92)',
      border: '1px solid rgba(37,99,235,0.10)',
      borderRadius: 16,
      padding: 16,
      boxShadow: '0 8px 30px rgba(15,23,42,0.06)',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: open || totalActive > 0 ? 12 : 0,
      }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 16px',
            background: open ? '#eff6ff' : '#fff',
            border: '1px solid rgba(37,99,235,0.2)',
            borderRadius: 10,
            color: '#2563eb',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(15,23,42,0.06)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          Filtres SIG
          {totalActive > 0 && (
            <span style={{
              background: '#2563eb',
              color: '#fff',
              borderRadius: 99,
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 7px',
              lineHeight: '16px',
            }}>
              {totalActive}
            </span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {!open && totalActive > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {Object.entries(filters)
              .filter(([, value]) => value && value !== 'all' && value !== '')
              .map(([key, value]) => (
                <span key={key} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  padding: '3px 10px',
                  background: 'rgba(37,99,235,0.07)',
                  color: '#2563eb',
                  borderRadius: 99,
                  border: '1px solid rgba(37,99,235,0.18)',
                  fontWeight: 500,
                }}>
                  {SIG_FILTER_TAG_LABELS[key]?.(value) ?? value}
                </span>
              ))}
            <button
              type="button"
              onClick={onReset}
              style={{
                fontSize: 11,
                padding: '3px 10px',
                background: 'transparent',
                color: '#94a3b8',
                border: '1px solid rgba(148,163,184,0.3)',
                borderRadius: 99,
                cursor: 'pointer',
              }}
            >
              Effacer tout
            </button>
          </div>
        )}
      </div>

      {open && (
        <div style={{
          background: '#fff',
          border: '1px solid rgba(37,99,235,0.1)',
          borderRadius: 14,
          padding: '18px 20px',
          boxShadow: '0 4px 20px rgba(15,23,42,0.08)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Wilaya</span>
              <select
                value={draft.wilaya}
                onChange={(e) => setDraftField('wilaya', e.target.value)}
                style={{
                  height: 38,
                  padding: '0 12px',
                  background: '#fff',
                  border: '1px solid rgba(37,99,235,0.18)',
                  borderRadius: 8,
                  color: draft.wilaya ? '#334155' : '#94a3b8',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">— Toutes les wilayas —</option>
                {wilayaOptions.map((wilaya) => (
                  <option key={wilaya} value={wilaya}>{wilaya}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Type de cancer</span>
              <input
                type="text"
                value={draft.type_cancer}
                onChange={(e) => setDraftField('type_cancer', e.target.value)}
                placeholder="Ex : Sein"
                style={{
                  height: 38,
                  padding: '0 12px',
                  background: '#fff',
                  border: '1px solid rgba(37,99,235,0.18)',
                  borderRadius: 8,
                  color: '#334155',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Age minimum</span>
              <input
                type="number"
                min="0"
                value={draft.age_min}
                onChange={(e) => setDraftField('age_min', e.target.value)}
                placeholder="0"
                style={{
                  height: 38,
                  padding: '0 12px',
                  background: '#fff',
                  border: '1px solid rgba(37,99,235,0.18)',
                  borderRadius: 8,
                  color: '#334155',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Age maximum</span>
              <input
                type="number"
                min="0"
                value={draft.age_max}
                onChange={(e) => setDraftField('age_max', e.target.value)}
                placeholder="120"
                style={{
                  height: 38,
                  padding: '0 12px',
                  background: '#fff',
                  border: '1px solid rgba(37,99,235,0.18)',
                  borderRadius: 8,
                  color: '#334155',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </label>
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            borderTop: '1px solid rgba(37,99,235,0.08)',
            paddingTop: 14,
            flexWrap: 'wrap',
          }}>
            <button
              type="button"
              onClick={() => { onApply(); setOpen(false); }}
              style={{
                padding: '9px 22px',
                background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              Appliquer les filtres
            </button>
            <button
              type="button"
              onClick={() => { onReset(); setOpen(false); }}
              style={{
                padding: '9px 18px',
                background: 'transparent',
                border: '1px solid rgba(37,99,235,0.2)',
                borderRadius: 10,
                color: '#64748b',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Réinitialiser
            </button>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>
              {Object.values(draft).filter((v) => v && v !== 'all' && v !== '').length} filtre(s) sélectionné(s)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SigPageV2() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const heatLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const communeMarkersLayerRef = useRef(null);
  const selectedZonesLayerRef = useRef(null);
  
  const [leafletReady, setLeafletReady] = useState(false);
  const [heatmapReady, setHeatmapReady] = useState(false);
  const [mapDataAll, setMapDataAll] = useState([]);
  const [wilayasData, setWilayasData] = useState(null);
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [savedZones, setSavedZones] = useState([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState([]);
  const [topWilaya, setTopWilaya] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // FIX : draft séparé pour les filtres — l'utilisateur édite le draft,
  // "Appliquer" copie le draft dans appliedFilters qui déclenche fetchData.
  const [draftFilters, setDraftFilters] = useState({ type_cancer: '', age_min: '', age_max: '', wilaya: '' });
  const [appliedFilters, setAppliedFilters] = useState({ type_cancer: '', age_min: '', age_max: '', wilaya: '' });

  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedCommuneId, setSelectedCommuneId] = useState(null);
  const [communes, setCommunes] = useState([]);

  const wilayaOptions = useMemo(() => {
    if (!Array.isArray(mapDataAll)) return [];
    return [...new Set(mapDataAll.map((w) => w.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [mapDataAll]);
  
  const zoneLayerRef = useRef(null);
  const edgeMarkerRef = useRef(null);
  const centerMarkerRef = useRef(null);
  const draftPolygonLayerRef = useRef(null);
  const draftPolygonVertexLayerRef = useRef(null);
  
  const [savingZone, setSavingZone] = useState(false);
  const [drawingMode, setDrawingMode] = useState(null);
  const drawingModeRef = useRef(drawingMode);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [zoneRadius, setZoneRadius] = useState(50000);
  const [zoneCenter, setZoneCenter] = useState(null);
  const [thermalEnabled, setThermalEnabled] = useState(true);

  // Stats de cancer agrégées à partir des wilayas actuellement chargées.
  // Quand une seule wilaya est sélectionnée (filtre appliqué), wilayasData.wilayas
  // ne contient (normalement) que les données de cette wilaya : la somme
  // correspond donc directement à sa répartition par type de cancer.
  const aggregatedCancerStats = useMemo(() => {
    if (!wilayasData || !wilayasData.wilayas) return [];
    const totals = {};
    Object.values(wilayasData.wilayas).forEach((wilaya) => {
      (wilaya.top_cancers || []).forEach((cancer) => {
        const name = cancer.topographie__libelle || cancer.topographie__code || cancer.name || 'Inconnu';
        const code = cancer.topographie__code || cancer.topographie__libelle || cancer.code || name;
        const count = Number(cancer.count || 0);
        const key = `${code}||${name}`;
        if (!totals[key]) totals[key] = { code, name, count: 0 };
        totals[key].count += count;
      });
    });
    const totalDiagnostics = wilayasData.total_diagnostics || Object.values(totals).reduce((sum, v) => sum + v.count, 0) || 1;
    return Object.values(totals)
      .sort((a, b) => b.count - a.count)
      .map((item) => ({ ...item, percentage: Math.round((item.count / totalDiagnostics) * 1000) / 10 }));
  }, [wilayasData]);

  const selectedCommuneCancerData = useMemo(
    () => COMMUNES_RISK_ANALYSIS.find((commune) => commune.id === selectedCommuneId) || null,
    [selectedCommuneId]
  );

  const toggleZoneSelection = (zone) => {
    const id = zone.id;
    const isSelected = selectedZoneIds.includes(id);
    setSelectedZoneIds(prev => isSelected ? prev.filter(zid => zid !== id) : [...prev, id]);
    if (!isSelected) zoomToZone(zone);
  };

  const toFiniteNumber = (value) => { const num = Number(value); return Number.isFinite(num) ? num : null; };

  const normalizeZonePolygon = (zone) => {
    const directPolygon = Array.isArray(zone?.polygon) ? zone.polygon : null;
    const nestedPolygon = Array.isArray(zone?.zones?.[0]?.polygon) ? zone.zones[0].polygon : null;
    const polygon = directPolygon || nestedPolygon || null;
    if (!polygon) return null;
    return polygon
      .map((point) => {
        const lat = Array.isArray(point) ? toFiniteNumber(point[0]) : toFiniteNumber(point?.lat);
        const lng = Array.isArray(point) ? toFiniteNumber(point[1]) : toFiniteNumber(point?.lng);
        if (lat === null || lng === null) return null;
        return [lat, lng];
      })
      .filter(Boolean);
  };

  const normalizeZoneCenter = (zone) => {
    const directLat = toFiniteNumber(zone?.center_lat ?? zone?.latitude ?? zone?.lat);
    const directLng = toFiniteNumber(zone?.center_lng ?? zone?.longitude ?? zone?.lng);
    const polygon = normalizeZonePolygon(zone);
    const polygonCenter = polygon?.length ? getPolygonCentroid(polygon) : null;
    const nestedCenter = zone?.zones?.[0]?.center;
    const nestedLat = Array.isArray(nestedCenter) ? toFiniteNumber(nestedCenter[0]) : toFiniteNumber(nestedCenter?.lat);
    const nestedLng = Array.isArray(nestedCenter) ? toFiniteNumber(nestedCenter[1]) : toFiniteNumber(nestedCenter?.lng);
    return {
      lat: directLat ?? polygonCenter?.lat ?? nestedLat ?? null,
      lng: directLng ?? polygonCenter?.lng ?? nestedLng ?? null,
    };
  };

  const normalizeZoneRadius = (zone, fallbackRadius = 0) => {
    const directRadius = toFiniteNumber(zone?.radius ?? zone?.rayon ?? zone?.r);
    const nestedRadius = toFiniteNumber(zone?.zones?.[0]?.radius ?? zone?.zones?.[0]?.rayon ?? zone?.zones?.[0]?.r);
    const polygon = normalizeZonePolygon(zone);
    const polygonRadius = polygon?.length >= 3 ? getPolygonApproxRadiusMeters(polygon, 0) : 0;
    let radius = directRadius ?? nestedRadius ?? fallbackRadius;
    if (polygonRadius > 0) radius = polygonRadius;
    if (!Number.isFinite(radius)) radius = fallbackRadius;
    if (radius > 0 && radius < 1000) radius *= 1000;
    return radius;
  };

  const formatZoneRadiusKm = (zone) => {
    if (normalizeZonePolygon(zone)?.length >= 3) return 'Polygone';
    const radius = normalizeZoneRadius(zone);
    if (!radius || radius <= 0) return 0;
    return Math.round(radius / 1000);
  };

  const intersectionAnalysis = useMemo(() => {
    if (selectedZoneIds.length < 2) return null;
    const zonesToCompare = savedZones.filter(z => selectedZoneIds.includes(z.id));
    if (zonesToCompare.length < 2) return null;
    const [z1, z2] = zonesToCompare;
    const p1 = [normalizeZoneCenter(z1).lat, normalizeZoneCenter(z1).lng];
    const p2 = [normalizeZoneCenter(z2).lat, normalizeZoneCenter(z2).lng];
    const r1 = normalizeZoneRadius(z1);
    const r2 = normalizeZoneRadius(z2);
    if (p1[0] === null || p1[1] === null || p2[0] === null || p2[1] === null || !window.L) return null;
    const r1m = r1 > 0 && r1 < 1000 ? r1 * 1000 : r1;
    const r2m = r2 > 0 && r2 < 1000 ? r2 * 1000 : r2;
    const distance = window.L.latLng(p1[0], p1[1]).distanceTo(window.L.latLng(p2[0], p2[1]));
    const overlap = (r1m + r2m) - distance;
    return { overlap: overlap > 0, distance: Math.round(distance / 1000), status: overlap > 0 ? "Zones Intersectées" : "Zones Disjointes" };
  }, [selectedZoneIds, savedZones]);

  useEffect(() => { drawingModeRef.current = drawingMode; }, [drawingMode]);

  const calculateEdgePoint = (center, radius) => {
    if (!mapInstance.current) return center;
    const latRadian = center.lat * Math.PI / 180;
    const angularDistance = radius / 6371000;
    return [center.lat, center.lng + (angularDistance * 180 / Math.PI) / Math.cos(latRadian)];
  };

  const updateZonePopup = () => {
    if (!zoneLayerRef.current) return;
    const currentRadius = zoneLayerRef.current.getRadius();
    zoneLayerRef.current.bindPopup(`<b>Zone d'analyse</b><br/>Rayon: ${Math.round(currentRadius / 1000)} km`).openPopup();
  };

  const clearDraftZone = () => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    [zoneLayerRef.current, edgeMarkerRef.current, centerMarkerRef.current, draftPolygonLayerRef.current, draftPolygonVertexLayerRef.current]
      .forEach((layer) => {
        if (layer) map.removeLayer(layer);
      });
    zoneLayerRef.current = null;
    edgeMarkerRef.current = null;
    centerMarkerRef.current = null;
    draftPolygonLayerRef.current = null;
    draftPolygonVertexLayerRef.current = null;
    setZoneCenter(null);
    setZoneRadius(50000);
    setPolygonPoints([]);
    setDrawingMode(null);
  };

  const initInteractiveZone = (center, radius) => {
    if (!mapInstance.current || !window.L) return;
    const map = mapInstance.current;
    clearDraftZone();
    setZoneCenter(center);
    setZoneRadius(radius);
    zoneLayerRef.current = window.L.circle(center, { radius, color: '#e11d48', fillOpacity: 0.1, weight: 2 }).addTo(map);
    centerMarkerRef.current = window.L.marker(center, {
      draggable: true, zIndexOffset: 1000,
      icon: window.L.divIcon({ className: 'sig-handle-center', html: '<div></div>', iconSize: [12, 12] })
    }).addTo(map);
    const edgeLatLng = calculateEdgePoint(center, radius);
    edgeMarkerRef.current = window.L.marker(edgeLatLng, {
      draggable: true, zIndexOffset: 1000,
      icon: window.L.divIcon({ className: 'sig-handle-edge', html: '<div></div>', iconSize: [12, 12] })
    }).addTo(map);
    centerMarkerRef.current.on('drag', (e) => {
      const newPos = e.target.getLatLng();
      setZoneCenter(newPos);
      zoneLayerRef.current.setLatLng(newPos);
      edgeMarkerRef.current.setLatLng(calculateEdgePoint(newPos, zoneLayerRef.current.getRadius()));
      updateZonePopup();
    });
    edgeMarkerRef.current.on('drag', (e) => {
      const newEdgePos = e.target.getLatLng();
      const newRadius = map.distance(zoneLayerRef.current.getLatLng(), newEdgePos);
      setZoneRadius(newRadius);
      zoneLayerRef.current.setRadius(newRadius);
      updateZonePopup();
    });
    updateZonePopup();
  };

  const startCircleDrawing = () => {
    clearDraftZone();
    setDrawingMode('circle');
    toast.success("Cliquez sur la carte pour placer le centre de la zone.");
  };

  const startPolygonDrawing = () => {
    clearDraftZone();
    setDrawingMode('polygon');
    setPolygonPoints([]);
    toast.success("Cliquez sur la carte pour dessiner le polygone, puis validez.");
  };

  const addPolygonPoint = (latlng) => {
    if (!latlng) return;
    setPolygonPoints((prev) => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
  };

  const finishPolygonDrawing = () => {
    if (polygonPoints.length < 3) {
      toast.error('Ajoutez au moins 3 points pour créer un polygone.');
      return;
    }
    toast.success('Polygone prêt. Vous pouvez maintenant enregistrer la zone.');
  };

  const cancelDrawing = () => {
    clearDraftZone();
    toast.success('Zone annulée.');
  };

  const renderSelectedZones = () => {
    if (!mapInstance.current || !selectedZonesLayerRef.current || !window.L) return;
    selectedZonesLayerRef.current.clearLayers();
    const zonesToRender = savedZones.filter(z => selectedZoneIds.includes(z.id));
    zonesToRender.forEach(zone => {
      const polygon = normalizeZonePolygon(zone);
      if (polygon?.length >= 3) {
        window.L.polygon(polygon, { color: '#2563eb', fillOpacity: 0.08, weight: 2, dashArray: '5, 5', interactive: false })
          .bindTooltip(zone.nom, { permanent: false, direction: 'center', className: 'zone-tooltip' })
          .addTo(selectedZonesLayerRef.current);
        return;
      }
      const { lat, lng } = normalizeZoneCenter(zone);
      const radius = normalizeZoneRadius(zone);
      if (lat === null || lng === null || radius <= 0) return;
      window.L.circle([lat, lng], { radius, color: '#2563eb', fillOpacity: 0.05, weight: 2, dashArray: '5, 5', interactive: false })
        .bindTooltip(zone.nom, { permanent: false, direction: 'center', className: 'zone-tooltip' })
        .addTo(selectedZonesLayerRef.current);
    });
  };

  const renderCancerChart = (items, max, color = '#2563eb') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => {
        const pct = max > 0 ? Math.max(6, (item.value / max) * 100) : 0;
        return (
          <div key={item.type} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>{item.type}</span>
              <span style={{ fontSize: 12, color, fontWeight: 700 }}>{item.value}</span>
            </div>
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}99, ${color})`, borderRadius: 999 }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderDraftZone = () => {
    if (!mapInstance.current || !window.L) return;
    const map = mapInstance.current;

    if (draftPolygonLayerRef.current) {
      map.removeLayer(draftPolygonLayerRef.current);
      draftPolygonLayerRef.current = null;
    }
    if (draftPolygonVertexLayerRef.current) {
      map.removeLayer(draftPolygonVertexLayerRef.current);
      draftPolygonVertexLayerRef.current = null;
    }

    if (drawingMode === 'polygon' && polygonPoints.length > 0) {
      const latLngs = polygonPoints.map((pt) => [pt.lat, pt.lng]);
      draftPolygonVertexLayerRef.current = window.L.layerGroup().addTo(map);
      polygonPoints.forEach((pt) => {
        window.L.circleMarker([pt.lat, pt.lng], {
          radius: 5,
          color: '#2563eb',
          weight: 2,
          fillColor: '#ffffff',
          fillOpacity: 1,
        }).addTo(draftPolygonVertexLayerRef.current);
      });
      if (polygonPoints.length >= 2) {
        draftPolygonLayerRef.current = window.L.polygon(latLngs, {
          color: '#2563eb',
          weight: 2,
          fillOpacity: 0.08,
          dashArray: '6, 6',
        }).addTo(map);
      }
    }
  };

  // fetchData : UN seul appel vers /sig/stats/ avec les noms exacts
  // attendus par le backend Django (type_cancer, age_min, age_max, wilaya, commune).
  const fetchData = useCallback(async (filters, wilaya, commune) => {
    setLoading(true);
    try {
      // On n'envoie que les valeurs non-vides pour éviter les rejets backend
      const params = {
        ...(filters.type_cancer              ? { type_cancer: filters.type_cancer.trim() } : {}),
        ...(filters.age_min !== ''           ? { age_min: Number(filters.age_min) }        : {}),
        ...(filters.age_max !== ''           ? { age_max: Number(filters.age_max) }        : {}),
        ...(wilaya                           ? { wilaya }                                   : {}),
        ...(commune                          ? { commune }                                  : {}),
      };

      const response = await sigService.getSigStats(params);
      const completeData = response.data || response;
      const formattedMapData = (completeData.wilayas || []).map(w => ({
        ...w, name: w.nom, cases: w.nb_patients, lat: w.coords?.[0], lon: w.coords?.[1]
      }));
      setMapDataAll(formattedMapData);
      if (formattedMapData.length > 0) {
        const sorted = [...formattedMapData].sort((a, b) => (b.cases || 0) - (a.cases || 0));
        setTopWilaya(sorted[0]);
      }
      setWilayasData(completeData);
      await fetchSavedZones();
      if (wilaya) loadCommunesForWilaya(wilaya);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error("Erreur lors de l'application des filtres");
    } finally {
      setLoading(false);
    }
  }, []);

  // FIX : appelé au montage avec les filtres initiaux vides
  useEffect(() => {
    if (leafletReady && heatmapReady) {
      fetchData(appliedFilters, selectedWilaya, selectedCommune);
    }
  }, [leafletReady, heatmapReady]);

  // FIX : re-fetch quand appliedFilters change (déclenché par le bouton Appliquer)
  useEffect(() => {
    if (leafletReady && heatmapReady) {
      fetchData(appliedFilters, selectedWilaya, selectedCommune);
    }
  }, [appliedFilters, leafletReady, heatmapReady]);

  // FIX : handler du bouton Appliquer — copie le draft dans appliedFilters
  const handleApplyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setSelectedWilaya(draftFilters.wilaya || null);
  };

  // FIX : reset complet
  const handleResetFilters = () => {
    const empty = { type_cancer: '', age_min: '', age_max: '', wilaya: '' };
    setDraftFilters(empty);
    setAppliedFilters(empty);
    setSelectedWilaya(null);
    setSelectedCommune('');
    setSelectedCommuneId(null);
  };

  useEffect(() => {
    if (!leafletReady || !heatmapReady || !mapRef.current) return;
    const map = window.L.map(mapRef.current, { zoomControl: false }).setView([28.5, 3], 5);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    markersLayerRef.current = window.L.layerGroup().addTo(map);
    communeMarkersLayerRef.current = window.L.layerGroup().addTo(map);
    selectedZonesLayerRef.current = window.L.layerGroup().addTo(map);
    const handleMapClick = (event) => {
      if (drawingModeRef.current === 'circle') {
        initInteractiveZone(event.latlng, zoneRadius);
        setDrawingMode(null);
        return;
      }
      if (drawingModeRef.current === 'polygon') {
        addPolygonPoint(event.latlng);
      }
    };
    map.on('click', handleMapClick);
    mapInstance.current = map;
    return () => {
      map.off('click', handleMapClick);
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) map.removeLayer(heatLayerRef.current);
      if (selectedZonesLayerRef.current) map.removeLayer(selectedZonesLayerRef.current);
      if (communeMarkersLayerRef.current) map.removeLayer(communeMarkersLayerRef.current);
      if (edgeMarkerRef.current) map.removeLayer(edgeMarkerRef.current);
      if (centerMarkerRef.current) map.removeLayer(centerMarkerRef.current);
      if (draftPolygonLayerRef.current) map.removeLayer(draftPolygonLayerRef.current);
      if (draftPolygonVertexLayerRef.current) map.removeLayer(draftPolygonVertexLayerRef.current);
      map.remove();
      mapInstance.current = null;
    };
  }, [leafletReady, heatmapReady]);

  useEffect(() => {
    if (!document.getElementById('sig-css')) {
      const style = document.createElement('style');
      style.id = 'sig-css';
      style.textContent = STYLES;
      document.head.appendChild(style);
    }
    if (!document.getElementById('leaf-css')) {
      const link = document.createElement('link');
      link.id = 'leaf-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (window.L) {
      setLeafletReady(true);
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletReady(true);
      document.head.appendChild(script);
    }
    if (!document.getElementById('leaflet-heat')) {
      const heatScript = document.createElement('script');
      heatScript.id = 'leaflet-heat';
      heatScript.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
      heatScript.onload = () => setHeatmapReady(true);
      document.head.appendChild(heatScript);
    } else {
      setHeatmapReady(true);
    }
  }, []);

  useEffect(() => { renderHeatmap(); renderBasicMarkers(); }, [mapDataAll, thermalEnabled, topWilaya]);
  useEffect(() => { renderCommuneMarkers(); }, [selectedCommuneId, leafletReady, heatmapReady]);
  useEffect(() => { renderSelectedZones(); }, [selectedZoneIds, savedZones, leafletReady]);
  useEffect(() => { renderDraftZone(); }, [drawingMode, polygonPoints, zoneCenter, zoneRadius, leafletReady]);
  useEffect(() => { loadCommunesForWilaya(selectedWilaya); }, [selectedWilaya]);

  const renderHeatmap = () => {
    if (!mapInstance.current || !window.L?.heatLayer) return;
    if (heatLayerRef.current && mapInstance.current.hasLayer(heatLayerRef.current)) mapInstance.current.removeLayer(heatLayerRef.current);
    heatLayerRef.current = null;
    if (!thermalEnabled || !mapDataAll?.length) return;
    const maxCases = Math.max(...mapDataAll.map((w) => Number(w.cases || w.nb_patients || 0)), 1);
    const points = mapDataAll
      .map((w) => ({ lat: Number(w.lat || (w.coords && w.coords[0])), lon: Number(w.lon || (w.coords && w.coords[1])), cases: Number(w.cases || w.nb_patients || 0) }))
      .filter((p) => p.cases > 0 && Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => [p.lat, p.lon, (p.cases / maxCases) * 4]);
    if (!points.length) return;
    heatLayerRef.current = window.L.heatLayer(points, { radius: 35, blur: 20, maxZoom: 12, minOpacity: 0.4, gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1: 'red' } }).addTo(mapInstance.current);
  };

  const renderBasicMarkers = () => {
    if (!mapInstance.current || !markersLayerRef.current || !window.L) return;
    markersLayerRef.current.clearLayers();
    if (!mapDataAll.length) return;
    mapDataAll.forEach(w => {
      const lat = Number(w.lat || (w.coords && w.coords[0]));
      const lon = Number(w.lon || (w.coords && w.coords[1]));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const isTop = topWilaya && w.name === topWilaya.name;
      const marker = window.L.circleMarker([lat, lon], {
        radius: isTop ? 14 : 8, fillColor: isTop ? '#ef4444' : '#0ea5e9', color: '#fff',
        weight: isTop ? 3 : 1, fillOpacity: thermalEnabled ? (isTop ? 0.9 : 0.45) : 0.8,
        className: isTop ? 'top-wilaya-marker' : ''
      });
      const content = `<div style="text-align:center"><b style="color:${isTop ? '#ef4444' : '#1e293b'}">${isTop ? '🏆 ' : ''}${w.name}</b><br/><span style="font-size:1.1em; font-weight:bold">${w.cases} cas</span></div>`;
      marker.bindTooltip(content, { permanent: isTop, direction: 'top', offset: [0, -10] });
      marker.on('click', () => {
        setSelectedWilaya(w.name);
        setAppliedFilters((prev) => ({ ...prev, wilaya: w.name }));
        setDraftFilters((prev) => ({ ...prev, wilaya: w.name }));
        setSelectedCommune('');
        setSelectedCommuneId(null);
        // On ouvre directement l'onglet "Cancers" pour afficher la
        // répartition par type de cancer de la wilaya cliquée
        // (ex : 1 cancer du sein, 2 cas cancer prostate...).
        setTab('cancers');
        mapInstance.current.flyTo([lat, lon], 10, { animate: true, duration: 1.1 });
      });
      marker.addTo(markersLayerRef.current);
    });
  };

  const renderCommuneMarkers = () => {
    if (!mapInstance.current || !communeMarkersLayerRef.current || !window.L) return;
    communeMarkersLayerRef.current.clearLayers();
    COMMUNES_RISK_ANALYSIS.forEach((commune) => {
      const isSelected = selectedCommuneId === commune.id;
      const marker = window.L.circleMarker(commune.coords, {
        radius: isSelected ? 13 : 9,
        fillColor: commune.riskScore > 8 ? '#dc2626' : commune.riskScore >= 5 ? '#ea580c' : commune.riskScore >= 2 ? '#ca8a04' : '#16a34a',
        color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)', weight: isSelected ? 3 : 1, fillOpacity: isSelected ? 0.95 : 0.75,
      });
      marker.bindTooltip(`<div style="text-align:center"><b>${commune.commune}</b><br/>Incidence ${commune.incidenceRate}/100k</div>`, { direction: 'top' });
      marker.on('click', () => {
        setSelectedCommuneId(commune.id);
        setTab('cancers');
        mapInstance.current.flyTo(commune.coords, 11, { animate: true, duration: 1.1 });
      });
      marker.addTo(communeMarkersLayerRef.current);
    });
  };

  const toggleThermalView = () => setThermalEnabled(!thermalEnabled);

  const saveInteractiveZone = async () => {
    const isPolygon = drawingMode === 'polygon' || polygonPoints.length >= 3;
    if (!zoneCenter && !isPolygon) { toast.error("Veuillez d'abord dessiner une zone."); return; }
    if (isPolygon && polygonPoints.length < 3) {
      toast.error("Le polygone doit contenir au moins 3 points.");
      return;
    }
    const zoneName = window.prompt("Entrez un nom pour cette nouvelle zone d'analyse :");
    if (!zoneName || !zoneName.trim()) return;
    try {
      setSavingZone(true);
      const trimmedName = zoneName.trim().substring(0, 50);
      const payload = isPolygon
        ? {
            nom: trimmedName,
            zones: [{
              name: trimmedName,
              polygon: polygonPoints.map((pt) => [pt.lat, pt.lng]),
              center: [getPolygonCentroid(polygonPoints)?.lat ?? polygonPoints[0].lat, getPolygonCentroid(polygonPoints)?.lng ?? polygonPoints[0].lng],
              radius: getPolygonApproxRadiusMeters(polygonPoints, zoneRadius),
            }],
            filters: { is_thermal: thermalEnabled },
          }
        : {
            nom: trimmedName,
            zones: [{ name: trimmedName, center: [zoneCenter.lat, zoneCenter.lng], radius: zoneRadius }],
            filters: { is_thermal: thermalEnabled },
          };
      await sigService.createMapCard(payload);
      toast.success(`Zone "${zoneName.trim()}" enregistrée avec succès.`);
      clearDraftZone();
      await fetchSavedZones();
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.response?.data?.non_field_errors?.[0] || error?.message || '';
      console.error('Erreur sauvegarde zone:', error?.response?.data || error);
      toast.error(detail ? `Erreur technique lors de l'enregistrement de la zone: ${detail}` : "Erreur technique lors de l'enregistrement de la zone.");
    } finally { setSavingZone(false); }
  };

  const deleteSavedZone = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette zone définitivement ?")) return;
    try {
      await sigService.deleteMapCard(id);
      toast.success("Zone supprimée.");
      setSelectedZoneIds(prev => prev.filter(zid => zid !== id));
      if (mapInstance.current) {
        if (zoneLayerRef.current) mapInstance.current.removeLayer(zoneLayerRef.current);
        if (edgeMarkerRef.current) mapInstance.current.removeLayer(edgeMarkerRef.current);
        if (centerMarkerRef.current) mapInstance.current.removeLayer(centerMarkerRef.current);
      }
      setZoneCenter(null);
      fetchSavedZones();
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const zoomToZone = (zone) => {
    if (!mapInstance.current) return;
    const polygon = normalizeZonePolygon(zone);
    if (polygon?.length >= 3) {
      clearDraftZone();
      const bounds = window.L.latLngBounds(polygon);
      mapInstance.current.fitBounds(bounds.pad(0.15), { animate: true });
      return;
    }
    const { lat, lng } = normalizeZoneCenter(zone);
    const radius = normalizeZoneRadius(zone, 50000);
    if (lat === null || lng === null) return;
    initInteractiveZone({ lat, lng }, radius);
    mapInstance.current.flyTo([lat, lng], 11, { animate: true, duration: 1.5 });
  };

  const zoomToWilaya = (wilaya) => {
    if (!mapInstance.current) return;
    const w = mapDataAll.find(item => item.name === wilaya);
    if (w) {
      const lat = Number(w.lat || (w.coords && w.coords[0]));
      const lon = Number(w.lon || (w.coords && w.coords[1]));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      mapInstance.current.flyTo([lat, lon], 10);
      setSelectedWilaya(wilaya);
      initInteractiveZone({ lat, lng: lon }, 50000);
    }
  };

  const loadCommunesForWilaya = async (wilaya) => {
    setSelectedCommune('');
    setSelectedCommuneId(null);
    if (!wilaya) { setCommunes([]); return; }
    try {
      const res = await sigService.getPatientsData(wilaya);
      const patients = res.data?.results || res.data || [];
      const communeList = Array.from(new Set(patients.map((p) => p.commune).filter(Boolean))).sort();
      setCommunes(communeList);
    } catch (error) {
      console.error('Erreur chargement communes:', error);
      setCommunes([]);
    }
  };

  const fetchSavedZones = async () => {
    try {
      const res = await sigService.getMapCards();
      setSavedZones(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (error) {
      console.error("Erreur zones:", error);
    }
  };

  // Indicateur visuel : y a-t-il des filtres actifs non encore appliqués ?
  const hasPendingChanges = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);
  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '') || Boolean(selectedWilaya || selectedCommune);

  // Total de cas correspondant à la wilaya actuellement sélectionnée
  // (sert à afficher "6 cas" à côté du titre de la répartition par cancer).
  const selectedWilayaTotalCases = useMemo(() => {
    if (!selectedWilaya) return null;
    const match = mapDataAll.find((w) => w.name === selectedWilaya);
    return match ? Number(match.cases || 0) : (wilayasData?.total_patients ?? null);
  }, [selectedWilaya, mapDataAll, wilayasData]);

  return (
    <AppLayout>
      <div className="sig-wrap">
        <div className="sig-header">
          <h1 className="sig-title">Cartographie SIG - Cancers en Algérie</h1>
          <p className="sig-subtitle">
            {selectedWilaya ? `Wilaya: ${selectedWilaya} | ` : ""}
            Total Filtré : {wilayasData?.total_patients || 0} patients | {wilayasData?.total_diagnostics || 0} diagnostics
            {hasActiveFilters && <span style={{ marginLeft: 8, background: 'rgba(37,99,235,0.1)', color: '#2563eb', padding: '1px 8px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700 }}>Filtres actifs</span>}
          </p>
          <SigFilterBar
            filters={appliedFilters}
            draft={draftFilters}
            setDraft={setDraftFilters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            wilayaOptions={wilayaOptions}
          />
        </div>

        <div className="sig-container">
          {/* ── Panel gauche ── */}
         

          {/* ── Carte centrale ── */}
          <div className="sig-map-section">
            <div ref={mapRef} id="sig-map">
              {!leafletReady && <div className="loading"><div className="loader" /></div>}
            </div>

            <style>{`
              .top-wilaya-marker { animation: pulse-red 2s infinite; }
              @keyframes pulse-red {
                0% { filter: drop-shadow(0 0 0px rgba(220, 38, 38, 0.6)); }
                70% { filter: drop-shadow(0 0 12px rgba(220, 38, 38, 0)); }
                100% { filter: drop-shadow(0 0 0px rgba(220, 38, 38, 0)); }
              }
              .sig-handle-center { background: white; border: 2px solid #2563eb; border-radius: 50%; box-shadow: 0 2px 8px rgba(15,23,42,0.15); }
              .sig-handle-edge { background: white; border: 2px solid #dc2626; border-radius: 2px; transform: rotate(45deg); box-shadow: 0 2px 8px rgba(15,23,42,0.15); }
            `}</style>

            <div className="sig-map-actions">
              <button className="sig-map-action" onClick={toggleThermalView}>
                {thermalEnabled ? 'Masquer thermique' : 'Afficher thermique'}
              </button>
              {!zoneCenter ? (
                <button className="sig-map-action" onClick={startCircleDrawing} style={{ background: drawingMode === 'circle' ? '#dbeafe' : '#ffffff' }}>
                  {drawingMode === 'circle' ? 'Cliquez sur la carte...' : 'Nouvelle zone cercle'}
                </button>
              ) : (
                <button className="sig-map-action" onClick={saveInteractiveZone} disabled={savingZone} style={{ background: '#10b981', color: '#fff', borderColor: '#10b981' }}>
                  {savingZone ? 'Enregistrement...' : '✓ Confirmer & Sauvegarder'}
                </button>
              )}
              <button className="sig-map-action" onClick={startPolygonDrawing} style={{ background: drawingMode === 'polygon' ? '#dbeafe' : '#ffffff' }}>
                {drawingMode === 'polygon' ? `Polygon: ${polygonPoints.length} points` : 'Nouvelle zone polygone'}
              </button>
              {drawingMode === 'polygon' && (
                <button className="sig-map-action" onClick={finishPolygonDrawing} style={{ background: '#ffffff' }}>
                  Terminer le polygone
                </button>
              )}
              {(drawingMode || zoneCenter || polygonPoints.length > 0) && (
                <button className="sig-map-action" onClick={cancelDrawing} style={{ background: '#ffffff' }}>
                  Annuler
                </button>
              )}
              {polygonPoints.length >= 3 && (
                <button className="sig-map-action" onClick={saveInteractiveZone} disabled={savingZone} style={{ background: '#10b981', color: '#fff', borderColor: '#10b981' }}>
                  {savingZone ? 'Enregistrement...' : 'Confirmer & Sauvegarder'}
                </button>
              )}
            </div>
          </div>

          {/* ── Panel droit ── */}
          <div className="sig-side-panel right">
            <div className="ss-tabs">
              <button className={`ss-tab${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>Zones</button>
              <button className={`ss-tab${tab === 'cancers' ? ' active' : ''}`} onClick={() => setTab('cancers')}>Cancers</button>
              <button className={`ss-tab${tab === 'ai' ? ' active' : ''}`} onClick={() => setTab('ai')}>IA</button>
            </div>

            <div className="ss-body" style={tab === 'ai' ? { padding: 0 } : undefined}>
              {loading ? (
                <div className="loading"><div className="loader" /></div>
              ) : (
                <>
                  {selectedWilaya && (
                    <div style={{ marginBottom: 16 }}>
                      <button
                        onClick={() => { setSelectedWilaya(null); setTab('overview'); }}
                        style={{ width: '100%', padding: '10px 12px', background: '#eff6ff', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                      >
                        ← Retour à la vue nationale
                      </button>
                    </div>
                  )}

                  {tab === 'overview' && (
                    <div>
                      <div className="sc-title">Mes zones sauvegardées</div>
                      <div className="sig-subtitle" style={{ marginBottom: '10px' }}>Sélectionnez 2 zones pour comparer</div>
                      {savedZones.length === 0 ? (
                        <p className="sig-subtitle">Aucune zone. Utilisez les boutons de zone sur la carte.</p>
                      ) : (
                        savedZones.map(zone => (
                          <div
                            key={zone.id}
                            className="zone-item"
                            style={{ border: selectedZoneIds.includes(zone.id) ? '1px solid #2563eb' : '', cursor: 'pointer' }}
                            onClick={() => zoomToZone(zone)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedZoneIds.includes(zone.id)}
                              onChange={(e) => { e.stopPropagation(); toggleZoneSelection(zone); }}
                              style={{ marginRight: '10px', accentColor: '#2563eb' }}
                            />
                            <div className="zone-info">
                              <div className="zone-name">{zone.nom}</div>
                              <div className="zone-meta">Rayon: {formatZoneRadiusKm(zone)} km</div>
                            </div>
                            <div className="zone-actions">
                              <button onClick={(e) => deleteSavedZone(zone.id, e)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                            </div>
                          </div>
                        ))
                      )}
                      {intersectionAnalysis && (
                        <div className="hypothesis-card" style={{ marginTop: '14px', background: intersectionAnalysis.overlap ? 'rgba(22,163,74,0.05)' : 'rgba(37,99,235,0.05)', borderColor: intersectionAnalysis.overlap ? 'rgba(22,163,74,0.2)' : 'rgba(37,99,235,0.15)' }}>
                          <div className="ht-title" style={{ color: intersectionAnalysis.overlap ? '#16a34a' : '#2563eb' }}>
                            🤝 {intersectionAnalysis.status}
                          </div>
                          <div className="ht-text">
                            Distance entre centres : <b>{intersectionAnalysis.distance} km</b><br/>
                            {intersectionAnalysis.overlap ? "✓ Les populations de ces zones se chevauchent." : "Les zones sont distinctes géographiquement."}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {tab === 'cancers' && (selectedCommuneCancerData || aggregatedCancerStats.length > 0) && (
                    <div>
                      <div className="sc-title" style={{ marginBottom: 4 }}>
                        {selectedCommuneCancerData
                          ? `Cancers de ${selectedCommuneCancerData.commune}`
                          : selectedWilaya
                            ? `Cancers à ${selectedWilaya}`
                            : 'Cancers renseignés'}
                      </div>
                      {!selectedCommuneCancerData && selectedWilaya && (
                        <div className="sig-subtitle" style={{ marginBottom: 12 }}>
                          {selectedWilayaTotalCases != null ? `${selectedWilayaTotalCases} cas au total` : ''}
                        </div>
                      )}
                      {selectedCommuneCancerData && (
                        <div className="hypothesis-card" style={{ marginBottom: 14, marginTop: 10 }}>
                          <div className="ht-title">Commune sélectionnée : {selectedCommuneCancerData.commune}</div>
                          <div className="ht-text" style={{ marginBottom: 10 }}>
                            Incidence: <b>{selectedCommuneCancerData.incidenceRate}/100k</b><br />
                            Niveau de risque: <b>{selectedCommuneCancerData.globalRisk}</b><br />
                            Cancer dominant: <b>{selectedCommuneCancerData.dominantCancer?.type || '—'}</b>
                          </div>
                          {renderCancerChart(
                            selectedCommuneCancerData.chartData,
                            Math.max(...selectedCommuneCancerData.chartData.map((c) => c.value), 1),
                            '#dc2626'
                          )}
                        </div>
                      )}
                      {selectedCommuneCancerData ? null : aggregatedCancerStats.length === 0 ? (
                        <p className="sig-subtitle">Aucun cas de cancer renseigné pour cette sélection.</p>
                      ) : aggregatedCancerStats.map((cancer, idx) => (
                        <div key={idx} className="cancer-item">
                          <div className="ci-name">
                            {cancer.name && cancer.code && cancer.name !== cancer.code
                              ? `${cancer.name} (${cancer.code})`
                              : (cancer.name || cancer.code || 'Inconnu')}
                          </div>
                          <div className="ci-value">
                            <div>
                              <div className="ci-count">{cancer.count}</div>
                              <div style={{ fontSize: '0.65rem', color: '#334155' }}>
                                {cancer.count > 1 ? 'cas' : 'cas'}
                              </div>
                            </div>
                            <div className="ci-pct">{cancer.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'ai' && (
                    <SigAiAnalysisPanel selectedCommuneId={selectedCommuneId} onCommuneChange={setSelectedCommuneId} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export { SigPageV2 };
export default SigPageV2;