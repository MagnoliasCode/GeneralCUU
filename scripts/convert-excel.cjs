const XLSX = require('xlsx');
const wellknown = require('wellknown');
const simplify = require('@turf/simplify').default;
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..', 'Catalogo ordenado.xlsx');
const OUT_DATA = path.resolve(__dirname, '..', 'public', 'data');
const OUT_SEED = path.resolve(__dirname, '..', 'supabase-seed.json');

fs.mkdirSync(OUT_DATA, { recursive: true });

const wb = XLSX.readFile(SRC, { cellDates: false });

// layer key, sheet name, id column, wkt column, label expression, extra prop columns to keep
const LAYERS = [
  {
    key: 'secciones',
    name: '1 Secciones',
    sheet: '1 Secciones',
    idCol: 'ID',
    wktCol: 'WKT_GEOM',
    label: (r) => `Sección ${r.SECCION}`,
    props: ['ENTIDAD', 'MUNICIPIO', 'ID_MUN', 'DISTRITO_FEDERAL', 'DISTRITO_LOCAL', 'SECCION', 'ZONA_AZUL', 'ZONA_BLANCA', 'COORDINADOR', 'REGIONES', 'ENLACE_SECCION', 'ETIQUETA'],
    simplifyTolerance: 0.0003,
  },
  {
    key: 'zonas_azules',
    name: '2 Zonas azules',
    sheet: '2 Zonas azules',
    idCol: 'ID',
    wktCol: 'WKT_ZONA',
    label: (r) => `Zona ${r.ZONA} (Secc. ${r.SECCIONES})`,
    props: ['ENTIDAD', 'MUNICIPIO', 'ID_MUN', 'DISTRITO_FEDERAL', 'DISTRITO_LOCAL', 'SECCIONES', 'ZONA', 'COORDINADOR', 'ENLACE_SECCION_ZONA', 'ETIQUETA'],
    simplifyTolerance: 0.0002,
  },
  {
    key: 'cuu_prioritario',
    name: '3 CUU Prioritario',
    sheet: '3 CUU Prioritario',
    idCol: 'ID',
    wktCol: 'WKT_GEOM',
    label: (r) => `CUU Prioritario ${r.ZONA ?? r.ID}`,
    props: ['ZONA', 'ENTIDAD', 'MUNICIPIO', 'DISTRITO_FEDERAL', 'DISTRITO_LOCAL', 'SECCIONES', 'COORDINADOR', 'ENLACE_ZONA', 'PRIVADA', 'VIV_TOT', 'TURNOS'],
    simplifyTolerance: 0.0004,
  },
  {
    key: 'colonias',
    name: '4 Colonias',
    sheet: '4 Colonias',
    idCol: 'ID',
    wktCol: 'WKT_GEOM',
    label: (r) => r.NOMBRE,
    props: ['ENTIDAD', 'MUNICIPIO', 'NOMBRE', 'CLASIFICAC', 'CP'],
    simplifyTolerance: 0.0002,
  },
  {
    key: 'cp',
    name: '5 CP',
    sheet: '5 CP',
    idCol: 'ID',
    wktCol: 'WKT_GEOM',
    label: (r) => `CP ${r.CP}`,
    props: ['CP', 'MUNICIPIO', 'TIPO'],
    simplifyTolerance: 0.0003,
  },
  {
    key: 'distrito_local',
    name: '6 Distrito Local',
    sheet: '6 Distrito Local',
    idCol: 'ID',
    wktCol: 'WKT_GEOM',
    label: (r) => `Distrito Local ${r.DISTRITO_L}`,
    props: ['ENTIDAD', 'DISTRITO_L'],
    simplifyTolerance: 0.0005,
  },
  {
    key: 'distrito_federal',
    name: '7 Distrito Federal',
    sheet: '7 Distrito Federal',
    idCol: 'ID',
    wktCol: 'WKT_GEOM',
    label: (r) => `Distrito Federal ${r.ID}`,
    props: ['ENTIDAD'],
    simplifyTolerance: 0.0006,
  },
];

