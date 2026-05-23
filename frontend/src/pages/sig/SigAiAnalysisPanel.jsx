import { jsPDF } from 'jspdf';
import 'leaflet/dist/leaflet.css';
import {
  Brain,
  Copy,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMap } from 'react-leaflet';
import { sigService } from '../../services/sigService';

const INDUSTRIAL_ZONES_DATA = [
  {
    nom: "Zone Industrielle Ouled Bendamou",
    commune: "Maghnia",
    coords: [34.8833, -1.7333],
    superficie: "104 hectares",
    secteurs: ["Sidérurgie", "Agroalimentaire"],
    polluants: ["Fumées métallurgiques", "CO2", "Particules fines PM2.5"],
    cancers_associes: ["Poumon", "Larynx", "Peau"],
    niveau_risque: "Critique",
    proximite_barrage: "11 km du barrage Hammam Boughrara",
    influence_km: 12,
    couleur: "#FF0000" // Rouge Critique
  },
  {
    nom: "Zone Industrielle Chetouane",
    commune: "Chetouane",
    coords: [34.9167, -1.2833],
    superficie: "6.7 km de long",
    secteurs: ["Industrie légère", "Textile", "Chimie"],
    polluants: ["COV", "Poussières industrielles"],
    cancers_associes: ["Poumon", "Vessie", "Lymphome"],
    niveau_risque: "Élevé",
    influence_km: 10,
    couleur: "#FF6600" // Orange Élevé
  },
  {
    nom: "Zone Portuaire Ghazaouet",
    commune: "Ghazaouet",
    coords: [35.1000, -1.8667],
    superficie: "Port industriel",
    secteurs: ["Import/Export", "Hydrocarbures", "Ciment"],
    polluants: ["Hydrocarbures", "Poussières de ciment", "Gaz d'échappement"],
    cancers_associes: ["Poumon", "Mésothéliome", "Peau"],
    niveau_risque: "Élevé",
    influence_km: 12,
    couleur: "#FF6600"
  }
];

const DAMS_DATA = [
  {
    nom: "Barrage Hammam Boughrara",
    commune: "Maghnia",
    coords: [34.9500, -1.8000],
    capacite: "177 millions m³",
    usage: "AEP + Irrigation",
    risques: [
      "Situé à 11 km zone industrielle Ouled Bendamou",
      "Risque d'infiltration eaux industrielles",
      "Développement cyanobactéries (chaleur)",
      "Accumulation pesticides agricoles"
    ],
    cancers_associes: ["Foie", "Reins", "Colorectal"],
    niveau_risque: "Critique",
    influence_km: 5,
    couleur: "#CC0000"
  },
  {
    nom: "Barrage El Mefrouch",
    commune: "Tlemcen",
    coords: [34.9333, -1.2667],
    capacite: "12 millions m³",
    usage: "AEP + Irrigation",
    risques: [
      "Contamination pesticides zones agricoles proches",
      "Nitrates élevés",
      "Proximité zone urbaine dense"
    ],
    cancers_associes: ["Colorectal", "Estomac"],
    niveau_risque: "Modéré",
    influence_km: 3,
    couleur: "#CA8A04"
  },
  {
    nom: "Barrage Sekkak",
    commune: "Nord Tlemcen",
    coords: [35.1333, -1.3500],
    capacite: "25 millions m³",
    usage: "AEP + Irrigation",
    risques: [
      "Prolifération cyanobactéries",
      "Hépatotoxines",
      "Ruissellement agricole"
    ],
    cancers_associes: ["Foie", "Reins"],
    niveau_risque: "Modéré",
    influence_km: 4,
    couleur: "#CA8A04"
  },
  {
    nom: "Barrage Beni Bahdel",
    commune: "Beni Bahdel",
    coords: [34.7833, -1.9333],
    capacite: "63 millions m³",
    usage: "AEP + Irrigation",
    risques: [
      "Accumulation métaux lourds",
      "Sédiments contaminés"
    ],
    cancers_associes: ["Foie", "Poumon"],
    influence_km: 2,
    niveau_risque: "Faible",
    couleur: "#00AA00"
  },
  {
    nom: "Barrage El Izdihar",
    commune: "Sidi Abdelli",
    coords: [34.9667, -1.0833],
    capacite: "Variable",
    usage: "Irrigation",
    risques: [
      "Nitrates agricoles élevés",
      "Engrais chimiques"
    ],
    cancers_associes: ["Colorectal", "Estomac"],
    influence_km: 3,
    niveau_risque: "Faible",
    couleur: "#00AA00"
  }
];

