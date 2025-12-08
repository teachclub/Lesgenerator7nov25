// src/types/lessonV2.ts
// Centrale types voor de lesketen v2 (vooral step2-leerlingmateriaal)

export interface TvKa {
  tv: number | null;
  tvLabel?: string | null;
  ka?: string | null;
  kaLabel?: string | null;
}

export interface LessonConcept {
  titel?: string;
  hook?: string;
  context?: string;
  hoofdvraag?: string;
  tv?: string | number | null;
  tvLabel?: string | null;
  ka?: string | null;
  kaLabel?: string | null;
}

export interface Source {
  id: string | number;
  provider?: string;
  type?: string;
  title?: string;
  description?: string;
  snippet?: string;
  url?: string | null;
  imageUrl?: string | null;
}

export interface Step2Bronvraag {
  sourceId: string;        // bv. "cito-522"
  vraag: string;
  deelvraagIndex: number;
  dimensie: string;
  subdimensie: string;
}

export interface Step2InvultabelRij {
  label: string;           // "Groep A"
  uitleg: string;
  deelvraagIndex: number;
}

export interface Step2Invultabel {
  kolommen: string[];
  rijen: Step2InvultabelRij[];
}

export interface Step2Reflectievraag {
  vraag: string;
  aandachtspuntVoorDocent?: string;
}

export interface Step2Reflectie {
  vragen: Step2Reflectievraag[];
}

export interface LessonStep2Data {
  chainSignature: string;
  hoofdvraag: string;
  inleiding: string;
  bronvragen: Step2Bronvraag[];
  invultabel: Step2Invultabel;
  reflectie: Step2Reflectie;
}

// Volledige payload van backend voor step2
export interface LessonStep2Response {
  step: "step2";
  data: LessonStep2Data;
}

