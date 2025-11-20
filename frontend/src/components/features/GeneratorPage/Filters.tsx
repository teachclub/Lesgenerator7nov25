import React from 'react';
import { useQueryStore } from '../../../state/query.store';
import { useShallow } from 'zustand/react/shallow';
import { TIJDVAKKEN } from '../../../lib/constants';

const AVAILABLE_PROVIDERS = ['Kleio', 'Cito'];

export const Filters: React.FC = () => {
  const { 
    providers, types, tijdvak, kas, 
    toggleArrayFilter, setFilterValue 
  } = useQueryStore(
    useShallow((s) => ({
      providers: s.filters.providers,
      types: s.filters.types,
      tijdvak: s.filters.tijdvak,
      kas: s.filters.kas,
      toggleArrayFilter: s.toggleArrayFilter,
      setFilterValue: s.setFilterValue,
    }))
  );

  const activeTijdvak = TIJDVAKKEN.find(t => t.id === tijdvak);

  const handleTijdvakChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterValue('tijdvak', e.target.value);
  };

  return (
    <div className="space-y-6 mt-4">
      
      {/* 1. TIJDVAKKEN (NU BOVENAAN) */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Historische Context</h3>
        <select 
          value={tijdvak} 
          onChange={handleTijdvakChange}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
        >
          <option value="">-- Alle tijdvakken --</option>
          {TIJDVAKKEN.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. KENMERKENDE ASPECTEN (Direct onder tijdvak) */}
      {activeTijdvak && (
        <div className="pt-2 border-t border-gray-100 animation-fade-in">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            KA's bij {activeTijdvak.id}
          </h3>
          <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {activeTijdvak.kas.map((ka, i) => (
              <label key={i} className="flex items-start cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5 shrink-0"
                  checked={kas.includes(ka)}
                  onChange={() => toggleArrayFilter('kas', ka)}
                />
                <span className="ml-2 text-xs text-gray-600 leading-snug select-none">
                  {ka}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 3. TYPE BRON */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Type Bron</h3>
        <div className="space-y-1">
          {['TEXT', 'IMAGE'].map(type => (
            <label key={type} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={types.includes(type)}
                onChange={() => toggleArrayFilter('types', type)}
              />
              <span className="ml-2 text-sm text-gray-800 capitalize">
                {type === 'TEXT' ? 'Tekst' : 'Afbeeldingen'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 4. PROVIDERS */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Selecteer Bronnen</h3>
        <div className="space-y-1">
          {AVAILABLE_PROVIDERS.map((provider) => (
            <label key={provider} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={providers.includes(provider)}
                onChange={() => toggleArrayFilter('providers', provider)}
              />
              <span className="ml-2 text-sm text-gray-800">{provider}</span>
            </label>
          ))}
        </div>
      </div>

    </div>
  );
};
