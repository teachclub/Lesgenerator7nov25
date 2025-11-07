// src/components/TijdvakKADropdown.tsx
import React from 'react';

// Definieer de props die de component verwacht
interface DropdownItem {
  id: string;
  naam: string;
}

interface TijdvakKADropdownProps {
  label: string;
  items: DropdownItem[]; // Accepteert Tijdvakken of KA's
  value: string; // De huidige geselecteerde waarde (uit App.tsx)
  onSelect: (value: string) => void; // De callback-functie
  disabled?: boolean; // Optionele prop
}

export const TijdvakKADropdown: React.FC<TijdvakKADropdownProps> = ({
  label,
  items,
  value,
  onSelect,
  disabled = false,
}) => {

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSelect(e.target.value);
  };

  return (
    <div className="dropdown-wrapper" style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', marginBottom: '5px' }}>
        {label}:
      </label>
      <select 
        value={value} 
        onChange={handleChange} 
        disabled={disabled || items.length === 0}
        style={{ width: '400px', padding: '5px' }}
      >
        <option value="">-- Maak een keuze --</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.naam}
          </option>
        ))}
      </select>
    </div>
  );
};
