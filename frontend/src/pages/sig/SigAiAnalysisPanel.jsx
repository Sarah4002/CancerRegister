import { jsPDF } from 'jspdf';
import 'leaflet/dist/leaflet.css';
import { Brain, Copy, FileText, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMap } from 'react-leaflet';
import { sigService } from '../../services/sigService';

/* ─────────────────────────────────────────
   DONNÉES STATIQUES
───────────────────────────────────────── */
const INDUSTRIAL_ZONES_DATA = [
  {
    nom: 'Zone Industrielle Ouled Bendamou',
    commune: 'Maghnia',
    coords: [34.8833, -1.7333],
    superficie: '104 hectares',
    secteurs: ['Sidérurgie', 'Agroalimentaire'],
    polluants: ['Fumées métallurgiques', 'CO2', 'Particules fines PM2.5'],
    cancers_associes: ['Poumon', 'Larynx', 'Peau'],
    niveau_risque: 'Critique',
    proximite_barrage: '11 km du barrage Hammam Boughrara',
    influence_km: 12,
    couleur: '#FF0000',
  },
  {
    nom: 'Zone Industrielle Chetouane',
    commune: 'Chetouane',
    coords: [34.9167, -1.2833],
    superficie: '6.7 km de long',
    secteurs: ['Industrie légère', 'Textile', 'Chimie'],
    polluants: ['COV', 'Poussières industrielles'],
    cancers_associes: ['Poumon', 'Vessie', 'Lymphome'],
    niveau_risque: 'Élevé',
    influence_km: 10,
    couleur: '#FF6600',
  },
  {
    nom: 'Zone Portuaire Ghazaouet',
    commune: 'Ghazaouet',
    coords: [35.1000, -1.8667],
    superficie: 'Port industriel',
    secteurs: ['Import/Export', 'Hydrocarbures', 'Ciment'],
    polluants: ['Hydrocarbures', 'Poussières de ciment', 'Gaz d\'échappement'],
    cancers_associes: ['Poumon', 'Mésothéliome', 'Peau'],
    niveau_risque: 'Élevé',
    influence_km: 12,
    couleur: '#FF6600',
  },
];

const DAMS_DATA = [
  {
    nom: 'Barrage Hammam Boughrara',
    commune: 'Maghnia',
    coords: [34.9500, -1.8000],
    capacite: '177 millions m³',
    usage: 'AEP + Irrigation',
    risques: [
      'Situé à 11 km zone industrielle Ouled Bendamou',
      'Risque d\'infiltration eaux industrielles',
      'Développement cyanobactéries (chaleur)',
      'Accumulation pesticides agricoles',
    ],
    cancers_associes: ['Foie', 'Reins', 'Colorectal'],
    niveau_risque: 'Critique',
    influence_km: 5,
    couleur: '#CC0000',
  },
  {
    nom: 'Barrage El Mefrouch',
    commune: 'Tlemcen',
    coords: [34.9333, -1.2667],
    capacite: '12 millions m³',
    usage: 'AEP + Irrigation',
    risques: [
      'Contamination pesticides zones agricoles proches',
      'Nitrates élevés',
      'Proximité zone urbaine dense',
    ],
    cancers_associes: ['Colorectal', 'Estomac'],
    niveau_risque: 'Modéré',
    influence_km: 3,
    couleur: '#CA8A04',
  },
  {
    nom: 'Barrage Sekkak',
    commune: 'Nord Tlemcen',
    coords: [35.1333, -1.3500],
    capacite: '25 millions m³',
    usage: 'AEP + Irrigation',
    risques: ['Prolifération cyanobactéries', 'Hépatotoxines', 'Ruissellement agricole'],
    cancers_associes: ['Foie', 'Reins'],
    niveau_risque: 'Modéré',
    influence_km: 4,
    couleur: '#CA8A04',
  },
  {
    nom: 'Barrage Beni Bahdel',
    commune: 'Beni Bahdel',
    coords: [34.7833, -1.9333],
    capacite: '63 millions m³',
    usage: 'AEP + Irrigation',
    risques: ['Accumulation métaux lourds', 'Sédiments contaminés'],
    cancers_associes: ['Foie', 'Poumon'],
    influence_km: 2,
    niveau_risque: 'Faible',
    couleur: '#00AA00',
  },
  {
    nom: 'Barrage El Izdihar',
    commune: 'Sidi Abdelli',
    coords: [34.9667, -1.0833],
    capacite: 'Variable',
    usage: 'Irrigation',
    risques: ['Nitrates agricoles élevés', 'Engrais chimiques'],
    cancers_associes: ['Colorectal', 'Estomac'],
    influence_km: 3,
    niveau_risque: 'Faible',
    couleur: '#00AA00',
  },
];

