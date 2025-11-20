import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GeneratorPage } from './components/features/GeneratorPage/GeneratorPage';
import ProposalsPage from './pages/ProposalsPage';
import LessonPage from './pages/LessonPage'; // Vergeet deze import niet!
import './index.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GeneratorPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/lesson" element={<LessonPage />} />
      </Routes>
    </Router>
  );
};

export default App;
