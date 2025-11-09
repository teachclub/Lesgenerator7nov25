import React from 'react';
import { useSelectionStore } from '../state/selection.store';
import { useQueryStore } from '../state/query.store';

export interface Source {
  id: string;
  title: string;
  type: string;
  link: string;
}

interface SelectionListProps {
  searchResults: Source[];
  isLoading: boolean;
}

export function A30SelectionList({ searchResults, isLoading }: SelectionListProps) {
  const { sources: selectedSources, addSource, removeSource } = useSelectionStore();
  const { max: maxSelection } = useQueryStore();

  const isSelected = (id: string) => {
    return selectedSources.some(s => s.id === id);
  };

  const canSelectMore = selectedSources.length < maxSelection;

  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    source: Source
  ) => {
    if (e.target.checked) {
      if (canSelectMore) {
        addSource(source);
      } else {
        alert(`Je kunt maximaal ${maxSelection} bronnen selecteren.`);
        e.target.checked = false;
      }
    } else {
      removeSource(source.id);
    }
  };

  if (isLoading) {
    return <div className="selection-list-a30 loading">Zoekresultaten laden...</div>;
  }

  if (searchResults.length === 0) {
    return (
      <div className="selection-list-a30 empty">
        Voer een zoekopdracht in om hier de Europeana-resultaten te zien.
      </div>
    );
  }

  return (
    <div className="selection-list-a30">
      <p>
        Resultaten gevonden. Geselecteerd: {selectedSources.length} / {maxSelection}
      </p>
      <ul className="search-results-list">
        {searchResults.map((src) => {
          const checked = isSelected(src.id);
          const disabled = !checked && !canSelectMore;
          
          return (
            <li key={src.id} className="search-result-item">
              <input
                type="checkbox"
                id={`cb-${src.id}`}
                checked={checked}
                disabled={disabled}
                onChange={(e) => handleCheckboxChange(e, src)}
              />
              <label htmlFor={`cb-${src.id}`}>{src.title}</label>
              <span className="item-type">({src.type})</span>
              <a
                href={src.link}
                target="_blank"
                rel="noopener noreferrer"
                className="item-link"
              >
                (bekijk bron)
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
