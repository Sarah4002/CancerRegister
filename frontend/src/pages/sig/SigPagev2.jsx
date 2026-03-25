import { useEffect, useRef, useState, useMemo } from 'react';
import { AppLayout } from '../../components/layout/Sidebar';
import { sigService } from '../../services/sigService';

const STYLES = `
  .sig-wrap { display: flex; flex-direction: column; height: calc(100vh - 60px); background: var(--bg); }
  .sig-header { padding: 16px 20px; border-bottom: 1px solid var(--border-light); background: var(--bg-card); }
  .sig-title { font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  .sig-subtitle { font-size: 0.8rem; color: var(--text-secondary); margin: 4px 0 0; }
  
  .sig-container { display: grid; grid-template-columns: 1fr 350px; gap: 0; flex: 1; overflow: hidden; }
  .sig-map-section { display: flex; flex-direction: column; border-right: 1px solid var(--border-light); }
  #sig-map { flex: 1; min-height: 0; }
  
  .sig-stats-section { display: flex; flex-direction: column; background: var(--bg-card); overflow: hidden; }
  .ss-tabs { display: flex; border-bottom: 1px solid var(--border-light); }
  .ss-tab { flex: 1; padding: 10px; background: none; border: none; color: var(--text-secondary); font-size: 0.75rem;
     font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all .15s; }
  .ss-tab.active { color: var(--text-primary); border-bottom-color: #00a8ff; background: rgba(0,168,255,0.05); }
  .ss-body { flex: 1; overflow-y: auto; padding: 12px; }
  .ss-body::-webkit-scrollbar { width: 3px; }
  .ss-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  
  .stat-card { background: var(--bg-elevated); border: 1px solid var(--border-light); border-radius: var(--radius-md);
     padding: 12px; margin-bottom: 10px; }
  .sc-title { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 8px; }
  .sc-count { font-size: 1.5rem; font-weight: 700; color: #00a8ff; }
  .sc-pct { font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; }
  
  .cancer-item { background: var(--bg-elevated); border: 1px solid var(--border-light); border-radius: var(--radius-md);
     padding: 10px; margin-bottom: 8px; }
  .ci-name { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); }
  .ci-value { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
  .ci-count { font-size: 1.2rem; font-weight: 700; color: #00a8ff; }
  .ci-pct { font-size: 0.75rem; background: rgba(0,168,255,0.15); color: #00a8ff; padding: 2px 6px; border-radius: 10px; }
  
  .communes-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .commune-card { background: var(--bg-elevated); border: 1px solid var(--border-light); border-radius: var(--radius-md);
     padding: 10px; cursor: pointer; transition: all .15s; }
  .commune-card:hover { border-color: #00a8ff; background: rgba(0,168,255,0.03); }
  .cc-name { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
  .cc-stats { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-secondary); }
  
  .causes-item { background: var(--bg-elevated); border: 1px solid var(--border-light); border-radius: var(--radius-md);
     padding: 10px; margin-bottom: 8px; }
  .ci-header { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
  .ci-cause { font-size: 0.7rem; color: var(--text-secondary); padding: 4px 0; padding-left: 12px; }
  .ci-cause:before { content: '• '; color: #00a8ff; font-weight: bold; }
  
  .loading { display: flex; align-items: center; justify-content: center; height: 100%; gap: 10px; color: var(--text-secondary); }
  .loader { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: #00a8ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  
  .leaflet-popup-content-wrapper { background: var(--bg-card) !important; border: 1px solid var(--border-light) !important; 
     border-radius: var(--radius-md) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important; }
  .leaflet-popup-content { color: var(--text-primary) !important; font-size: 0.75rem !important; }
  .leaflet-popup-tip { background: var(--bg-card) !important; border: 1px solid var(--border-light) !important; }
  .leaflet-container a.leaflet-popup-close-button { color: var(--text-secondary) !important; }
  
  @media(max-width:1100px) { .sig-container { grid-template-columns: 1fr; } .sig-stats-section { max-height: 350px; border-top: 1px solid var(--border-light); border-right: none; } }
`;

