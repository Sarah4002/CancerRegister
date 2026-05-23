export const MAP_W = 700;
export const MAP_H = 520;
export const LNG_MIN = -9.0;
export const LNG_MAX = 12.5;
export const LAT_MIN = 18.5;
export const LAT_MAX = 37.8;

export const project = (lng, lat) => {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_W;
  const y = MAP_H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * MAP_H;
  return { x, y };
};

export const ALGERIA_BORDER = [
  [-1.8, 35.1], [0.0, 35.7], [1.0, 35.9], [2.2, 36.3], [2.9, 36.8],
  [3.2, 36.9], [4.0, 36.9], [5.0, 36.9], [6.0, 37.0], [7.0, 37.1],
  [7.5, 37.1], [8.0, 36.9], [8.6, 36.9], [9.0, 37.1], [9.5, 37.3],
  [9.6, 36.8], [10.0, 35.0], [10.2, 33.0], [9.8, 31.0], [9.5, 30.0],
  [9.5, 28.0], [9.0, 26.0], [9.4, 24.0], [10.0, 22.0], [11.5, 20.0],
  [11.9, 19.5], [12.0, 19.0], [11.5, 18.9], [8.5, 19.0], [5.5, 19.0],
  [3.0, 19.5], [1.5, 19.8], [-0.5, 19.8], [-2.0, 20.0], [-4.8, 20.5],
  [-5.5, 20.0], [-5.5, 21.3], [-6.0, 23.0], [-7.0, 24.5], [-8.7, 27.5],
  [-8.7, 28.0], [-8.0, 28.8], [-6.5, 29.5], [-5.5, 30.5], [-4.5, 31.0],
  [-3.5, 31.5], [-2.5, 32.0], [-2.5, 33.0], [-2.0, 33.8], [-1.8, 34.2],
  [-1.8, 35.1],
];

const BORDER_POLYGON = ALGERIA_BORDER.map(([lng, lat]) => project(lng, lat));

export const borderPath = BORDER_POLYGON.map((pt, index) =>
  `${index === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
).join(' ') + ' Z';

const dotFromLine = (point, midpoint, normal) =>
  (point.x - midpoint.x) * normal.x + (point.y - midpoint.y) * normal.y;

const interpolateEdge = (start, end, midpoint, normal) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const denominator = dx * normal.x + dy * normal.y;

  if (Math.abs(denominator) < 1e-9) {
    return { x: end.x, y: end.y };
  }

  const numerator = (midpoint.x - start.x) * normal.x + (midpoint.y - start.y) * normal.y;
  const t = numerator / denominator;

  return {
    x: start.x + dx * t,
    y: start.y + dy * t,
  };
};

const clipPolygon = (polygon, midpoint, normal) => {
  if (!polygon.length) return polygon;

  const result = [];

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    const currentInside = dotFromLine(current, midpoint, normal) <= 1e-9;
    const previousInside = dotFromLine(previous, midpoint, normal) <= 1e-9;

    if (currentInside !== previousInside) {
      result.push(interpolateEdge(previous, current, midpoint, normal));
    }

    if (currentInside) {
      result.push(current);
    }
  }

  return result;
};

const getPolygonCentroid = (polygon, fallback) => {
  if (!polygon.length) return fallback;

  let area = 0;
  let x = 0;
  let y = 0;

  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    x += (a.x + b.x) * cross;
    y += (a.y + b.y) * cross;
  }

  if (Math.abs(area) < 1e-9) {
    return fallback;
  }

  return {
    x: x / (3 * area),
    y: y / (3 * area),
  };
};

export const getPolygonPath = (polygon) => {
  if (!polygon?.length) return '';
  return polygon.map((pt, index) =>
    `${index === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
  ).join(' ') + ' Z';
};

export const buildWilayaCells = (wilayas) => {
  const projectedWilayas = wilayas.map((wilaya) => ({
    ...wilaya,
    ...project(wilaya.lng, wilaya.lat),
  }));

  return projectedWilayas.map((wilaya) => {
    let polygon = [...BORDER_POLYGON];

    projectedWilayas.forEach((other) => {
      if (other.code === wilaya.code) return;

      polygon = clipPolygon(
        polygon,
        { x: (wilaya.x + other.x) / 2, y: (wilaya.y + other.y) / 2 },
        { x: other.x - wilaya.x, y: other.y - wilaya.y }
      );
    });

    return {
      ...wilaya,
      polygon,
      centroid: getPolygonCentroid(polygon, { x: wilaya.x, y: wilaya.y }),
    };
  });
};