const AGRICULTURAL_ZONES_DATA = [
  {
    nom: "Plaine de Maghnia",
    commune: "Maghnia",
    center: [34.8667, -1.7500],
    polygon: [[34.84, -1.82], [34.92, -1.82], [34.92, -1.68], [34.84, -1.68]],
    cultures: ["Céréales", "Maraîchage", "Betterave"],
    pesticides: ["Glyphosate", "Organophosphorés", "Fongicides"],
    risques: ["Contamination nappe phréatique", "Résidus dans aliments"],
    cancers_associes: ["Sang/Lymphome", "Foie", "Sein"],
    niveau_risque: "Élevé",
    couleur: "#EA580C"
  },
  {
    nom: "Zone Agricole Hennaya",
    commune: "Hennaya",
    center: [34.9667, -1.4667],
    polygon: [[34.94, -1.49], [34.99, -1.49], [34.99, -1.44], [34.94, -1.44]],
    cultures: ["Agrumes", "Vignes", "Olives"],
    pesticides: ["Fongicides", "Insecticides", "Herbicides"],
    risques: ["Fongicides cancérigènes", "Exposition cutanée agriculteurs"],
    cancers_associes: ["Sein", "Poumon", "Peau"],
    niveau_risque: "Modéré",
    couleur: "#CA8A04"
  },
  {
    nom: "Zone Agricole Remchi",
    commune: "Remchi",
    center: [35.0667, -1.4333],
    polygon: [[35.04, -1.45], [35.09, -1.45], [35.09, -1.41], [35.04, -1.41]],
    cultures: ["Cultures irriguées", "Maraîchage"],
    pesticides: ["Nitrates", "Engrais azotés"],
    risques: ["Nitrates dans eau potable", "Contamination sols"],
    cancers_associes: ["Colorectal", "Estomac", "Thyroïde"],
    niveau_risque: "Modéré",
    couleur: "#CA8A04"
  },
  {
    nom: "Zone Agricole Sebdou",
    commune: "Sebdou",
    center: [34.6333, -1.3333],
    polygon: [[34.61, -1.35], [34.65, -1.35], [34.65, -1.31], [34.61, -1.31]],
    cultures: ["Élevage", "Céréales"],
    pesticides: ["Antiparasitaires vétérinaires", "Herbicides"],
    risques: ["UV index élevé", "Altitude exposée"],
    cancers_associes: ["Peau", "Mélanome"],
    niveau_risque: "Faible",
    couleur: "#16A34A"
  }
];

