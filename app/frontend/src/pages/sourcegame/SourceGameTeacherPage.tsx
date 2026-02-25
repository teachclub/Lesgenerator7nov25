import { useEffect, useMemo, useRef, useState } from "react";
import "./use-the-source.css";
import { tvKaOptions } from "../../data/tvKaPresets";

type SearchSource = {
  id: string;
  provider?: string;
  title?: string;
  display_title?: string;
  human_title?: string;
  pretty_title?: string;
  source_title?: string;
  description?: string;
  fullText?: string;
  mainText?: string;
  imageUrl?: string | null;
  image_url?: string | null;
  image?: string | null;
  tv?: string;
  ka?: string;
  link?: string;
  url?: string;
  type?: string;
  _score?: number;
  _uiKey?: string;
};

type SessionApi = {
  ok: boolean;
  session?: {
    id: number;
    game_code?: string;
    status?: string;
    title?: string;
    clock?: {
      phase?: "waiting" | "reading" | "terms" | "chip_rain" | "question_reading" | "question_maker" | "quiz" | "time_up" | "finished";
      seconds_left_phase?: number;
    };
    teams?: Array<{ id: number; name: string; join_code: string; score?: number; players_count?: number }>;
  };
  error?: string;
};

function asText(x: unknown): string {
  return String(x || "").trim();
}

