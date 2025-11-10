import React, { useState } from 'react';
import type { Chip, SortedChips } from '../api/a06.chips';

interface ChipsProps {
  chips: SortedChips;
  isLoading: boolean;
  onChipClick: (chip: Chip) => void;
}

const ChipList = ({
  list,
  onClick,
}: {
  list: Chip[];
  onClick: (chip: Chip) => void;
}) => {
  const [showAll, setShowAll] = useState(false);
  const top10 = list.slice(0, 10);
  const remainingCount = list.length - 10;

  const itemsToShow = showAll ? list : top10;

  return (
    <>
      <ul className="chips-list">
        {itemsToShow.map((chip, index) => (
          <li key={`${chip.label}-${index}`}>
            <button
              type="button"
              onClick={() => onClick(chip)}
              className={`chip-kind-${chip.kind || 'unknown'}`}
            >
              {chip.label} ({chip.count})
            </button>
          </li>
        ))}
      </ul>
      {remainingCount > 0 && (
        <button
          type="button"
          className="chip-show-all"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Toon minder' : `Toon alle ${list.length} items...`}
        </button>
      )}
    </>
  );
};

const OpenSection = ({
  title,
  kind,
  list,
  onClick,
}: {
  title: string;
  kind: string;
  list: Chip[];
  onClick: (chip: Chip) => void;
}) => {
  if (!list || list.length === 0) return null;

  return (
    <div className="chip-open-section">
      <h4 className={`chip-title chip-title-${kind}`}>{title}</h4>
      <ChipList list={list} onClick={onClick} />
    </div>
  );
};

export function A06Chips({ chips, isLoading, onChipClick }: ChipsProps) {
  if (isLoading) {
    return (
      <div className="chips-a06 loading">
        <span>Geassocieerde Suggesties worden geladen...</span>
        <br />
        <span>(dit kan even duren, maar Rome werd niet in één dag gebouwd!)</span>
      </div>
    );
  }

  const { personen, gebeurtenissen, plaatsen, begrippen } = chips?.onderwerp || {};
  const isEmpty =
    (!personen || personen.length === 0) &&
    (!gebeurtenissen || gebeurtenissen.length === 0) &&
    (!plaatsen || plaatsen.length === 0) &&
    (!begrippen || begrippen.length === 0);

  if (isEmpty) {
    return (
      <div className="chips-a06 empty">
        <span>(Suggesties verschijnen na een zoekopdracht)</span>
      </div>
    );
  }

  return (
    <div className="chips-a06">
      <OpenSection
        title="Personen"
        kind="person"
        list={personen}
        onClick={onChipClick}
      />
      <OpenSection
        title="Gebeurtenissen"
        kind="event"
        list={gebeurtenissen}
        onClick={onChipClick}
      />
      <OpenSection
        title="Begrippen"
        kind="concept"
        list={begrippen}
        onClick={onChipClick}
      />
      <OpenSection
        title="Locaties"
        kind="place"
        list={plaatsen}
        onClick={onChipClick}
      />
    </div>
  );
}
