import { useMemo } from "react";
import { useSelectionStore } from "@/state/selection.store";

export type Source = { id: string; title: string | string[]; type: string; url: string; preset?: boolean };
type SelectionListProps = { presetSources: Source[]; otherSources: Source[]; isLoading: boolean };

function normalizeTitle(t: string | string[]) { return Array.isArray(t) ? (t[0] || "") : (t || ""); }

function SourceItem({ s }: { s: Source }) {
  const { selected, toggle, isSelected, max } = useSelectionStore();
  const checked = isSelected(s.id);
  const full = selected.length >= max;
  const disabled = !checked && full;
  function onChange() {
    if (!checked && full) { alert(`Je kunt maximaal ${max} bronnen selecteren.`); return; }
    toggle({ id: s.id, title: normalizeTitle(s.title), type: s.type, url: s.url, preset: !!s.preset });
  }
  return (
    <li className="search-result-item">
      <input type="checkbox" id={`cb-${s.id}`} checked={checked} disabled={disabled} onChange={onChange} />
      <label htmlFor={`cb-${s.id}`}>{normalizeTitle(s.title)}</label>
      <span className="item-type">({s.type})</span>
      <a href={s.url} target="_blank" rel="noopener noreferrer" className="item-link">(bekijk bron)</a>
    </li>
  );
}

function GroupedSourceList({ sources }: { sources: Source[] }) {
  const grouped = useMemo(() => {
    const acc = new Map<string, Source[]>();
    for (const s of sources) {
      const t = (s.type || "").toLowerCase();
      let g = "Overig";
      if (t.includes("image") || t.includes("spotprent")) g = "Beeldbronnen";
      else if (t.includes("text")) g = "Tekstbronnen";
      else if (t.includes("video") || t.includes("sound") || t.includes("audio")) g = "Audio & Video";
      if (!acc.has(g)) acc.set(g, []);
      acc.get(g)!.push(s);
    }
    const order = ["Beeldbronnen", "Tekstbronnen", "Audio & Video", "Overig"];
    return order.map((key) => ({ key, list: acc.get(key) || [] })).filter((g) => g.list.length > 0);
  }, [sources]);

  return (
    <>
      {grouped.map((g) => (
        <div key={g.key} className="source-group">
          <h5 className="list-subheader-type">{g.key}</h5>
          <ul className="search-results-list other-list">
            {g.list.map((s) => <SourceItem key={s.id} s={s} />)}
          </ul>
        </div>
      ))}
    </>
  );
}

export default function SelectionList({ presetSources, otherSources, isLoading }: SelectionListProps) {
  const { selected, max } = useSelectionStore();
  if (isLoading) return <div className="selection-list-a30 loading">Zoekresultaten laden...</div>;
  const hasPreset = presetSources?.length > 0;
  const hasOthers = otherSources?.length > 0;
  if (!hasPreset && !hasOthers) return <div className="selection-list-a30 empty">Klik op een lesvoorstel om de bijbehorende bronnen te laden.</div>;
  return (
    <div className="selection-list-a30">
      <p>Geselecteerd: {selected.length} / {max}</p>
      {hasPreset && (<><h4 className="list-subheader">Aanbevolen door AI (Preset)</h4><ul className="search-results-list preset-list">{presetSources.map((s) => <SourceItem key={s.id} s={{ ...s, preset: true }} />)}</ul></>)}
      {hasOthers && (<><h4 className="list-subheader">Overige Geschikte Bronnen</h4><GroupedSourceList sources={otherSources} /></>)}
    </div>
  );
}

