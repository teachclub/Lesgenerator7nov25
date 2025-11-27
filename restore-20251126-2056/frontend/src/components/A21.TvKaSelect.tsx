import React, { useEffect, useState } from 'react';

interface Tijdvak {
  id: number;
  nummer: number;
  titel: string;
  periode: string;
}

interface KenmerkendAspect {
  id: number;
  nummer: number;
  titel: string;
}

interface Props {
  onSelect: (selection: { tv?: string; ka?: string; kaTitel?: string }) => void;
}

export function A21TvKaSelect({ onSelect }: Props) {
  const [tijdvakken, setTijdvakken] = useState<Tijdvak[]>([]);
  const [selectedTv, setSelectedTv] = useState<string>('');
  
  const [kas, setKas] = useState<KenmerkendAspect[]>([]);
  const [selectedKa, setSelectedKa] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:8081/api/tijdvakken')
      .then(res => res.json())
      .then(data => setTijdvakken(Array.isArray(data) ? data : []))
      .catch(err => console.error("Fout bij laden tijdvakken:", err));
  }, []);

  useEffect(() => {
    if (!selectedTv) { setKas([]); return; }
    fetch(`http://localhost:8081/api/ka?tv=${selectedTv}`)
      .then(res => res.json())
      .then(data => setKas(Array.isArray(data) ? data : []))
      .catch(err => console.error("Fout bij laden KA's:", err));
  }, [selectedTv]);

  const handleTvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTv(val);
    setSelectedKa(''); 
    onSelect({ tv: val, ka: undefined });
  };

  const handleKaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedKa(val);
    const kaObj = kas.find(k => String(k.id) === val || String(k.nummer) === val);
    onSelect({ tv: selectedTv, ka: val, kaTitel: kaObj?.titel });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded border border-gray-200 shadow-sm">
      
      {/* STAP 1 */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Stap 1: Kies Tijdvak
        </label>
        <select 
          className="w-full p-2 border border-gray-300 rounded text-sm"
          value={selectedTv}
          onChange={handleTvChange}
        >
          <option value="">-- Selecteer --</option>
          {tijdvakken.map((tv) => (
            <option key={tv.id} value={tv.id}>
              Tijdvak {tv.id}: {tv.titel}
            </option>
          ))}
        </select>
      </div>

      {/* STAP 2 */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Stap 2: Kies Kenmerkend Aspect
        </label>
        <select 
          className="w-full p-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
          value={selectedKa}
          onChange={handleKaChange}
          disabled={!selectedTv}
        >
          <option value="">{selectedTv ? '-- Kies KA --' : 'Kies eerst tijdvak'}</option>
          {kas.map((ka) => (
            // HIER IS DE FIX: GEEN SPATIE MEER TUSSEN KA EN NUMMER
            <option key={ka.id} value={ka.nummer}>
              KA{ka.nummer}: {ka.titel}
            </option>
          ))}
        </select>
      </div>

      {selectedKa && (
          <div className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded">
              ✓ KA{selectedKa} Geselecteerd
          </div>
      )}
    </div>
  );
}