const AGRICULTURAL_ZONES_DATA = [
  {
    nom: 'Plaine de Maghnia',
    commune: 'Maghnia',
    center: [34.8667, -1.7500],
    polygon: [[34.84, -1.82], [34.92, -1.82], [34.92, -1.68], [34.84, -1.68]],
    cultures: ['Céréales', 'Maraîchage', 'Betterave'],
    pesticides: ['Glyphosate', 'Organophosphorés', 'Fongicides'],
    risques: ['Contamination nappe phréatique', 'Résidus dans aliments'],
    cancers_associes: ['Sang/Lymphome', 'Foie', 'Sein'],
    niveau_risque: 'Élevé',
    couleur: '#EA580C',
  },
  {
    nom: 'Zone Agricole Hennaya',
    commune: 'Hennaya',
    center: [34.9667, -1.4667],
    polygon: [[34.94, -1.49], [34.99, -1.49], [34.99, -1.44], [34.94, -1.44]],
    cultures: ['Agrumes', 'Vignes', 'Olives'],
    pesticides: ['Fongicides', 'Insecticides', 'Herbicides'],
    risques: ['Fongicides cancérigènes', 'Exposition cutanée agriculteurs'],
    cancers_associes: ['Sein', 'Poumon', 'Peau'],
    niveau_risque: 'Modéré',
    couleur: '#CA8A04',
  },
  {
    nom: 'Zone Agricole Remchi',
    commune: 'Remchi',
    center: [35.0667, -1.4333],
    polygon: [[35.04, -1.45], [35.09, -1.45], [35.09, -1.41], [35.04, -1.41]],
    cultures: ['Cultures irriguées', 'Maraîchage'],
    pesticides: ['Nitrates', 'Engrais azotés'],
    risques: ['Nitrates dans eau potable', 'Contamination sols'],
    cancers_associes: ['Colorectal', 'Estomac', 'Thyroïde'],
    niveau_risque: 'Modéré',
    couleur: '#CA8A04',
  },
  {
    nom: 'Zone Agricole Sebdou',
    commune: 'Sebdou',
    center: [34.6333, -1.3333],
    polygon: [[34.61, -1.35], [34.65, -1.35], [34.65, -1.31], [34.61, -1.31]],
    cultures: ['Élevage', 'Céréales'],
    pesticides: ['Antiparasitaires vétérinaires', 'Herbicides'],
    risques: ['UV index élevé', 'Altitude exposée'],
    cancers_associes: ['Peau', 'Mélanome'],
    niveau_risque: 'Faible',
    couleur: '#16A34A',
  },
];

const CANCER_CASES_BY_COMMUNE_DATA = [
  { commune: 'Maghnia', coords: [34.8833, -1.7333], cas: { poumon: 45, foie: 38, peau: 22, sein: 31, colorectal: 18 }, population: 240000, uv_index: 8.5, temperature_max: 38 },
  { commune: 'Tlemcen (ville)', coords: [34.8828, -1.3167], cas: { sein: 62, poumon: 28, colorectal: 35, foie: 15, peau: 19 }, population: 180000, uv_index: 7.8, temperature_max: 36 },
  { commune: 'Chetouane', coords: [34.9167, -1.2833], cas: { poumon: 34, vessie: 21, lymphome: 18, sein: 25, peau: 14 }, population: 85000, uv_index: 7.5, temperature_max: 35 },
  { commune: 'Ghazaouet', coords: [35.1000, -1.8667], cas: { poumon: 39, peau: 28, mesotheliome: 12, sein: 20, foie: 11 }, population: 70000, uv_index: 8.2, temperature_max: 34 },
  { commune: 'Remchi', coords: [35.0667, -1.4333], cas: { colorectal: 29, estomac: 24, thyroide: 16, sein: 18, foie: 13 }, population: 55000, uv_index: 7.2, temperature_max: 33 },
  { commune: 'Hennaya', coords: [34.9667, -1.4667], cas: { sein: 33, poumon: 19, peau: 24, lymphome: 14, foie: 10 }, population: 48000, uv_index: 7.9, temperature_max: 37 },
  { commune: 'Sebdou', coords: [34.6333, -1.3333], cas: { peau: 31, melanome: 18, poumon: 12, sein: 16, colorectal: 9 }, population: 42000, uv_index: 9.2, temperature_max: 41 },
  { commune: 'Sidi Abdelli', coords: [34.9667, -1.0833], cas: { colorectal: 22, estomac: 18, foie: 16, sein: 21, poumon: 11 }, population: 38000, uv_index: 7.4, temperature_max: 34 },
  { commune: 'Beni Saf', coords: [35.3000, -1.3833], cas: { poumon: 25, peau: 20, mesotheliome: 8, sein: 17, foie: 12 }, population: 65000, uv_index: 8.0, temperature_max: 33 },
  { commune: 'Nedroma', coords: [35.0167, -1.8333], cas: { sein: 19, poumon: 16, foie: 14, colorectal: 12, peau: 15 }, population: 32000, uv_index: 7.6, temperature_max: 35 },
];

