import { useEffect, useState } from 'react';

export default function AssignPanel({ feature, assignment, onSave, onClose }) {
  const [responsable, setResponsable] = useState('');
  const [prioritario, setPrioritario] = useState(false);
  const [pendiente, setPendiente] = useState(false);

  useEffect(() => {
    setResponsable(assignment?.responsable ?? '');
    setPrioritario(assignment?.prioritario ?? false);
    setPendiente(assignment?.pendiente ?? false);
  }, [feature, assignment]);

  if (!feature) return null;
  const props = feature.properties;

  return (
    <div className="assign-panel">
      <button className="close-btn" onClick={onClose} aria-label="Cerrar">×</button>
      <h2>{props.label}</h2>
      <div className="props-list">
        {Object.entries(props)
          .filter(([k]) => !['id', 'layer', 'label'].includes(k))
          .map(([k, v]) => (
            <div key={k} className="prop-row">
              <span className="prop-key">{k}</span>
              <span className="prop-val">{v === null || v === '' ? '—' : String(v)}</span>
            </div>
          ))}
      </div>

      <hr />

      <label className="field">
        Responsable / equipo
        <input
          type="text"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          placeholder="Nombre del responsable"
        />
      </label>

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={prioritario}
          onChange={(e) => setPrioritario(e.target.checked)}
        />
        Prioritario
      </label>

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={pendiente}
          onChange={(e) => setPendiente(e.target.checked)}
        />
        Pendiente
      </label>

      <button
        className="save-btn"
        onClick={() => onSave({ responsable, prioritario, pendiente })}
      >
        Guardar asignación
      </button>
    </div>
  );
}