const CANCER_CASES_BY_COMMUNE_DATA = [
  { commune: "Maghnia", coords: [34.8833, -1.7333],
    cas: { poumon: 45, foie: 38, peau: 22, sein: 31, colorectal: 18 },
    population: 240000, uv_index: 8.5, temperature_max: 38 },

  { commune: "Tlemcen (ville)", coords: [34.8828, -1.3167],
    cas: { sein: 62, poumon: 28, colorectal: 35, foie: 15, peau: 19 },
    population: 180000, uv_index: 7.8, temperature_max: 36 },

  { commune: "Chetouane", coords: [34.9167, -1.2833],
    cas: { poumon: 34, vessie: 21, lymphome: 18, sein: 25, peau: 14 },
    population: 85000, uv_index: 7.5, temperature_max: 35 },

  { commune: "Ghazaouet", coords: [35.1000, -1.8667],
    cas: { poumon: 39, peau: 28, mesotheliome: 12, sein: 20, foie: 11 },
    population: 70000, uv_index: 8.2, temperature_max: 34 },

  { commune: "Remchi", coords: [35.0667, -1.4333],
    cas: { colorectal: 29, estomac: 24, thyroide: 16, sein: 18, foie: 13 },
    population: 55000, uv_index: 7.2, temperature_max: 33 },

  { commune: "Hennaya", coords: [34.9667, -1.4667],
    cas: { sein: 33, poumon: 19, peau: 24, lymphome: 14, foie: 10 },
    population: 48000, uv_index: 7.9, temperature_max: 37 },

  { commune: "Sebdou", coords: [34.6333, -1.3333],
    cas: { peau: 31, melanome: 18, poumon: 12, sein: 16, colorectal: 9 },
    population: 42000, uv_index: 9.2, temperature_max: 41 },

  { commune: "Sidi Abdelli", coords: [34.9667, -1.0833],
    cas: { colorectal: 22, estomac: 18, foie: 16, sein: 21, poumon: 11 },
    population: 38000, uv_index: 7.4, temperature_max: 34 },

  { commune: "Beni Saf", coords: [35.3000, -1.3833],
    cas: { poumon: 25, peau: 20, mesotheliome: 8, sein: 17, foie: 12 },
    population: 65000, uv_index: 8.0, temperature_max: 33 },

  { commune: "Nedroma", coords: [35.0167, -1.8333],
    cas: { sein: 19, poumon: 16, foie: 14, colorectal: 12, peau: 15 },
    population: 32000, uv_index: 7.6, temperature_max: 35 }
];

/**
 * Calcul de distance Haversine
 */
