// Bestand: InputPanel.tsx
import React from 'react';

type Props = {
  idee: string;
  setIdee: (v: string) => void;
  presentisme: boolean;
  setPresentisme: (v: boolean) => void;
  taalniveau: number;
  setTaalniveau: (v: number) => void;
  nuance: number;
  setNuance: (v: number) => void;
  vraagType: string;
  setVraagType: (v: string) => void;
  tijdvakken: string[];
  setTijdvakken: (v: string[]) => void;
  onGenereer: () => void;
};

const InputPanel = ({
  idee, setIdee,
  presentisme, setPresentisme,
  taalniveau, setTaalniveau,
  nuance, setNuance,
  vraagType, setVraagType,
  tijdvakken, setTijdvakken,
  onGenereer
}: Props) => {
  const toggleTijdvak = (id: string) => {
    setTijdvakken(
      tijdvakken.includes(id)
        ? tijdvakken.filter((v) => v !== id)
        : [...tijdvakken, id]
    );
  };

  return (
    <div style={{ width: '20%', padding: '1rem', borderRight: '1px solid #ddd' }}>
      <h3>🎯 Input</h3>

      <label>Idee</label>
      <textarea value={idee} onChange={(e) => setIdee(e.target.value)} />

      <label>
        <input type="checkbox" checked={presentisme} onChange={(e) => setPresentisme(e.target.checked)} />
        Presentisme
      </label>

      <label>Taalniveau: {taalniveau}</label>
      <input type="range" min="1" max="5" value={taalniveau} onChange={(e) => setTaalniveau(Number(e.target.value))} />

      <label>Nuance: {nuance}</label>
      <input type="range" min="1" max="5" value={nuance} onChange={(e) => setNuance(Number(e.target.value))} />

      <label>Vraagtype</label>
      <select value={vraagType} onChange={(e) => setVraagType(e.target.value)}>
        <option value="open">Open</option>
        <option value="verklaring">Verklaring</option>
        <option value="vergelijking">Vergelijking</option>
      </select>

      <label>Tijdvakken</label>
      <div>
        {[...Array(10)].map((_, i) => {
          const id = (i + 1).toString();
          return (
            <button
              key={id}
              style={{
                padding: '0.25rem',
                margin: '2px',
                background: tijdvakken.includes(id) ? '#ffd700' : '#eee'
              }}
              onClick={() => toggleTijdvak(id)}
            >
              {id}
            </button>
          );
        })}
      </div>

      <button onClick={onGenereer}>🧠 Genereer hoofdvragen</button>
    </div>
  );
};

export default InputPanel;

