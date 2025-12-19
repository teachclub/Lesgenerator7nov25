import { useState } from "react";

type AnyObj = Record<string, any>;

export const useSearchMatch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [result, setResult] = useState<Record<string, any[]>>({});

  const fetchMatches = async (
    deelvraagId: string,
    vraag: string,
    subdimensie: string,
    tijdvak?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/search-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deelvraagId,
          deelvraag: vraag,
          subdimensie,
          tijdvak,
        }),
      });

      const data: AnyObj = await res.json();

      const lijst = Array.isArray(data?.bronnen)
        ? data.bronnen
        : Array.isArray(data?.sources)
          ? data.sources
          : [];

      setResult((prev) => ({
        ...prev,
        [deelvraagId]: lijst.map((b: AnyObj) => ({
          id: b.id,
          title: b.title || b.titel || "(zonder titel)",
          status: b.status || b.provider || "",
          motivatie: b.motivatie || b.description || "",
          kernargumenten: b.kernargumenten || [],
          didactische_waarde: b.didactische_waarde || null,
          eindscore: b.eindscore || null,
        })),
      }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, result, fetchMatches };
};