/* ─────────────────────────────────────────
   UTILITAIRES
───────────────────────────────────────── */
function haversineDistance(coords1, coords2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(coords2[0] - coords1[0]);
  const dLon = toRad(coords2[1] - coords1[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coords1[0])) * Math.cos(toRad(coords2[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const COMMUNES_RISK_ANALYSIS = CANCER_CASES_BY_COMMUNE_DATA.map((commune) => {
  const totalCases = Object.values(commune.cas).reduce((s, c) => s + c, 0);
  const incidenceRate = (totalCases / commune.population) * 100000;
  const industrialZonesProximity = INDUSTRIAL_ZONES_DATA.filter(
    (z) => haversineDistance(commune.coords, z.coords) < z.influence_km + 5,
  );
  const damsProximity = DAMS_DATA.filter(
    (d) => haversineDistance(commune.coords, d.coords) < d.influence_km + 10,
  );
  const agriculturalZonesProximity = AGRICULTURAL_ZONES_DATA.filter(
    (z) => haversineDistance(commune.coords, z.center) < 15,
  );
  const dominantCancer = Object.entries(commune.cas).sort(([, a], [, b]) => b - a)[0];
  let riskScore = 0;
  if (incidenceRate > 50) riskScore += 4;
  else if (incidenceRate > 20) riskScore += 2;
  riskScore += 3 * industrialZonesProximity.length;
  riskScore += damsProximity.length;
  riskScore += agriculturalZonesProximity.length;
  let globalRisk = 'Faible';
  if (riskScore > 8) globalRisk = 'Critique';
  else if (riskScore > 5) globalRisk = 'Élevé';
  else if (riskScore > 2) globalRisk = 'Modéré';
  return {
    ...commune,
    id: commune.commune.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    totalCases,
    chartData: Object.entries(commune.cas).map(([type, value]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      value,
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

const GLOBAL_STATS = (() => {
  const totalPatients = COMMUNES_RISK_ANALYSIS.reduce((s, c) => s + c.totalCases, 0);
  const allCancers = {};
  COMMUNES_RISK_ANALYSIS.forEach((c) => {
    for (const [t, n] of Object.entries(c.cas)) allCancers[t] = (allCancers[t] || 0) + n;
  });
  const mostFrequentCancer = Object.entries(allCancers).sort(([, a], [, b]) => b - a)[0];
  const sorted = [...COMMUNES_RISK_ANALYSIS].sort((a, b) => b.riskScore - a.riskScore);
  return {
    totalPatients,
    mostAffectedCommune: sorted[0]?.commune || 'N/A',
    mostFrequentCancer: mostFrequentCancer?.[0] || 'N/A',
    top3CriticalCommunes: sorted
      .filter((c) => c.globalRisk === 'Critique' || c.globalRisk === 'Élevé')
      .slice(0, 3)
      .map((c) => c.commune),
  };
})();

const CANCER_OPTIONS = [
  { value: '', label: '— Tous les types de cancer —' },
  { value: 'poumon', label: 'Cancer du Poumon' },
  { value: 'sein', label: 'Cancer du Sein' },
  { value: 'colorectal', label: 'Cancer Colorectal' },
  { value: 'foie', label: 'Cancer du Foie' },
  { value: 'peau', label: 'Cancer de la Peau' },
  { value: 'vessie', label: 'Cancer de la Vessie' },
  { value: 'lymphome', label: 'Lymphome' },
  { value: 'mesotheliome', label: 'Mésothéliome' },
  { value: 'estomac', label: "Cancer de l'Estomac" },
  { value: 'thyroide', label: 'Cancer de la Thyroïde' },
  { value: 'melanome', label: 'Mélanome' },
];

const ZONE_GROUPS = [
  { key: 'industrial_zones', label: 'Zones industrielles', zones: INDUSTRIAL_ZONES_DATA },
  { key: 'dams', label: 'Barrages', zones: DAMS_DATA },
  { key: 'agricultural_zones', label: 'Zones agricoles', zones: AGRICULTURAL_ZONES_DATA },
];

function makeZoneKey(category, zoneName) {
  return `${category}:${zoneName}`;
}

function countSavedZones(cards) {
  return cards.reduce((acc, card) => acc + (Array.isArray(card?.zones) ? card.zones.length : 0), 0);
}

function flattenSavedZoneItems(cards) {
  return cards.flatMap((card) => {
    if (!Array.isArray(card?.zones) || card.zones.length === 0) return [];
    return card.zones.map((zone, index) => {
      const zoneName = String(zone?.name || zone?.nom || `${card?.nom || 'Zone'} ${index + 1}`).trim();
      return {
        key: `${card.id}:${index}:${zoneName}`,
        cardName: card.nom,
        cardDescription: card.description,
        wilaya: card.wilaya,
        commune: zone?.commune || card.commune || card.wilaya || 'Zone enregistrée',
        zone: {
          nom: zoneName,
          commune: zone?.commune || card.commune || card.wilaya || 'Zone enregistrée',
          niveau_risque: zone?.risk || zone?.niveau_risque || card?.filters?.risk_level || 'Non défini',
          cancers_associes: zone?.cancers_associes || zone?.cancers || [],
          center: zone?.center,
          polygon: zone?.polygon,
          radius: zone?.radius,
        },
      };
    });
  });
}

function buildFallbackReport(selectedCommuneData, polluantsIdentifies) {
  const industries = selectedCommuneData.industrialZonesProximity.map((z) => z.nom).join(', ') || 'aucune';
  const dams = selectedCommuneData.damsProximity.map((d) => d.nom).join(', ') || 'aucun';
  const agri = selectedCommuneData.agriculturalZonesProximity.map((z) => z.nom).join(', ') || 'aucune';
  const polluants = polluantsIdentifies.join(', ') || 'aucun';
  return `ANALYSE DES FACTEURS DE RISQUE

La commune de ${selectedCommuneData.commune} présente une incidence de ${selectedCommuneData.incidenceRate} pour 100 000 habitants, avec un cancer dominant ${selectedCommuneData.dominantCancer.type} (${selectedCommuneData.dominantCancer.cases} cas). Les proximités industrielles (${industries}), les barrages (${dams}) et les zones agricoles (${agri}) constituent des expositions environnementales cohérentes.

HYPOTHÈSES CAUSALES

1. Exposition aux polluants industriels et à la combustion (40 %).
2. Contamination de l'eau et des sols par pesticides et nitrates (30 %).
3. Exposition climatique et UV, associée à la densité urbaine et aux micro-polluants (20 %).

NIVEAU DE RISQUE GLOBAL

Niveau : ${selectedCommuneData.globalRisk}
Justification : incidence ${selectedCommuneData.incidenceRate}/100k, ${selectedCommuneData.industrialZonesProximity.length} zone(s) industrielle(s), ${selectedCommuneData.damsProximity.length} barrage(s), ${selectedCommuneData.agriculturalZonesProximity.length} zone(s) agricole(s). Polluants : ${polluants}.

RECOMMANDATIONS

1. Renforcer la surveillance épidémiologique et le recueil des expositions.
2. Contrôles prioritaires de qualité de l'eau, sols et air autour des zones à risque.
3. Campagne de prévention publique et dépistage ciblé.`;
}

function MapAutoCenter({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 11); }, [center, map]);
  return null;
}

/* ─────────────────────────────────────────
   COMPOSANT PRINCIPAL
───────────────────────────────────────── */
export default function SigAiAnalysisPanel({ selectedCommuneId }) {
  const [commune, setCommune] = useState('');
  const [cancerType, setCancerType] = useState('');
  const [selectedZones, setSelectedZones] = useState([]);
  const [savedZones, setSavedZones] = useState([]);
  const [savedZonesLoading, setSavedZonesLoading] = useState(false);
  const [report, setReport] = useState('');
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(false);

  /* Sync commune depuis carte */
  useEffect(() => {
    if (!selectedCommuneId) return;
    const matched = COMMUNES_RISK_ANALYSIS.find((e) => e.id === selectedCommuneId);
    if (matched?.commune) setCommune(matched.commune);
  }, [selectedCommuneId]);

  /* Charger les zones sauvegardées */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSavedZonesLoading(true);
      try {
        const response = await sigService.getMapCards();
        const cards = Array.isArray(response?.data)
          ? response.data
          : response?.data?.results || [];
        if (!cancelled) setSavedZones(cards);
      } catch {
        if (!cancelled) setSavedZones([]);
      } finally {
        if (!cancelled) setSavedZonesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedZonePayload = selectedZones.map(({ category, zone }) => ({
    category,
    type: category,
    nom: zone.nom,
    commune: zone.commune,
    niveau_risque: zone.niveau_risque,
    cancers_associes: zone.cancers_associes,
  }));

  const selectedZoneCount = selectedZones.length;
  const savedZoneCount = countSavedZones(savedZones);
  const savedZoneItems = flattenSavedZoneItems(savedZones);

  const toggleZone = (category, zone) => {
    const key = makeZoneKey(category, zone.nom);
    setSelectedZones((cur) =>
      cur.some((i) => i.key === key)
        ? cur.filter((i) => i.key !== key)
        : [...cur, { key, category, zone }],
    );
  };

  const useSavedZoneCard = (card) => {
    const payload = flattenSavedZoneItems([card]).map((item) => ({
      key: item.key,
      category: 'saved_zone',
      zone: item.zone,
    }));
    if (payload.length === 0) {
      toast('Cette carte ne contient pas de zones exploitables.');
      return;
    }
    setSelectedZones(payload);
    toast.success(`Zones de "${card.nom}" chargées.`);
  };

  const toggleSavedZoneItem = (item) => {
    setSelectedZones((current) => {
      const exists = current.some((z) => z.key === item.key);
      if (exists) return current.filter((z) => z.key !== item.key);
      return [...current, { key: item.key, category: 'saved_zone', zone: item.zone }];
    });
  };

  const handlePredictCauses = async (e) => {
    e.preventDefault();
    const trimmedCommune = commune.trim();
    if (!trimmedCommune && selectedZones.length === 0) {
      setWarning('Veuillez choisir une commune ou sélectionner au moins une zone avant de lancer l\'analyse.');
      return;
    }
    setLoading(true);
    setWarning('');
    setReport('');
    try {
      const response = await sigService.analyzeScope({
        wilaya: 'Tlemcen',
        analysis_type: selectedZones.length > 0 ? 'zone_cross' : 'commune',
        commune: trimmedCommune || null,
        ...(cancerType ? { filters: { type_cancer: cancerType } } : {}),
        ...(selectedZones.length > 0 ? { selected_zones: selectedZonePayload } : {}),
      });
      const payload = response?.data || {};
      setReport(payload.report || '');
      setWarning(payload.warning || '');
    } catch {
      /* Fallback local si le service est indisponible */
      const matched = COMMUNES_RISK_ANALYSIS.find(
        (c) => c.commune.toLowerCase() === trimmedCommune.toLowerCase(),
      );
      if (matched) {
        const polluants = [
          ...new Set([
            ...matched.industrialZonesProximity.flatMap((z) => z.polluants || []),
            ...matched.damsProximity.flatMap((d) => d.risques || []),
          ]),
        ].slice(0, 5);
        setReport(buildFallbackReport(matched, polluants));
        setWarning('Service IA indisponible — rapport généré localement à partir des données statiques.');
      } else {
        setWarning('Impossible de contacter le service d\'analyse. Veuillez réessayer plus tard.');
      }
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
      const pdfTitle =
        selectedZoneCount > 0
          ? selectedZones.map(({ zone }) => zone.nom).join(' + ')
          : commune || 'Commune';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(`Analyse Épidémiologique : ${pdfTitle}`, margin, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100);
      doc.text(`Document généré par RNC SIG AI — ${new Date().toLocaleString()}`, margin, 28);
      doc.setDrawColor(200);
      doc.line(margin, 32, 195, 32);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const clean = report.replace(/##/g, '').replace(/\*\*/g, '');
      doc.text(doc.splitTextToSize(clean, 180), margin, 42);
      doc.save(`Analyse_Cancer_${pdfTitle.replace(/[^\w-]+/g, '_')}.pdf`);
      toast.success('PDF généré avec succès');
    } catch {
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  /* ── Dérivés UI ── */
  const statusState = warning ? 'warn' : report ? 'ready' : 'idle';
  const statusLabel = warning ? 'Attention' : report ? 'Analyse prête' : 'En attente';
  const statusSub =
    selectedZoneCount > 0
      ? `${selectedZoneCount} zone(s) prêtes pour le croisement`
      : commune
      ? `Analyse sur la commune ${commune}`
      : 'Choisissez une commune ou des zones pour lancer l\'analyse';

  const renderReport = (text) =>
    text.split('\n\n').map((paragraph, i) => {
      if (paragraph.startsWith('##'))
        return (
          <p key={i} className="ai-report-heading">
            {paragraph.replace('##', '').trim()}
          </p>
        );
      if (!paragraph.trim()) return null;
      return (
        <p key={i} className="ai-report-para">
          {paragraph}
        </p>
      );
    });

  /* ─────────────────────────────────────────
     RENDU
  ───────────────────────────────────────── */
  return (
    <>
      {/* ── Styles scoped au panneau ── */}
      <style>{`
        /* Animations */
        @keyframes ai-spin { to { transform: rotate(360deg); } }

        /* Panneau racine — s'adapte au scroll du panneau parent */
        .ai-panel {
          display: flex;
          flex-direction: column;
          /* pas de height fixe ni overflow:hidden : le scroll est géré par .ss-body */
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          font-family: inherit;
        }

        /* ── En-tête ── */
        .ai-panel-header {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 12px 12px;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
          flex-shrink: 0;
        }
        .ai-header-left { display: flex; align-items: flex-start; gap: 14px; }

        /* Icône cerveau avec anneau de chargement */
        .ai-brain-wrap {
          position: relative;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ai-brain-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #1a6b9a;
          opacity: 0;
          transition: opacity .3s;
        }
        .ai-brain-ring.spinning {
          opacity: 1;
          animation: ai-spin 1s linear infinite;
        }
        .ai-brain-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(26, 107, 154, 0.10);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a6b9a;
        }

        .ai-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(26, 107, 154, 0.10);
          color: #1a6b9a;
          margin-bottom: 4px;
        }
        .ai-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }
        .ai-subtitle {
          margin-top: 3px;
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
          max-width: 440px;
        }

        /* Stat pills */
        .ai-stat-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .ai-stat-pill {
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          text-align: center;
          min-width: 68px;
          background: #f8fafc;
        }
        .ai-stat-pill .sp-val {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .ai-stat-pill .sp-lbl {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 600;
          letter-spacing: .04em;
          margin-top: 1px;
        }
        .ai-stat-pill.active .sp-val { color: #1a6b9a; }

        /* ── Corps principal — colonne unique, scroll géré par le parent ── */
        .ai-panel-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px 12px 20px;
        }

        /* Les deux colonnes sont empilées verticalement dans le panneau étroit */
        .ai-col-left {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ai-col-right {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        /* ── Champs formulaire ── */
        .ai-input-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .ai-field-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: .06em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .ai-input, .ai-select {
          width: 100%;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 10px 14px;
          font-size: 13px;
          color: #0f172a;
          outline: none;
          transition: border-color .15s, background .15s;
          font-family: inherit;
        }
        .ai-input:focus, .ai-select:focus {
          border-color: #1a6b9a;
          background: #ffffff;
        }

        /* ── Section zones ── */
        .ai-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 14px 16px;
        }
        .ai-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }
        .ai-card-title { font-size: 13px; font-weight: 800; color: #0f172a; }
        .ai-card-sub { font-size: 11px; color: #64748b; margin-top: 2px; line-height: 1.4; }
        .ai-chip {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(26,107,154,.10);
          color: #1a6b9a;
          white-space: nowrap;
        }

        .ai-group-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .ai-zone-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .ai-zone-tag {
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all .15s;
          line-height: 1.3;
          text-align: left;
        }
        .ai-zone-tag:hover { border-color: rgba(26,107,154,.4); color: #1a6b9a; background: rgba(26,107,154,.06); }
        .ai-zone-tag.active {
          border-color: #1a6b9a;
          color: #1a6b9a;
          background: rgba(26,107,154,.08);
        }
        .ai-zone-tag-sub { font-size: 9px; font-weight: 500; color: #94a3b8; }

        /* Zones actives (pills retirables) */
        .ai-active-zones { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .ai-active-zone-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px 4px 12px;
          border-radius: 999px;
          border: 1px solid rgba(26,107,154,.25);
          background: rgba(26,107,154,.07);
          font-size: 11px;
          font-weight: 700;
          color: #1a6b9a;
          cursor: pointer;
          transition: all .15s;
        }
        .ai-active-zone-pill:hover { background: rgba(26,107,154,.14); }
        .ai-active-zone-pill span { font-size: 13px; color: #94a3b8; line-height: 1; }

        /* Cartes sauvegardées */
        .ai-saved-card {
          width: 100%;
          text-align: left;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 10px 12px;
          cursor: pointer;
          transition: all .15s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .ai-saved-card:hover {
          border-color: rgba(26,107,154,.35);
          background: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15,23,42,.06);
        }
        .ai-saved-card-name { font-size: 12px; font-weight: 700; color: #0f172a; }
        .ai-saved-card-meta { font-size: 10px; color: #94a3b8; margin-top: 2px; }
        .ai-saved-card-badge {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(26,107,154,.10);
          color: #1a6b9a;
        }

        /* Bouton CTA principal */
        .ai-cta-btn {
          width: 100%;
          padding: 12px 18px;
          border-radius: 14px;
          border: none;
          background: #2563eb;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity .15s, background .15s;
        }
        .ai-cta-btn:hover { background: #1d4ed8; }
        .ai-cta-btn:disabled { opacity: .5; cursor: not-allowed; }

        /* ── Colonne droite : statut ── */
        .ai-status-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 14px 16px;
          transition: border-color .3s, background .3s;
        }
        .ai-status-card.ready { border-color: #bbf7d0; background: #f0fdf4; }
        .ai-status-card.warn  { border-color: #fde68a; background: #fffbeb; }

        .ai-status-row { display: flex; align-items: flex-start; gap: 10px; }
        .ai-status-dot {
          flex-shrink: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
          margin-top: 5px;
          transition: background .3s;
        }
        .ai-status-dot.ready { background: #22c55e; }
        .ai-status-dot.warn  { background: #f59e0b; }

        .ai-status-main { flex: 1; min-width: 0; }
        .ai-status-label { font-size: 14px; font-weight: 800; color: #0f172a; }
        .ai-status-sub   { font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.4; }

        .ai-meta-chips { display: flex; gap: 6px; flex-shrink: 0; }
        .ai-meta-chip {
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 5px 10px;
          text-align: center;
        }
        .ai-meta-chip-lbl { font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; }
        .ai-meta-chip-val { font-size: 12px; font-weight: 700; color: #334155; margin-top: 1px; }

        .ai-warning-box {
          margin-top: 10px;
          border-radius: 10px;
          border: 1px solid #fde68a;
          background: #ffffff;
          padding: 10px 12px;
          font-size: 12px;
          color: #92400e;
          line-height: 1.5;
        }

        /* Rapport */
        .ai-report-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          min-height: 180px;
        }
        .ai-report-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
        .ai-report-title { font-size: 12px; font-weight: 800; color: #94a3b8; letter-spacing: .08em; text-transform: uppercase; }
        .ai-report-focus { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 1px; }
        .ai-report-actions { display: flex; gap: 6px; }
        .ai-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all .15s;
        }
        .ai-action-btn:hover { background: #f1f5f9; border-color: #cbd5e1; color: #0f172a; }
        .ai-action-btn.primary {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }
        .ai-action-btn.primary:hover { background: #1d4ed8; }

        .ai-report-body {
          padding: 16px;
        }
        .ai-report-body::-webkit-scrollbar { width: 4px; }
        .ai-report-body::-webkit-scrollbar-track { background: transparent; }
        .ai-report-body::-webkit-scrollbar-thumb { background: rgba(26,107,154,.15); border-radius: 2px; }

        .ai-report-heading {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .10em;
          text-transform: uppercase;
          color: #1a6b9a;
          margin: 18px 0 6px;
        }
        .ai-report-heading:first-child { margin-top: 0; }
        .ai-report-para {
          font-size: 13px;
          color: #334155;
          line-height: 1.7;
          margin-bottom: 8px;
        }

        /* État vide du rapport */
        .ai-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          text-align: center;
        }
        .ai-empty-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          margin-bottom: 14px;
        }
        .ai-empty-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .ai-empty-sub { font-size: 12px; color: #64748b; line-height: 1.6; max-width: 240px; }

        /* Loader inline */
        @keyframes ai-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .ai-loader-dot {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #ffffff;
          animation: ai-pulse 1s ease-in-out infinite;
        }
        .ai-loader-dot:nth-child(2) { animation-delay: .15s; }
        .ai-loader-dot:nth-child(3) { animation-delay: .30s; }
        .ai-loader-row { display: flex; align-items: center; gap: 5px; }
      `}</style>

      <div className="ai-panel">
        {/* ── En-tête ── */}
        <div className="ai-panel-header">
          <div className="ai-header-left">
            <div className="ai-brain-wrap">
              <div className={`ai-brain-ring${loading ? ' spinning' : ''}`} />
              <div className="ai-brain-icon">
                <Brain size={20} />
              </div>
            </div>
            <div>
              <div className="ai-badge">Analyse IA SIG</div>
              <div className="ai-title">Croisement des zones et hypothèses</div>
              <div className="ai-subtitle">
                Sélectionnez une commune, des zones réelles ou une carte sauvegardée pour générer des hypothèses de corrélation environnementale.
              </div>
            </div>
          </div>

          
        </div>

        {/* ── Corps ── */}
        <div className="ai-panel-body">

          {/* ── Colonne gauche : formulaire ── */}
          <div className="ai-col-left">
            <form onSubmit={handlePredictCauses} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Accès rapide aux zones enregistrées */}
             

              {/* Commune + cancer */}
              <div className="ai-input-grid">
                <div>
                  <label className="ai-field-label" htmlFor="ai-commune">Commune</label>
                  <input
                    id="ai-commune"
                    type="text"
                    className="ai-input"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder="Ex : Maghnia, Tlemcen…"
                  />
                </div>
                <div>
                  <label className="ai-field-label" htmlFor="ai-cancer">Type de cancer</label>
                  <select
                    id="ai-cancer"
                    className="ai-select"
                    value={cancerType}
                    onChange={(e) => setCancerType(e.target.value)}
                  >
                    {CANCER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Zones réelles */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <div>
                    <div className="ai-card-title">Zones réelles à croiser</div>
                    <div className="ai-card-sub">Sélectionnez une ou plusieurs zones pour générer des hypothèses.</div>
                  </div>
                  <span className="ai-chip">
                    {selectedZoneCount > 0 ? `${selectedZoneCount} actives` : 'Aucune'}
                  </span>
                </div>

                {ZONE_GROUPS.map((group) => (
                  <div key={group.key}>
                    <div className="ai-group-label">{group.label}</div>
                    <div className="ai-zone-tags">
                      {group.zones.map((zone) => {
                        const key = makeZoneKey(group.key, zone.nom);
                        const active = selectedZones.some((i) => i.key === key);
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`ai-zone-tag${active ? ' active' : ''}`}
                            onClick={() => toggleZone(group.key, zone)}
                          >
                            <div>{zone.nom}</div>
                            <div className="ai-zone-tag-sub">{zone.commune} · {zone.niveau_risque}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {selectedZoneCount > 0 && (
                  <div className="ai-active-zones">
                    {selectedZones.map(({ key, zone }) => (
                      <button
                        key={key}
                        type="button"
                        className="ai-active-zone-pill"
                        onClick={() => setSelectedZones((cur) => cur.filter((i) => i.key !== key))}
                      >
                        {zone.nom}
                        <span>×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Zones sauvegardées */}
              <div className="ai-card">
                <div className="ai-card-header">
                  <div>
                    <div className="ai-card-title">Mes zones sauvegardées</div>
                    <div className="ai-card-sub">Réutilisez vos cartes enregistrées pour un croisement rapide.</div>
                  </div>
                  <span className="ai-chip">
                    {savedZonesLoading
                      ? 'Chargement…'
                      : `${savedZones.length} carte${savedZones.length !== 1 ? 's' : ''}`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {savedZonesLoading ? (
                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                      Chargement des zones sauvegardées…
                    </div>
                  ) : savedZones.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                      Aucune zone sauvegardée.
                    </div>
                  ) : (
                    savedZones.map((card) => {
                      const zoneCount = Array.isArray(card?.zones) ? card.zones.length : 0;
                      const poiCount = Array.isArray(card?.pois) ? card.pois.length : 0;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          className="ai-saved-card"
                          onClick={() => useSavedZoneCard(card)}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div className="ai-saved-card-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {card.nom}
                            </div>
                            <div className="ai-saved-card-meta">
                              {[card.wilaya, card.commune].filter(Boolean).join(' · ')}
                              {zoneCount > 0 && ` · ${zoneCount} zones`}
                              {poiCount > 0 && ` · ${poiCount} POI`}
                            </div>
                          </div>
                          <span className="ai-saved-card-badge">{zoneCount}</span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="ai-card" style={{ marginTop: 12, background: '#fff', padding: 12 }}>
                  <div className="ai-card-header" style={{ marginBottom: 10 }}>
                    <div>
                      <div className="ai-card-title">Zones enregistrées sélectionnables</div>
                      <div className="ai-card-sub">Cliquez une zone pour l’ajouter au croisement.</div>
                    </div>
                    <span className="ai-chip">{savedZoneItems.length}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {savedZoneItems.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                        Les cartes sauvegardées ne contiennent pas encore de zones.
                      </div>
                    ) : (
                      savedZoneItems.map((item) => {
                        const active = selectedZones.some((z) => z.key === item.key);
                        return (
                          <button
                            key={item.key}
                            type="button"
                            className="ai-saved-card"
                            onClick={() => toggleSavedZoneItem(item)}
                            style={{
                              background: active ? 'linear-gradient(135deg, rgba(26,107,154,.10), rgba(59,130,246,.05))' : '#f8fafc',
                              borderColor: active ? '#1a6b9a' : '#e2e8f0',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div className="ai-saved-card-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.zone.nom}
                              </div>
                              <div className="ai-saved-card-meta">
                                {[item.commune, item.zone.niveau_risque].filter(Boolean).join(' · ')}
                              </div>
                              <div className="ai-saved-card-meta" style={{ color: '#94a3b8' }}>
                                {item.cardName}
                              </div>
                            </div>
                            <span className="ai-saved-card-badge">{active ? 'Sélectionnée' : 'Ajouter'}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Bouton lancer */}
              <button type="submit" className="ai-cta-btn" disabled={loading}>
                {loading ? (
                  <div className="ai-loader-row">
                    <div className="ai-loader-dot" />
                    <div className="ai-loader-dot" />
                    <div className="ai-loader-dot" />
                    <span style={{ marginLeft: 4 }}>Analyse en cours</span>
                  </div>
                ) : (
                  <>
                    <Brain size={16} />
                    {selectedZoneCount > 0 ? 'Croiser les zones' : 'Prédire les causes'}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Colonne droite : résultats ── */}
          <div className="ai-col-right">

            {/* Statut */}
            <div className={`ai-status-card${statusState !== 'idle' ? ` ${statusState}` : ''}`}>
              <div className="ai-status-row">
                <div className={`ai-status-dot${statusState !== 'idle' ? ` ${statusState}` : ''}`} />
                <div className="ai-status-main">
                  <div className="ai-status-label">{statusLabel}</div>
                  <div className="ai-status-sub">{statusSub}</div>
                </div>
                
              </div>

              {warning && (
                <div className="ai-warning-box">{warning}</div>
              )}
            </div>

            {/* Rapport */}
            <div className="ai-report-card">
              {report ? (
                <>
                  <div className="ai-report-header">
                    <div>
                      <div className="ai-report-title">Rapport IA</div>
                      <div className="ai-report-focus">
                        {selectedZoneCount > 0
                          ? `${selectedZoneCount} zone(s) sélectionnée(s)`
                          : commune || '—'}
                      </div>
                    </div>
                    <div className="ai-report-actions">
                      <button type="button" className="ai-action-btn" onClick={copyToClipboard}>
                        <Copy size={13} /> Copier
                      </button>
                      <button type="button" className="ai-action-btn primary" onClick={exportToPDF}>
                        <FileText size={13} /> PDF
                      </button>
                    </div>
                  </div>
                  <div className="ai-report-body">
                    {renderReport(report)}
                  </div>
                </>
              ) : (
                <div className="ai-empty">
                  <div className="ai-empty-icon">
                    <Brain size={24} />
                  </div>
                  <div className="ai-empty-title">Le rapport apparaîtra ici</div>
                  <div className="ai-empty-sub">
                    Saisissez une commune ou sélectionnez des zones pour obtenir une analyse causale structurée.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   SOUS-COMPOSANTS (réexportés si besoin)
───────────────────────────────────────── */
export { GLOBAL_STATS };
