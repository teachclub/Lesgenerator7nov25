export type VraagType =
  | "verklarend"
  | "vergelijkend"
  | "oorzaak-gevolg"
  | "continuiteit-verandering"
  | "perspectief"
  | "standpunt"
  | "chronologisch"
  | "probleem-oplossing";

export type HoofdvraagSuggestie = { id: number; vraag: string };
export type DeelvraagItem = { id: number; subdimensie: string; vraag: string };

export type Source = {
  provider?: string;
  type?: string;
  title?: string;
  url?: string | null;
  description?: string;
  fullText?: string;
  imageUrl?: string | null;
  score?: number;
};

export type DimKey = "politiek" | "sociaal" | "cultureel" | "individueel";

export const DIMENSIES: Array<{ key: DimKey; label: string; apiMatchHint: string }> = [
  { key: "politiek", label: "politiek (macht/bestuur)", apiMatchHint: "politiek" },
  { key: "sociaal", label: "sociaal-economisch (geld/werk/groepen)", apiMatchHint: "sociaal" },
  { key: "cultureel", label: "cultureel-mentaal (ideeën/propaganda/beelden)", apiMatchHint: "cultureel" },
  { key: "individueel", label: "individueel (keuzes/motieven/ervaringen)", apiMatchHint: "individueel" },
];

