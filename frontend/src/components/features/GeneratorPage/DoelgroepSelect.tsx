import React from 'react';
import { useQueryStore } from '../../../state/query.store';
import type { Doelgroep } from '../../../state/query.store';

const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label {...props} className="block text-sm font-medium text-gray-700" />
);

const DOELGROEPEN: Doelgroep[] = ["leerling", "docent", "algemeen"];

export const DoelgroepSelect: React.FC = () => {
  const { doelgroep, setQuery } = useQueryStore((state) => ({
    doelgroep: state.query.doelgroep,
    setQuery: state.setQuery,
  }));

  const handleDoelgroepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as Doelgroep;
    if (DOELGROEPEN.includes(newValue)) {
      setQuery({
        doelgroep: newValue,
      });
    }
  };

  return (
    <div className="space-y-1">
      <Label htmlFor="doelgroep-select">Doelgroep</Label>
      <select
        id="doelgroep-select"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={doelgroep}
        onChange={handleDoelgroepChange}
      >
        {DOELGROEPEN.map((group) => (
          <option key={group} value={group}>
            {group.charAt(0).toUpperCase() + group.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
};
