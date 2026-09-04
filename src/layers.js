export const LAYERS = [
  { key: 'secciones', name: 'Secciones', color: '#2563eb', type: 'polygon' },
  { key: 'zonas_azules', name: 'Zonas azules', color: '#0891b2', type: 'polygon' },
  { key: 'cuu_prioritario', name: 'CUU Prioritario', color: '#dc2626', type: 'polygon' },
  { key: 'colonias', name: 'Colonias', color: '#7c3aed', type: 'polygon' },
  { key: 'cp', name: 'Códigos Postales', color: '#ea580c', type: 'polygon' },
  { key: 'distrito_local', name: 'Distrito Local', color: '#16a34a', type: 'polygon' },
  { key: 'distrito_federal', name: 'Distrito Federal', color: '#a16207', type: 'polygon' },
  { key: 'casillas', name: 'Casillas', color: '#db2777', type: 'point' },
];

export function layerDataUrl(key) {
  return `${import.meta.env.BASE_URL}data/${key}.geojson.json`;
}
