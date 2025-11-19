import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GeneratorPage } from './components/features/GeneratorPage/GeneratorPage';
import ProposalsPage from './pages/ProposalsPage';
import './index.css';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GeneratorPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
      </Routes>
    </Router>
  );
};

export default App;
