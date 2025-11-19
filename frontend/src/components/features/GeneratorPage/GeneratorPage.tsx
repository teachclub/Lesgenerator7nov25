import React from 'react';
import { SearchBar } from './SearchBar';
import { Filters } from './Filters';
import { HitList } from './HitList';
import { SearchActions } from './SearchActions';
import { DetailPane } from './DetailPane';
import { GenerateButton } from './GenerateButton';
import { useQueryStore } from '../../../state/query.store';

export const GeneratorPage: React.FC = () => {
  const selectedHit = useQueryStore((s) => s.selectedHit);

  return (
    <div className="container mx-auto p-6 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Kleio – bronzoeker & lesgenerator</h1>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 relative">
        <div className="col-span-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200 overflow-y-auto custom-scrollbar">
          <SearchBar />
          <Filters />
          <SearchActions />
        </div>

        <div className="col-span-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h2 className="font-bold text-gray-800">Gevonden bronnen</h2>
          </div>
          <HitList />
        </div>

        <div className="col-span-5 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full">
          {selectedHit ? (
            <DetailPane 
                key={selectedHit.id} 
                hit={selectedHit} 
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 p-10 text-center">
              <p>Klik op een resultaat in de middelste kolom om hier de details te bekijken.</p>
            </div>
          )}
        </div>

        <GenerateButton />
      </div>
    </div>
  );
};
