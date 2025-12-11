import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { PresetZoekerPage } from "./pages/PresetZoekerPage";
import ProposalsPage from "./pages/ProposalsPage";
import LessonPage from "./pages/LessonPage";
import LessonStep3Page from "./pages/LessonStep3Page";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Startpagina */}
        <Route path="/" element={<PresetZoekerPage />} />

        {/* Lesvoorstellen */}
        <Route path="/proposals" element={<ProposalsPage />} />

        {/* Nieuwe geïntegreerde Step1+Step2 pagina */}
        <Route path="/lesson" element={<LessonPage />} />

        {/* NIEUWE stap 3 – Bronnenblad */}
        <Route path="/lesson/step3" element={<LessonStep3Page />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

