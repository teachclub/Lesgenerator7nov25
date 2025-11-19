import React from 'react';
import { useQueryStore } from '../../../state/query.store';

export const NiveauSelect: React.FC = () => {
  const doelgroep = useQueryStore((s) => s.doelgroep);
  const setDoelgroep = useQueryStore((s) => s.setDoelgroep);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDoelgroep(e.target.value);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Doelgroep / niveau
      </label>
      <select
        value={doelgroep}
        onChange={handleChange}
        className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="Bovenbouw VWO">Bovenbouw VWO</option>
        <option value="Onderbouw VWO/HAVO">Onderbouw VWO / HAVO</option>
        <option value="MAVO/VMBO">MAVO / VMBO</option>
      </select>
    </div>
  );
};
