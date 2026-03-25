// Données des 58 wilayas d'Algérie
// Coordonnées approximatives (longitude, latitude) pour le centre de chaque wilaya

export const WILAYAS = [
  { code: '01', nom: 'Adrar',          lat: 27.87,  lng: -0.29  },
  { code: '02', nom: 'Chlef',          lat: 36.16,  lng: 1.33   },
  { code: '03', nom: 'Laghouat',       lat: 33.80,  lng: 2.86   },
  { code: '04', nom: 'Oum El Bouaghi', lat: 35.87,  lng: 7.11   },
  { code: '05', nom: 'Batna',          lat: 35.55,  lng: 6.17   },
  { code: '06', nom: 'Béjaïa',         lat: 36.75,  lng: 5.08   },
  { code: '07', nom: 'Biskra',         lat: 34.85,  lng: 5.73   },
  { code: '08', nom: 'Béchar',         lat: 31.62,  lng: -2.22  },
  { code: '09', nom: 'Blida',          lat: 36.47,  lng: 2.83   },
  { code: '10', nom: 'Bouira',         lat: 36.37,  lng: 3.90   },
  { code: '11', nom: 'Tamanrasset',    lat: 22.79,  lng: 5.52   },
  { code: '12', nom: 'Tébessa',        lat: 35.40,  lng: 8.12   },
  { code: '13', nom: 'Tlemcen',        lat: 34.88,  lng: -1.32  },
  { code: '14', nom: 'Tiaret',         lat: 35.37,  lng: 1.32   },
  { code: '15', nom: 'Tizi Ouzou',     lat: 36.71,  lng: 4.05   },
  { code: '16', nom: 'Alger',          lat: 36.74,  lng: 3.06   },
  { code: '17', nom: 'Djelfa',         lat: 34.67,  lng: 3.26   },
  { code: '18', nom: 'Jijel',          lat: 36.82,  lng: 5.77   },
  { code: '19', nom: 'Sétif',          lat: 36.19,  lng: 5.41   },
  { code: '20', nom: 'Saïda',          lat: 34.83,  lng: 0.15   },
  { code: '21', nom: 'Skikda',         lat: 36.88,  lng: 6.90   },
  { code: '22', nom: 'Sidi Bel Abbès', lat: 35.20,  lng: -0.63  },
  { code: '23', nom: 'Annaba',         lat: 36.90,  lng: 7.77   },
  { code: '24', nom: 'Guelma',         lat: 36.46,  lng: 7.43   },
  { code: '25', nom: 'Constantine',    lat: 36.37,  lng: 6.61   },
  { code: '26', nom: 'Médéa',          lat: 36.26,  lng: 2.75   },
  { code: '27', nom: 'Mostaganem',     lat: 35.93,  lng: 0.09   },
  { code: '28', nom: 'M\'Sila',        lat: 35.70,  lng: 4.54   },
  { code: '29', nom: 'Mascara',        lat: 35.40,  lng: 0.14   },
  { code: '30', nom: 'Ouargla',        lat: 31.95,  lng: 5.32   },
  { code: '31', nom: 'Oran',           lat: 35.69,  lng: -0.63  },
  { code: '32', nom: 'El Bayadh',      lat: 33.68,  lng: 1.02   },
  { code: '33', nom: 'Illizi',         lat: 26.51,  lng: 8.48   },
  { code: '34', nom: 'Bordj Bou Arréridj', lat: 36.07, lng: 4.76 },
  { code: '35', nom: 'Boumerdès',      lat: 36.76,  lng: 3.63   },
  { code: '36', nom: 'El Tarf',        lat: 36.76,  lng: 8.31   },
  { code: '37', nom: 'Tindouf',        lat: 27.67,  lng: -8.14  },
  { code: '38', nom: 'Tissemsilt',     lat: 35.61,  lng: 1.81   },
  { code: '39', nom: 'El Oued',        lat: 33.36,  lng: 6.86   },
  { code: '40', nom: 'Khenchela',      lat: 35.43,  lng: 7.14   },
  { code: '41', nom: 'Souk Ahras',     lat: 36.29,  lng: 7.95   },
  { code: '42', nom: 'Tipaza',         lat: 36.59,  lng: 2.45   },
  { code: '43', nom: 'Mila',           lat: 36.45,  lng: 6.26   },
  { code: '44', nom: 'Aïn Defla',      lat: 36.26,  lng: 1.97   },
  { code: '45', nom: 'Naâma',          lat: 33.27,  lng: -0.31  },
  { code: '46', nom: 'Aïn Témouchent', lat: 35.30,  lng: -1.14  },
  { code: '47', nom: 'Ghardaïa',       lat: 32.49,  lng: 3.67   },
  { code: '48', nom: 'Relizane',       lat: 35.74,  lng: 0.56   },
  { code: '49', nom: 'Timimoun',       lat: 29.26,  lng: 0.24   },
  { code: '50', nom: 'Bordj Badji Mokhtar', lat: 21.33, lng: 0.95 },
  { code: '51', nom: 'Ouled Djellal',  lat: 34.42,  lng: 5.07   },
  { code: '52', nom: 'Béni Abbès',     lat: 30.13,  lng: -2.17  },
  { code: '53', nom: 'In Salah',       lat: 27.20,  lng: 2.47   },
  { code: '54', nom: 'In Guezzam',     lat: 19.57,  lng: 5.77   },
  { code: '55', nom: 'Touggourt',      lat: 33.10,  lng: 6.07   },
  { code: '56', nom: 'Djanet',         lat: 24.55,  lng: 9.48   },
  { code: '57', nom: 'El M\'Ghair',    lat: 33.95,  lng: 5.92   },
  { code: '58', nom: 'El Meniaa',      lat: 30.58,  lng: 2.88   },
];

// Mapping nom wilaya → données (insensible à la casse)
export const getWilayaByNom = (nom) => {
  if (!nom) return null;
  const n = nom.toLowerCase().trim();
  return WILAYAS.find(w =>
    w.nom.toLowerCase() === n ||
    w.nom.toLowerCase().includes(n) ||
    n.includes(w.nom.toLowerCase())
  );
};

// Couleur selon valeur (choroplèthe)
export const getChoroplethColor = (value, max) => {
  if (!value || value === 0) return '#1e2a3a';
  const ratio = value / max;
  if (ratio < 0.1)  return '#1a3a5c';
  if (ratio < 0.2)  return '#1a4a7c';
  if (ratio < 0.35) return '#1a5c9c';
  if (ratio < 0.5)  return '#0077cc';
  if (ratio < 0.65) return '#00a8ff';
  if (ratio < 0.8)  return '#00c4ff';
  return '#00e5ff';
};
