// api/chipsets.ts
// Voorgebakken chipsets + simpele helpers om snel Europeana-renderbare chips te maken.

export type Chip = {
  label: string;
  kind?: "person" | "concept" | "event" | "place" | "work" | "type" | "genre" | "technique" | "org" | "law";
  who?: string[];
  what?: string[];
  where?: string[];
  yearRange?: { from: number; to: number };
  type?: Array<"IMAGE" | "TEXT" | "VIDEO" | "SOUND">;
  reusability?: "open" | "restricted" | "permission" | "uncategorized";
  negatives?: string[];
  boost?: string[];
};

// ——— Rembrandt (kunsthistorisch zoeken) ———
export const CHIPSET_REMBRANDT: Chip[] = [
  {
    label: "Rembrandt van Rijn",
    kind: "person",
    who: ["Rembrandt van Rijn", "Rembrandt"],
    where: ["Amsterdam", "Leiden"],
    yearRange: { from: 1630, to: 1660 },
    type: ["IMAGE"],
    reusability: "open",
    boost: ["who", "YEAR", "where"],
  },
  {
    label: "chiaroscuro / clair-obscur",
    kind: "concept",
    what: ["chiaroscuro", "clair-obscur"],
    type: ["IMAGE"],
  },
  {
    label: "ets / etching / Radierung",
    kind: "technique",
    what: ["ets", "etching", "Radierung", "eau-forte"],
    type: ["IMAGE", "TEXT"],
  },
  {
    label: "groepsportret / portret",
    kind: "genre",
    what: ["groepsportret", "portret", "group portrait", "portrait"],
    type: ["IMAGE"],
  },
  {
    label: "De Nachtwacht (1642)",
    kind: "work",
    what: ["De Nachtwacht", "Night Watch"],
    yearRange: { from: 1642, to: 1642 },
    type: ["IMAGE", "TEXT"],
  },
  {
    label: "Jan Six (mecenas)",
    kind: "person",
    who: ["Jan Six"],
    yearRange: { from: 1640, to: 1665 },
    type: ["IMAGE", "TEXT"],
  },
];

// ——— Hitler (politiek/maatschappelijk) ———
export const CHIPSET_HITLER: Chip[] = [
  {
    label: "Adolf Hitler",
    kind: "person",
    who: ["Adolf Hitler", "Hitler"],
    where: ["München", "Berlin", "Berlijn"],
    yearRange: { from: 1930, to: 1945 },
    type: ["IMAGE", "TEXT"],
    reusability: "open",
    boost: ["who", "YEAR"],
  },
  {
    label: "NSDAP",
    kind: "org",
    what: ["NSDAP", "Nationalsozialistische Deutsche Arbeiterpartei"],
    yearRange: { from: 1920, to: 1945 },
    type: ["IMAGE", "TEXT"],
  },
  {
    label: "propaganda / Wahlplakat",
    kind: "concept",
    what: ["propaganda", "Wahlplakat", "affiche", "poster"],
    type: ["IMAGE", "TEXT"],
  },
  {
    label: "Neurenbergwetten (1935)",
    kind: "law",
    what: ["Neurenbergwetten", "Nürnberger Gesetze"],
    yearRange: { from: 1935, to: 1936 },
    type: ["TEXT"],
  },
  {
    label: "Kristallnacht (1938)",
    kind: "event",
    what: ["Kristallnacht", "Novemberpogrome"],
    yearRange: { from: 1938, to: 1938 },
    type: ["IMAGE", "TEXT"],
  },
  {
    label: "Mein Kampf (1925/1926)",
    kind: "work",
    what: ["Mein Kampf"],
    yearRange: { from: 1925, to: 1926 },
    type: ["TEXT"],
  },
];

// ——— Kleine helpers ———

// Maakt een eenvoudige “anker”-chip van een vrije term (bv. persoon/onderwerp).
export function makeAnchorChip(term: string, opts?: {
  kind?: Chip["kind"];
  types?: Chip["type"];
  where?: string[];
  yearRange?: { from: number; to: number };
  reusability?: Chip["reusability"];
}): Chip {
  const t = String(term || "").trim();
  return {
    label: t,
    kind: opts?.kind || "person",
    who: [t],
    where: opts?.where,
    yearRange: opts?.yearRange,
    type: opts?.types || ["IMAGE", "TEXT"],
    reusability: opts?.reusability || "open",
    boost: ["who"],
  };
}

// Heuristische inflator: zet platte chip-labels om naar een minimale Chip-structuur.
export function inflateSimpleChip(label: string): Chip {
  const L = String(label || "").trim();

  // simpele herkenning op keywords
  const low = L.toLowerCase();
  if (/(portret|portrait|groepsportret)/.test(low)) {
    return { label: L, kind: "genre", what: [L], type: ["IMAGE"] };
  }
  if (/(ets|etching|radierung|eau-forte)/.test(low)) {
    return { label: L, kind: "technique", what: [L, "ets", "etching"], type: ["IMAGE", "TEXT"] };
  }
  if (/(chiaroscuro|clair-obscur|clairobscur)/.test(low)) {
    return { label: L, kind: "concept", what: ["chiaroscuro", "clair-obscur"], type: ["IMAGE"] };
  }
  if (/^(tv\d+|ka\s*\d+)$/i.test(L)) {
    return { label: L, kind: "concept", what: [L] };
  }
  // default: neem aan dat het een persoons- of werklabel is en zet in who/what
  return { label: L, kind: "person", who: [L] };
}

