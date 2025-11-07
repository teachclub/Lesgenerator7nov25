import React from "react";

type Props = {
  raw?: any;        // Europeana raw item
  type?: string;    // "text" | "image" | etc.
};

function firsts(arr: any, n = 3): string[] {
  const a = Array.isArray(arr) ? arr : (arr ? [arr] : []);
  return a.map(String).filter(Boolean).slice(0, n);
}

export default function A23_MatchBadges({ raw, type }: Props) {
  const who = firsts(raw?.who);
  const what = firsts(raw?.what);
  const where = firsts(raw?.where);
  const year = firsts(raw?.year || raw?.YEAR);
  const edmType =
    type ||
    String(raw?.type || raw?.edmType || "")
      .toLowerCase();

  const badges: Array<{ k: string; v: string }> = [];

  if (edmType) badges.push({ k: "TYPE", v: edmType });
  who.forEach((v) => badges.push({ k: "who", v }));
  what.forEach((v) => badges.push({ k: "what", v }));
  where.forEach((v) => badges.push({ k: "where", v }));
  year.forEach((v) => badges.push({ k: "YEAR", v }));

  if (badges.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {badges.map((b, i) => (
        <span
          key={`${b.k}-${i}-${b.v}`}
          className="text-[11px] px-2 py-0.5 rounded-full border"
          title={`${b.k}: ${b.v}`}
        >
          <span className="opacity-60 mr-1">{b.k}</span>
          <span>{b.v}</span>
        </span>
      ))}
    </div>
  );
}

