import React from "react";

type Hoofdvraag = { id: number; vraag: string };

export function HoofdvraagPanel(props: {
  hoofdvraagResult: Hoofdvraag[] | null;
  gekozenHoofdvraag: Hoofdvraag | null;
  onKies: (hv: Hoofdvraag) => void;
  onVerwijder: (id: number) => void;
  onWegklikken: () => void;
}) {
  const { hoofdvraagResult, gekozenHoofdvraag, onKies, onVerwijder, onWegklikken } = props;

  return (
    <section className="ql-card">
      <h2>Hoofdvraag (3 chips)</h2>

      <div className="ql-chiprow">
        {(hoofdvraagResult || []).map((hv) => (
          <div
            key={hv.id}
            className={`ql-bigchip ${gekozenHoofdvraag?.id === hv.id ? "ql-bigchip-on" : ""}`}
            onClick={() => onKies(hv)}
            role="button"
            tabIndex={0}
          >
            <span>{hv.vraag}</span>
            <button
              className="ql-x"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onVerwijder(hv.id);
              }}
              aria-label="Verwijder hoofvraag"
            >
              ×
            </button>
          </div>
        ))}
        {!hoofdvraagResult?.length && <div className="ql-muted">Nog geen hoofdvragen (klik links op genereren).</div>}
      </div>

      {gekozenHoofdvraag && (
        <div className="ql-picked">
          <div>
            <strong>Gekozen:</strong> {gekozenHoofdvraag.vraag}
          </div>
          <button className="ql-btn ql-btn-light" type="button" onClick={onWegklikken}>
            Wegklikken
          </button>
        </div>
      )}
    </section>
  );
}


