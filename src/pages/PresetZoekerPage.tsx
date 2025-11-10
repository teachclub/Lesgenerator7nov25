import React, { useState } from 'react';

// State Stores
import { useQueryStore } from '../state/query.store';
import { useSelectionStore } from '../state/selection.store';

// API Clients
import { fetchChips, type Chip } from '../api/a06.chips';
import { fetchPreset } from '../api/a13.searchPreset';
import { fetchProposals, fetchLesson, type AiProposal } from '../api/a19.generate';

// Componenten
import { A16SearchBar } from '../components/A16.SearchBar';
import { A21TvKaSelect } from '../components/A21.TvKaSelect';
import { A06Chips } from '../components/A06.Chips';
import { A14Filters } from '../components/A14.Filters';
import { A15RatioPicker } from '../components/A15.RatioPicker';
import { A18SelectionPanel, type Source } from '../components/A18.SelectionPanel';
import { A19GenerateButton } from '../components/A19.GenerateButton';
import { A20ExportActions } from '../components/A20.ExportActions';

// --- Types voor de pagina-state ---
type LoadingState = 'idle' | 's1-preset' | 's1-chips' | 's2-proposals' | 's3-lesson';

/**
 * Hoofdpagina: Orchestratie van alle componenten en API-calls.
 */
export function PresetZoekerPage() {
  // Lokale state voor laadstatussen en resultaten
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  // AI-resultaten
  const [chips, setChips] = useState<Chip[]>([]);
  const [proposals, setProposals] = useState<AiProposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [lessonMarkdown, setLessonMarkdown] = useState<string>('');

  // Haal state en acties uit de stores
  const queryState = useQueryStore();
  const selectionState = useSelectionStore();

  // --- S1: Zoek Bronnen (Preset) + Genereer AI Chips ---
  const handleS1Search = async (term: string, tv: string, ka: string) => {
    setError(null);
    setChips([]);
    setProposals([]);
    setLessonMarkdown('');
    
    // 1. Update de query store
    queryState.setTerm(term);
    queryState.setTv(tv);
    queryState.setKa(ka);
    
    // 2. Start de 'preset' zoekopdracht (S1+S2)
    setLoading('s1-preset');
    const presetInput = queryState.getPresetInput();
    const presetResult = await fetchPreset({ ...presetInput, term, tv, ka });

    if (presetResult.ok) {
      selectionState.setSources(presetResult.data.sources as Source[]);
    } else {
      setError(presetResult.error as string);
    }
    setLoading('idle'); // Preset is klaar, nu chips

    // 3. Start de 'chips' generatie (async)
    if (term.trim() || ka.trim()) {
      setLoading('s1-chips');
      const context = ka || tv; // Gebruik KA of TV als context
      const chipsResult = await fetchChips({ term: term || ka, context });
      if (chipsResult.ok) {
        setChips(chipsResult.chips);
      } // Fout bij chips is niet erg, we gaan door
      setLoading('s1-chips');
    }
  };

  // --- Tussenstap: Klik op een Chip (zoek opnieuw) ---
  const handleChipClick = (chip: Chip) => {
    // TODO: Implementeer logica voor 'Zoeken met Chips' (A12)
    // Dit zou de 'custom' modus kunnen activeren en resultaten toevoegen.
    console.log('Chip geklikt, roep A12 API aan:', chip);
    alert('Zoeken met chips (A12) nog niet geïmplementeerd.');
  };

  // --- S2: Genereer Lesvoorstellen ---
  // Deze functie wordt aangeroepen zodra de bronnen (van S1) binnen zijn
  // OF wanneer S2-filters (A14, A15) veranderen.
  // We triggeren dit nu handmatig na S1.
  const triggerProposalGeneration = async (sources: Source[]) => {
    if (sources.length === 0) return;
    
    setLoading('s2-proposals');
    setError(null);
    setProposals([]);
    setSelectedProposalId(null);
    
    const proposalsResult = await fetchProposals(sources);
    if (proposalsResult.ok) {
      setProposals(proposalsResult.data.proposals);
    } else {
      setError(proposalsResult.error as string);
    }
    setLoading('idle');
  };
  
  // TODO: Koppel triggerProposalGeneration aan een 'Genereer voorstellen' knop
  // of roep het automatisch aan na S1.

  // --- S3: Genereer Definitieve Les ---
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

      {/* --- SECTIE 1: S1 + S2 Invoer --- */}
      <section className="section-s1-s2">
        <h2>Sectie 1 & 2: Zoeken & Filteren</h2>
        
        {/* We moeten A16 en A21 combineren in de 'echte' A16 */}
        <A16SearchBar 
          onSearch={handleS1Search}
          isLoading={loading === 's1-preset' || loading === 's1-chips'}
        />
        
        <A14Filters
          selectedFilters={queryState.filters}
          onFilterChange={queryState.setFilter}
          disabled={loading !== 'idle'}
        />
        
        <A15RatioPicker
          selectedRatio={queryState.ratio}
          onRatioChange={queryState.setRatio}
          selectedMax={queryState.max}
          onMaxChange={queryState.setMax}
          disabled={loading !== 'idle'}
        />
        
        {/* TODO: Knop toevoegen om S1/S2 opnieuw uit te voeren */}
      </section>

      {/* --- SECTIE 2: Resultaten (Chips & Selectie) --- */}
      <section className="section-results">
        <A06Chips
          chips={chips}
          isLoading={loading === 's1-chips'}
          onChipClick={handleChipClick}
        />
        
        <A18SelectionPanel
          sources={selectionState.sources}
          mode={selectionState.mode}
          onModeChange={selectionState.setMode}
          onRemoveSource={selectionState.removeSource}
          isLoading={loading === 's1-preset'}
        />
        
        {/* TODO: Knop om S2 (Proposals) te triggeren */}
        <button onClick={() => triggerProposalGeneration(selectionState.sources)} disabled={loading !== 'idle' || selectionState.sources.length === 0}>
          Genereer Lesvoorstellen (S2)
        </button>
      </section>

      {/* --- SECTIE 3: Genereren (AI Voorstellen & Knop) --- */}
      <section className="section-s3-generate">
        <h2>Sectie 3: Genereer Les</h2>
        
        <A19GenerateButton
          sources={selectionState.sources}
          proposals={proposals}
          selectedProposalId={selectedProposalId}
          onSelectProposal={setSelectedProposalId}
          onGenerate={handleS3Generate}
          isLoading={loading === 's2-proposals' || loading === 's3-lesson'}
        />
      </section>
      
      {/* --- SECTIE 4: Eindresultaat & Export --- */}
      <section className="section-s4-export">
        <h2>Eindresultaat</h2>
        
        <div className="lesson-output">
          {loading === 's3-lesson' && <p>Les aan het genereren...</p>}
          {lessonMarkdown ? (
            <pre>{lessonMarkdown}</pre> /* TODO: Gebruik een Markdown-renderer */
          ) : (
            !isLoading && <p>De gegenereerde les verschijnt hier.</p>
          )}
        </div>

        <A20ExportActions
          lessonMarkdown={lessonMarkdown}
          isReady={!!lessonMarkdown}
          disabled={loading !== 'idle'}
        />
      </section>

      {/* Toon algemene foutmeldingen */}
      {error && (
        <div className="error-panel">
          <strong>Fout:</strong> {error}
        </div>
      )}
    </div>
  );
}
