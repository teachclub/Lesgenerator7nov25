import React from 'react';
import { useQueryStore } from '../../../state/query.store';

export const ModeSelect: React.FC = () => {
  // VEILIGE SELECTORS
  const mode = useQueryStore((s) => s.mode);
  const setMode = useQueryStore((s) => s.setMode);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value === 'OR' ? 'OR' : 'AND';
    setMode(value);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Combinatie van zoektermen
      </label>
      <select
        value={mode}
        onChange={handleChange}
        className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="AND">Alle termen moeten voorkomen (AND)</option>
        <option value="OR">Een van de termen is genoeg (OR)</option>
      </select>
    </div>
  );
};
