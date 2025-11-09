import React, { useState } from 'react';

import { useQueryStore } from '../state/query.store';
import { useSelectionStore } from '../state/selection.store';

import { fetchChipsWithCounts, type SortedChips, type Chip } from '../api/a06.chips';
import { fetchProposalsFromSearch, type AiProposal } from '../api/a13.searchPreset';
import { fetchLesson } from '../api/a19.generate';

import { A16SearchBar } from '../components/A16.SearchBar';
import { A21TvKaSelect } from '../components/A21.TvKaSelect';
import { A06Chips } from '../components/A06.Chips';
import { A14Filters } from '../components/A14.Filters';
import { A30SelectionList, type Source } from '../components/A30.SelectionList';
import { A19GenerateButton } from '../components/A19.GenerateButton';
import { A20ExportActions } from '../components/A20.ExportActions';

type LoadingState = 'idle' | 's1-chips' | 's2-proposals' | 's3-lesson';

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
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [lessonMarkdown, setLessonMarkdown] = useState<string>('');
  
  const [searchResults, setSearchResults] = useState<Source[]>([]);

  const queryState = useQueryStore();
  const selectionState = useSelectionStore();

  const handleS1Search = async (term: string, tv: string, ka: string) => {
    setError(null);
    setChips(EMPTY_CHIPS);
    setProposals([]);
    setLessonMarkdown('');
    setSearchResults([]);
    selectionState.setSources([]);
    
    queryState.setTerm(term);
    queryState.setTv(tv);
    queryState.setKa(ka);
    
    if (term.trim() || ka.trim()) {
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
    setSelectedProposalId(null);
    
    const presetInput = queryState.getPresetInput();
    const proposalsResult = await fetchProposalsFromSearch(presetInput);
    
    if (proposalsResult.ok) {
      setProposals(proposalsResult.data.proposals);
    } else {
      setError(proposalsResult.error as string);
    }
    setLoading('idle');
  };

  const handleChipClick = (chip: Chip) => {
    const { term, tv, ka, setTerm } = queryState;
    const chipLabel = chip.label;

    if (!term.trim()) {
      setTerm(chipLabel);
      handleS1Search(chipLabel, tv, ka);
      return;
    }

    const helpText = "Logica:\nEN = Verfijnen (minder treffers, moet beide bevatten)\nOF = Vergroten (meer treffers, mag een van beide bevatten)";
    const useAnd = window.confirm(
      `Wil je verfijnen met 'EN'? (Zoekterm wordt: "${term} EN ${chipLabel}")\n\n${helpText}\n\nOK = EN\nAnnuleren = OF`
    );
    
    const operator = useAnd ? 'AND' : 'OR';
    const newTerm = `${term} ${operator} ${chipLabel}`;
    
    setTerm(newTerm);
    handleS1Search(newTerm, tv, ka);
  };
  
  const handleS3Generate = async (chosenProposal: AiProposal) => {
    setLoading('s3-lesson');
    setError(null);
    setLessonMarkdown('');

    const lessonResult = await fetchLesson(chosenProposal, selectionState.sources);

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
              onSearch={handleS1Search}
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
          sources={selectionState.sources}
          proposals={proposals}
          selectedProposalId={selectedProposalId}
          onSelectProposal={setSelectedProposalId}
          onGenerate={handleS3Generate}
          isLoading={loading === 's2-proposals' || loading === 's3-lesson'}
        />

        <A30SelectionList
          searchResults={searchResults}
          isLoading={loading === 's2-proposals'}
        />
        
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
