import React from 'react';
import { useSelectionStore } from '../../state/selection.store';

export const SourceBasket: React.FC = () => {
  const { selected, remove } = useSelectionStore();

  if (selected.length === 0) {
    return (
      <div style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f9f9f9' }}>
        <h3>Verzamelbakje</h3>
        <p style={{ fontStyle: 'italic' }}>Selecteer bronnen uit de lijst.</p>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#f9f9f9' }}>
      <h3>Verzamelbakje ({selected.length}/12)</h3>
      {selected.map(source => (
        <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #eee' }}>
          <span>{source.title}</span>
          <button onClick={() => remove(source.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>
            [Verwijder]
          </button>
        </div>
      ))}
    </div>
  );
};
