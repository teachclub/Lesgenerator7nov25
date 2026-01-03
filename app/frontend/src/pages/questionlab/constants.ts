import type { DimKey } from "./types";

export const DIMENSIES: Array<{ key: DimKey; label: string; apiMatchHint: string }> = [
  { key: "politiek", label: "politiek (macht/bestuur)", apiMatchHint: "politiek" },
  { key: "sociaal", label: "sociaal-economisch (geld/werk/groepen)", apiMatchHint: "sociaal" },
  { key: "cultureel", label: "cultureel-mentaal (ideeën/propaganda/beelden)", apiMatchHint: "cultureel" },
  { key: "individueel", label: "individueel (keuzes/motieven/ervaringen)", apiMatchHint: "individueel" },
];

export type VraagType =
  | "verklarend"
  | "vergelijkend"
  | "oorzaak-gevolg"
  | "continuiteit-verandering"
  | "perspectief"
  | "standpunt"
  | "chronologisch"
  | "probleem-oplossing";

export const VRAAGTYPE_OPTIONS: VraagType[] = [
  "verklarend",
  "vergelijkend",
  "oorzaak-gevolg",
  "continuiteit-verandering",
  "perspectief",
  "standpunt",
  "chronologisch",
  "probleem-oplossing",
];

export function labelShort(s: string) {
  const x = String(s || "").toLowerCase();
  if (x.includes("politiek")) return "Politiek";
  if (x.includes("sociaal")) return "Eco";
  if (x.includes("cultureel")) return "Cultuur";
  if (x.includes("individueel")) return "Individueel";
  return s;
}

