import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import * as PresetZoekerMod from "./pages/PresetZoekerPage";
import * as ProposalsMod from "./pages/ProposalsPage";

import * as Step1Mod from "./pages/LessonStep1Page";
import * as Step2Mod from "./pages/LessonStep2Page";
import * as Step3Mod from "./pages/LessonStep3Page";
import * as Step4Mod from "./pages/LessonStep4Page";

const PresetZoekerPage =
  (PresetZoekerMod as any).default ||
  (PresetZoekerMod as any).PresetZoekerPage ||
  (PresetZoekerMod as any).PresetZoeker;

const ProposalsPage =
  (ProposalsMod as any).default ||
  (ProposalsMod as any).ProposalsPage ||
  (ProposalsMod as any).ProposalPage;

const LessonStep1Page =
  (Step1Mod as any).default || (Step1Mod as any).LessonStep1Page;

const LessonStep2Page =
  (Step2Mod as any).default || (Step2Mod as any).LessonStep2Page;

const LessonStep3Page =
  (Step3Mod as any).default || (Step3Mod as any).LessonStep3Page;

const LessonStep4Page =
  (Step4Mod as any).default || (Step4Mod as any).LessonStep4Page;

function Missing({ name }: { name: string }) {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Route error</h1>
      <p>
        Component <b>{name}</b> kon niet worden geladen.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            PresetZoekerPage ? <PresetZoekerPage /> : <Missing name="PresetZoekerPage" />
          }
        />
        <Route
          path="/proposals"
          element={ProposalsPage ? <ProposalsPage /> : <Missing name="ProposalsPage" />}
        />

        <Route
          path="/lesson"
          element={<Navigate to="/lesson/step1" replace />}
        />

        <Route
          path="/lesson/step1"
          element={LessonStep1Page ? <LessonStep1Page /> : <Missing name="LessonStep1Page" />}
        />
        <Route
          path="/lesson/step2"
          element={LessonStep2Page ? <LessonStep2Page /> : <Missing name="LessonStep2Page" />}
        />
        <Route
          path="/lesson/step3"
          element={LessonStep3Page ? <LessonStep3Page /> : <Missing name="LessonStep3Page" />}
        />
        <Route
          path="/lesson/step4"
          element={LessonStep4Page ? <LessonStep4Page /> : <Missing name="LessonStep4Page" />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

