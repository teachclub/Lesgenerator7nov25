import React, { useState } from 'react';

import { useQueryStore } from '../state/query.store';
import { useSelectionStore } from '../state/selection.store';

import { fetchChipsWithCounts, type SortedChips, type Chip } from '../api/a06.chips';
import { fetchProposalsFromSearch, type AiProposal } from '../api/a13.searchPreset';
import { fetchLesson } from '../api/a19.generate';
import { fetchSourcesForProposal } from '../api/a26.sources';

import { A16SearchBar } from '../components/A16.SearchBar';
import { A21TvKaSelect } from '../components/A21.TvKaSelect';
import { A06Chips } from '../components/A06.Chips';
import { A14Filters } from '../components/A14.Filters';
import { A30SelectionList, type Source } from '../components/A30.SelectionList';
import { A19GenerateButton } from '../components/A19.GenerateButton';
import { A20ExportActions } from '../components/A20.ExportActions';
import { A31Verzamelbak } from '../components/A31.Verzamelbak';

type LoadingState = 'idle' | 's1-chips' | 's2-proposals' | 's3-lesson' | 's4-sources';

const EMPTY_CHIPS: SortedChips = {
  onderwerp: {
    personen: [],
    gebeurtenissen: [],
    plaatsen: [],
    begrippen: [],
  },
};

export function PresetZoekerPage() {
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const [chips, setChips] = useState<SortedChips>(EMPTY_CHIPS);
  const [proposals, setProposals] = useState<AiProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<AiProposal | null>(null);
  const [lessonMarkdown, setLessonMarkdown] = useState<string>('');
  
  const [presetSources, setPresetSources] = useState<Source[]>([]);
  const [otherSources, setOtherSources] = useState<Source[]>([]);

  const queryState = useQueryStore();
  const selectionState = useSelectionStore();

  const handleS1Search = async () => {
    setError(null);
    setChips(EMPTY_CHIPS);
    setProposals([]);
    setLessonMarkdown('');
    setPresetSources([]);
    setOtherSources([]);
    selectionState.setSources([]);
    
    const term = queryState.getSearchQuery();
    const { tv, ka } = queryState;
    
    if (term.trim() || (tv && ka)) {
      setLoading('s1-chips');
      const context = ka || tv;
      const chipsResult = await fetchChipsWithCounts(term || ka, context);
      if (chipsResult.ok) {
        setChips(chipsResult.data.chips);
      } else {
        setError(chipsResult.error as string);
      }
      setLoading('idle');
    }
  };
  
  const handleProposalGeneration = async () => {
    setLoading('s2-proposals');
    setError(null);
    setProposals([]);
    setSelectedProposal(null);
    setPresetSources([]);
    setOtherSources([]);
    selectionState.setSources([]);
    
    const presetInput = queryState.getPresetInput();
    const proposalsResult = await fetchProposalsFromSearch(presetInput);
    
    if (proposalsResult.ok) {
      setProposals(proposalsResult.data.proposals);
    } else {
      setError(proposalsResult.error as string);
    }
    setLoading('idle');
  };

  const handleProposalSelect = async (proposal: AiProposal | null) => {
    if (!proposal) {
      setSelectedProposal(null);
      setPresetSources([]);
      setOtherSources([]);
      return;
    }
    
    setSelectedProposal(proposal);
    setLoading('s4-sources');
    setError(null);
    selectionState.setSources([]);

    const { term, filters } = queryState.getPresetInput();
    const sourcesResult = await fetchSourcesForProposal({
      term,
      filters,
      chosenProposal: proposal,
    });

    if (sourcesResult.ok) {
      setPresetSources(sourcesResult.data.presetSources);
      setOtherSources(sourcesResult.data.otherSources);
      selectionState.setSources(sourcesResult.data.presetSources);
    } else {
      setError(sourcesResult.error as string);
    }
    setLoading('idle');
  };

  const handleChipClick = (chip: Chip) => {
    const { terms, tv, ka, setTerm } = queryState;
    const chipLabel = chip.label;

    let placed = false;
    for (let i = 0; i < terms.length; i++) {
      if (terms[i].trim() === '') {
        setTerm(i, chipLabel);
        placed = true;
        break;
      }
    }
    if (!placed) {
      setTerm(terms.length, chipLabel);
    }
  };
  
  const handleS3Generate = async () => {
    if (!selectedProposal) {
      setError("Selecteer eerst een lesvoorstel.");
      return;
    }
    
    setLoading('s3-lesson');
    setError(null);
    setLessonMarkdown('');

    const lessonResult = await fetchLesson(selectedProposal, selectionState.selected);

    if (lessonResult.ok) {
      setLessonMarkdown(lessonResult.data.lessonMarkdown);
    } else {
      setError(lessonResult.error as string);
    }
    setLoading('idle');
  };

  return (
    <div className="preset-zoeker-page">
      <h1>Lesgenerator</h1>

      <section className="section-search">
        <h2>1. Zoeken & Filteren</h2>
        
        <div className="search-container">
          <div className="search-panel">
            <A16SearchBar 
              onTriggerSearch={handleS1Search}
              isLoading={loading === 's1-chips'}
            />
            
            <A14Filters
              selectedFilters={queryState.filters}
              onFilterChange={queryState.setFilter}
              disabled={loading !== 'idle'}
            />

            <button onClick={handleProposalGeneration} disabled={loading !== 'idle'}>
              Genereer Lesvoorstellen
            </button>
          </div>
          
          <div className="chips-panel">
            <A06Chips
              chips={chips}
              isLoading={loading === 's1-chips'}
              onChipClick={handleChipClick}
            />
          </div>
        </div>
        
      </section>

      <section className="section-selection">
        <h2>2. Kies Voorstel & Selecteer Bronnen</h2>
        
        <A19GenerateButton
          proposals={proposals}
          selectedProposal={selectedProposal}
          onSelectProposal={handleProposalSelect}
          onGenerate={handleS3Generate}
          isLoading={loading === 's2-proposals' || loading === 's3-lesson'}
          sourcesLoading={loading === 's4-sources'}
          selectedSources={selectionState.selected}
        />

        <div className="selection-container">
          <div className="selection-results-panel">
            <A30SelectionList
              presetSources={presetSources}
              otherSources={otherSources}
              isLoading={loading === 's4-sources'}
            />
          </div>
          <div className="selection-basket-panel">
            <A31Verzamelbak />
          </div>
        </div>
        
      </section>
      
      <section className="section-export">
        <h2>3. Eindresultaat</h2>
        
        <div className="lesson-output">
          {loading === 's3-lesson' && <p>Les aan het genereren...</p>}
          {lessonMarkdown ? (
            <pre>{lessonMarkdown}</pre>
          ) : (
            loading === 'idle' && <p>De gegenereerde les verschijnt hier.</p>
          )}
        </div>

        <A20ExportActions
          lessonMarkdown={lessonMarkdown}
          isReady={!!lessonMarkdown}
          disabled={loading !== 'idle'}
        />
      </section>

      {error && (
        <div className="error-panel">
          <strong>Fout:</strong> {error}
        </div>
      )}
    </div>
  );
}
