import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./use-the-source.css";

function makePlayerKey() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

export default function SourceGameJoinPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"code" | "name">("code");
  const [gameCode, setGameCode] = useState("");
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkCode() {
    setBusy(true);
    setError("");
    try {
      const lookupRes = await fetch(`/api/sourcegame/lookup?game_code=${encodeURIComponent(gameCode.trim())}`);
      const lookup = await lookupRes.json();
      if (!lookup?.ok || !lookup?.session?.id) throw new Error(lookup?.error || "Gamecode niet gevonden");

      const sid = String(lookup.session.id);
      setSessionId(sid);
      setSessionTitle(String(lookup.session.title || lookup.session?.source?.title || "").trim());
      setStep("name");
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function joinGame() {
    setBusy(true);
    setError("");
    try {
      if (!sessionId) throw new Error("Sessie niet gevonden, controleer eerst de gamecode");
      const playerKey = makePlayerKey();
      const displayName = name.trim() || "Leerling";

      const joinRes = await fetch(`/api/sourcegame/sessions/${sessionId}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_key: playerKey,
          display_name: displayName,
        }),
      });
      const joined = await joinRes.json();
      if (!joined?.ok) throw new Error(joined?.error || "Joinen mislukt");

      navigate(`/sourcegame/play/${sessionId}?player_key=${encodeURIComponent(playerKey)}&name=${encodeURIComponent(displayName)}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="uts-shell">
      <div className="uts-stars" />
      <div className="uts-wrap">
        <header className="uts-header">
          <div className="uts-kicker">STUDENT ENTRY</div>
          <h1>Use the Source</h1>
          <p>Join met gamecode. Lees. Onthoud. Win.</p>
        </header>

        <article className="uts-panel uts-join-card uts-pin-wrap">
          {step === "code" ? (
            <>
              <h2>Voer Gamecode In</h2>
              <input
                className="uts-pin-input"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="US123"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && gameCode.trim()) checkCode();
                }}
              />
              <button className="uts-btn-primary uts-pin-btn" disabled={busy || !gameCode.trim()} onClick={checkCode}>
                {busy ? "Controleren..." : "Verder"}
              </button>
            </>
          ) : (
            <>
              <h2>Kies Je Naam</h2>
              <p className="uts-join-hint">
                Game: <strong>{gameCode.toUpperCase()}</strong>
                {sessionTitle ? ` · ${sessionTitle}` : ""}
              </p>
              <input
                className="uts-pin-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Je naam"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) joinGame();
                }}
              />
              <div className="uts-pin-actions">
                <button className="uts-btn-secondary" onClick={() => setStep("code")} disabled={busy}>
                  Terug
                </button>
                <button className="uts-btn-primary uts-pin-btn" disabled={busy || !name.trim()} onClick={joinGame}>
                  {busy ? "Joinen..." : "Join Game"}
                </button>
              </div>
            </>
          )}
          <p className="uts-join-hint">
            Docent-account aanmaken: <a href="/teacher/register">/teacher/register</a>
          </p>
          <p className="uts-join-hint">
            Spelregel: voer belangrijke begrippen in die bij de source passen. Ook passende begrippen die niet letterlijk in de bron staan kunnen punten opleveren. Dubbel invoeren = strafpunt.
          </p>
        </article>

        {error && <div className="uts-error">{error}</div>}
      </div>
    </div>
  );
}