const TLEMCEN_COMMUNES = [
  { name: "Tlemcen", lat: 34.88, lng: -1.32 },
  { name: "Sidi El Djillali", lat: 34.90, lng: -1.40 },
  { name: "Ain Fezza", lat: 34.85, lng: -1.15 },
  { name: "Bensekrane", lat: 34.80, lng: -1.30 },
  { name: "Marnia", lat: 35.00, lng: -1.20 },
  { name: "Sabra", lat: 34.70, lng: -1.50 },
  { name: "Ouled Mimoun", lat: 34.75, lng: -1.10 },
  { name: "Sebdou", lat: 34.60, lng: -1.25 },
  { name: "Chetouane", lat: 34.95, lng: -1.45 },
];

export default function SigPageV2() {
  const mapRef = useRef(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapDataAll, setMapDataAll] = useState([]); // All wilayas with coordinates
  const [wilayasData, setWilayasData] = useState(null); // Detailed wilayas data
  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [tab, setTab] = useState('overview'); // 'overview', 'cancers', 'causes'
  const [loading, setLoading] = useState(true);
  const mapInstance = useRef(null);
  const circleMarkers = useRef({});

  // Aggregate cancer statistics across all wilayas for national view
  const aggregatedCancerStats = useMemo(() => {
    if (!wilayasData || !wilayasData.wilayas) return [];
    const totals = {};
    const wilayas = wilayasData.wilayas;
    Object.values(wilayas).forEach(w => {
      const top = w.top_cancers || [];
      top.forEach(c => {
        const name = c.topographie__libelle || c.topographie__code || c.name || 'Inconnu';
        const code = c.topographie__code || c.topographie__libelle || c.code || name;
        const count = Number(c.count || 0);
        const key = `${code}||${name}`;
        if (!totals[key]) totals[key] = { code, name, count: 0 };
        totals[key].count += count;
      });
    });
    const arr = Object.values(totals).sort((a, b) => b.count - a.count);
    const totalDiagnostics = wilayasData.total_diagnostics || arr.reduce((s, x) => s + x.count, 0) || 1;
    return arr.map(c => ({ ...c, percentage: Math.round((c.count / totalDiagnostics) * 1000) / 10 }));
  }, [wilayasData]);

  const aggregatedCancerCauses = useMemo(() => {
    // Provide placeholder causes when backend doesn't return them
    const causes = {};
    aggregatedCancerStats.forEach(c => {
      causes[c.name] = {
        label: c.name,
        count: c.count,
        percentage: c.percentage,
        causes: ['Causes non documentées'],
      };
    });
    return causes;
  }, [aggregatedCancerStats]);

  // Charger Leaflet
  useEffect(() => {
    if (!document.getElementById('sig-css')) {
      const s = document.createElement('style');
      s.id = 'sig-css';
      s.textContent = STYLES;
      document.head.appendChild(s);
    }

    if (window.L) {
      setLeafletReady(true);
      return;
    }

    if (!document.getElementById('leaf-css')) {
      const link = document.createElement('link');
      link.id = 'leaf-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);
  }, []);

  // Charger les données
  useEffect(() => {
    if (leafletReady) {
      fetchData();
    }
  }, [leafletReady]);

  // Initialiser la carte avec tous les wilayas
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;

    const map = window.L.map(mapRef.current).setView([28.5, 3], 5);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    // Add circle markers for all wilayas
    if (mapDataAll && mapDataAll.length > 0) {
      // Get max cases for scale calculation
      const maxCases = Math.max(...mapDataAll.map(w => w.cases || 0), 1);

      mapDataAll.forEach(wilaya => {
        const cases = wilaya.cases || 0;
        const color = cases > 20 ? '#d32f2f' : cases > 10 ? '#f57c00' : cases > 5 ? '#fbc02d' : '#00a8ff';
        const radius = (cases / maxCases) * 30 + 5;

        const marker = window.L.circleMarker([wilaya.lat, wilaya.lon], {
          radius: Math.max(5, radius),
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.7,
        })
          .bindPopup(`
            <div style="min-width: 150px;">
              <strong>${wilaya.name}</strong><br/>
              Patients: ${cases}<br/>
              Diagnostics: ${wilaya.diagnostics || 0}
            </div>
          `)
          .addTo(map);

        // Add click event
        marker.on('click', () => {
          setSelectedWilaya(wilaya.name);
          setTab('overview');
        });

        circleMarkers.current[wilaya.name] = marker;
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [leafletReady, mapDataAll]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const completeData = await sigService.getCompleteAllWilayasData();
      setMapDataAll(completeData.map || []);
      setWilayasData(completeData.wilayas);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWilayaClick = (wilayaName) => {
    setSelectedWilaya(wilayaName);
    setTab('overview');
  };

  return (
    <AppLayout>
      <div className="sig-wrap">
        {/* Header */}
        <div className="sig-header">
          <h1 className="sig-title">Cartographie SIG - Cancers en Algérie</h1>
          <p className="sig-subtitle">
            {selectedWilaya 
              ? `Wilaya: ${selectedWilaya} - Cas de cancers détaillés`
              : `Total: ${wilayasData?.total_patients || 0} patients | ${wilayasData?.total_diagnostics || 0} diagnostics`}
          </p>
        </div>

        {/* Container */}
        <div className="sig-container">
          {/* Map */}
          <div className="sig-map-section">
            <div ref={mapRef} id="sig-map" style={{ flex: 1 }}>
              {!leafletReady && (
                <div className="loading">
                  <div className="loader" />
                  <span>Chargement de la carte...</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="sig-stats-section">
            <div className="ss-tabs">
              <button
                className={`ss-tab${tab === 'overview' ? ' active' : ''}`}
                onClick={() => setTab('overview')}
              >
                Aperçu
              </button>
              <button
                className={`ss-tab${tab === 'cancers' ? ' active' : ''}`}
                onClick={() => setTab('cancers')}
              >
                Cancers
              </button>
              <button
                className={`ss-tab${tab === 'causes' ? ' active' : ''}`}
                onClick={() => setTab('causes')}
              >
                Causes
              </button>
            </div>

            <div className="ss-body">
              {loading ? (
                <div className="loading">
                  <div className="loader" />
                </div>
              ) : (
                <>
                  {/* Bouton retour si wilaya sélectionnée */}
                  {selectedWilaya && (
                    <div style={{ marginBottom: 12 }}>
                      <button
                        onClick={() => {
                          setSelectedWilaya(null);
                          setTab('overview');
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'rgba(0,168,255,0.15)',
                          border: '1px solid rgba(0,168,255,0.3)',
                          color: '#00a8ff',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          transition: 'all .15s',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(0,168,255,0.25)';
                          e.target.style.borderColor = 'rgba(0,168,255,0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(0,168,255,0.15)';
                          e.target.style.borderColor = 'rgba(0,168,255,0.3)';
                        }}
                      >
                        ← Retour à la carte nationale
                      </button>
                    </div>
                  )}

                  {/* Overview Tab */}
                  {tab === 'overview' && (
                    <div>
                      <div className="stat-card">
                        <div className="sc-title">
                          {selectedWilaya ? 'Cas dans ' + selectedWilaya : 'Total Algérie'}
                        </div>
                        <div className="sc-count">
                          {selectedWilaya 
                            ? wilayasData?.wilayas?.[selectedWilaya]?.patients || 0
                            : wilayasData?.total_patients || 0}
                        </div>
                        <div className="sc-pct">
                          Diagnostics: {selectedWilaya 
                            ? wilayasData?.wilayas?.[selectedWilaya]?.diagnostics || 0
                            : wilayasData?.total_diagnostics || 0}
                        </div>
                      </div>

                      <div className="stat-card">
                        <div className="sc-title">Population Totale</div>
                        <div className="sc-count">{wilayasData?.total_patients || 0}</div>
                        <div className="sc-pct">Incidence globale</div>
                      </div>

                      <div className="stat-card">
                        <div className="sc-title">Communes Affectées</div>
                        <div className="sc-count">{Object.keys(wilayasData?.wilayas || {}).length}</div>
                        <div className="sc-pct">Wilayas avec cas détectés</div>
                      </div>
                    </div>
                  )}

                  {/* Cancers Tab */}
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
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                - patients
                              </div>
                            </div>
                            <div className="ci-pct">{cancer.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Causes Tab */}
                  {tab === 'causes' && Object.keys(aggregatedCancerCauses).length > 0 && (
                    <div>
                      <div className="sc-title" style={{ marginBottom: 12 }}>Causes des Cancers Dominants</div>
                      {Object.entries(aggregatedCancerCauses).map(([cancer, data], idx) => (
                        <div key={idx} className="causes-item">
                          <div className="ci-header">
                            {data.label} ({data.percentage}%)
                          </div>
                          {data.causes.map((cause, cIdx) => (
                            <div key={cIdx} className="ci-cause">
                              {cause}
                            </div>
                          ))}
                        </div>
                      ))}
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