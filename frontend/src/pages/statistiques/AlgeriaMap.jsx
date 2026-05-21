import { useState, useMemo } from 'react';
import { WILAYAS } from './wilayasData';
import {
  MAP_W,
  MAP_H,
  buildWilayaCells,
  borderPath,
  getPolygonPath,
  project,
} from './algeriaMapGeometry';

export default function AlgeriaMap({ data = [], selectedWilaya, onWilayaClick }) {
  const [hovered, setHovered] = useState(null);

  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count || 0), 1), [data]);

  const wilayasWithData = useMemo(() => {
    return WILAYAS.map((w) => {
      const found = data.find((d) => {
        const dn = (d.wilaya || '').toLowerCase().trim();
        const wn = w.nom.toLowerCase().trim();
        return dn === wn || dn.includes(wn) || wn.includes(dn);
      });
      return { ...w, count: found?.count || 0 };
    });
  }, [data]);

  const wilayaCells = useMemo(() => buildWilayaCells(wilayasWithData), [wilayasWithData]);

  const getColor = (count) => {
    if (!count) return null;
    const ratio = count / maxCount;
    if (ratio < 0.15) return '#1a4a7c';
    if (ratio < 0.3) return '#2563eb';
    if (ratio < 0.5) return '#2563eb';
    if (ratio < 0.7) return '#00c4ff';
    if (ratio < 0.85) return '#29d6ff';
    return '#00e5ff';
  };

  const hoveredWilaya = hovered ? wilayaCells.find((w) => w.code === hovered) : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <rect width={MAP_W} height={MAP_H} fill="#0a0f1a" rx="8" />

        {[20, 25, 30, 35].map((lat) => {
          const { y } = project(0, lat);
          return (
            <g key={lat}>
              <line x1={0} y1={y} x2={MAP_W} y2={y} stroke="#f1f5f9" strokeWidth={0.5} />
              <text x={6} y={y - 3} fill="#2a3a4a" fontSize={8}>{lat}°N</text>
            </g>
          );
        })}

        {[-8, -4, 0, 4, 8, 12].map((lng) => {
          const { x } = project(lng, 0);
          return (
            <g key={lng}>
              <line x1={x} y1={0} x2={x} y2={MAP_H} stroke="#f1f5f9" strokeWidth={0.5} />
              <text x={x + 2} y={MAP_H - 4} fill="#2a3a4a" fontSize={8}>{lng}°E</text>
            </g>
          );
        })}

        <path d={borderPath} fill="#0d1824" stroke="#1e4a7c" strokeWidth={1.5} />

        {wilayaCells.map((w) => {
          const color = getColor(w.count) || '#d6e7ff';
          const isHovered = hovered === w.code;
          const isSelected = selectedWilaya === w.nom;

          return (
            <g
              key={w.code}
              style={{ cursor: w.count > 0 ? 'pointer' : 'default' }}
              onMouseEnter={() => setHovered(w.code)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => w.count > 0 && onWilayaClick && onWilayaClick(w.nom)}
            >
              <path
                d={getPolygonPath(w.polygon)}
                fill={w.count > 0 ? color : '#eef5ff'}
                fillOpacity={w.count > 0 ? (isHovered || isSelected ? 0.96 : 0.78) : 0.92}
                stroke={isSelected ? '#ffffff' : (isHovered ? '#7dd3fc' : '#dbeafe')}
                strokeWidth={isSelected ? 2.1 : (isHovered ? 1.4 : 0.9)}
              />

              {(isHovered || isSelected) && (
                <text
                  x={w.centroid.x}
                  y={w.centroid.y}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={9}
                  fontWeight={700}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {w.nom}
                </text>
              )}
            </g>
          );
        })}

        <text x={MAP_W / 2} y={18} textAnchor="middle" fill="#4a6a8a" fontSize={11} fontWeight={600}>
          Carte de l'Algérie - Incidence par wilaya
        </text>
      </svg>

      {hoveredWilaya && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#ffffff',
            border: '1px solid #1e4a7c',
            borderRadius: 8,
            padding: '10px 14px',
            minWidth: 140,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            {hoveredWilaya.nom}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Wilaya {hoveredWilaya.code}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: hoveredWilaya.count > 0 ? '#2563eb' : '#4a6a8a', marginTop: 4, fontFamily: 'monospace' }}>
            {hoveredWilaya.count}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>patients enregistres</div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Faible</span>
        {['#1a4a7c', '#2563eb', '#2563eb', '#00c4ff', '#00e5ff'].map((c) => (
          <div key={c} style={{ width: 20, height: 12, background: c, borderRadius: 2 }} />
        ))}
        <span style={{ fontSize: 11, color: '#6b7280' }}>Eleve</span>
        <span style={{ fontSize: 10, color: '#4a6a8a', marginLeft: 8 }}>Aucun cas</span>
        <div style={{ width: 14, height: 10, borderRadius: 2, background: '#eef5ff', border: '1px solid #cbd5e1' }} />
      </div>
    </div>
  );
}
