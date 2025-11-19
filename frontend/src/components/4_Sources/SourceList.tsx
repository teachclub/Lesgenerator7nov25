import React from 'react';
import { Source, useSelectionStore } from '../../state/selection.store';

interface SourceListProps {
  presetSources: Source[];
  otherSources: Source[];
  isLoading: boolean;
}

const SourceItem: React.FC<{ source: Source, isMaxReached: boolean }> = ({ source, isMaxReached }) => {
  const { selected, toggle } = useSelectionStore();
  const isSelected = selected.some(s => s.id === source.id);
  const isDisabled = !isSelected && isMaxReached;

  return (
    <div style={{ border: '1px solid #eee', padding: '5px', margin: '5px 0', opacity: isDisabled ? 0.5 : 1 }}>
      <label>
        <input 
          type="checkbox" 
          checked={isSelected} 
          onChange={() => toggle(source)} 
          disabled={isDisabled}
        />
        {source.title}
      </label>
      <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '10px' }}>
        [Preview]
      </a>
    </div>
  );
};

export const SourceList: React.FC<SourceListProps> = ({ presetSources, otherSources, isLoading }) => {
  const { selected } = useSelectionStore();
  const isMaxReached = selected.length >= 12;

  if (isLoading) {
    return <div style={{ padding: '10px', marginTop: '20px' }}>Bronnen worden geladen...</div>;
  }

  if (!presetSources.length && !otherSources.length) {
    return null;
  }

  const sortedOtherSources = [...otherSources].sort((a, b) => (a.type || '').localeCompare(b.type || ''));

  return (
    <section style={{ border: "1px solid #ddd", padding: 12, marginTop: 16 }}>
      <h2>3. Kies je Bronnen (Max. 12)</h2>
      {isMaxReached && <p style={{ color: 'red', fontWeight: 'bold' }}>Maximum van 12 bronnen bereikt.</p>}
      
      <h3>Preset Melange (Aanbevolen)</h3>
      <div>
        {presetSources.map(source => (
          <SourceItem key={source.id} source={source} isMaxReached={isMaxReached} />
        ))}
      </div>

      <h3 style={{ marginTop: '20px' }}>Overige Bronnen</h3>
      <div>
        {sortedOtherSources.map(source => (
          <SourceItem key={source.id} source={source} isMaxReached={isMaxReached} />
        ))}
      </div>
    </section>
  );
};
