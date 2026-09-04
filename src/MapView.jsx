import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import { LAYERS, layerDataUrl } from './layers';
import { useAssignments } from './useAssignments';
import AssignPanel from './AssignPanel';
import { useAuth } from './AuthContext';

const CHIHUAHUA_CENTER = [28.9, -106.5];

function statusStyle(baseColor, assignment) {
  if (assignment?.prioritario) {
    return { color: '#dc2626', weight: 2, fillColor: '#dc2626', fillOpacity: 0.35 };
  }
  if (assignment?.pendiente) {
    return { color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.25 };
  }
  if (assignment?.responsable) {
    return { color: baseColor, weight: 2, fillColor: '#16a34a', fillOpacity: 0.2 };
  }
  return { color: baseColor, weight: 1, fillColor: baseColor, fillOpacity: 0.08 };
}

function LayerData({ layerConfig, assignments, onSelect }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(layerDataUrl(layerConfig.key))
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      });
    return () => {
      cancelled = true;
    };
  }, [layerConfig.key]);

  if (!data) return null;

  if (layerConfig.type === 'point') {
    return data.features.map((f) => {
      const docId = `${f.properties.layer}_${f.properties.id}`;
      const assignment = assignments[docId];
      const style = statusStyle(layerConfig.color, assignment);
      const [lng, lat] = f.geometry.coordinates;
      return (
        <CircleMarker
          key={docId}
          center={[lat, lng]}
          radius={5}
          pathOptions={style}
          eventHandlers={{ click: () => onSelect(f, docId) }}
        >
          <Popup>{f.properties.label}</Popup>
        </CircleMarker>
      );
    });
  }

  return (
    <GeoJSON
      key={layerConfig.key}
      data={data}
      style={(f) => {
        const docId = `${f.properties.layer}_${f.properties.id}`;
        return statusStyle(layerConfig.color, assignments[docId]);
      }}
      onEachFeature={(f, l) => {
        const docId = `${f.properties.layer}_${f.properties.id}`;
        l.on('click', () => onSelect(f, docId));
        l.bindTooltip(f.properties.label, { sticky: true });
      }}
    />
  );
}

export default function MapView() {
  const { user, logout } = useAuth();
  const { assignments, updateAssignment } = useAssignments();
  const [activeLayers, setActiveLayers] = useState(() => new Set(['secciones']));
  const [selected, setSelected] = useState(null); // { feature, docId }

  function toggleLayer(key) {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSave(values) {
    if (!selected) return;
    const props = selected.feature.properties;
    updateAssignment(selected.docId, props.layer, props.id, props.label, values, user?.email ?? null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Territorios</h1>
          <div className="user-row">
            <span>{user?.email}</span>
            <button onClick={logout}>Salir</button>
          </div>
        </div>
        <div className="layer-list">
          <h3>Capas</h3>
          {LAYERS.map((l) => (
            <label key={l.key} className="layer-toggle">
              <input
                type="checkbox"
                checked={activeLayers.has(l.key)}
                onChange={() => toggleLayer(l.key)}
              />
              <span className="swatch" style={{ background: l.color }} />
              {l.name}
            </label>
          ))}
        </div>
        <div className="legend">
          <h3>Estatus</h3>
          <div className="legend-row"><span className="swatch" style={{ background: '#dc2626' }} /> Prioritario</div>
          <div className="legend-row"><span className="swatch" style={{ background: '#f59e0b' }} /> Pendiente</div>
          <div className="legend-row"><span className="swatch" style={{ background: '#16a34a' }} /> Con responsable</div>
        </div>
      </aside>

      <main className="map-area">
        <MapContainer center={CHIHUAHUA_CENTER} zoom={7} className="leaflet-container">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {LAYERS.filter((l) => activeLayers.has(l.key)).map((l) => (
            <LayerData
              key={l.key}
              layerConfig={l}
              assignments={assignments}
              onSelect={(feature, docId) => setSelected({ feature, docId })}
            />
          ))}
        </MapContainer>
      </main>

      {selected && (
        <AssignPanel
          feature={selected.feature}
          assignment={assignments[selected.docId]}
          onSave={handleSave}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
