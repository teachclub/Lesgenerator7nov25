import { useLocation, useNavigate } from "react-router-dom";

export default function LabProposalsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const lab = location.state as any;

  if (!lab || lab.fromLab !== true) {
    return (
      <div style={{ padding: 24 }}>
        <h1>LAB – Voorstellen</h1>
        <p>Deze pagina kan alleen worden geopend vanuit de Vraaggenerator.</p>
        <button onClick={() => navigate("/lab/questions")}>
          Terug naar LAB
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>LAB – Lesvoorstellen</h1>

      <h2>Hoofdvraag</h2>
      <p>{lab.hoofdvraag}</p>

      <h2>Deelvragen</h2>
      <ul>
        {lab.deelvragen.map((d: any, i: number) => (
          <li key={i}>
            {d.subdimensie}: {d.vraag}
          </li>
        ))}
      </ul>

      <h2>Bronnen</h2>
      <ul>
        {lab.bronnenPerDeelvraag.flatMap((x: any) => x.bronnen).map(
          (b: any, i: number) => (
            <li key={i}>{b.title}</li>
          )
        )}
      </ul>

      <p>
        Tijdvak(ken): {lab.tijdvakken.join(", ") || "—"}<br/>
        Anti-presentisme: {lab.presentisme ? "aan" : "uit"}<br/>
        Niveau: {lab.niveau}
      </p>
    </div>
  );
}

