import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import { sigService } from '../../services/sigService';
import SigAiAnalysisPanel, { COMMUNES_RISK_ANALYSIS } from './SigAiAnalysisPanel';

const STYLES = `
  .sig-wrap { display: flex; flex-direction: column; height: calc(100vh - 60px); background: var(--bg); }
  .sig-header { padding: 16px 20px; border-bottom: 1px solid var(--border-light); background: #ffffff; }
  .sig-title { font-size: 1.3rem; font-weight: 700; color: #1e293b; margin: 0; }
  .sig-subtitle { font-size: 0.8rem; color: #64748b; margin: 4px 0 0; }

  .sig-container { display: grid; grid-template-columns: 280px 1fr 320px; gap: 0; flex: 1; overflow: hidden; }
  .sig-map-section { display: flex; flex-direction: column; border-right: 1px solid var(--border-light); }
  #sig-map { flex: 1; min-height: 0; }

  .sig-side-panel { display: flex; flex-direction: column; background: #ffffff; overflow: hidden; border-right: 1px solid var(--border-light); }
  .sig-side-panel.right { border-right: none; border-left: 1px solid var(--border-light); }

  .ss-tabs { display: flex; border-bottom: 1px solid var(--border-light); }
  .ss-tab { flex: 1; padding: 10px; background: none; border: none; color: #64748b; font-size: 0.75rem;
     font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all .15s; }
  .ss-tab:hover { color: #1e293b; }
  .ss-tab.active { color: #00a8ff; border-bottom-color: #00a8ff; background: rgba(0,168,255,0.05); }
  .ss-body { flex: 1; overflow-y: auto; padding: 12px; }
  .ss-body::-webkit-scrollbar { width: 3px; }
  .ss-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .stat-card { background: var(--bg-elevated); border: 1px solid var(--border-light); border-radius: var(--radius-md);
     padding: 12px; margin-bottom: 10px; }
  .sc-title { font-size: 0.8rem; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
  .sc-count { font-size: 1.5rem; font-weight: 700; color: #00a8ff; }
  .sc-pct { font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; }

  .cancer-item { background: var(--bg-elevated); border: 1px solid var(--border-light); border-radius: var(--radius-md);
     padding: 10px; margin-bottom: 8px; }
  .ci-name { font-size: 0.8rem; font-weight: 600; color: #1e293b; }
  .ci-value { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
  .ci-count { font-size: 1.2rem; font-weight: 700; color: #00a8ff; }
  .ci-pct { font-size: 0.75rem; background: rgba(0,168,255,0.15); color: #00a8ff; padding: 2px 6px; border-radius: 10px; }

  .causes-item { background: var(--bg-elevated); border: 1px solid var(--border-light); border-radius: var(--radius-md);
     padding: 10px; margin-bottom: 8px; }
  .ci-header { font-size: 0.8rem; font-weight: 600; color: #1e293b; margin-bottom: 6px; }
  .ci-cause { font-size: 0.7rem; color: var(--text-secondary); padding: 4px 0; padding-left: 12px; }
  .ci-cause:before { content: '• '; color: #00a8ff; font-weight: bold; }

  .hypothesis-card { background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3);
     padding: 12px; border-radius: var(--radius-md); margin-top: 10px; }
  .ht-title { font-size: 0.8rem; font-weight: 700; color: #ffc107; margin-bottom: 5px; display: flex; align-items: center; gap: 5px; }
  .ht-text { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; }

  .loading { display: flex; align-items: center; justify-content: center; height: 100%; gap: 10px; color: var(--text-secondary); }
  .loader { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: #00a8ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .zone-item { 
    background: #f8fafc; 
    border: 1px solid var(--border-light); 
    border-radius: 8px; 
    padding: 10px; 
    margin-bottom: 8px; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
  }
  .zone-info { flex: 1; cursor: pointer; }
  .zone-name { font-size: 0.85rem; font-weight: 600; color: #1e293b; }
  .zone-meta { font-size: 0.7rem; color: #64748b; }
  .zone-actions { display: flex; gap: 8px; }

  .ai-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px dashed #0ea5e9; border-radius: 12px; padding: 15px; margin-top: 10px; }
  .ai-badge { display: inline-flex; align-items: center; background: #0ea5e9; color: white; padding: 2px 8px; border-radius: 20px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
  .ai-content { font-size: 0.8rem; color: #0369a1; line-height: 1.5; }
  .btn-ai-generate {
    width: 100%; padding: 10px; background: #0ea5e9; color: white; border: none; border-radius: 8px;
    font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: 15px;
  }

  .sig-map-actions { position: absolute; top: 14px; right: 14px; z-index: 1000; display: flex; gap: 8px; }
  .sig-map-action { background: rgba(15, 23, 42, 0.92); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 999px;
     padding: 8px 12px; font-size: 0.75rem; font-weight: 700; cursor: pointer; box-shadow: 0 10px 30px rgba(15,23,42,0.28); }
  .sig-map-action.secondary { background: rgba(248, 250, 252, 0.95); color: #0f172a; }
  .sig-zone-controls { position: absolute; top: 64px; right: 14px; z-index: 1000; width: 260px; padding: 12px;
     background: rgba(15, 23, 42, 0.9); color: #fff; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12);
     box-shadow: 0 10px 30px rgba(15,23,42,0.28); }
  .sig-zone-controls-title { font-size: 0.8rem; font-weight: 700; margin-bottom: 8px; }
  .sig-zone-controls-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; }
  .sig-zone-controls-label { font-size: 0.75rem; color: rgba(255,255,255,0.86); }
  .sig-zone-controls-help { margin-top: 10px; font-size: 0.72rem; color: rgba(255,255,255,0.76); line-height: 1.4; }
  .sig-zone-controls-meta { margin-top: 8px; font-size: 0.72rem; color: rgba(255,255,255,0.82); }

  .leaflet-popup-content-wrapper { background: var(--bg-card) !important; border: 1px solid var(--border-light) !important;
     border-radius: var(--radius-md) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important; }
  .leaflet-popup-content { color: var(--text-primary) !important; font-size: 0.75rem !important; }
  .leaflet-popup-tip { background: var(--bg-card) !important; border: 1px solid var(--border-light) !important; }
  .leaflet-container a.leaflet-popup-close-button { color: var(--text-secondary) !important; }

  .zone-tooltip { background: rgba(0, 168, 255, 0.8) !important; color: white !important; border: none !important; font-weight: 700 !important; font-size: 0.7rem !important; }
  @media(max-width:1100px) { .sig-container { grid-template-columns: 1fr; } }
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
  const [filters, setFilters] = useState({ type_cancer: '', age_min: '', age_max: '' });
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null); // Conserver si nécessaire pour d'autres usages
  const [selectedCommune, setSelectedCommune] = useState('');
  const [selectedCommuneId, setSelectedCommuneId] = useState(null);
  const [communes, setCommunes] = useState([]);
  const zoneLayerRef = useRef(null);
  const edgeMarkerRef = useRef(null); // Poignée pour redimensionner
  const centerMarkerRef = useRef(null); // Poignée pour déplacer
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

        if (!totals[key]) {
          totals[key] = { code, name, count: 0 };
        }

        totals[key].count += count;
      });
    });

    const totalDiagnostics = wilayasData.total_diagnostics || Object.values(totals).reduce((sum, value) => sum + value.count, 0) || 1;
    return Object.values(totals)
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        percentage: Math.round((item.count / totalDiagnostics) * 1000) / 10,
      }));
  }, [wilayasData]);

  const toggleZoneSelection = (zone) => {
    const id = zone.id;
    const isSelected = selectedZoneIds.includes(id);
    setSelectedZoneIds(prev => 
      isSelected ? prev.filter(zid => zid !== id) : [...prev, id]
    );

    if (!isSelected) {
      zoomToZone(zone);
    }
  };

  const toFiniteNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const normalizeZoneCenter = (zone) => {
    const directLat = toFiniteNumber(zone?.center_lat ?? zone?.latitude ?? zone?.lat);
    const directLng = toFiniteNumber(zone?.center_lng ?? zone?.longitude ?? zone?.lng);

    const nestedCenter = zone?.zones?.[0]?.center;
    const nestedLat = Array.isArray(nestedCenter)
      ? toFiniteNumber(nestedCenter[0])
      : toFiniteNumber(nestedCenter?.lat);
    const nestedLng = Array.isArray(nestedCenter)
      ? toFiniteNumber(nestedCenter[1])
      : toFiniteNumber(nestedCenter?.lng);

    return {
      lat: directLat ?? nestedLat ?? null,
      lng: directLng ?? nestedLng ?? null,
    };
  };

  const normalizeZoneRadius = (zone, fallbackRadius = 0) => {
    const directRadius = toFiniteNumber(zone?.radius ?? zone?.rayon ?? zone?.r);
    const nestedRadius = toFiniteNumber(zone?.zones?.[0]?.radius ?? zone?.zones?.[0]?.rayon ?? zone?.zones?.[0]?.r);

    let radius = directRadius ?? nestedRadius ?? fallbackRadius;
    if (!Number.isFinite(radius)) radius = fallbackRadius;

    if (radius > 0 && radius < 1000) {
      radius *= 1000;
    }

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

    return {
      overlap: overlap > 0,
      distance: Math.round(distance / 1000),
      status: overlap > 0 ? "Zones Intersectées" : "Zones Disjointes",
      combinedRadius: Math.round((r1m + r2m) / 1000)
    };
  }, [selectedZoneIds, savedZones]);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  const calculateEdgePoint = (center, radius) => {
    if (!mapInstance.current) return center;
    const map = mapInstance.current;
    const targetPoint = map.project(center, map.getZoom());
    targetPoint.x += (radius / (40075017 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, map.getZoom() + 8))); 
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

    zoneLayerRef.current = window.L.circle(center, {
      radius: radius,
      color: '#e11d48',
      fillOpacity: 0.1,
      weight: 2
    }).addTo(map);

    centerMarkerRef.current = window.L.marker(center, {
      draggable: true,
      zIndexOffset: 1000,
      icon: window.L.divIcon({ className: 'sig-handle-center', html: '<div></div>', iconSize: [12, 12] })
    }).addTo(map);

    const edgeLatLng = calculateEdgePoint(center, radius);
    edgeMarkerRef.current = window.L.marker(edgeLatLng, {
      draggable: true,
      zIndexOffset: 1000,
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

  const autoZoomToCircle = () => {
    if (mapInstance.current && zoneLayerRef.current) {
      mapInstance.current.fitBounds(zoneLayerRef.current.getBounds(), { padding: [20, 20] });
    }
  };

  const renderSelectedZones = () => {
    if (!mapInstance.current || !selectedZonesLayerRef.current || !window.L) return;

    selectedZonesLayerRef.current.clearLayers();

    const zonesToRender = savedZones.filter(z => selectedZoneIds.includes(z.id));

    zonesToRender.forEach(zone => {
      const { lat, lng } = normalizeZoneCenter(zone);
      const radius = normalizeZoneRadius(zone);

      if (lat === null || lng === null || radius <= 0) return;

      window.L.circle([lat, lng], {
        radius,
        color: '#00a8ff',
        fillOpacity: 0.05,
        weight: 2,
        dashArray: '5, 5',
        interactive: false
      })
        .bindTooltip(zone.nom, { permanent: false, direction: 'center', className: 'zone-tooltip' })
        .addTo(selectedZonesLayerRef.current);
    });
  };

  useEffect(() => {
    if (!document.getElementById('sig-css')) {
      const style = document.createElement('style');
      style.id = 'sig-css';
      style.textContent = STYLES;
      document.head.appendChild(style);
    }

    if (!document.getElementById('leaf-css')) {
      const link = document.createElement('link');
      link.id = 'leaf-css';
      link.rel = 'stylesheet';
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

  useEffect(() => {
    if (leafletReady && heatmapReady) {
      fetchData();
    }
  }, [leafletReady, heatmapReady]);

  useEffect(() => {
    if (!leafletReady || !heatmapReady || !mapRef.current) return;

    const map = window.L.map(mapRef.current, { zoomControl: false }).setView([28.5, 3], 5);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

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
      if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
        map.removeLayer(heatLayerRef.current);
      }
      if (selectedZonesLayerRef.current) map.removeLayer(selectedZonesLayerRef.current);
      if (communeMarkersLayerRef.current) map.removeLayer(communeMarkersLayerRef.current);
      if (edgeMarkerRef.current) map.removeLayer(edgeMarkerRef.current);
      if (centerMarkerRef.current) map.removeLayer(centerMarkerRef.current);
      heatLayerRef.current = null;
      map.remove();
      mapInstance.current = null;
    };
  }, [leafletReady, heatmapReady]);

  useEffect(() => {
    renderHeatmap();
    renderBasicMarkers();
  }, [mapDataAll, thermalEnabled, topWilaya]);

  useEffect(() => {
    renderCommuneMarkers();
  }, [selectedCommuneId, leafletReady, heatmapReady]);

  useEffect(() => {
    renderSelectedZones();
  }, [selectedZoneIds, savedZones, leafletReady]);

  useEffect(() => {
    loadCommunesForWilaya(selectedWilaya);
  }, [selectedWilaya]);

  const renderHeatmap = () => {
    if (!mapInstance.current || !window.L?.heatLayer) return;

    if (heatLayerRef.current && mapInstance.current.hasLayer(heatLayerRef.current)) {
      mapInstance.current.removeLayer(heatLayerRef.current);
    }
    heatLayerRef.current = null;

    if (!thermalEnabled) return;
    if (!mapDataAll?.length) return;

    const maxCases = Math.max(...mapDataAll.map((w) => Number(w.cases || w.nb_patients || 0)), 1);
    const points = mapDataAll
      .map((w) => ({
        lat: Number(w.lat || (w.coords && w.coords[0])),
        lon: Number(w.lon || (w.coords && w.coords[1])),
        cases: Number(w.cases || w.nb_patients || 0)
      }))
      .filter((p) => p.cases > 0 && Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => [
        p.lat,
        p.lon,
        (p.cases / maxCases) * 4 // Intensité augmentée pour visibilité
      ]);

    if (!points.length) return;

    heatLayerRef.current = window.L.heatLayer(points, {
      radius: 35,
      blur: 20,
      maxZoom: 12, // Permet de voir la chaleur même en zoomant sur une ville
      minOpacity: 0.4,
      gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1: 'red' }
    }).addTo(mapInstance.current);
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
        radius: isTop ? 14 : 8,
        fillColor: isTop ? '#ef4444' : '#0ea5e9', // Rouge pour la plus touchée
        color: '#fff',
        weight: isTop ? 3 : 1,
        // En mode thermique, on réduit l'opacité des points normaux pour voir la heatmap
        fillOpacity: thermalEnabled ? (isTop ? 0.9 : 0.45) : 0.8,
        className: isTop ? 'top-wilaya-marker' : ''
      });

      const content = `
        <div style="text-align:center">
          <b style="color:${isTop ? '#ef4444' : '#1e293b'}">${isTop ? '🏆 ' : ''}${w.name}</b><br/>
          <span style="font-size:1.1em; font-weight:bold">${w.cases} cas</span>
        </div>`;
      
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
        color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)',
        weight: isSelected ? 3 : 1,
        fillOpacity: isSelected ? 0.95 : 0.75,
      });

      marker.bindTooltip(`<div style="text-align:center"><b>${commune.commune}</b><br/>Incidence ${commune.incidenceRate}/100k</div>`, { direction: 'top' });
      marker.on('click', () => {
        setSelectedCommuneId(commune.id);
        setTab('ai');
        mapInstance.current.flyTo(commune.coords, 11, { animate: true, duration: 1.1 });
      });
      marker.addTo(communeMarkersLayerRef.current);
    });
  };

  const toggleThermalView = () => {
    setThermalEnabled((current) => !current);
  };

  const saveInteractiveZone = async () => {
    if (!zoneCenter) {
      toast.error("Veuillez d'abord dessiner une zone.");
      return;
    }

    const zoneName = window.prompt("Entrez un nom pour cette nouvelle zone d'analyse :");
    if (!zoneName || !zoneName.trim()) return;

    try {
      setSavingZone(true);
      const payload = {
        nom: zoneName.trim().substring(0, 50),
        zones: [
          {
            center: [zoneCenter.lat, zoneCenter.lng],
            radius: zoneRadius,
          }
        ],
        filters: {
          is_thermal: thermalEnabled,
        },
      };
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
      
      // Retirer l'ID de la sélection (comparaison) si présent
      setSelectedZoneIds(prev => prev.filter(zid => zid !== id));
      
      // Nettoyer immédiatement les éléments visuels de la zone sur la carte
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
      // Affiche la zone d'influence visuelle de la wilaya sur la carte
      initInteractiveZone({ lat, lng: lon }, 50000);
    }
  };

  const loadCommunesForWilaya = async (wilaya) => {
    setSelectedCommune('');
    if (!wilaya) {
      setCommunes([]);
      return;
    }

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

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fusion des filtres thématiques et des sélections géographiques
      const params = { 
        ...filters,
        wilaya: selectedWilaya,
        commune: selectedCommune 
      };
      
      const response = await sigService.getSigStats(params);
      const completeData = response.data || response;
      const formattedMapData = (completeData.wilayas || []).map(w => ({
        ...w,
        name: w.nom,
        cases: w.nb_patients,
        lat: w.coords?.[0],
        lon: w.coords?.[1]
      }));

      setMapDataAll(formattedMapData);
      
      if (formattedMapData.length > 0) {
        const sorted = [...formattedMapData].sort((a, b) => (b.cases || 0) - (a.cases || 0));
        setTopWilaya(sorted[0]);
      }
      setWilayasData(completeData);
      await fetchSavedZones();
      
      // Si une wilaya est déjà sélectionnée, rafraîchir ses communes avec les nouveaux filtres
      if (selectedWilaya) {
        loadCommunesForWilaya(selectedWilaya);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error("Erreur lors de l'application des filtres");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="sig-wrap">
        <div className="sig-header">
          <h1 className="sig-title">Cartographie SIG - Cancers en Algérie</h1>
          <p className="sig-subtitle">
            {selectedWilaya ? `Wilaya: ${selectedWilaya} | ` : ""}
            Total Filtré : {wilayasData?.total_patients || 0} patients | {wilayasData?.total_diagnostics || 0} diagnostics
          </p>
        </div>

        <div className="sig-container">
          <div className="sig-side-panel">
            <div className="ss-body" style={{ borderBottom: '1px solid var(--border-light)', flex: 'none' }}>
              <div className="sc-title">🔍 Filtres Avancés</div>
              <div style={{ display: 'grid', gap: '8px', marginBottom: '10px' }}>
                <input 
                  type="text" placeholder="Type de cancer (ex: Sein)..." className="ci-cause" 
                  style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ddd' }}
                  value={filters.type_cancer} onChange={e => setFilters({...filters, type_cancer: e.target.value})}
                />
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input type="number" placeholder="Âge min" style={{ width: '50%', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} value={filters.age_min} onChange={e => setFilters({...filters, age_min: e.target.value})} />
                  <input type="number" placeholder="Âge max" style={{ width: '50%', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} value={filters.age_max} onChange={e => setFilters({...filters, age_max: e.target.value})} />
                </div>
                <button className="sig-map-action" onClick={fetchData} style={{ width: '100%', marginTop: '5px' }}>Appliquer Filtres</button>
              </div>
            </div>

            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', background: '#f8fafc' }}>
              <div className="sc-title" style={{ margin: 0 }}> Vue nationale</div>
              <div className="sig-subtitle">Cliquez sur une wilaya pour zoomer</div>
            </div>
            <div className="ss-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {mapDataAll.slice(0, 15).map((wilaya) => (
                  <div 
                    key={wilaya.code} 
                    className={`zone-item`} 
                    style={{ cursor: 'pointer', borderLeft: selectedWilaya === wilaya.name ? '4px solid #00a8ff' : '' }}
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

          <div className="sig-map-section" style={{ position: 'relative' }}>
            <div ref={mapRef} id="sig-map">
              {!leafletReady && <div className="loading"><div className="loader" /></div>}
            </div>

            <style>{`
              .top-wilaya-marker {
                animation: pulse-red 2s infinite;
              }
              @keyframes pulse-red {
                0% { filter: drop-shadow(0 0 0px rgba(239, 68, 68, 0.7)); }
                70% { filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0)); }
                100% { filter: drop-shadow(0 0 0px rgba(239, 68, 68, 0)); }
              }
              .sig-handle-center { background: white; border: 2px solid #00a8ff; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
              .sig-handle-edge { background: white; border: 2px solid #e11d48; border-radius: 2px; transform: rotate(45deg); box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
              .btn-save-zone { background: #10b981 !important; animation: bounceIn 0.5s; }
              @keyframes bounceIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
            
            {/* Contrôles interactifs sur la carte */}
            <div className="sig-map-actions">
              <button className="sig-map-action" onClick={toggleThermalView}>
                {thermalEnabled ? ' Masquer thermique' : ' Afficher thermique'}
              </button>
              {!zoneCenter ? (
                <button className="sig-map-action" onClick={startDrawing} style={{ background: isDrawing ? '#f59e0b' : '' }}>
                  {isDrawing ? ' Cliquez sur la carte...' : ' Nouvelle Zone'}
                </button>
              ) : (
                <button className="sig-map-action btn-save-zone" onClick={saveInteractiveZone} disabled={savingZone}>
                  {savingZone ? 'Enregistrement...' : ' Confirmer & Sauvegarder'}
                </button>
              )}
            </div>
          </div>

          <div className="sig-side-panel right">
            <div className="ss-tabs">
              <button className={`ss-tab${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>Zones</button>
              <button className={`ss-tab${tab === 'cancers' ? ' active' : ''}`} onClick={() => setTab('cancers')}>Cancers</button>
              <button className={`ss-tab${tab === 'ai' ? ' active' : ''}`} onClick={() => setTab('ai')}>IA</button>
            </div>

            <div className="ss-body">
              {tab === 'overview' && (
                <div>
                  <div className="sc-title">Mes zones sauvegardées</div>
                  <div className="sig-subtitle" style={{ marginBottom: '10px' }}>Sélectionnez 2 zones pour comparer</div>
                  {savedZones.length === 0 ? (
                    <p className="sig-subtitle">Aucune zone. Utilisez "Créer zone" sur la carte.</p>
                  ) : (
                    savedZones.map(zone => (
                      <div 
                        key={zone.id} 
                        className="zone-item" 
                        style={{ border: selectedZoneIds.includes(zone.id) ? '1px solid #00a8ff' : '', cursor: 'pointer' }}
                        onClick={() => zoomToZone(zone)}
                      >
                        <input 
                          type="checkbox" 
                          checked={selectedZoneIds.includes(zone.id)} 
                          onChange={(e) => { e.stopPropagation(); toggleZoneSelection(zone); }}
                          style={{ marginRight: '10px' }}
                        />
                        <div className="zone-info">
                          <div className="zone-name">{zone.nom}</div>
                          <div className="zone-meta">
                            Rayon: {formatZoneRadiusKm(zone)} km
                          </div>
                        </div>
                        <div className="zone-actions">
                          <button onClick={(e) => deleteSavedZone(zone.id, e)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>
                    ))
                  )}

                  {intersectionAnalysis && (
                    <div className="hypothesis-card" style={{ marginTop: '20px', background: intersectionAnalysis.overlap ? 'rgba(16, 185, 129, 0.1)' : '' }}>
                      <div className="ht-title" style={{ color: intersectionAnalysis.overlap ? '#10b981' : '#f59e0b' }}>
                         🤝 {intersectionAnalysis.status}
                      </div>
                      <div className="ht-text">
                        Distance entre centres : <b>{intersectionAnalysis.distance} km</b><br/>
                        {intersectionAnalysis.overlap ? "⚠️ Les populations de ces zones se chevauchent." : "Les zones sont distinctes géographiquement."}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {tab === 'cancers' && (
                /* ... (contenu existant des stats cancers) ... */
                <div className="stat-card">
                   <div className="sc-title">Répartition Globale</div>
                   {aggregatedCancerStats.slice(0,10).map(c => (
                     <div key={c.code} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                       <span>{c.name}</span>
                       <span style={{ fontWeight: 700 }}>{c.count}</span>
                     </div>
                   ))}
                </div>
              )}
              {tab === 'ai' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <SigAiAnalysisPanel selectedCommuneId={selectedCommuneId} onCommuneChange={setSelectedCommuneId} />
                </div>
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
