import { create } from 'zustand';

// Definities voor de uitgebreide V2 data
export interface LessonPlanV2 {
  title: string;
  context: string;
  learningGoal: string;
  didacticApproach: string;
  phases: { phaseName: string; time: string; teacherRole: string; studentRole: string; materials: string; }[];
  teacherGuide: {
      lessonGoal: string;
      didacticQuadrant: string;
      reflectionQuestions: string[];
      answerKey: { questionId: string; answer: string; }[];
  };
  studentWorksheet: {
      assignmentDescription: string;
      steps: string[];
      sourceQuestions?: { sourceId: string; questions: { id: string; question: string; bloomLevel?: string; }[] }[];
  };
}

interface LessonStateV2 {
  lessonPlan: LessonPlanV2 | null;
  setLessonPlan: (plan: LessonPlanV2) => void;
}

// HIER ZAT DE FOUT: De export naam moet exact kloppen met de import
export const useLessonStoreV2 = create<LessonStateV2>((set) => ({
  lessonPlan: null,
  setLessonPlan: (plan) => set({ lessonPlan: plan }),
}));
