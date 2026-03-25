import { useState, useMemo } from 'react';
import { WILAYAS } from './wilayasData';

// Projection simple : lng/lat → x/y SVG
// Algérie : lng de -8.7 à 12.0 ; lat de 18.9 à 37.4
const MAP_W = 700;
const MAP_H = 520;
const LNG_MIN = -9.0, LNG_MAX = 12.5;
const LAT_MIN = 18.5, LAT_MAX = 37.8;

const project = (lng, lat) => {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W;
  const y = MAP_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * MAP_H;
  return { x, y };
};

// Frontières schématiques de l'Algérie (points en lng/lat)
const ALGERIA_BORDER = [
  // Nord - côte méditerranéenne
  [-1.8,35.1],[0.0,35.7],[1.0,35.9],[2.2,36.3],[2.9,36.8],
  [3.2,36.9],[4.0,36.9],[5.0,36.9],[6.0,37.0],[7.0,37.1],
  [7.5,37.1],[8.0,36.9],[8.6,36.9],
  // Est - frontière Tunisie/Libye
  [9.0,37.1],[9.5,37.3],[9.6,36.8],[10.0,35.0],[10.2,33.0],
  [9.8,31.0],[9.5,30.0],[9.5,28.0],[9.0,26.0],[9.4,24.0],
  [10.0,22.0],[11.5,20.0],[11.9,19.5],[12.0,19.0],
  // Sud - frontière Niger/Mali
  [11.5,18.9],[8.5,19.0],[5.5,19.0],[3.0,19.5],[1.5,19.8],
  [-0.5,19.8],[-2.0,20.0],[-4.8,20.5],[-5.5,20.0],
  // Ouest - frontière Maroc/Mauritanie
  [-5.5,21.3],[-6.0,23.0],[-7.0,24.5],[-8.7,27.5],[-8.7,28.0],
  [-8.0,28.8],[-6.5,29.5],[-5.5,30.5],[-4.5,31.0],[-3.5,31.5],
  [-2.5,32.0],[-2.5,33.0],[-2.0,33.8],[-1.8,34.2],[-1.8,35.1],
];

const borderPath = ALGERIA_BORDER.map((pt, i) => {
  const { x, y } = project(pt[0], pt[1]);
  return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
}).join(' ') + ' Z';

