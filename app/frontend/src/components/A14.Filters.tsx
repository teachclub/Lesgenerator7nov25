interface Props {
  filters: {
    images: boolean;
    text: boolean;
    kleio: boolean;
    cito: boolean;
  };
  onToggle: (key: 'images' | 'text' | 'kleio' | 'cito') => void;
  disabled?: boolean;
}

export function A14Filters({ filters, onToggle, disabled }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Type Bron</span>
        <div className="flex flex-wrap gap-2">
          <FilterTag label="Afbeeldingen" checked={filters.images} onChange={() => onToggle('images')} disabled={disabled} />
          <FilterTag label="Tekst" checked={filters.text} onChange={() => onToggle('text')} disabled={disabled} />
        </div>
      </div>

      <div>
         <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Herkomst</span>
         <div className="flex flex-wrap gap-2">
          <FilterTag label="Kleio" checked={filters.kleio} onChange={() => onToggle('kleio')} disabled={disabled} />
          <FilterTag label="Cito" checked={filters.cito} onChange={() => onToggle('cito')} disabled={disabled} />
         </div>
      </div>
    </div>
  );
}

function FilterTag({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange: () => void, disabled?: boolean }) {
  return (
    <label className={`
      flex items-center space-x-1 cursor-pointer px-2 py-1 rounded border transition-colors text-sm
      ${checked ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}
