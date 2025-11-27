interface Props {
  term: string;
  onTermChange: (term: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export function A16SearchBar({ term, onTermChange, onSearch, isLoading }: Props) {
  
  // We voegen de operatoren letterlijk toe als tekst.
  // De backend moet deze herkennen en de "aftreksom" logica toepassen.
  const addOperator = (op: 'AND' | 'OR' | 'NOT') => {
    // Voeg een spatie toe voor en na de operator voor de leesbaarheid
    const textToAdd = ` ${op} `;
    
    // Voeg toe aan bestaande term
    const newTerm = term + textToAdd;
    onTermChange(newTerm);
    
    // Focus terug op input zodat je direct door kunt typen
    const input = document.getElementById('search-input');
    if (input) input.focus();
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <input
          id="search-input"
          type="text"
          className="flex-1 border border-gray-300 p-2 rounded shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Zoekterm (bijv. 'Maarten Luther')..."
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        <button
          onClick={onSearch}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50 font-bold transition-colors"
        >
          {isLoading ? '...' : 'Zoek'}
        </button>
      </div>
      
      {/* Operator Knoppen */}
      <div className="flex gap-2 text-xs items-center">
        <span className="text-gray-500 font-semibold mr-1">Operators:</span>
        
        <button 
            onClick={() => addOperator('AND')} 
            title="Zoekterm A EN Zoekterm B moeten voorkomen"
            className="bg-gray-100 hover:bg-gray-200 border px-2 py-1 rounded text-gray-700 font-bold"
        >
            AND
        </button>
        
        <button 
            onClick={() => addOperator('OR')} 
            title="Zoekterm A OF Zoekterm B mag voorkomen"
            className="bg-gray-100 hover:bg-gray-200 border px-2 py-1 rounded text-gray-700 font-bold"
        >
            OR
        </button>

        <button 
            onClick={() => addOperator('NOT')} 
            title="Sluit resultaten uit (A min B)"
            className="bg-gray-100 hover:bg-red-50 border border-gray-200 hover:border-red-300 px-2 py-1 rounded text-red-700 font-bold"
        >
            NOT
        </button>
      </div>
    </div>
  );
}
