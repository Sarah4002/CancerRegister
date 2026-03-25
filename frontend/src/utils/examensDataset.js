export const CATEGORIES_EXAMENS = [
  { value: 'biologie', label: 'Bilan biologique' },
  { value: 'imagerie', label: 'Imagerie' },
  { value: 'anapath', label: 'Anatomopathologie' },
  { value: 'endoscopie', label: 'Endoscopie' },
  { value: 'cardiologie', label: 'Cardiologie' },
];

export const EXAMENS_PREDEFINIS = {
  biologie: [
    'NFS',
    'CRP',
    'VS',
    'Bilan hépatique',
    'Bilan rénal',
    'Marqueurs tumoraux (CEA)',
    'Marqueurs tumoraux (CA125)',
    'Marqueurs tumoraux (CA19-9)',
    'Marqueurs tumoraux (PSA)',
    'Marqueurs tumoraux (AFP)',
    'Marqueurs tumoraux (CA15-3)',
  ],
  imagerie: [
    'Radio thorax',
    'Echo abdominale',
    'Scanner thoraco-abdomino-pelvien',
    'IRM',
    'TEP-scan',
    'Mammographie',
    'Echographie',
  ],
  anapath: [
    'Biopsie',
    'Exérèse chirurgicale',
    'Cytoponction',
  ],
  endoscopie: [
    'Coloscopie',
    'Gastroscopie',
    'Bronchoscopie',
  ],
  cardiologie: [
    'ECG',
    'Echographie cardiaque',
    'Fraction d\'éjection',
  ],
};
