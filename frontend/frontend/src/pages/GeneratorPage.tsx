import React from 'react';
import { useQueryStore } from '../state/query.store';

const GeneratorPage: React.FC = () => {
  const store = useQueryStore();

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Lessy Lesgenerator</h1>
      
      <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}>
        <h2>Debug: query.store.ts</h2>
        <p>Huidige modus: <strong>{store.mode}</strong></p>
        <p>Zoektermen:</p>
        <pre>{JSON.stringify(store.terms, null, 2)}</pre>
      </div>
    </div>
  );
};

export default GeneratorPage;
