import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PresetZoekerPage } from './pages/PresetZoekerPage';
import ProposalsPage from './pages/ProposalsPage';
import LessonPage from './pages/LessonPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* De startpagina met je zoekbalk en filters */}
        <Route path="/" element={<PresetZoekerPage />} />
        
        {/* De pagina met de AI lesvoorstellen */}
        <Route path="/proposals" element={<ProposalsPage />} />

        {/* De nieuwe pagina voor het volledige lesplan */}
        <Route path="/lesson" element={<LessonPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
