import { useEffect, useMemo, useRef, useState } from 'react';

const HEATMAP_WILAYA_KEYS = [
  'Algiers', 'Bashar', 'Naâma', 'El Bayadh', 'Adrar', 'Tinduf', 'Oran',
  'Aïn Témouchent', 'Sidi Bel Abbès', 'Mascara', 'Mostaganem', 'Constantine',
  'Guelma', 'Mila', 'Skikda', 'Jijel', 'Setif', 'Batna', 'Oum El Bouaghi',
  'Bejaia', 'Bordj Bou Arreridj', "M'sila", 'Ghardaia', 'Tamanrasset',
  'Ouargla', 'Illizi', 'El Oued', 'Biskra', 'Djelfa', 'Laghouat', 'Tébessa',
  'Khenchela', 'Tlemcen', 'Saïda', 'Tiaret', 'Tissemsilt', 'Relizane', 'Médéa',
  'Bouira', 'Souk Ahras', 'Tizi Ouzou', 'Boumerd├¿s', 'A├»n Defla', 'Blida',
  'Chlef', 'Tipaza', 'Annaba', 'El Tarf', 'Bordj Badji Mokhtar', 'Timimoune',
  'Touggourt', 'Beni Abbes', 'In Salah', "El M'ghair", 'Djanet', 'In Guezzam',
  'El Menia', 'Ouled Djellal',
];

const COLOR_STOPS = ['#fef3c7', '#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];
const NAME_ALIASES = {
  alger: 'algiers', bechar: 'bashar', ain_temouchent: 'ain temouchent',
  setif: 'setif', medea: 'medea', msila: 'm sila', m_sila: 'm sila',
  boumerdes: 'Boumerd├¿s', ain_defla: 'A├»n Defla', tebessa: 'tebessa',
  saida: 'saida', naama: 'Naâma', ghardaia: 'ghardaia', bejaia: 'bejaia',
};

function normalizeWilayaName(value) {
  return String(value || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/['.-]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const SVG_KEY_BY_NORMALIZED = HEATMAP_WILAYA_KEYS.reduce((keys, key) => {
  keys[normalizeWilayaName(key)] = key;
  return keys;
}, {});

function resolveSvgKey(name) {
  const normalized = normalizeWilayaName(name);
  const alias = NAME_ALIASES[normalized.replace(/\s+/g, '_')] || NAME_ALIASES[normalized];
  return SVG_KEY_BY_NORMALIZED[normalized]
    || SVG_KEY_BY_NORMALIZED[normalizeWilayaName(alias)]
    || (HEATMAP_WILAYA_KEYS.includes(alias) ? alias : undefined);
}

function hexToRgb(hex) {
  const color = hex.slice(1);
  return { r: parseInt(color.slice(0, 2), 16), g: parseInt(color.slice(2, 4), 16), b: parseInt(color.slice(4, 6), 16) };
}

function heatmapColor(value, max) {
  if (value === undefined || value === null) return '#e5e7eb';
  const ratio = Math.pow(Math.max(0, Math.min(1, Number(value || 0) / Math.max(max, 1))), 0.7);
  const position = ratio * (COLOR_STOPS.length - 1);
  const index = Math.min(COLOR_STOPS.length - 2, Math.floor(position));
  const from = hexToRgb(COLOR_STOPS[index]);
  const to = hexToRgb(COLOR_STOPS[index + 1]);
  const mix = (start, end) => Math.round(start + (end - start) * (position - index)).toString(16).padStart(2, '0');
  return `#${mix(from.r, to.r)}${mix(from.g, to.g)}${mix(from.b, to.b)}`;
}

export default function AlgeriaHeatmap({ data = [], selectedWilaya, onSelectWilaya }) {
  const containerRef = useRef(null);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [hovered, setHovered] = useState(null);

  const { mapData, labelsBySvgKey, maxCases } = useMemo(() => data.reduce((result, item) => {
    const label = item.wilaya || item.name || item.label;
    const key = resolveSvgKey(label);
    const count = Number(item.count ?? item.value ?? 0);
    if (key) {
      result.mapData[key] = count;
      result.labelsBySvgKey[key] = label;
    }
    result.maxCases = Math.max(result.maxCases, count);
    return result;
  }, { mapData: {}, labelsBySvgKey: {}, maxCases: 0 }), [data]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/algeria-wilayas.svg', { signal: controller.signal })
      .then((response) => response.ok ? response.text() : Promise.reject(new Error('Carte indisponible')))
      .then(setSvgMarkup)
      .catch((error) => { if (error.name !== 'AbortError') setSvgMarkup(''); });
    return () => controller.abort();
  }, []);

  const selectedKey = resolveSvgKey(selectedWilaya);
  const activeKey = hovered || selectedKey;

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;
    const cleanups = [...root.querySelectorAll('path[data-wilaya]')].map((path) => {
      const key = path.dataset.wilaya;
      path.style.fill = heatmapColor(mapData[key], maxCases);
      path.style.cursor = 'pointer';
      path.style.transition = 'fill 180ms ease, stroke 180ms ease';
      path.setAttribute('stroke', activeKey === key ? '#0f172a' : '#ffffff');
      path.setAttribute('stroke-width', activeKey === key ? '1.2' : '0.5');
      const enter = () => setHovered(key);
      const leave = () => setHovered(null);
      const click = () => onSelectWilaya?.(labelsBySvgKey[key] || key);
      path.addEventListener('mouseenter', enter);
      path.addEventListener('mouseleave', leave);
      path.addEventListener('click', click);
      return () => {
        path.removeEventListener('mouseenter', enter);
        path.removeEventListener('mouseleave', leave);
        path.removeEventListener('click', click);
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [svgMarkup, mapData, labelsBySvgKey, maxCases, activeKey, onSelectWilaya]);

  const displayName = activeKey && (labelsBySvgKey[activeKey] || activeKey);
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={containerRef} style={{ width: '100%', lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      {activeKey && <div style={{ position: 'absolute', pointerEvents: 'none', top: '5%', right: '5%', minWidth: 150, borderRadius: 12, background: 'rgba(255,255,255,.94)', border: '1px solid rgba(37,99,235,.14)', boxShadow: '0 16px 34px rgba(15,23,42,.14)', padding: '12px 14px', zIndex: 1, display: 'grid', justifyItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 16 }}>{displayName}</span>
        <span style={{ color: '#2563eb', fontWeight: 700, background: '#eff6ff', border: '1px solid rgba(37,99,235,.14)', padding: '4px 12px', borderRadius: 999, fontSize: 13 }}>{mapData[activeKey] !== undefined ? `${mapData[activeKey]} cas` : 'Pas de données'}</span>
      </div>}
    </div>
  );
}
