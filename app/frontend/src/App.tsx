import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import PresetZoekerPage from "./pages/PresetZoekerPage";
import ProposalsPage from "./pages/ProposalsPage";

import LessonStep1Page from "./pages/LessonStep1Page";
import LessonStep2Page from "./pages/LessonStep2Page";
import LessonStep3Page from "./pages/LessonStep3Page";
import LessonStep4Page from "./pages/LessonStep4Page";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PresetZoekerPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />

        <Route path="/lesson" element={<Navigate to="/lesson/step1" replace />} />
        <Route path="/lesson/step1" element={<LessonStep1Page />} />
        <Route path="/lesson/step2" element={<LessonStep2Page />} />
        <Route path="/lesson/step3" element={<LessonStep3Page />} />
        <Route path="/lesson/step4" element={<LessonStep4Page />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

