import { create } from 'zustand';

export interface LessonPlanV2 {
  title: string;
  context: string;
  learningGoal: string;
  didacticApproach: string;
  
  phases: { phaseName: string; time: string; teacherRole: string; studentRole: string; materials: string; }[];
  
  teacherGuide: {
      lessonGoal: string;
      grabBagRationale: string;
      sourceQuadrant: { axisX: string; axisY: string; explanation: string; };
      reflectionAnswers?: string[];
      filledTables?: { collaboration: string; quadrant: string; };
  };
  
  studentWorksheet: {
      assignmentDescription: string;
      steps: string[];
      
      grabBagInstruction?: string; // NIEUW
      grabBag: { label: string; items: string[] }[];
      
      quadrantInstruction?: string; // NIEUW
      emptyTables: { collaboration: string; quadrant: string; };
      
      sourceAnalyses?: { sourceId: string; questions: string[]; answers: string[]; }[];
      reflectionQuestions?: string[];
  };
}

interface LessonStateV2 {
  lessonPlan: LessonPlanV2 | null;
  setLessonPlan: (plan: LessonPlanV2) => void;
}

export const useLessonStoreV2 = create<LessonStateV2>((set) => ({
  lessonPlan: null,
  setLessonPlan: (plan) => set({ lessonPlan: plan }),
}));
