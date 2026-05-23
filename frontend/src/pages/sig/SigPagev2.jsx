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

  .sig-container { display: grid; grid-template-columns: 280px 1fr 350px; gap: 0; flex: 1; overflow: hidden; }
  .sig-map-section { display: flex; flex-direction: column; border-right: 1px solid rgba(37,99,235,0.08); position: relative; background: #fff; }
  #sig-map { flex: 1; min-height: 0; }

  .sig-side-panel { display: flex; flex-direction: column; background: #ffffff; overflow: hidden; border-right: 1px solid rgba(37,99,235,0.08); }
  .sig-side-panel.right { border-right: none; border-left: 1px solid rgba(37,99,235,0.08); width: 350px; }

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
  const [draftFilters, setDraftFilters] = useState({ type_cancer: '', age_min: '', age_max: '' });
  const [appliedFilters, setAppliedFilters] = useState({ type_cancer: '', age_min: '', age_max: '' });

  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedCommuneId, setSelectedCommuneId] = useState(null);
  const [communes, setCommunes] = useState([]);
  
  const zoneLayerRef = useRef(null);
  const edgeMarkerRef = useRef(null);
  const centerMarkerRef = useRef(null);
  
  const [savingZone, setSavingZone] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(isDrawing);
  const [zoneRadius, setZoneRadius] = useState(50000);
  const [zoneCenter, setZoneCenter] = useState(null);
  const [thermalEnabled, setThermalEnabled] = useState(true);

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

  const toggleZoneSelection = (zone) => {
    const id = zone.id;
    const isSelected = selectedZoneIds.includes(id);
    setSelectedZoneIds(prev => isSelected ? prev.filter(zid => zid !== id) : [...prev, id]);
    if (!isSelected) zoomToZone(zone);
  };

  const toFiniteNumber = (value) => { const num = Number(value); return Number.isFinite(num) ? num : null; };

  const normalizeZoneCenter = (zone) => {
    const directLat = toFiniteNumber(zone?.center_lat ?? zone?.latitude ?? zone?.lat);
    const directLng = toFiniteNumber(zone?.center_lng ?? zone?.longitude ?? zone?.lng);
    const nestedCenter = zone?.zones?.[0]?.center;
    const nestedLat = Array.isArray(nestedCenter) ? toFiniteNumber(nestedCenter[0]) : toFiniteNumber(nestedCenter?.lat);
    const nestedLng = Array.isArray(nestedCenter) ? toFiniteNumber(nestedCenter[1]) : toFiniteNumber(nestedCenter?.lng);
    return { lat: directLat ?? nestedLat ?? null, lng: directLng ?? nestedLng ?? null };
  };

  const normalizeZoneRadius = (zone, fallbackRadius = 0) => {
    const directRadius = toFiniteNumber(zone?.radius ?? zone?.rayon ?? zone?.r);
    const nestedRadius = toFiniteNumber(zone?.zones?.[0]?.radius ?? zone?.zones?.[0]?.rayon ?? zone?.zones?.[0]?.r);
    let radius = directRadius ?? nestedRadius ?? fallbackRadius;
    if (!Number.isFinite(radius)) radius = fallbackRadius;
    if (radius > 0 && radius < 1000) radius *= 1000;
    return radius;
  };

  const formatZoneRadiusKm = (zone) => {
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

  useEffect(() => { isDrawingRef.current = isDrawing; }, [isDrawing]);

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

  const initInteractiveZone = (center, radius) => {
    if (!mapInstance.current || !window.L) return;
    const map = mapInstance.current;
    setZoneCenter(center);
    setZoneRadius(radius);
    if (zoneLayerRef.current) map.removeLayer(zoneLayerRef.current);
    if (edgeMarkerRef.current) map.removeLayer(edgeMarkerRef.current);
    if (centerMarkerRef.current) map.removeLayer(centerMarkerRef.current);
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

  const startDrawing = () => {
    setIsDrawing(true);
    toast.success("Cliquez sur la carte pour placer le centre de la zone.");
  };

  const renderSelectedZones = () => {
    if (!mapInstance.current || !selectedZonesLayerRef.current || !window.L) return;
    selectedZonesLayerRef.current.clearLayers();
    const zonesToRender = savedZones.filter(z => selectedZoneIds.includes(z.id));
    zonesToRender.forEach(zone => {
      const { lat, lng } = normalizeZoneCenter(zone);
      const radius = normalizeZoneRadius(zone);
      if (lat === null || lng === null || radius <= 0) return;
      window.L.circle([lat, lng], { radius, color: '#2563eb', fillOpacity: 0.05, weight: 2, dashArray: '5, 5', interactive: false })
        .bindTooltip(zone.nom, { permanent: false, direction: 'center', className: 'zone-tooltip' })
        .addTo(selectedZonesLayerRef.current);
    });
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
  }, [appliedFilters]);

  // FIX : handler du bouton Appliquer — copie le draft dans appliedFilters
  const handleApplyFilters = () => {
    setAppliedFilters({ ...draftFilters });
  };

  // FIX : reset complet
  const handleResetFilters = () => {
    const empty = { type_cancer: '', age_min: '', age_max: '' };
    setDraftFilters(empty);
    setAppliedFilters(empty);
  };

  useEffect(() => {
    if (!leafletReady || !heatmapReady || !mapRef.current) return;
    const map = window.L.map(mapRef.current, { zoomControl: false }).setView([28.5, 3], 5);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    markersLayerRef.current = window.L.layerGroup().addTo(map);
    communeMarkersLayerRef.current = window.L.layerGroup().addTo(map);
    selectedZonesLayerRef.current = window.L.layerGroup().addTo(map);
    const handleMapClick = (event) => {
      if (!isDrawingRef.current) return;
      initInteractiveZone(event.latlng, zoneRadius);
      setIsDrawing(false);
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
      marker.on('click', () => { setSelectedCommuneId(commune.id); setTab('ai'); mapInstance.current.flyTo(commune.coords, 11, { animate: true, duration: 1.1 }); });
      marker.addTo(communeMarkersLayerRef.current);
    });
  };

  const toggleThermalView = () => setThermalEnabled(!thermalEnabled);

  const saveInteractiveZone = async () => {
    if (!zoneCenter) { toast.error("Veuillez d'abord dessiner une zone."); return; }
    const zoneName = window.prompt("Entrez un nom pour cette nouvelle zone d'analyse :");
    if (!zoneName || !zoneName.trim()) return;
    try {
      setSavingZone(true);
      const payload = { nom: zoneName.trim().substring(0, 50), zones: [{ center: [zoneCenter.lat, zoneCenter.lng], radius: zoneRadius }], filters: { is_thermal: thermalEnabled } };
      await sigService.createMapCard(payload);
      toast.success(`Zone "${zoneName.trim()}" enregistrée avec succès.`);
      if (edgeMarkerRef.current) mapInstance.current.removeLayer(edgeMarkerRef.current);
      if (centerMarkerRef.current) mapInstance.current.removeLayer(centerMarkerRef.current);
      setZoneCenter(null);
      await fetchSavedZones();
    } catch (error) {
      toast.error("Erreur technique lors de l'enregistrement de la zone.");
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
  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '');

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
        </div>

        <div className="sig-container">
          {/* ── Panel gauche ── */}
          <div className="sig-side-panel">
            <div className="ss-body" style={{ borderBottom: '1px solid rgba(37,99,235,0.08)', flex: 'none', background: '#f8fafc' }}>
              <div className="sc-title">Filtres Avancés</div>
              <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Type de cancer (ex: Sein)..."
                  style={{ padding: '9px 12px', width: '100%', borderRadius: '9px', border: '1px solid rgba(37,99,235,0.15)', background: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                  value={draftFilters.type_cancer}
                  onChange={e => setDraftFilters(d => ({ ...d, type_cancer: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleApplyFilters()}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number" placeholder="Âge min" min="0" max="120"
                    style={{ width: '50%', padding: '9px 12px', borderRadius: '9px', border: '1px solid rgba(37,99,235,0.15)', background: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    value={draftFilters.age_min}
                    onChange={e => setDraftFilters(d => ({ ...d, age_min: e.target.value }))}
                  />
                  <input
                    type="number" placeholder="Âge max" min="0" max="120"
                    style={{ width: '50%', padding: '9px 12px', borderRadius: '9px', border: '1px solid rgba(37,99,235,0.15)', background: '#fff', fontSize: '0.85rem', outline: 'none' }}
                    value={draftFilters.age_max}
                    onChange={e => setDraftFilters(d => ({ ...d, age_max: e.target.value }))}
                  />
                </div>

                {/* FIX : Appliquer copie le draft → déclenche useEffect → fetchData */}
                <button
                  onClick={handleApplyFilters}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: hasPendingChanges ? '#1d4ed8' : '#2563eb',
                    color: '#fff', border: 'none', borderRadius: '9px',
                    fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                    boxShadow: hasPendingChanges ? '0 4px 12px rgba(37,99,235,0.4)' : '0 2px 6px rgba(37,99,235,0.2)',
                    transition: 'all 0.2s',
                    outline: hasPendingChanges ? '2px solid rgba(37,99,235,0.4)' : 'none',
                    outlineOffset: 2,
                  }}
                >
                  {hasPendingChanges ? '⚡ Appliquer les filtres' : 'Appliquer les filtres'}
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    style={{ width: '100%', padding: '8px 14px', background: 'transparent', color: '#64748b', border: '1px solid rgba(100,116,139,0.25)', borderRadius: '9px', fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer' }}
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '16px', borderBottom: '1px solid rgba(37,99,235,0.08)', background: '#f8fafc' }}>
              <div className="sc-title" style={{ margin: 0 }}>Vue nationale</div>
              <div className="sig-subtitle">Cliquez sur une wilaya pour zoomer</div>
            </div>
            <div className="ss-body" style={{ background: '#ffffff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {mapDataAll.slice(0, 15).map((wilaya) => (
                  <div
                    key={wilaya.code}
                    className="zone-item"
                    style={{ borderLeft: selectedWilaya === wilaya.name ? '3px solid #2563eb' : '', cursor: 'pointer' }}
                    onClick={() => zoomToWilaya(wilaya.name)}
                  >
                    <div className="zone-info">
                      <div className="zone-name">{wilaya.name}</div>
                      <div className="zone-meta">{wilaya.cases} cas détectés</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
                <button className="sig-map-action" onClick={startDrawing} style={{ background: isDrawing ? '#dbeafe' : '#ffffff' }}>
                  {isDrawing ? 'Cliquez sur la carte...' : 'Nouvelle Zone'}
                </button>
              ) : (
                <button className="sig-map-action" onClick={saveInteractiveZone} disabled={savingZone} style={{ background: '#10b981', color: '#fff', borderColor: '#10b981' }}>
                  {savingZone ? 'Enregistrement...' : '✓ Confirmer & Sauvegarder'}
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

            <div className="ss-body">
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
                        <p className="sig-subtitle">Aucune zone. Utilisez "Nouvelle Zone" sur la carte.</p>
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

                  {tab === 'cancers' && aggregatedCancerStats.length > 0 && (
                    <div>
                      <div className="sc-title" style={{ marginBottom: 12 }}>Cancers renseignés</div>
                      {aggregatedCancerStats.map((cancer, idx) => (
                        <div key={idx} className="cancer-item">
                          <div className="ci-name">
                            {cancer.name && cancer.code && cancer.name !== cancer.code
                              ? `${cancer.name} (${cancer.code})`
                              : (cancer.name || cancer.code || 'Inconnu')}
                          </div>
                          <div className="ci-value">
                            <div>
                              <div className="ci-count">{cancer.count}</div>
                              <div style={{ fontSize: '0.65rem', color: '#334155' }}>patients</div>
                            </div>
                            <div className="ci-pct">{cancer.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'ai' && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                      <SigAiAnalysisPanel selectedCommuneId={selectedCommuneId} onCommuneChange={setSelectedCommuneId} />
                    </div>
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