function haversineDistance(coords1, coords2) {
  const toRad = (x) => x * Math.PI / 180;
  const R = 6371;
  const lat1 = toRad(coords1[0]);
  const lon1 = toRad(coords1[1]);
  const lat2 = toRad(coords2[0]);
  const lon2 = toRad(coords2[1]);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export const COMMUNES_RISK_ANALYSIS = CANCER_CASES_BY_COMMUNE_DATA.map(commune => {
  const totalCases = Object.values(commune.cas).reduce((sum, c) => sum + c, 0);
  const incidenceRate = (totalCases / commune.population) * 100000;

  const industrialZonesProximity = INDUSTRIAL_ZONES_DATA.filter(zone =>
    haversineDistance(commune.coords, zone.coords) < (zone.influence_km + 5)
  );
  const damsProximity = DAMS_DATA.filter(dam =>
    haversineDistance(commune.coords, dam.coords) < (dam.influence_km + 10)
  );
  const agriculturalZonesProximity = AGRICULTURAL_ZONES_DATA.filter(zone =>
    haversineDistance(commune.coords, zone.center) < 15
  );

  const dominantCancer = Object.entries(commune.cas).sort(([, a], [, b]) => b - a)[0];

  let riskScore = 0;
  if (incidenceRate > 50) riskScore += 4;
  else if (incidenceRate > 20) riskScore += 2;

  if (industrialZonesProximity.length > 0) riskScore += 3 * industrialZonesProximity.length; // Higher weight for industrial zones
  if (damsProximity.length > 0) riskScore += 1 * damsProximity.length;
  if (agriculturalZonesProximity.length > 0) riskScore += 1 * agriculturalZonesProximity.length;

  let globalRisk = "Faible";
  if (riskScore > 8) globalRisk = "Critique";
  else if (riskScore > 5) globalRisk = "Élevé";
  else if (riskScore > 2) globalRisk = "Modéré";

  return {
    ...commune,
    id: commune.commune.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    totalCases,
    chartData: Object.entries(commune.cas).map(([type, value]) => ({ 
      type: type.charAt(0).toUpperCase() + type.slice(1), 
      value 
    })),
    incidenceRate: parseFloat(incidenceRate.toFixed(2)),
    dominantCancer: dominantCancer ? { type: dominantCancer[0], cases: dominantCancer[1] } : null,
    industrialZonesProximity,
    damsProximity,
    agriculturalZonesProximity,
    globalRisk,
    riskScore,
  };
});

/**
 * Statistiques globales pour la barre latérale gauche
 */
const GLOBAL_STATS = (() => {
  const totalPatients = COMMUNES_RISK_ANALYSIS.reduce((sum, c) => sum + c.totalCases, 0);
  const allCancers = {};
  COMMUNES_RISK_ANALYSIS.forEach(commune => {
    for (const [cancerType, cases] of Object.entries(commune.cas)) {
      allCancers[cancerType] = (allCancers[cancerType] || 0) + cases;
    }
  });
  const mostFrequentCancer = Object.entries(allCancers).sort(([, a], [, b]) => b - a)[0];

  const sortedByRisk = [...COMMUNES_RISK_ANALYSIS].sort((a, b) => b.riskScore - a.riskScore);
  const mostAffectedCommune = sortedByRisk[0]?.commune || 'N/A';
  const top3CriticalCommunes = sortedByRisk.filter(c => c.globalRisk === 'Critique' || c.globalRisk === 'Élevé').slice(0, 3).map(c => c.commune);

  return {
    totalPatients,
    mostAffectedCommune,
    mostFrequentCancer: mostFrequentCancer ? mostFrequentCancer[0] : 'N/A',
    top3CriticalCommunes,
  };
})();

const ALL_CANCER_TYPES = [
  "poumon", "foie", "peau", "sein", "colorectal", "vessie", "lymphome", "mesotheliome", "estomac", "thyroide", "melanome"
];

function buildFallbackReport(selectedCommuneData, polluantsIdentifies) {
  const industries = selectedCommuneData.industrialZonesProximity.map((zone) => zone.nom).join(', ') || 'aucune';
  const dams = selectedCommuneData.damsProximity.map((dam) => dam.nom).join(', ') || 'aucun';
  const agri = selectedCommuneData.agriculturalZonesProximity.map((zone) => zone.nom).join(', ') || 'aucune';
  const polluants = polluantsIdentifies.join(', ') || 'aucun';

  return `##  ANALYSE DES FACTEURS DE RISQUE
La commune de ${selectedCommuneData.commune} présente une incidence de ${selectedCommuneData.incidenceRate} pour 100 000 habitants, avec un cancer dominant ${selectedCommuneData.dominantCancer.type} (${selectedCommuneData.dominantCancer.cases} cas). Les proximités industrielles (${industries}), les barrages (${dams}) et les zones agricoles (${agri}) constituent des expositions environnementales cohérentes avec les réponses observées dans les données locales.

##  HYPOTHÈSES CAUSALES
1. Exposition aux polluants industriels et à la combustion (40 %).
2. Contamination de l’eau et des sols par pesticides et nitrates (30 %).
3. Exposition climatique et UV, associée à la densité urbaine et aux micro-polluants (20 %).

##  NIVEAU DE RISQUE GLOBAL
Niveau : ${selectedCommuneData.globalRisk}
Justification : l’incidence est élevée (${selectedCommuneData.incidenceRate}), avec ${selectedCommuneData.industrialZonesProximity.length} zones industrielles proches, ${selectedCommuneData.damsProximity.length} barrages proches et ${selectedCommuneData.agriculturalZonesProximity.length} zones agricoles en interaction locale. Les polluants identifiés incluent ${polluants}.

##  RECOMMANDATIONS
1. Renforcer la surveillance épidémiologique et le recueil des expositions dans les communes les plus exposées.
2. Prioriser des contrôles de qualité de l’eau, des sols et de l’air autour des zones industrielles et agricoles.
3. Lancer une campagne de prévention publique liée aux expositions environnementales et au dépistage ciblé.`;
}

/**
 * Composant pour recentrer la carte
 */
function MapAutoCenter({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 11); }, [center, map]);
  return null;
}

