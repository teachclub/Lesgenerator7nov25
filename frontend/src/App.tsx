import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { PresetZoekerPage } from './pages/PresetZoekerPage';
import ProposalsPage from './pages/ProposalsPage';
import LessonPage from './pages/LessonPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PresetZoekerPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/lesson-plan" element={<LessonPage />} />
      </Routes>
    </BrowserRouter>
  );
}
