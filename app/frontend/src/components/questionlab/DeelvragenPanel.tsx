import React from "react";

type Deelvraag = { id: number; subdimensie: string; vraag: string };

export function DeelvragenPanel(props: {
  zichtbaar: boolean;
  deelvragen: Deelvraag[] | null;
  extraPromptPerDeelvraag: Record<number, string>;
  onUpdateVraag: (index: number, nieuweVraag: string) => void;
  onUpdateExtraPrompt: (dvId: number, value: string) => void;
  onVerwijder: (id: number) => void;
  onVindBronnen: (dvId: number, vraag: string, subdimensie: string) => void;
  seemsInSubdimensie: (vraag: string, subdimensie: string) => boolean;
}) {
  const {
    zichtbaar,
    deelvragen,
    extraPromptPerDeelvraag,
    onUpdateVraag,
    onUpdateExtraPrompt,
    onVerwijder,
    onVindBronnen,
    seemsInSubdimensie,
  } = props;

  if (!zichtbaar) return null;

  return (
    <section className="ql-card">
      <h2>Deelvragen</h2>

      {(deelvragen || []).map((dv, index) => (
        <div key={dv.id} className="ql-deelvraag">
          <div className="ql-deelvraag-top">
            <div className="ql-subdimensie">{dv.subdimensie}</div>
            <button className="ql-x2" type="button" onClick={() => onVerwijder(dv.id)}>
              ×
            </button>
          </div>

          <textarea
            className="ql-textarea ql-textarea-small"
            value={dv.vraag}
            onChange={(e) => onUpdateVraag(index, e.target.value)}
          />

          <label className="ql-label ql-label-tight">Prompt voor deze deelvraag (optioneel)</label>
          <textarea
            className="ql-textarea ql-textarea-small"
            value={extraPromptPerDeelvraag[dv.id] || ""}
            onChange={(e) => onUpdateExtraPrompt(dv.id, e.target.value)}
            placeholder="Bijv. ‘neem een concreet voorbeeld (Berlijn, Cuba,…)’"
          />

          {!seemsInSubdimensie(dv.vraag, dv.subdimensie) && (
            <div className="ql-warn">⚠️ Mogelijk niet typisch voor “{dv.subdimensie}”.</div>
          )}

          <div className="ql-toolbar">
            <button className="ql-btn ql-btn-light" type="button" onClick={() => onVindBronnen(dv.id, dv.vraag, dv.subdimensie)}>
              🔍 Vind bronnen
            </button>
          </div>
        </div>
      ))}

      {!deelvragen?.length && <div className="ql-muted">Nog geen deelvragen.</div>}
    </section>
  );
}

