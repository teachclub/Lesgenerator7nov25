import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import PresetZoekerPage from "./pages/PresetZoekerPage";
import ProposalsPage from "./pages/ProposalsPage";

import LessonStep1Page from "./pages/LessonStep1Page";
import LessonStep2Page from "./pages/LessonStep2Page";
import LessonStep3Page from "./pages/LessonStep3Page";
import LessonStep4Page from "./pages/LessonStep4Page";
import LessonStep5Page from "./pages/LessonStep5Page";

import QuestionLabPage from "./pages/QuestionLabPage";
import LabSourcesByDimensionPage from "./pages/LabSourcesByDimensionPage";
import LabProposalsPage from "./pages/LabProposalsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/lab/questions" replace />} />

        <Route path="/preset" element={<PresetZoekerPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />

        <Route path="/lesson" element={<Navigate to="/lesson/step1" replace />} />
        <Route path="/lesson/step1" element={<LessonStep1Page />} />
        <Route path="/lesson/step2" element={<LessonStep2Page />} />
        <Route path="/lesson/step3" element={<LessonStep3Page />} />
        <Route path="/lesson/step4" element={<LessonStep4Page />} />
        <Route path="/lesson/step5" element={<LessonStep5Page />} />

        <Route path="/lab" element={<Navigate to="/lab/questions" replace />} />
        <Route path="/lab/questions" element={<QuestionLabPage />} />
        <Route path="/lab/sources" element={<LabSourcesByDimensionPage />} />
        <Route path="/lab/proposals" element={<LabProposalsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

