import { useEffect, useState } from 'react';
import { fetchTijdvakken, fetchKenmerkendeAspecten } from '../lib/api';

interface TijdvakData { id: string; label?: string; naam?: string; }
interface KaData { id: string; name?: string; naam?: string; }

interface Props {
  tv: string;
  ka: string[]; // Array!
  onChange: (val: { tv?: string; ka?: string[] }) => void;
}

export function A21TvKaSelect({ tv, ka, onChange }: Props) {
  const [tijdvakken, setTijdvakken] = useState<TijdvakData[]>([]);
  const [kas, setKas] = useState<KaData[]>([]);
  const [loadingTv, setLoadingTv] = useState(false);
  const [loadingKa, setLoadingKa] = useState(false);

  // 1. Laad Tijdvakken
  useEffect(() => {
    async function loadTv() {
      setLoadingTv(true);
      try {
        const data = await fetchTijdvakken();
        setTijdvakken(data);
      } catch (e) { console.error("A21: Fout bij tijdvakken:", e); } 
      finally { setLoadingTv(false); }
    }
    loadTv();
  }, []);

  // 2. Laad KA's
  useEffect(() => {
    if (!tv) {
      setKas([]);
      return;
    }
    async function loadKa() {
      setLoadingKa(true);
      try {
        const data = await fetchKenmerkendeAspecten(tv);
        setKas(data);
      } catch (e) { console.error("A21: Fout bij KA's:", e); } 
      finally { setLoadingKa(false); }
    }
    loadKa();
  }, [tv]);

  // Helper voor Multi-Select logica
  const handleToggleKa = (id: string) => {
      const current = ka || [];
      if (current.includes(id)) {
          // Verwijderen
          onChange({ ka: current.filter(k => k !== id) });
      } else {
          // Toevoegen
          onChange({ ka: [...current, id] });
      }
  };

  return (
    <div className="space-y-4">

      {/* Stap 1: Tijdvak */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
            Stap 1: Kies Tijdvak
        </label>
        <select
          value={tv}
          onChange={(e) => onChange({ tv: e.target.value, ka: [] })} // Reset KA bij wissel
          className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500"
          disabled={loadingTv}
        >
          <option value="">
             {loadingTv ? "Laden..." : "-- Selecteer een Tijdvak --"}
          </option>
          {tijdvakken.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label || t.naam || t.id}
            </option>
          ))}
        </select>
      </div>

      {/* Stap 2: KA Checkboxes */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
            Stap 2: Kies Kenmerkende Aspecten
        </label>

        <div className="border border-gray-300 rounded bg-white max-h-60 overflow-y-auto shadow-inner">
            {!tv && <div className="p-4 text-center text-gray-400 text-sm italic">Kies eerst een tijdvak.</div>}
            {tv && loadingKa && <div className="p-4 text-center text-gray-400 text-sm">KA's ophalen...</div>}

            {tv && !loadingKa && kas.length > 0 && (
                <div className="divide-y divide-gray-100">
                    {kas.map((k) => {
                        const isChecked = ka.includes(k.id);
                        return (
                            <label key={k.id} className={`flex items-start gap-3 p-3 hover:bg-blue-50 cursor-pointer transition-colors ${isChecked ? 'bg-blue-50' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={() => handleToggleKa(k.id)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={`text-sm ${isChecked ? 'text-blue-800 font-medium' : 'text-gray-700'}`}>
                                    {k.name || k.naam || k.id}
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
        <div className="text-right mt-1">
            <span className="text-xs text-gray-400">{ka.length} geselecteerd</span>
        </div>
      </div>
    </div>
  );
}
