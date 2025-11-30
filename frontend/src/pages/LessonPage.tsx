import React, { useState } from "react";

type FullLessonResponse = any; // later netjes typen

const LessonPage: React.FC = () => {
  const [title, setTitle] = useState("Testles Koude Oorlog");
  const [hook, setHook] = useState(
    "Waarom waren mensen zo bang voor kernwapens?"
  );
  const [sourceText, setSourceText] = useState(
    "Voorbeeldtekst over de dreiging van kernwapens tijdens de Koude Oorlog."
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<FullLessonResponse | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setLesson(null);

    try {
      const body = {
        concept: {
          title: title.trim(),
          hook: hook.trim(),
        },
        sources: [
          {
            id: "manual-1",
            fullText: sourceText.trim(),
          },
        ],
      };

      const res = await fetch("http://127.0.0.1:8081/api/generate-lesson-v2/full", {

        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Backend error: ${res.status} ${res.statusText} - ${text}`
        );
      }

      const data = await res.json();
      setLesson(data);
    } catch (e: any) {
      console.error("[LessonPage] full-lesson error:", e);
      setError(e.message || "Onbekende fout bij full-lesson.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Lessy Lesgenerator – Full lesson</h1>

      <div
        style={{
          padding: "1rem",
          border: "1px solid #ddd",
          borderRadius: 8,
          marginBottom: "1.5rem",
        }}
      >
        <h2>Concept</h2>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Titel
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Hook / hoofdvraag
          <input
            type="text"
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          Bron (fullText)
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={5}
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </label>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 1rem",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Les genereren..." : "Genereer volledige les"}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#ffe5e5",
            color: "#b00020",
            padding: "1rem",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          Fout bij full-lesson: {error}
        </div>
      )}

      {lesson && (
        <div
          style={{
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            fontSize: "0.9rem",
          }}
        >
          {JSON.stringify(lesson, null, 2)}
        </div>
      )}
    </div>
  );
};

export default LessonPage;

