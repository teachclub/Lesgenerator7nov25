import React from 'react';
import { SearchBar } from '../components/1_Search/SearchBar';

const GeneratorPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Lessy Lesgenerator</h1>

      <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}>
        <h2>1. Zoeken & Filteren</h2>
        <SearchBar />
      </div>

    </div>
  );
};

export default GeneratorPage;