export default function AlgeriaMap({ data = [], selectedWilaya, onWilayaClick }) {
  const [hovered, setHovered] = useState(null);

  const maxCount = useMemo(() => Math.max(...data.map(d => d.count), 1), [data]);

  // Enrichir les wilayas avec les données
  const wilayasWithData = useMemo(() => {
    return WILAYAS.map(w => {
      const found = data.find(d => {
        const dn = (d.wilaya || '').toLowerCase();
        const wn = w.nom.toLowerCase();
        return dn === wn || dn.includes(wn) || wn.includes(dn);
      });
      return { ...w, count: found?.count || 0 };
    });
  }, [data]);

  const getColor = (count) => {
    if (!count) return null;
    const ratio = count / maxCount;
    if (ratio < 0.15) return '#1a4a7c';
    if (ratio < 0.3)  return '#0077cc';
    if (ratio < 0.5)  return '#00a8ff';
    if (ratio < 0.7)  return '#00c4ff';
    if (ratio < 0.85) return '#29d6ff';
    return '#00e5ff';
  };

  const getRadius = (count) => {
    if (!count) return 3;
    const ratio = count / maxCount;
    return 4 + ratio * 18;
  };

  const hoveredWilaya = hovered ? wilayasWithData.find(w => w.code === hovered) : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Fond */}
        <rect width={MAP_W} height={MAP_H} fill="#0a0f1a" rx="8" />

        {/* Grille lat/lng */}
        {[20, 25, 30, 35].map(lat => {
          const { y } = project(0, lat);
          return (
            <g key={lat}>
              <line x1={0} y1={y} x2={MAP_W} y2={y} stroke="#1e2a3a" strokeWidth={0.5} />
              <text x={6} y={y - 3} fill="#2a3a4a" fontSize={8}>{lat}°N</text>
            </g>
          );
        })}
        {[-8, -4, 0, 4, 8, 12].map(lng => {
          const { x } = project(lng, 0);
          return (
            <g key={lng}>
              <line x1={x} y1={0} x2={x} y2={MAP_H} stroke="#1e2a3a" strokeWidth={0.5} />
              <text x={x + 2} y={MAP_H - 4} fill="#2a3a4a" fontSize={8}>{lng}°E</text>
            </g>
          );
        })}

        {/* Contour Algérie */}
        <path d={borderPath} fill="#0d1824" stroke="#1e4a7c" strokeWidth={1.5} />

        {/* Cercles des wilayas */}
        {wilayasWithData.map(w => {
          const { x, y } = project(w.lng, w.lat);
          const r        = getRadius(w.count);
          const color    = getColor(w.count) || '#1e3a5c';
          const isHov    = hovered === w.code;
          const isSel    = selectedWilaya === w.nom;

          return (
            <g key={w.code}
              style={{ cursor: w.count > 0 ? 'pointer' : 'default' }}
              onMouseEnter={() => setHovered(w.code)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => w.count > 0 && onWilayaClick && onWilayaClick(w.nom)}
            >
              {/* Halo sur hover */}
              {(isHov || isSel) && w.count > 0 && (
                <circle cx={x} cy={y} r={r + 5} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
              )}
              <circle
                cx={x} cy={y} r={r}
                fill={w.count > 0 ? color : '#1e2a3a'}
                fillOpacity={w.count > 0 ? (isHov ? 1 : 0.75) : 0.4}
                stroke={isSel ? '#fff' : (isHov ? color : '#1e3a5c')}
                strokeWidth={isSel ? 2 : (w.count > 0 ? 0.8 : 0.5)}
              />
              {/* Label wilaya (seulement si count > 0 ou hover) */}
              {(w.count > 0 || isHov) && (
                <text
                  x={x} y={y - r - 3}
                  textAnchor="middle"
                  fill={isHov || isSel ? '#fff' : '#8fa8c8'}
                  fontSize={isHov ? 9 : 7}
                  fontWeight={isHov ? 700 : 400}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {w.nom}
                </text>
              )}
              {/* Compteur si count > 0 */}
              {w.count > 0 && r > 8 && (
                <text
                  x={x} y={y + 3}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={r > 12 ? 8 : 7}
                  fontWeight={700}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {w.count}
                </text>
              )}
            </g>
          );
        })}

        {/* Titre carte */}
        <text x={MAP_W / 2} y={18} textAnchor="middle" fill="#4a6a8a" fontSize={11} fontWeight={600}>
          Carte de l'Algérie – Incidence par wilaya
        </text>
      </svg>

      {/* Tooltip hover */}
      {hoveredWilaya && (
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: '#0f1420', border: '1px solid #1e4a7c',
          borderRadius: 8, padding: '10px 14px', minWidth: 140, pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
            {hoveredWilaya.nom}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Wilaya {hoveredWilaya.code}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: hoveredWilaya.count > 0 ? '#00a8ff' : '#4a6a8a', marginTop: 4, fontFamily: 'monospace' }}>
            {hoveredWilaya.count}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>patients enregistrés</div>
        </div>
      )}

      {/* Légende */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Faible</span>
        {['#1a4a7c', '#0077cc', '#00a8ff', '#00c4ff', '#00e5ff'].map(c => (
          <div key={c} style={{ width: 20, height: 12, background: c, borderRadius: 2 }} />
        ))}
        <span style={{ fontSize: 11, color: '#6b7280' }}>Élevé</span>
        <span style={{ fontSize: 10, color: '#4a6a8a', marginLeft: 8 }}>• Aucun cas</span>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1e2a3a', border: '1px solid #1e3a5c' }} />
      </div>
    </div>
  );
}