const summary = [];
const seedDocs = [];

function toFeature(geometry, id, layerKey, properties) {
  return {
    type: 'Feature',
    id: `${layerKey}_${id}`,
    properties: { id, layer: layerKey, ...properties },
    geometry,
  };
}

for (const layer of LAYERS) {
  const ws = wb.Sheets[layer.sheet];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  const features = [];
  let errors = 0;

  for (const r of rows) {
    const id = r[layer.idCol];
    const wkt = r[layer.wktCol];
    if (id === null || id === undefined || !wkt) continue;
    let geom;
    try {
      geom = wellknown.parse(wkt);
      if (!geom) throw new Error('null geometry');
    } catch (e) {
      errors++;
      continue;
    }
    let feature = toFeature(geom, id, layer.key, {
      label: layer.label(r),
      ...Object.fromEntries(layer.props.map((p) => [p, r[p] ?? null])),
    });
    try {
      feature = simplify(feature, { tolerance: layer.simplifyTolerance, highQuality: false, mutate: true });
    } catch (e) {
      // keep original geometry if simplify fails (e.g. unsupported geometry type)
    }
    features.push(feature);
    seedDocs.push({
      doc_id: `${layer.key}_${id}`,
      layer: layer.key,
      territory_id: String(id),
      label: layer.label(r),
      responsable: '',
      prioritario: false,
      pendiente: false,
      updated_at: null,
      updated_by: null,
    });
  }

  const fc = { type: 'FeatureCollection', features };
  const outFile = path.join(OUT_DATA, `${layer.key}.geojson.json`);
  fs.writeFileSync(outFile, JSON.stringify(fc));
  const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(1);
  summary.push({ layer: layer.key, rows: rows.length, features: features.length, errors, sizeKB });
}

// Casillas: point layer, use LONGITUD_G / LATITUD_GO columns (WGS84), not the UTM WKT_GEOM column
{
  const ws = wb.Sheets['8 Casillas'];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  const features = [];
  let idx = 0;
  for (const r of rows) {
    const lon = r.LONGITUD_G;
    const lat = r.LATITUD_GO;
    if (typeof lon !== 'number' || typeof lat !== 'number') continue;
    idx++;
    const id = `${r.SECCION}_${r.CASILLA}_${idx}`;
    const feature = toFeature(
      { type: 'Point', coordinates: [lon, lat] },
      id,
      'casillas',
      {
        label: `Casilla ${r.CASILLA} - Sección ${r.SECCION}`,
        ENTIDAD: r.ENTIDAD,
        MUNICIPIO: r.NMUNICIPIO,
        SECCION: r.SECCION,
        CASILLA: r.CASILLA,
        MANZANA: r.MANZANA,
        DOMICILIO: r.DOMICILIO,
        UBICACION: r.UBICACIÓN,
        COORDINADOR: r.COORDINADOR,
        REGIONES: r.REGIONES,
        ENLACE_SECCION: r.ENLACE_SECCION,
      }
    );
    features.push(feature);
    seedDocs.push({
      doc_id: `casillas_${id}`,
      layer: 'casillas',
      territory_id: String(id),
      label: feature.properties.label,
      responsable: '',
      prioritario: false,
      pendiente: false,
      updated_at: null,
      updated_by: null,
    });
  }
  const fc = { type: 'FeatureCollection', features };
  const outFile = path.join(OUT_DATA, 'casillas.geojson.json');
  fs.writeFileSync(outFile, JSON.stringify(fc));
  const sizeKB = (fs.statSync(outFile).size / 1024).toFixed(1);
  summary.push({ layer: 'casillas', rows: rows.length, features: features.length, errors: rows.length - idx, sizeKB });
}

fs.writeFileSync(OUT_SEED, JSON.stringify(seedDocs, null, 2));

console.log('LAYER SUMMARY');
console.table(summary);
console.log('Total seed docs:', seedDocs.length);
console.log('Seed file size KB:', (fs.statSync(OUT_SEED).size / 1024).toFixed(1));