function normLex(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqList(xs: string[]) {
  return [...new Set((xs || []).map((x) => asText(x)).filter(Boolean))];
}

function topTokens(s: string) {
  const stop = new Set(["de", "het", "een", "en", "of", "van", "voor", "met", "op", "in", "aan", "als", "hoe", "waarom", "wat", "wie", "welke"]);
  return uniqList(
    normLex(s)
      .split(" ")
      .filter((w) => w.length >= 4 && !stop.has(w))
  ).slice(0, 12);
}

function cleanText(raw: unknown): string {
  return String(raw || "")
    .replace(/\[HTML\]/g, "")
    .replace(/\[WP\]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateAtWordEnd(raw: unknown, maxChars = 320): string {
  const text = cleanText(raw);
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, Math.max(20, maxChars));
  const lastSpace = cut.lastIndexOf(" ");
  const safe = (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trim();
  return `${safe}... lees verder`;
}

function pickSourceDisplayTitle(src: SearchSource): string {
  return asText(
    src.title ||
    src.display_title ||
    src.human_title ||
    src.pretty_title ||
    src.source_title ||
    src.id
  );
}

function pickSourceImageUrl(src: SearchSource): string {
  return asText(
    src.imageUrl ||
    src.image_url ||
    src.image
  );
}

function sourceUiKey(src: SearchSource, fallbackIndex = 0): string {
  return [
    asText(src.provider).toLowerCase(),
    asText(src.id),
    asText(src.url || src.link),
    pickSourceDisplayTitle(src).toLowerCase(),
    String(fallbackIndex),
  ].join("|");
}

function normalizeSearchSource(src: SearchSource, fallbackIndex = 0): SearchSource {
  const normalized = {
    ...src,
    title: pickSourceDisplayTitle(src),
    imageUrl: pickSourceImageUrl(src) || null,
  };
  return {
    ...normalized,
    _uiKey: asText(src._uiKey) || sourceUiKey(normalized, fallbackIndex),
  };
}

function hasImageSignal(src: SearchSource): boolean {
  const type = asText(src.type).toLowerCase();
  const hasTypeHit = /afbeelding|foto|prent|spotprent|poster|cartoon|illustratie|kaart|image/.test(type);
  const hasUrl = Boolean(pickSourceImageUrl(src));
  return hasTypeHit || hasUrl;
}

function toInt(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function countWords(raw: unknown): number {
  const text = cleanText(raw);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeWpm(value: number): number {
  if (!Number.isFinite(value)) return 80;
  return Math.max(40, Math.min(2000, Math.trunc(value)));
}

function estimateReadingSeconds(words: number, wpm: number): number {
  if (words <= 0) return 0;
  const speed = normalizeWpm(wpm);
  return Math.ceil((words / speed) * 60);
}

function phaseLabel(phase: string): string {
  const p = asText(phase).toLowerCase();
  if (!p) return "onbekend";
  if (p === "waiting") return "waiting";
  if (p === "reading") return "leesfase";
  if (p === "terms") return "termfase";
  if (p === "chip_rain") return "chip-rain";
  if (p === "question_reading") return "leesfase 2";
  if (p === "question_maker") return "vraagmaker";
  if (p === "quiz") return "quiz";
  if (p === "time_up") return "tijd op";
  if (p === "finished") return "klaar";
  return p;
}

const TV_PERIOD_BY_CODE: Record<string, string> = {
  TV1: "tot 3000 v.Chr.",
  TV2: "3000 v.Chr. – 500 n.Chr.",
  TV3: "500 – 1000",
  TV4: "1000 – 1500",
  TV5: "1500 – 1600",
  TV6: "1600 – 1700",
  TV7: "1700 – 1800",
  TV8: "1800 – 1900",
  TV9: "1900 – 1950 (20e eeuw, eerste helft)",
  TV10: "1950 – heden (20e/21e eeuw)",
};

function formatTvHuman(tvRaw: string): string {
  const tvCode = asText(tvRaw).toUpperCase();
  if (!tvCode) return "Tijdvak onbekend";
  const tvNum = Number(tvCode.replace(/[^\d]/g, ""));
  const tvLabel = tvKaOptions.find((opt) => opt.tv === tvNum)?.tvLabel || tvCode;
  const period = TV_PERIOD_BY_CODE[tvCode];
  return period ? `${tvLabel} · ${period}` : tvLabel;
}

function formatKaHuman(kaRaw: string, tvRaw: string): string {
  const kaCode = asText(kaRaw).toUpperCase();
  if (!kaCode) return "Kenmerkend aspect onbekend";
  const tvNum = Number(asText(tvRaw).replace(/[^\d]/g, ""));
  const kaNum = Number(kaCode.replace(/[^\d]/g, ""));
  const hit = tvKaOptions.find((opt) => opt.tv === tvNum && Number(opt.ka) === kaNum)
    || tvKaOptions.find((opt) => Number(opt.ka) === kaNum);
  if (!hit) return kaCode;
  const cleanLabel = asText(hit.kaLabel).replace(/^KA\d+\s*-\s*/i, "");
  return cleanLabel ? `Kenmerkend aspect: ${cleanLabel}` : kaCode;
}

const BUNDLED_CHASE_TRACK = "/audio/star-wars-style-chase-music-181118.mp3";
const BUNDLED_BATTLE_TRACK = "/audio/star-wars-style-battle-music-148641.mp3";
const READING_GRACE_AFTER_CRAWL_SECONDS = 30;

function normalizeAudioInputForSession(raw: string): string {
  const value = asText(raw);
  if (!value) return "";
  const lower = value.toLowerCase();
  if (
    /^https?:\/\/pixabay\.com\/.*star-wars-style-chase-music-181118\/?$/i.test(value) ||
    lower.includes("star-wars-style-chase-music-181118")
  ) {
    return BUNDLED_CHASE_TRACK;
  }
  if (
    /^https?:\/\/pixabay\.com\/.*star-wars-style-battle-music-148641\/?$/i.test(value) ||
    lower.includes("star-wars-style-battle-music-148641")
  ) {
    return BUNDLED_BATTLE_TRACK;
  }
  if (/^\/users\//i.test(value) || /^file:\/\//i.test(value)) {
    const base = value.split(/[\\/]/).pop() || "";
    return base ? `/audio/${encodeURIComponent(base)}` : "";
  }
  return value;
}

const TVS = Array.from({ length: 10 }, (_, i) => `TV${i + 1}`);
const TEACHER_INTRO_WPM = 135;
const TEACHER_INTRO_SPEED_MULTIPLIER = 1.5;
const TEACHER_INTRO_CRAWL_TITLE = "Mission Briefing // Use the Source";
const TEACHER_INTRO_CRAWL_BLOCKS = [
  "Scherp aan.",
  "Beste leraar, beste sourcerer.",
  "Lang geleden, in een vergeten tijdperk, lazen leerlingen vrijwillig bronnen. Ja, echt. Zonder zuchten. Zonder \"moet dit?\".",
  "Nu moeten we concurreren met Snapchat, TikTok, PlayStation en 47 open tabs die niets met geschiedenis te maken hebben.",
  "Goed nieuws: wij zijn de Yedi van het lokaal. Discipline, nieuwsgierigheid en bronkracht zitten nog in je klas, je moet ze alleen activeren.",
  "Kies een bron die past bij je les van vandaag en stuur teams de hyperspace in.",
  "Laat ze scoren op relevante begrippen, historische context en precisie.",
  "Goede bronkennis = meer punten. Wild gokken = punishment.",
  "Tip: pak een bron met herkenbare personen, gebeurtenissen en begrippen. Dan zie je meteen wie scherp leest en wie op automatische piloot zweeft.",
  "Ready? Druk op die button.",
  "May the source be with you.",
];

export default function SourceGameTeacherPage() {
  const [teacherIntroOpen, setTeacherIntroOpen] = useState(true);
  const [teacherIntroSeed, setTeacherIntroSeed] = useState(0);
  const [step, setStep] = useState<"select" | "game">("select");
  const [mainQuestion, setMainQuestion] = useState("");
  const [tv, setTv] = useState("TV9");
  const [ka, setKa] = useState("KA38");
  const [providerFilter, setProviderFilter] = useState<"ALLE" | "KLEIO" | "CITO">("ALLE");
  const [imageOnly, setImageOnly] = useState(false);

  const [searchBusy, setSearchBusy] = useState(false);
  const [queryHints, setQueryHints] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedSource, setSelectedSource] = useState<SearchSource | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const [teamsRaw, setTeamsRaw] = useState("Team Licht, Team Donker");
  const [readingWpm, setReadingWpm] = useState(180);
  const [termSeconds, setTermSeconds] = useState("60");
  const [chipRainEnabled, setChipRainEnabled] = useState(true);
  const [round2Count, setRound2Count] = useState("5");
  const [waitingMusicUrl, setWaitingMusicUrl] = useState("https://pixabay.com/nl/music/hoofdtitel-space-adventures-orchestral-music-star-wars-style-139660/");
  const [warmupMusicUrl, setWarmupMusicUrl] = useState(BUNDLED_CHASE_TRACK);
  const [musicUrl, setMusicUrl] = useState(BUNDLED_BATTLE_TRACK);
  const [teacherMusicOn, setTeacherMusicOn] = useState(false);
  const [teacherMusicVolume, setTeacherMusicVolume] = useState(65);
  const [introMusicBlocked, setIntroMusicBlocked] = useState(false);
  const teacherTrackRef = useRef<HTMLAudioElement | null>(null);
  const [previewSeed, setPreviewSeed] = useState(0);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const previewTextRef = useRef<HTMLDivElement | null>(null);
  const teacherIntroStageRef = useRef<HTMLDivElement | null>(null);
  const teacherIntroTextRef = useRef<HTMLDivElement | null>(null);
  const [teacherIntroMotion, setTeacherIntroMotion] = useState({ startPx: 340, endPx: 220 });
  const [previewMotion, setPreviewMotion] = useState({ startPx: 260, endPx: 180 });
  const [sessionBusy, setSessionBusy] = useState(false);
  const [session, setSession] = useState<SessionApi["session"]>();
  const [copyMsg, setCopyMsg] = useState("");

  const [error, setError] = useState("");
  const [leadDismissed, setLeadDismissed] = useState(false);
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadSchool, setLeadSchool] = useState("");
  const [leadConsentCommunity, setLeadConsentCommunity] = useState(true);
  const [leadConsentProduct, setLeadConsentProduct] = useState(false);
  const [leadMsg, setLeadMsg] = useState("");
  const [leadError, setLeadError] = useState("");
  const [manualSourceRef, setManualSourceRef] = useState("");
  const [manualSourceTitle, setManualSourceTitle] = useState("");
  const [manualSourceSnippet, setManualSourceSnippet] = useState("");
  const [manualSourceText, setManualSourceText] = useState("");
  const [manualSourceUrl, setManualSourceUrl] = useState("");
  const [manualSourceImage, setManualSourceImage] = useState("");
  const [manualSourceType, setManualSourceType] = useState("TEXT");

  useEffect(() => {
    if (!teacherIntroOpen) return;
    const stage = teacherIntroStageRef.current;
    const text = teacherIntroTextRef.current;
    if (!stage || !text) return;
    const measure = () => {
      const stageH = Math.max(360, stage.clientHeight || 0);
      const textH = Math.max(180, text.scrollHeight || 0);
      const startPx = Math.round(stageH * 0.95);
      const endPx = Math.max(140, Math.round(textH - stageH * 0.14));
      setTeacherIntroMotion((prev) =>
        prev.startPx === startPx && prev.endPx === endPx ? prev : { startPx, endPx }
      );
    };
    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(stage);
      ro.observe(text);
    } else {
      const t = window.setTimeout(measure, 250);
      return () => window.clearTimeout(t);
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, [teacherIntroOpen, teacherIntroSeed]);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem("uts_teacher_lead_dismissed_v1") === "1";
      const savedEmail = asText(window.localStorage.getItem("uts_teacher_lead_email_v1"));
      const savedName = asText(window.localStorage.getItem("uts_teacher_lead_name_v1"));
      const savedSchool = asText(window.localStorage.getItem("uts_teacher_lead_school_v1"));
      setLeadDismissed(dismissed);
      if (savedEmail) setLeadEmail(savedEmail);
      if (savedName) setLeadName(savedName);
      if (savedSchool) setLeadSchool(savedSchool);
    } catch {
      // localstorage fail-open
    }
  }, []);

  const topChips = useMemo(() => {
    return searchResults.slice(0, 5).map((s) => asText(s.title || s.id)).filter(Boolean);
  }, [searchResults]);

  const kaOptionsForTv = useMemo(() => {
    const tvNum = Number(String(tv || "").replace(/[^\d]/g, ""));
    if (!Number.isFinite(tvNum) || tvNum < 1) return [] as Array<{ value: string; label: string }>;
    return tvKaOptions
      .filter((opt) => opt.tv === tvNum)
      .map((opt) => ({
        value: `KA${opt.ka}`,
        label: asText(opt.kaLabel).replace(/^KA\d+\s*-\s*/i, "") || asText(opt.kaLabel),
      }));
  }, [tv]);

  useEffect(() => {
    if (!kaOptionsForTv.length) return;
    if (!kaOptionsForTv.some((opt) => opt.value === ka)) {
      setKa(kaOptionsForTv[0].value);
    }
  }, [kaOptionsForTv, ka]);

  const tvHumanLabel = useMemo(() => formatTvHuman(tv), [tv]);
  const kaHumanLabel = useMemo(() => formatKaHuman(ka, tv), [ka, tv]);

  useEffect(() => {
    if (step !== "game") return;
    const stage = previewStageRef.current;
    const text = previewTextRef.current;
    if (!stage || !text) return;

    const measure = () => {
      const stageH = Math.max(280, stage.clientHeight || 0);
      const textH = Math.max(120, text.scrollHeight || 0);
      const startPx = Math.round(stageH * 0.82);
      const endPx = Math.max(90, Math.round(textH - stageH * 0.24));
      setPreviewMotion((prev) =>
        prev.startPx === startPx && prev.endPx === endPx ? prev : { startPx, endPx }
      );
    };

    measure();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(stage);
      ro.observe(text);
    } else {
      const t = window.setTimeout(measure, 250);
      return () => window.clearTimeout(t);
    }
    return () => {
      if (ro) ro.disconnect();
    };
  }, [step, selectedSource, previewSeed, readingWpm, selectedSourceId]);

  const selectedBlocks = useMemo(() => {
    if (!selectedSource) return [] as Array<{ label: string; text: string }>;
    const blocks: Array<{ label: string; text: string }> = [];
    const push = (label: string, raw: unknown) => {
      const text = cleanText(raw);
      if (!text) return;
      if (blocks.some((b) => b.text === text)) return;
      blocks.push({ label, text });
    };
    push("Kerntekst", selectedSource.mainText);
    push("Volledige bron", selectedSource.fullText);
    push("Snippet", selectedSource.description);
    return blocks;
  }, [selectedSource]);

  const crawlPreview = useMemo(() => {
    const title = asText(selectedSource?.title || selectedSource?.id || "Bron");
    const snippetRaw = asText(selectedSource?.description);
    const textRaw = asText(selectedSource?.fullText || selectedSource?.mainText);
    const compact = (s: string) => s.replace(/\s+/g, " ").trim();
    const snippet = compact(snippetRaw);
    const text = compact(textRaw);
    const blocks: string[] = [];

    if (snippet && (!text || (text !== snippet && !text.includes(snippet)))) {
      blocks.push(snippetRaw);
    }

    if (textRaw) {
      const parsed = textRaw
        .split(/\n{2,}|\r\n\r\n/)
        .map((p) => p.replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (parsed.length) blocks.push(...parsed);
      else blocks.push(textRaw);
    }

    if (!blocks.length && snippetRaw) blocks.push(snippetRaw);
    return { title, blocks };
  }, [selectedSource]);

  const previewWordCount = useMemo(() => {
    return countWords([crawlPreview.title, ...crawlPreview.blocks].join(" "));
  }, [crawlPreview]);

  const computedReadingSeconds = useMemo(() => {
    return estimateReadingSeconds(previewWordCount, readingWpm);
  }, [previewWordCount, readingWpm]);

  const teacherPreviewTrackUrl = useMemo(() => {
    return normalizeAudioInputForSession(musicUrl);
  }, [musicUrl]);
  const teacherVolume01 = Math.max(0, Math.min(1, teacherMusicVolume / 100));
  const teacherIntroTrackUrl = BUNDLED_CHASE_TRACK;
  const teacherActiveTrackUrl = teacherIntroOpen
    ? teacherIntroTrackUrl
    : step === "game" && teacherMusicOn
    ? teacherPreviewTrackUrl
    : "";

  useEffect(() => {
    if (!teacherActiveTrackUrl) {
      if (teacherTrackRef.current) {
        teacherTrackRef.current.pause();
        teacherTrackRef.current.currentTime = 0;
        teacherTrackRef.current = null;
      }
      setIntroMusicBlocked(false);
      return;
    }
    if (teacherTrackRef.current) {
      teacherTrackRef.current.pause();
      teacherTrackRef.current.currentTime = 0;
      teacherTrackRef.current = null;
    }
    const audio = new Audio(teacherActiveTrackUrl);
    audio.loop = true;
    audio.volume = teacherVolume01;
    teacherTrackRef.current = audio;
    audio.play().then(() => {
      setIntroMusicBlocked(false);
    }).catch(async () => {
      try {
        audio.muted = true;
        await audio.play();
        audio.muted = false;
        audio.volume = teacherVolume01;
        setIntroMusicBlocked(false);
      } catch {
        if (teacherIntroOpen) setIntroMusicBlocked(true);
      }
    });
    return () => {
      audio.pause();
      audio.currentTime = 0;
      if (teacherTrackRef.current === audio) teacherTrackRef.current = null;
    };
  }, [teacherActiveTrackUrl, teacherVolume01, teacherIntroOpen]);

  useEffect(() => {
    if (teacherTrackRef.current) {
      teacherTrackRef.current.volume = teacherVolume01;
    }
  }, [teacherVolume01]);

  function tryStartIntroMusic() {
    const track = teacherTrackRef.current;
    if (!teacherIntroOpen || !track) return;
    track.play().then(() => {
      setIntroMusicBlocked(false);
    }).catch(() => {
      setIntroMusicBlocked(true);
    });
  }

  useEffect(() => {
    if (!teacherIntroOpen || !introMusicBlocked) return;
    const onAnyInteraction = () => {
      tryStartIntroMusic();
    };
    window.addEventListener("pointerdown", onAnyInteraction, { once: true });
    window.addEventListener("keydown", onAnyInteraction, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onAnyInteraction);
      window.removeEventListener("keydown", onAnyInteraction);
    };
  }, [teacherIntroOpen, introMusicBlocked]);

  async function copyText(label: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyMsg(`${label} gekopieerd`);
      setTimeout(() => setCopyMsg(""), 1400);
    } catch {
      setCopyMsg("Kopieren mislukt");
      setTimeout(() => setCopyMsg(""), 1400);
    }
  }

  async function refreshSession(id: number | string) {
    const res = await fetch(`/api/sourcegame/sessions/${id}`);
    const json = (await res.json()) as SessionApi;
    if (!json?.ok || !json.session?.id) throw new Error(json?.error || "Kon sessie niet laden");
    setSession(json.session);
  }

  async function enrichWithDetail(src: SearchSource): Promise<SearchSource> {
    const url = asText(src.url || src.link);
    if (!url || !url.includes("vgnkleio.nl/bronnen/")) return src;
    try {
      setDetailBusy(true);
      const res = await fetch("/api/source-detail", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!json?.ok) return src;
      return {
        ...src,
        title: asText(json.title) || src.title,
        fullText: asText(json.fullText) || src.fullText,
        imageUrl: asText(json.imageUrl) || src.imageUrl,
        type: asText(json.type) || src.type,
        provider: asText(json.provider) || src.provider,
      };
    } catch {
      return src;
    } finally {
      setDetailBusy(false);
    }
  }

  async function selectSource(src: SearchSource) {
    const normalized = normalizeSearchSource(src);
    const key = asText(normalized._uiKey) || sourceUiKey(normalized);
    setSelectedSourceId(key);
    setSelectedSource(normalized);
    const enrichedRaw = await enrichWithDetail(normalized);
    const enriched = normalizeSearchSource({
      ...normalized,
      ...enrichedRaw,
      _uiKey: key,
    });
    setSelectedSource(enriched);
    setSearchResults((prev) =>
      prev.map((p) => {
        const rowKey = asText(p._uiKey) || sourceUiKey(p);
        return rowKey === key ? { ...p, ...enriched, _uiKey: key } : p;
      })
    );
  }

  async function runSourceSearch() {
    setSearchBusy(true);
    setError("");
    try {
      const q = asText(mainQuestion);
      if (!q) throw new Error("Voer eerst een hoofdvraag in");

      let queries = [q];
      try {
        const suggestRes = await fetch("/api/seed-source-suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tv: tv ? [tv] : [],
            ka,
            richting: q,
          }),
        });
        const suggestJson = await suggestRes.json();
        const extra = Array.isArray(suggestJson?.queries) ? suggestJson.queries.map((x: unknown) => asText(x)) : [];
        queries = uniqList([q, ...extra]).slice(0, 8);
      } catch {
        // fail-open
      }

      const body = {
        query: queries,
        rows: 36,
        filters: {
          tv: tv || undefined,
          ka: ka || undefined,
          text: true,
          images: true,
          cito: providerFilter !== "KLEIO",
          kleio: providerFilter !== "CITO",
          historiek: false,
        },
        cacheFirst: true,
        cacheMin: 8,
        cacheLimit: 36,
      };

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      const raw = Array.isArray(json?.sources) ? (json.sources as SearchSource[]) : [];
      const rawNormalized = raw.map((src, idx) => normalizeSearchSource(src, idx));
      const providerScoped = rawNormalized.filter((src) => {
        const p = asText(src.provider).toLowerCase();
        if (providerFilter === "KLEIO") return p.includes("kleio");
        if (providerFilter === "CITO") return p.includes("cito");
        return true;
      });
      const imageScoped = imageOnly ? providerScoped.filter((src) => hasImageSignal(src)) : providerScoped;
      const tokens = topTokens(q);

      const scored = imageScoped
        .map((src, idx) => {
          const title = pickSourceDisplayTitle(src);
          const blob = normLex([title, src.description, src.fullText, src.mainText].filter(Boolean).join(" "));
          const tokenScore = tokens.reduce((acc, t) => (blob.includes(t) ? acc + 1 : acc), 0);
          return normalizeSearchSource(
            {
              ...src,
              title,
              imageUrl: pickSourceImageUrl(src) || null,
              _score: tokenScore,
            },
            idx
          );
        })
        .sort((a, b) => Number(b._score || 0) - Number(a._score || 0));

      setQueryHints(queries);
      setSearchResults(scored);

      if (scored.length) {
        await selectSource(scored[0]);
      } else {
        setSelectedSource(null);
        setSelectedSourceId("");
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSearchBusy(false);
    }
  }

  function applyManualSource() {
    setError("");
    const ref = asText(manualSourceRef);
    const title = asText(manualSourceTitle);
    const text = cleanText(manualSourceText);
    if (!ref) {
      setError("Handmatige bron: vul minimaal een bron-ref/id in.");
      return;
    }
    if (!title) {
      setError("Handmatige bron: vul een titel in.");
      return;
    }
    if (!text && !asText(manualSourceSnippet)) {
      setError("Handmatige bron: vul tekst of snippet in.");
      return;
    }

    const src: SearchSource = {
      id: ref,
      provider: "Handmatig",
      title,
      description: asText(manualSourceSnippet),
      fullText: text,
      mainText: text,
      imageUrl: asText(manualSourceImage) || null,
      tv: tv || "",
      ka: ka || "",
      link: asText(manualSourceUrl),
      url: asText(manualSourceUrl),
      type: asText(manualSourceType) || "TEXT",
      _score: 999,
      _uiKey: `manual|${ref}`,
    };
    setSelectedSourceId(asText(src._uiKey) || ref);
    setSelectedSource(src);
  }

  async function createGame() {
    setSessionBusy(true);
    setError("");
    try {
      if (!selectedSource) throw new Error("Selecteer eerst een bron op pagina 1");

      const teams = teamsRaw
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      if (teams.length < 2) throw new Error("Geef minimaal 2 teams op");

      const sourceId = asText(selectedSource.id);
      const sourceTitle = asText(selectedSource.title || sourceId);
      const sourceSnippet = cleanText(selectedSource.description);
      const sourceText = cleanText(selectedSource.fullText || selectedSource.mainText || selectedSource.description);
      const sourceUrl = asText(selectedSource.url || selectedSource.link);
      const term = Math.max(15, toInt(termSeconds, 60));
      const readingWithGrace = computedReadingSeconds + READING_GRACE_AFTER_CRAWL_SECONDS;
      const duration = Math.max(15, readingWithGrace + term);
      const questionCount = Math.max(2, Math.min(12, toInt(round2Count, 5)));
      const chipRainSeconds = chipRainEnabled ? 35 : 0;

      const createRes = await fetch("/api/sourcegame/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: {
            id: sourceId,
            ref: sourceId,
            title: sourceTitle,
            snippet: sourceSnippet,
            text: sourceText,
            tv,
            ka,
            image_url: asText(selectedSource.imageUrl),
            url: sourceUrl,
            type: asText(selectedSource.type) || "TEXT",
          },
          teams,
          settings: {
            duration_seconds: duration,
            reading_seconds: readingWithGrace,
            term_seconds: term,
            lock_teams_on_start: true,
            bonus_tv: true,
            bonus_ka: true,
            enable_chip_rain: chipRainEnabled,
            chip_rain_seconds: chipRainSeconds,
            round2_question_count: questionCount,
            question_reading_seconds: computedReadingSeconds,
            question_maker_seconds: Math.max(30, Math.min(240, questionCount * 15)),
            quiz_seconds: Math.max(90, Math.min(900, questionCount * 35)),
            reading_wpm: Number(readingWpm),
          },
          meta: {
            reading_wpm: Number(readingWpm),
            waiting_music_url: normalizeAudioInputForSession(waitingMusicUrl),
            warmup_music_url: normalizeAudioInputForSession(warmupMusicUrl),
            music_live_url: normalizeAudioInputForSession(musicUrl),
            music_url: normalizeAudioInputForSession(musicUrl),
          },
        }),
      });
      const created = (await createRes.json()) as SessionApi;
      if (!created?.ok || !created.session?.id) throw new Error(created?.error || "Game maken mislukt");

      await refreshSession(created.session.id);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSessionBusy(false);
    }
  }

  async function startGame() {
    if (!session?.id) return;
    const joinedCount = (session.teams || []).reduce((acc, t) => acc + Number(t.players_count || 0), 0);
    if (joinedCount < 1) {
      setError("Start game kan pas zodra minimaal 1 leerling is gejoined.");
      return;
    }

    let boardWindow: Window | null = null;
    try {
      boardWindow = window.open("", "_blank", "noopener,noreferrer");
    } catch {
      boardWindow = null;
    }

    setSessionBusy(true);
    setError("");
    try {
      const sid = session.id;
      const res = await fetch(`/api/sourcegame/sessions/${sid}/start`, { method: "POST" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Sessie starten mislukt");
      await refreshSession(sid);
      if (boardWindow) {
        boardWindow.location.href = `/sourcegame/board/${sid}`;
      }
    } catch (e: any) {
      if (boardWindow) {
        try {
          boardWindow.close();
        } catch {
          // ignore
        }
      }
      setError(String(e?.message || e));
    } finally {
      setSessionBusy(false);
    }
  }

  async function stopAutocueNow() {
    if (!session?.id) return;
    setSessionBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sourcegame/sessions/${session.id}/reading-done`, { method: "POST" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Autocue stoppen mislukt");
      await refreshSession(session.id);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSessionBusy(false);
    }
  }

  function dismissLeadCard() {
    setLeadDismissed(true);
    try {
      window.localStorage.setItem("uts_teacher_lead_dismissed_v1", "1");
    } catch {
      // ignore
    }
  }

  async function submitTeacherLead() {
    setLeadError("");
    setLeadMsg("");
    const email = asText(leadEmail).toLowerCase();
    if (!email) {
      setLeadError("Vul je e-mailadres in.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLeadError("Gebruik een geldig e-mailadres.");
      return;
    }
    if (!leadConsentCommunity && !leadConsentProduct) {
      setLeadError("Kies minimaal 1 opt-in.");
      return;
    }
    setLeadBusy(true);
    try {
      const res = await fetch("/api/sourcegame/teacher-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          display_name: asText(leadName),
          school_name: asText(leadSchool),
          consent_community: leadConsentCommunity,
          consent_product: leadConsentProduct,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Aanmelden mislukt");
      try {
        window.localStorage.setItem("uts_teacher_lead_email_v1", email);
        window.localStorage.setItem("uts_teacher_lead_name_v1", asText(leadName));
        window.localStorage.setItem("uts_teacher_lead_school_v1", asText(leadSchool));
        window.localStorage.setItem("uts_teacher_lead_dismissed_v1", "1");
      } catch {
        // ignore
      }
      setLeadMsg("Top. Je bent optioneel aangemeld.");
      setLeadDismissed(true);
    } catch (e: any) {
      setLeadError(String(e?.message || e));
    } finally {
      setLeadBusy(false);
    }
  }

  const teacherIntroWordCount = useMemo(
    () => countWords([TEACHER_INTRO_CRAWL_TITLE, ...TEACHER_INTRO_CRAWL_BLOCKS].join(" ")),
    []
  );
  const teacherIntroDuration = useMemo(
    () => Math.max(30, Math.ceil(estimateReadingSeconds(teacherIntroWordCount, TEACHER_INTRO_WPM) / TEACHER_INTRO_SPEED_MULTIPLIER)),
    [teacherIntroWordCount]
  );

  const gameCode = asText(session?.game_code || (session?.id ? `US${session.id}` : ""));
  const playerJoinPath = "/join";
  const playerJoinUrl = typeof window !== "undefined" ? `${window.location.origin}${playerJoinPath}` : playerJoinPath;
  const smartboardPath = session?.id ? `/sourcegame/board/${session.id}` : "";
  const smartboardUrl = typeof window !== "undefined" && smartboardPath ? `${window.location.origin}${smartboardPath}` : smartboardPath;
  const joinedCount = (session?.teams || []).reduce((acc, t) => acc + Number(t.players_count || 0), 0);
  const canStart = Boolean(session?.id) && asText(session?.status) !== "live" && joinedCount >= 1;
  const phase = asText(session?.clock?.phase || "");
  const canStopAutocue = Boolean(session?.id) && asText(session?.status) === "live" && (phase === "reading" || phase === "question_reading");
  useEffect(() => {
    if (!session?.id) return;
    const timer = window.setInterval(() => {
      refreshSession(session.id).catch(() => void 0);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [session?.id]);

  return (
    <div className="uts-shell">
      <div className="uts-stars" />
      <div className="uts-wrap uts-wrap-teacher">
        <div className="uts-ql-head">
          <h1>QuestionLab (QL03) → Use the Source</h1>
          <p>Docentmodule: eerst bron kiezen in QL-flow, daarna game instellen.</p>
        </div>

        {teacherIntroOpen ? (
          <section className="uts-ql-card uts-teacher-intro-card">
            <div className="uts-teacher-intro-logo">USE THE SOURCE</div>
            <div className="uts-teacher-cockpit-frame">
              <div className="uts-teacher-cockpit-window-wrap">
                <div className="uts-teacher-cockpit-window">
                  <div className="uts-teacher-cockpit-screen">
                    <div
                      ref={teacherIntroStageRef}
                      className="uts-crawl-stage uts-teacher-crawl-stage"
                      style={{
                        ["--crawl-duration" as any]: `${teacherIntroDuration}s`,
                        ["--crawl-start-px" as any]: `${teacherIntroMotion.startPx}px`,
                        ["--crawl-end-px" as any]: `${teacherIntroMotion.endPx}px`,
                      }}
                    >
                      <div className="uts-crawl-fade" />
                      <div className="uts-crawl-label">AUTOCUE · MISSION BRIEFING</div>
                      <div className="uts-crawl-perspective">
                        <div
                          ref={teacherIntroTextRef}
                          key={`${teacherIntroSeed}:${teacherIntroDuration}:${teacherIntroMotion.startPx}:${teacherIntroMotion.endPx}`}
                          className="uts-crawl-text uts-crawl-text-preview-loop uts-teacher-crawl-text"
                        >
                          <h3>{TEACHER_INTRO_CRAWL_TITLE}</h3>
                          {TEACHER_INTRO_CRAWL_BLOCKS.map((block, i) => (
                            <p key={`teacher-intro-${i}-${block.slice(0, 18)}`}>{block}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="uts-teacher-cockpit-meta">
                Cockpit raam: groot · 3D autocue · loop {teacherIntroDuration}s
                <div className="uts-teacher-cockpit-actions">
                  {introMusicBlocked ? (
                    <button
                      type="button"
                      className="uts-btn-secondary"
                      onClick={tryStartIntroMusic}
                    >
                      Start soundtrack
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="uts-btn-secondary"
                    onClick={() => setTeacherIntroSeed((v) => v + 1)}
                  >
                    Herstart briefing
                  </button>
                </div>
              </div>
            </div>
            <div className="uts-ql-actions">
              <button
                type="button"
                className="uts-btn-primary"
                onClick={() => setTeacherIntroOpen(false)}
              >
                Find the Source
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="uts-ql-tabs">
              <button type="button" className={`uts-ql-tab ${step === "select" ? "active" : ""}`} onClick={() => setStep("select")}>
                Pagina 1 · Bron + Hoofdvraag
              </button>
              <button
                type="button"
                className={`uts-ql-tab ${step === "game" ? "active" : ""}`}
                onClick={() => {
                  if (selectedSource) setStep("game");
                }}
              >
                Pagina 2 · Game instellingen
              </button>
            </div>

            {!leadDismissed ? (
              <section className="uts-ql-card uts-optin-card">
                <div className="uts-optin-head">
                  <h3>Optioneel aanmelden</h3>
                  <button type="button" className="uts-optin-skip" onClick={dismissLeadCard}>Later</button>
                </div>
                <p className="uts-muted" style={{ marginTop: 0 }}>
                  Wil je updates over nieuwe spelvormen en extra rondes? Laat vrijblijvend je e-mail achter.
                </p>
                <div className="uts-optin-grid">
                  <input
                    className="uts-ql-input"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="jij@school.nl"
                  />
                  <input
                    className="uts-ql-input"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Naam (optioneel)"
                  />
                  <input
                    className="uts-ql-input"
                    value={leadSchool}
                    onChange={(e) => setLeadSchool(e.target.value)}
                    placeholder="School (optioneel)"
                  />
                </div>
                <div className="uts-optin-consent">
                  <label className="uts-ql-check">
                    <input type="checkbox" checked={leadConsentCommunity} onChange={(e) => setLeadConsentCommunity(e.target.checked)} />
                    <span>Community-updates ontvangen</span>
                  </label>
                  <label className="uts-ql-check">
                    <input type="checkbox" checked={leadConsentProduct} onChange={(e) => setLeadConsentProduct(e.target.checked)} />
                    <span>Nieuws over extra spellen ontvangen</span>
                  </label>
                </div>
                <div className="uts-ql-actions">
                  <button type="button" className="uts-btn-primary" onClick={submitTeacherLead} disabled={leadBusy}>
                    {leadBusy ? "Aanmelden..." : "Vrijblijvend aanmelden"}
                  </button>
                </div>
                {leadError ? <div className="uts-error" style={{ marginTop: 8 }}>{leadError}</div> : null}
                {leadMsg ? <div className="uts-copy-msg" style={{ marginTop: 8 }}>{leadMsg}</div> : null}
              </section>
            ) : null}

            {step === "select" ? (
          <div className="uts-ql-grid">
            <section className="uts-ql-card">
              <h2>Instellingen</h2>

              <div className="uts-ql-label" style={{ marginTop: 12 }}>Tijdvakken</div>
              <div className="uts-tv-grid">
                {TVS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`uts-tv-chip ${tv === t ? "active" : ""}`}
                    onClick={() => setTv(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <label className="uts-ql-label" style={{ marginTop: 12 }}>KA</label>
              <select className="uts-ql-input" value={ka} onChange={(e) => setKa(e.target.value)}>
                <option value="">-- Kies KA --</option>
                {kaOptionsForTv.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="uts-inline">
                <div>
                  <label className="uts-ql-label">Providerfilter</label>
                  <select className="uts-ql-input" value={providerFilter} onChange={(e) => setProviderFilter(e.target.value as "ALLE" | "KLEIO" | "CITO")}>
                    <option value="ALLE">Alle providers</option>
                    <option value="KLEIO">Alleen Kleio</option>
                    <option value="CITO">Alleen Cito</option>
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "end" }}>
                  <label className="uts-ql-check" style={{ marginBottom: 8 }}>
                    <input type="checkbox" checked={imageOnly} onChange={(e) => setImageOnly(e.target.checked)} />
                    <span>Alleen afbeeldingen</span>
                  </label>
                </div>
              </div>

              <label className="uts-ql-label">Wat voor soort bron zoek je?</label>
              <textarea
                className="uts-ql-textarea"
                value={mainQuestion}
                onChange={(e) => setMainQuestion(e.target.value)}
                placeholder="Bijv. een spotprent, foto of tekstbron over..."
                rows={4}
              />

              <div className="uts-manual-block">
                <div className="uts-manual-title">Of voer zelf een bron in</div>
                <input
                  className="uts-ql-input"
                  value={manualSourceRef}
                  onChange={(e) => setManualSourceRef(e.target.value)}
                  placeholder="Bron-ref / bron-id"
                />
                <input
                  className="uts-ql-input"
                  value={manualSourceTitle}
                  onChange={(e) => setManualSourceTitle(e.target.value)}
                  placeholder="Bron titel"
                />
                <input
                  className="uts-ql-input"
                  value={manualSourceSnippet}
                  onChange={(e) => setManualSourceSnippet(e.target.value)}
                  placeholder="Korte snippet (optioneel)"
                />
                <textarea
                  className="uts-ql-textarea"
                  value={manualSourceText}
                  onChange={(e) => setManualSourceText(e.target.value)}
                  placeholder="Volledige bron- of contexttekst"
                  rows={4}
                />
                <div className="uts-inline">
                  <div>
                    <input
                      className="uts-ql-input"
                      value={manualSourceUrl}
                      onChange={(e) => setManualSourceUrl(e.target.value)}
                      placeholder="Bron URL (optioneel)"
                    />
                  </div>
                  <div>
                    <input
                      className="uts-ql-input"
                      value={manualSourceImage}
                      onChange={(e) => setManualSourceImage(e.target.value)}
                      placeholder="Afbeelding URL (optioneel)"
                    />
                  </div>
                  <div>
                    <input
                      className="uts-ql-input"
                      value={manualSourceType}
                      onChange={(e) => setManualSourceType(e.target.value)}
                      placeholder="Type (TEXT/IMAGE)"
                    />
                  </div>
                </div>
                <button type="button" className="uts-btn-secondary" onClick={applyManualSource}>
                  Gebruik handmatige bron
                </button>
              </div>

              <div className="uts-ql-actions">
                <button type="button" className="uts-btn-primary" disabled={searchBusy || !asText(mainQuestion)} onClick={runSourceSearch}>
                  {searchBusy ? "Zoekt..." : "Zoek Bronnen"}
                </button>
              </div>
            </section>

            <section className="uts-ql-card">
              <h2>Preview treffers</h2>
              {!searchResults.length ? <div className="uts-muted">Nog geen treffers. Klik “Zoek Bronnen”.</div> : null}

              {!!topChips.length && (
                <div className="uts-chip-row">
                  {topChips.map((c) => (
                    <span key={c} className="uts-chip-soft">{c}</span>
                  ))}
                </div>
              )}

              {!!queryHints.length && (
                <div className="uts-hints-inline">
                  Zoeksporen: {queryHints.slice(0, 5).join(" • ")}
                </div>
              )}

              <div className="uts-preview-list">
                {searchResults.map((s, idx) => {
                  const rowKey = asText(s._uiKey) || sourceUiKey(s, idx);
                  const active = rowKey === selectedSourceId;
                  const snippet = truncateAtWordEnd(s.description || s.mainText || s.fullText, 320);
                  const imageSnippetUrl = pickSourceImageUrl(s);
                  const showImageSnippet = hasImageSignal(s) && !!imageSnippetUrl;
                  return (
                    <button
                      key={rowKey}
                      type="button"
                      className={`uts-preview-card ${active ? "active" : ""}`}
                      onClick={() => {
                        void selectSource(s);
                      }}
                    >
                      <div className="uts-preview-title">{pickSourceDisplayTitle(s)}</div>
                      <div className="uts-preview-meta">{asText(s.provider) || "Bron"} · {asText(s.type) || "TEXT"}</div>
                      <div className="uts-preview-badges">
                        <span className="uts-badge">{idx < 4 ? "★ ★ ★ meest relevant" : "★ ★ relevant"}</span>
                      </div>
                      {showImageSnippet ? (
                        <div className="uts-preview-image-snippet-wrap">
                          <img
                            src={imageSnippetUrl}
                            alt={`snippet ${pickSourceDisplayTitle(s)}`}
                            className="uts-preview-image-snippet"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                      {!!snippet && <div className="uts-preview-snippet">{snippet}</div>}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="uts-ql-card">
              <h2>Individuele weergave</h2>
              {!selectedSource ? <div className="uts-muted">Klik in de middelste kolom op een treffer.</div> : null}
              {selectedSource ? (
                <>
                  <div className="uts-detail-title">{asText(selectedSource.title || selectedSource.id)}</div>
                  <div className="uts-detail-meta">{asText(selectedSource.provider) || "Bron"} · {asText(selectedSource.type) || "TEXT"}</div>
                  {detailBusy ? <div className="uts-muted" style={{ marginTop: 8 }}>Details laden...</div> : null}

                  {asText(selectedSource.imageUrl) ? (
                    <img src={asText(selectedSource.imageUrl)} alt="bron" className="uts-detail-image" />
                  ) : null}

                  {selectedBlocks.map((b, i) => (
                    <div key={`${b.label}-${i}`} className="uts-detail-block">
                      <div className="uts-detail-label">{b.label}</div>
                      <div className="uts-detail-text">{b.text}</div>
                    </div>
                  ))}

                  {asText(selectedSource.url || selectedSource.link) ? (
                    <a className="uts-open-link" href={asText(selectedSource.url || selectedSource.link)} target="_blank" rel="noreferrer">
                      open bron
                    </a>
                  ) : null}
                </>
              ) : null}

              <div className="uts-divider" />
              <div className="uts-muted">Gekozen hoofdvraag: <b>{asText(mainQuestion) || "—"}</b></div>
              <button
                type="button"
                className="uts-btn-primary"
                style={{ width: "100%" }}
                disabled={!selectedSource || !asText(mainQuestion)}
                onClick={() => setStep("game")}
              >
                Gebruik bron in game
              </button>
            </section>
          </div>
        ) : (
          <div className="uts-step2-grid">
            <section className="uts-ql-card">
              <h2>Game parameters</h2>
              <div className="uts-muted" style={{ marginBottom: 8 }}>
                Winst wordt pas bepaald na 2 rondes: termen + vraag/meerkeuze.
              </div>
              <div className="uts-source-mini">
                <div><strong>Gekozen bron:</strong> {asText(selectedSource?.title || selectedSource?.id) || "(geen)"}</div>
                <div className="uts-source-mini-meta">{tvHumanLabel}</div>
                <div className="uts-source-mini-meta">{kaHumanLabel}</div>
              </div>

              <label className="uts-ql-label">Teams (komma-gescheiden)</label>
              <input className="uts-ql-input" value={teamsRaw} onChange={(e) => setTeamsRaw(e.target.value)} placeholder="Team Licht, Team Donker" />

              <label className="uts-ql-label">Autocue snelheid ({readingWpm} woorden/min)</label>
              <div className="uts-speed-row">
                <input
                  type="range"
                  min={40}
                  max={2000}
                  step={5}
                  value={readingWpm}
                  onChange={(e) => setReadingWpm(normalizeWpm(Number(e.target.value)))}
                />
                <input
                  className="uts-ql-input uts-wpm-input"
                  value={String(readingWpm)}
                  onChange={(e) => setReadingWpm(normalizeWpm(Number(e.target.value)))}
                />
                <button type="button" className="uts-btn-secondary" onClick={() => setPreviewSeed((v) => v + 1)}>
                  Herstart preview
                </button>
              </div>
              <div className="uts-muted">
                Geschatte leestijd crawl: <b>{computedReadingSeconds}s</b> ({previewWordCount} woorden) ·
                uitloop na laatste zin: <b>{READING_GRACE_AFTER_CRAWL_SECONDS}s</b> ·
                leesfase totaal: <b>{computedReadingSeconds + READING_GRACE_AFTER_CRAWL_SECONDS}s</b>.
              </div>

              <label className="uts-ql-label">Muziek tijdens wachten (voor start)</label>
              <input
                className="uts-ql-input"
                value={waitingMusicUrl}
                onChange={(e) => setWaitingMusicUrl(e.target.value)}
                placeholder="Plak bij voorkeur een directe .mp3 link"
              />

              <label className="uts-ql-label">Opwarm-track vlak na start</label>
              <input
                className="uts-ql-input"
                value={warmupMusicUrl}
                onChange={(e) => setWarmupMusicUrl(e.target.value)}
                placeholder="Plak bij voorkeur een directe .mp3 link"
              />

              <label className="uts-ql-label">Muziek tijdens game (termfase)</label>
              <input
                className="uts-ql-input"
                value={musicUrl}
                onChange={(e) => setMusicUrl(e.target.value)}
                placeholder="Plak bij voorkeur een directe .mp3 link"
              />
              <div className="uts-volume-wrap">
                <button
                  type="button"
                  className={`uts-music-toggle ${teacherMusicOn ? "on" : "off"}`}
                  onClick={() => setTeacherMusicOn((v) => !v)}
                >
                  Preview game-track: {teacherMusicOn ? "aan" : "uit"}
                </button>
                <span className="uts-volume-label">Volume {teacherMusicVolume}%</span>
                <input
                  className="uts-volume-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={teacherMusicVolume}
                  onChange={(e) => setTeacherMusicVolume(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                />
              </div>

              <div className="uts-params-grid">
                <div>
                  <label className="uts-ql-label">Begrippenronde (s)</label>
                  <input className="uts-ql-input" value={termSeconds} onChange={(e) => setTermSeconds(e.target.value)} />
                </div>
                <div style={{ display: "flex", alignItems: "end" }}>
                  <label className="uts-ql-check" style={{ marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={chipRainEnabled}
                      onChange={(e) => setChipRainEnabled(Boolean(e.target.checked))}
                    />
                    <span>Bonusronde begrippenregen (chip-rain)</span>
                  </label>
                </div>
                <div>
                  <label className="uts-ql-label">Aantal quizvragen</label>
                  <input className="uts-ql-input" value={round2Count} onChange={(e) => setRound2Count(e.target.value)} />
                </div>
              </div>

              <div className="uts-crawl-preview-wrap">
                <div
                  ref={previewStageRef}
                  className="uts-crawl-stage uts-crawl-stage-preview"
                  style={{
                    ["--crawl-duration" as any]: `${Math.max(1, computedReadingSeconds)}s`,
                    ["--crawl-start-px" as any]: `${previewMotion.startPx}px`,
                    ["--crawl-end-px" as any]: `${previewMotion.endPx}px`,
                  }}
                >
                  <div className="uts-crawl-fade" />
                  <div className="uts-crawl-label">AUTOCUE · LIVE PREVIEW</div>
                  <div className="uts-crawl-perspective">
                    <div
                      ref={previewTextRef}
                      key={`${previewSeed}:${readingWpm}:${computedReadingSeconds}:${selectedSourceId}`}
                      className="uts-crawl-text uts-crawl-text-preview-loop"
                    >
                      <h3>{crawlPreview.title}</h3>
                      {(crawlPreview.blocks.length ? crawlPreview.blocks : ["Geen tekst beschikbaar voor preview."]).map((block, i) => (
                        <p key={`${i}-${block.slice(0, 20)}`}>{block}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="uts-ql-actions">
                <button type="button" className="uts-btn-secondary" onClick={() => setStep("select")}>Terug naar bronkeuze</button>
                {!session?.id ? (
                  <button type="button" className="uts-btn-primary" disabled={sessionBusy || !selectedSource} onClick={createGame}>
                    {sessionBusy ? "Maken..." : "Prepare game"}
                  </button>
                ) : (
                  <span className="uts-muted" style={{ alignSelf: "center", marginTop: 12 }}>
                    Sessie klaar. Start via <b>Game live</b>.
                  </span>
                )}
              </div>
              {session?.id ? (
                <div className="uts-muted" style={{ marginTop: 8 }}>
                  Gejoinede leerlingen: <b>{joinedCount}</b> {joinedCount < 1 ? "(minimaal 1 nodig om te starten)" : ""}
                </div>
              ) : null}
            </section>

            <section className="uts-ql-card">
              <h2>Game live</h2>
              {!session?.id ? <div className="uts-muted">Nog geen sessie gestart.</div> : null}

              {session?.id ? (
                <div className="uts-session-meta">
                  <div><strong>Sessie:</strong> #{session.id}</div>
                  <div>
                    <strong>Fase:</strong> {phaseLabel(phase)}
                    {["terms", "chip_rain", "question_maker", "quiz"].includes(asText(phase).toLowerCase()) &&
                    Number.isFinite(Number(session.clock?.seconds_left_phase)) ? (
                      <> · {Math.max(0, Number(session.clock?.seconds_left_phase || 0))}s resterend</>
                    ) : null}
                  </div>
                  <div>
                    <strong>Gamecode:</strong> {gameCode}
                    <button className="uts-copy" type="button" onClick={() => copyText("Gamecode", gameCode)}>Kopieer</button>
                  </div>
                  <div>
                    <strong>Leerling-link:</strong> <a href={playerJoinPath} target="_blank" rel="noreferrer">{playerJoinPath}</a>
                    <button className="uts-copy" type="button" onClick={() => copyText("Leerling-link", playerJoinUrl)}>Kopieer</button>
                  </div>
                  <div>
                    <strong>Smartboard joinscherm:</strong>{" "}
                    {smartboardPath ? (
                      <>
                        <a href={smartboardPath} target="_blank" rel="noreferrer">{smartboardPath}</a>
                        <button className="uts-copy" type="button" onClick={() => copyText("Smartboard-link", smartboardUrl)}>
                          Kopieer
                        </button>
                      </>
                    ) : (
                      <span className="uts-muted">Nog niet beschikbaar</span>
                    )}
                  </div>
                  <div className="uts-links">
                    {(session.teams || []).map((t) => (
                      <div key={t.id}>{t.name}: <b>{t.join_code}</b></div>
                    ))}
                  </div>
                  {!!copyMsg && <div className="uts-copy-msg">{copyMsg}</div>}

                  <div className="uts-ql-actions">
                    <a className="uts-btn-secondary" href={`/sourcegame/play/${session.id}`} target="_blank" rel="noreferrer">Open host scherm</a>
                    <a className="uts-btn-primary" href={playerJoinPath} target="_blank" rel="noreferrer">Open leerling join</a>
                    {smartboardPath ? (
                      <a className="uts-btn-secondary" href={smartboardPath} target="_blank" rel="noreferrer">
                        Open smartboard join
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="uts-btn-start"
                      onClick={startGame}
                      disabled={sessionBusy || !canStart}
                    >
                      {sessionBusy ? "Starten..." : "Start game"}
                    </button>
                    <button
                      type="button"
                      className="uts-btn-stop"
                      onClick={stopAutocueNow}
                      disabled={sessionBusy || !canStopAutocue}
                    >
                      Stop autocue -&gt; volgende ronde
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
            )}
          </>
        )}

        {error ? <div className="uts-error">{error}</div> : null}
      </div>
    </div>
  );
}