export default function SigAiAnalysisPanel({ selectedCommuneId }) {
  const [commune, setCommune] = useState('');
  const [report, setReport] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePredictCauses = async (event) => {
    event.preventDefault();

    const trimmedCommune = commune.trim();
    if (!trimmedCommune) {
      setWarning('Veuillez saisir une commune avant de lancer l’analyse.');
      return;
    }

    setLoading(true);
    setWarning('');
    setReport('');

    try {
      const response = await sigService.analyzeScope({
        wilaya: 'Tlemcen',
        analysis_type: 'commune',
        commune: trimmedCommune,
      });

      const payload = response?.data || {};
      setReport(payload.report || '');
      setWarning(payload.warning || '');
    } catch (error) {
      setWarning('Impossible de contacter le service d’analyse. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(report);
    toast.success('Rapport copié dans le presse-papier');
  };

  const exportToPDF = () => {
    if (!report) return;
    try {
      const doc = new jsPDF();
      const margin = 15;
      
      // Titre du document
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`Analyse Épidémiologique : ${commune}`, margin, 20);

      // Métadonnées
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100);
      doc.text(`Document généré par RNC SIG AI - ${new Date().toLocaleString()}`, margin, 28);

      // Séparateur
      doc.setDrawColor(200);
      doc.line(margin, 32, 195, 32);

      // Corps du rapport (Nettoyage sommaire du markdown)
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const cleanText = report.replace(/##/g, '').replace(/\*\*/g, '');
      const splitText = doc.splitTextToSize(cleanText, 180);
      doc.text(splitText, margin, 42);

      doc.save(`Analyse_Cancer_${commune || 'Commune'}.pdf`);
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Erreur PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const renderReport = (text) =>
    text.split('\n\n').map((paragraph, index) => {
      if (paragraph.startsWith('##')) {
        return <h3 key={index} className="mt-5 mb-2 text-lg font-black text-slate-900">{paragraph.replace('##', '').trim()}</h3>;
      }
      if (!paragraph.trim()) {
        return null;
      }
      return <p key={index} className="mb-3 text-sm leading-6 text-slate-700">{paragraph}</p>;
    });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#1a6b9a] p-2 text-white">
            <Brain size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Prédiction des causes par commune</h2>
            <p className="text-sm text-slate-500">Saisissez une commune de Tlemcen et l’IA propose les causes probables avec le contexte SIG.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <form onSubmit={handlePredictCauses} className="space-y-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <label className="block text-sm font-bold text-slate-700">
            Commune
            <input
              type="text"
              value={commune}
              onChange={(event) => setCommune(event.target.value)}
              placeholder="Ex : Maghnia, Tlemcen, Chetouane"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-[#1a6b9a]"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">L’analyse est réalisée sur la wilaya de Tlemcen.</p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1a6b9a] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <Brain size={16} />}
              {loading ? 'Analyse en cours...' : 'Prédire les causes'}
            </button>
          </div>
        </form>

        {warning && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {warning}
          </div>
        )}

        {report ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Rapport IA</p>
                <p className="text-sm text-slate-600">Prévision sur <span className="font-bold text-slate-900">{commune}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  <Copy size={14} /> Copier
                </button>
                <button
                  type="button"
                  onClick={exportToPDF}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 shadow-sm"
                >
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>
            <div className="prose prose-slate max-w-none text-sm">{renderReport(report)}</div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Saisissez une commune pour obtenir une analyse causale structurée.
          </div>
        )}
      </div>
    </div>
  );
}
