import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { sigService } from '../../services/sigService';
import { WILAYAS_DATA } from '../../utils/wilayas_coords';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

// === CONSTANTES & HELPERS ===
const COLORS = { LOW: '#00e5a0', MED: '#f5a623', HIGH: '#ff4d6a' };
const getRadius = (cases) => cases >= 100 ? 40 : cases >= 51 ? 30 : cases >= 11 ? 20 : cases >= 1 ? 10 : 0;
const getColor = (cases) => cases >= 51 ? COLORS.HIGH : cases >= 11 ? COLORS.MED : COLORS.LOW;

// Map auto-zoomer
function MapFlyTo({ coords, zoom }) {
  const map = useMap();
  useEffect(() => { if (coords) map.flyTo(coords, zoom, { duration: 1.5 }); }, [coords, zoom, map]);
  return null;
}

export default function CartographiePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedWilaya, setSelectedWilaya] = useState(null);
  const [wilayaDetails, setWilayaDetails] = useState(null);

  const [activeTab, setActiveTab] = useState('apercu');
  const [mapCenter, setMapCenter] = useState([32.0, 3.0]); // Algeria center
  const [mapZoom, setMapZoom] = useState(5);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // Initial load
  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      setLoading(true);
      const res = await sigService.getSigStats();
      setStats(res.data);
    } catch (err) {
      toast.error("Erreur du chargement de la carte");
    } finally {
      setLoading(false);
    }
  };

  // On Wilaya click
  const handleWilayaClick = async (wName, coords) => {
    setSelectedWilaya(wName);
    setMapCenter(coords);
    setMapZoom(8);
    setWilayaDetails(null);
    setAiResponse('');
    try {
      const res = await sigService.getWilayaDetails(wName);
      setWilayaDetails(res.data);
    } catch (e) {
      toast.error("Détails wilaya introuvables");
    }
  };

  // Reset to Algeria
  const handleResetMap = () => {
    setSelectedWilaya(null);
    setWilayaDetails(null);
    setMapCenter([32.0, 3.0]);
    setMapZoom(5);
    setAiResponse('');
  };

  // GROQ AI Analyer
  const handleAnalyse = async () => {
    if (!selectedWilaya || !wilayaDetails) return toast.error("Veuillez sélectionner une wilaya d'abord.");
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) return toast.error("Clé API GROQ (VITE_GROQ_API_KEY) manquant dans .env");

    setAiLoading(true);
    setAiResponse("Connexion à l'IA en cours...\n");

    // Construire le contexte
    const topCancersStr = wilayaDetails.cancers.slice(0, 5).map(c => `- ${c.libelle || c.code}: ${c.count} cas`).join('\n');
    const prompt = `Agissez en tant qu'épidémiologiste expert de l'Algérie. Analysez ces données pour la wilaya de ${wilayaDetails.nom}.
Population : ${wilayaDetails.population}. Cas de cancer identifiés : ${wilayaDetails.nb_diagnostics}.
Cancers dominants :
${topCancersStr}

Fournissez une analyse des CAUSES POSSIBLES liées aux facteurs environnementaux (pollution, agriculture, pétrochimie...), industriels, ou alimentaires spécifiques de CETTE REGION précise en Algérie (exemple: Skikda = pétrochimie, Est = pesticides, habitudes culinaires, etc). 
Format exigé en 3 parties claires :
1. Facteurs probables
2. Données épidémiologiques régionales
3. Recommandations de prévention
Répondez directement en français (ne mettez pas de balises d'introduction).`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          stream: true
        })
      });

      if (!response.ok) {
        let errMessage = `HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          errMessage += ` - ${errBody.error?.message || JSON.stringify(errBody)}`;
        } catch (e) {
          errMessage += ` - ${response.statusText}`;
        }
        throw new Error(errMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      setAiResponse("");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        const parsedLines = lines
          .map(l => l.replace(/^data: /, "").trim())
          .filter(l => l !== "" && l !== "[DONE]")
          .map(l => {
            try { return JSON.parse(l); } catch (e) { return null; }
          })
          .filter(l => l !== null);

        for (const p of parsedLines) {
          if (p.choices && p.choices.length > 0 && p.choices[0].delta.content) {
            setAiResponse(prev => prev + p.choices[0].delta.content);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setAiResponse(`Erreur : Impossible de joindre l'API d'analyse.\nDétails : ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <AppLayout title="Cartographie SIG">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <div style={{ color: 'var(--text-muted)' }}>Chargement des données de cartographie...</div>
        </div>
      </AppLayout>
    );
  }

  // Calculated Incidence National
  const totalNationalPopulation = WILAYAS_DATA.reduce((acc, w) => acc + w.population, 0);
  const incNational = ((stats.total_patients / totalNationalPopulation) * 100000).toFixed(1);

  // Communes Offset Geometry for local map dispersion
  const renderCommuneCircles = () => {
    if (!wilayaDetails || wilayaDetails.communes.length <= 1) return null;
    const [cLat, cLon] = wilayaDetails.coords;
    return wilayaDetails.communes.map((c, i) => {
      // Create small artificial scatter offset for communes around the wilaya center since exact coords are missing
      const ang = (i / wilayaDetails.communes.length) * Math.PI * 2;
      const r = 0.15; // roughly 15km
      const clat = cLat + Math.cos(ang) * r;
      const clon = cLon + Math.sin(ang) * r;
      return (
        <CircleMarker key={'com-' + i} center={[clat, clon]} radius={Math.max(5, getRadius(c.nb_patients) / 2)} pathOptions={{ color: '#fff', fillColor: getColor(c.nb_patients), fillOpacity: 0.8, weight: 1 }}>
          <Tooltip direction="top" sticky><strong>{c.nom}</strong> ({c.nb_patients} cas)</Tooltip>
        </CircleMarker>
      );
    });
  };

  return (
    <AppLayout title="Cartographie SIG">
      <style>{`
         .sidebar-tab { flex:1; padding: 12px 0; text-align:center; background:none; border:none; border-bottom:2px solid transparent; color:var(--text-muted); cursor:pointer; font-size:13px; font-weight:600; transition:0.2s; }
         .sidebar-tab.active { border-bottom-color: var(--accent); color: var(--accent); }
         .leaflet-container { background: #0c0d12; border-radius: 12px; }
         .circle-text { font-size: 11px; font-weight: 700; color: #fff; text-shadow: 0 0 4px rgba(0,0,0,0.8); }
      `}</style>

      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)', minHeight: 600 }}>

        {/* LEAFLET MAP - LEFT */}
        <div style={{ flex: '1 1 65%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
          {selectedWilaya && (
            <button onClick={handleResetMap} style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              x Retour Algérie
            </button>
          )}
          <MapContainer center={[32.0, 3.0]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <MapFlyTo coords={mapCenter} zoom={mapZoom} />

            {/* Render Wilayas */}
            {!selectedWilaya && stats.wilayas.map((w, i) => {
              const r = getRadius(w.nb_patients);
              if (r === 0) return null;
              return (
                <CircleMarker
                  key={i}
                  center={w.coords}
                  radius={r}
                  pathOptions={{ color: getColor(w.nb_patients), fillColor: getColor(w.nb_patients), fillOpacity: 0.6, weight: 2 }}
                  eventHandlers={{ click: () => handleWilayaClick(w.nom, w.coords) }}
                >
                  <Tooltip direction="top" sticky>
                    <div style={{ textAlign: 'center' }}>
                      <strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{w.nom}</strong>
                      <span style={{ fontSize: 12, color: '#666' }}>{w.nb_patients} patients</span>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* Render Communes if Wilaya Selected */}
            {selectedWilaya && renderCommuneCircles()}
          </MapContainer>
        </div>

        {/* SIDEBAR - RIGHT */}
        <div style={{ flex: '0 0 35%', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <button className={`sidebar-tab ${activeTab === 'apercu' ? 'active' : ''}`} onClick={() => setActiveTab('apercu')}>Aperçu</button>
            <button className={`sidebar-tab ${activeTab === 'cancers' ? 'active' : ''}`} onClick={() => setActiveTab('cancers')}>Cancers</button>
            <button className={`sidebar-tab ${activeTab === 'causes' ? 'active' : ''}`} onClick={() => setActiveTab('causes')}>Causes (IA)</button>
          </div>

          {/* Contents */}
          <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>

            {/* ==== TAB: APERÇU ==== */}
            {activeTab === 'apercu' && (
              <div>
                {!selectedWilaya ? (
                  <>
                    <h3 style={{ marginTop: 0, color: 'var(--text-primary)', marginBottom: 24, fontFamily: 'var(--font-display)', fontSize: 18 }}>Algérie (Global)</h3>
                    <StatBox label="Total Patients" val={stats.total_patients} color="var(--accent)" />
                    <StatBox label="Total Diagnostics" val={stats.total_diagnostics} color="var(--accent)" />
                    <StatBox label="Incidence globale" val={`${incNational} cas / 100k hab`} color="#00e5a0" />
                    <StatBox label="Wilayas Touchées" val={stats.wilayas.length} color="var(--text-primary)" />

                    <div style={{ marginTop: 30, fontSize: 12, color: 'var(--text-muted)' }}>
                      Cliquez sur une wilaya (cercle) sur la carte pour explorer en détail.
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={{ marginTop: 0, color: 'var(--accent)', marginBottom: 24, fontFamily: 'var(--font-display)', fontSize: 20 }}>{selectedWilaya}</h3>
                    {!wilayaDetails ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</div> : (
                      <>
                        <StatBox label="Population" val={wilayaDetails.population.toLocaleString('fr-FR')} color="var(--text-secondary)" />
                        <StatBox label="Patients enregistrés" val={wilayaDetails.nb_patients} color="var(--text-primary)" />
                        <StatBox label="Diagnostics positifs" val={wilayaDetails.nb_diagnostics} color="var(--text-primary)" />
                        <StatBox label="Incidence régionale" val={`${((wilayaDetails.nb_patients / wilayaDetails.population) * 100000).toFixed(1)} cas / 100k hab`} color={COLORS.HIGH} />

                        <div style={{ marginTop: 24 }}>
                          <h4 style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Communes impactées</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
                            {wilayaDetails.communes.map((c, i) => (
                              <div key={i} style={{ background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
                                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{c.nom}</strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{c.nb_patients} cas</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}


            {/* ==== TAB: CANCERS ==== */}
            {activeTab === 'cancers' && (
              <div>
                <h3 style={{ marginTop: 0, color: 'var(--text-primary)', marginBottom: 20, fontSize: 16 }}>
                  Top Cancers ({selectedWilaya || "Toutes Wilayas"})
                </h3>

                {(() => {
                  let arr = [];
                  let total = 0;
                  if (selectedWilaya && wilayaDetails) {
                    arr = wilayaDetails.cancers.slice(0, 5);
                    total = wilayaDetails.nb_diagnostics;
                  } else {
                    // Agrégation nationale simplifiée (au cas où, depuis stat.wilayas)
                    const temp = {};
                    stats.wilayas.forEach(w => w.top_cancers.forEach(c => {
                      temp[c.code] = (temp[c.code] || 0) + c.count;
                    }));
                    arr = Object.entries(temp).map(([k, v]) => ({ code: k, count: v })).sort((a, b) => b.count - a.count).slice(0, 5);
                    total = stats.total_diagnostics;
                  }

                  if (arr.length === 0) return <div style={{ color: 'var(--text-muted)' }}>Aucune donnée tumorale</div>;

                  return arr.map((c, i) => {
                    const pct = total > 0 ? ((c.count / total) * 100).toFixed(1) : 0;
                    return (
                      <div key={i} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.libelle || c.code}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{pct}% ({c.count} cas)</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)' }} />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* ==== TAB: CAUSES (IA) ==== */}
            {activeTab === 'causes' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h3 style={{ marginTop: 0, color: 'var(--text-primary)', marginBottom: 16, fontSize: 16 }}>Analyse Causale Environnementale (IA)</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                  Utilisation des modèles de langage pour analyser les corrélations probables entre la typologie des cancers recensés et l'historique environnemental ou industriel (eau, agriculture, pétrochimie) du périmètre ciblé.
                </p>

                <button
                  onClick={handleAnalyse}
                  disabled={aiLoading}
                  style={{ width: '100%', padding: '12px', background: aiLoading ? 'var(--bg-elevated)' : 'var(--accent)', color: aiLoading ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer', marginBottom: 20, transition: '0.2s' }}
                >
                  {aiLoading ? 'Analyse en cours...' : (selectedWilaya ? `Analyser les causes à ${selectedWilaya}` : 'Sélectionnez une wilaya d\'abord')}
                </button>

                <div style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, overflowY: 'auto' }}>
                  {aiResponse ? (
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                      {aiResponse}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 40 }}>
                      Les résultats de l'analyse s'afficheront ici.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </AppLayout>
  );
}

// Composant Box
function StatBox({ label, val, color }) {
  return (
    <div style={{ padding: '16px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 18, color: color, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{val}</span>
    </div>
  );
}
