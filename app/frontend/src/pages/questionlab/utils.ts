// ===== array / string helpers =====
export function uniq(arr: string[]) {
  return [...new Set(arr.filter(Boolean))];
}

export function normalizeBegrippen(input: string): string[] {
  return uniq(
    input
      .split(/[,\n;]/g)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

// ===== tijdvak labels =====
export function tvLabel(tv: string) {
  return `TV${tv}`;
}

export function tvLabelLong(tv: string) {
  const n = String(tv || "").trim();
  return n ? `Tijdvak ${n}` : "";
}

// ===== bron helpers =====
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

export function sourceKey(s: Source) {
  const u = String(s?.url || "");
  if (u) return u;
  return `${String(s?.provider)}|${String(s?.type)}|${String(s?.title)}`;
}

// ===== dimensie UI helpers =====
export type DimKey = "politiek" | "sociaal" | "cultureel" | "individueel";

export function dimColor(dim: DimKey) {
  if (dim === "politiek") return "#e7f0ff";
  if (dim === "sociaal") return "#fff6d6";
  if (dim === "cultureel") return "#ffe8d6";
  return "#efeaff";
}

export function dimAccent(dim: DimKey) {
  if (dim === "politiek") return "#2b6cb0";
  if (dim === "sociaal") return "#b7791f";
  if (dim === "cultureel") return "#c05621";
  return "#6b46c1";
}

export function labelShort(s: string) {
  const x = String(s || "").toLowerCase();
  if (x.includes("politiek")) return "Politiek";
  if (x.includes("sociaal")) return "Eco";
  if (x.includes("cultureel")) return "Cultuur";
  if (x.includes("individueel")) return "Individueel";
  return s;
}

