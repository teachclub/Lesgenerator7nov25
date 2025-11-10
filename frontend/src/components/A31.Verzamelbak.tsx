import React from 'react';
import { useSelectionStore } from '../state/selection.store';

export function A31Verzamelbak() {
  const { selected, toggle, max } = useSelectionStore();

  if (selected.length === 0) {
    return (
      <div className="verzamelbak-a31 empty">
        <h4>Geselecteerde Bronnen (0 / {max})</h4>
        <p>(Vink bronnen aan in de resultatenlijst om ze hier te verzamelen)</p>
      </div>
    );
  }

  return (
    <div className="verzamelbak-a31">
      <h4>Geselecteerde Bronnen ({selected.length} / {max})</h4>
      <ul className="verzamelbak-list">
        {selected.map((s) => (
          <li key={s.id} className="verzamelbak-item">
            <span className="item-title">{s.title}</span>
            <button
              type="button"
              className="remove-btn"
              onClick={() => toggle(s)}
            >
              Verwijder
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
