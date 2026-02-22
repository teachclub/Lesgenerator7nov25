import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import "./use-the-source.css";
import { tvKaOptions } from "../../data/tvKaPresets";

type Team = {
  id: number;
  name: string;
  score: number;
  join_code: string;
  join_path?: string;
  join_url?: string | null;
  players_count?: number;
};

type TimelineItem = {
  id: number;
  submitted_at: string;
  team_id: number;
  team_name: string;
  player_id?: number;
  player_name?: string;
  term: string;
  verdict: string;
  points: number;
};

type Round2Question = {
  id: number;
  team_id: number;
  team_name: string;
  player_id: number;
  player_key: string;
  display_name: string;
  question_text: string;
  quality_points: number;
  quality_reason: string;
  quality_source: string;
  created_at: string;
};

type Round2QuizItem = {
  id: number;
  asked_by_team_id?: number | null;
  source_question_id?: number | null;
  prompt: string;
  options: string[];
  origin: string;
  created_at: string;
};

type Round2Answer = {
  id: number;
  quiz_item_id: number;
  team_id: number;
  team_name: string;
  player_id: number;
  player_key: string;
  display_name: string;
  selected_index: number;
  verdict: "goed" | "half_goed" | "fout";
  points: number;
  rationale?: string;
  created_at: string;
};

type Round2State = {
  questions: Round2Question[];
  quiz_items: Round2QuizItem[];
  answers: Round2Answer[];
};

type OverallTeamScore = {
  team_key: string;
  team_name: string;
  total_score: number;
  games_played: number;
};

type OverallMvpScore = {
  player_key: string;
  display_name: string;
  total_score: number;
  games_played: number;
};

type OverallHighscores = {
  generated_at: string;
  finished_sessions: number;
  teams_top: OverallTeamScore[];
  mvp_top: OverallMvpScore[];
};

type SessionResponse = {
  ok: boolean;
  session?: {
    id: number;
    game_code?: string;
    status: string;
    title: string;
    source_ref: string;
    source_id?: number | null;
    source: {
      title?: string;
      snippet?: string;
      text?: string;
      tv?: string;
      ka?: string;
      image_url?: string;
      url?: string;
    };
    timing: {
      duration_seconds: number;
      reading_seconds: number;
      term_seconds: number;
    };
    settings?: {
      music_url?: string;
      waiting_music_url?: string;
      warmup_music_url?: string;
      music_live_url?: string;
      reading_wpm?: number;
      question_reading_seconds?: number;
      question_maker_seconds?: number;
      quiz_seconds?: number;
      round2_question_count?: number;
    };
    teams: Team[];
    clock?: {
      phase: "waiting" | "reading" | "terms" | "question_reading" | "question_maker" | "quiz" | "time_up" | "finished";
      elapsed_seconds: number;
      seconds_left_total: number;
      seconds_left_phase: number;
      total_seconds: number;
      reading_seconds: number;
      term_seconds: number;
      question_reading_seconds?: number;
      question_maker_seconds?: number;
      quiz_seconds?: number;
      starts_at: string | null;
      ends_at: string | null;
    };
  };
  leaderboard?: Array<Team & { players?: Array<{ id: number; player_key?: string; display_name: string; score: number }> }>;
  score_timeline?: TimelineItem[];
  round2?: Round2State;
};

type SearchSource = {
  id: string;
  provider?: string;
  title?: string;
  description?: string;
  fullText?: string;
  imageUrl?: string | null;
  tv?: string;
  ka?: string;
  link?: string;
  url?: string;
  type?: string;
  _score?: number;
};

const TVS = Array.from({ length: 10 }, (_, i) => `TV${i + 1}`);

function toInt(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function fallbackClock(session: SessionResponse["session"] | undefined) {
  if (!session) return null;
  const reading = Number(session.timing?.reading_seconds || 0);
  const term = Number(session.timing?.term_seconds || session.timing?.duration_seconds || 60);
  const questionReading = Number(session.settings?.question_reading_seconds || reading || 0);
  const questionMaker = Number(session.settings?.question_maker_seconds || 60);
  const quiz = Number(session.settings?.quiz_seconds || 90);
  const total = reading + term + questionReading + questionMaker + quiz;
  return {
    phase: "waiting" as const,
    elapsed_seconds: 0,
    seconds_left_total: total,
    seconds_left_phase: reading || term || questionReading || questionMaker || quiz,
    total_seconds: total,
    reading_seconds: reading,
    term_seconds: term,
    question_reading_seconds: questionReading,
    question_maker_seconds: questionMaker,
    quiz_seconds: quiz,
    starts_at: null,
    ends_at: null,
  };
}

function uniqList(xs: string[]) {
  return [...new Set((xs || []).map((x) => String(x || "").trim()).filter(Boolean))];
}

function normLex(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function topTokens(s: string) {
  const stop = new Set(["de", "het", "een", "en", "of", "van", "voor", "met", "op", "in", "aan", "als", "hoe", "waarom", "wat", "wie", "welke"]);
  return uniqList(
    normLex(s)
      .split(" ")
      .filter((w) => w.length >= 4 && !stop.has(w))
  ).slice(0, 10);
}

function cleanText(raw: unknown) {
  return String(raw || "")
    .replace(/\[HTML\]/g, " ")
    .replace(/\[WP\]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(s: string) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizeWpm(value: number) {
  if (!Number.isFinite(value)) return 80;
  return Math.max(40, Math.min(2000, Math.trunc(value)));
}

function estimateReadingSeconds(text: string, wpm: number) {
  const words = countWords(text);
  if (words <= 0) return 0;
  const speed = normalizeWpm(wpm);
  const seconds = Math.ceil((words / speed) * 60);
  return Math.max(0, seconds);
}

const FIXED_READING_WPM = 80;
const BUNDLED_CHASE_TRACK = "/audio/star-wars-style-chase-music-181118.mp3";
const BUNDLED_BATTLE_TRACK = "/audio/star-wars-style-battle-music-148641.mp3";
const PRE_AUTOCUE_COUNTDOWN_SECONDS = 0;
const MISSION_TYPING_CHARS_PER_SECOND = 28;
const MISSION_BRIEFING_TEXT = [
  "Jullie Missie:",
  "",
  "Lees straks de tekst die verschijnt rustig door en onthoudt goed waar de tekst over gaat.",
  "Wat zijn belangrijke personen. Bij welke historische begrippen past deze tekst beste?",
  "Je mag straks dit allemaal invoeren.",
  "De best passende begrippen leveren meer punten op.",
  "Begrippen die al zijn geweest leveren strafpunten op.",
  "",
  "May the source be with you!",
].join("\n");

function normalizeRequestedAudioUrl(raw: string) {
  const value = String(raw || "").trim();
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
    if (!base) return "";
    return `/audio/${encodeURIComponent(base)}`;
  }
  return value;
}

function normalizeLoopOffset(offsetSeconds: number, durationSeconds: number) {
  const duration = Number(durationSeconds || 0);
  if (!Number.isFinite(duration) || duration <= 1) return 0;
  let normalized = Number(offsetSeconds || 0) % duration;
  if (normalized < 0) normalized += duration;
  return normalized;
}

function loopDriftSeconds(currentSeconds: number, targetSeconds: number, durationSeconds: number) {
  const duration = Number(durationSeconds || 0);
  if (!Number.isFinite(duration) || duration <= 1) return 0;
  let delta = targetSeconds - currentSeconds;
  if (delta > duration / 2) delta -= duration;
  if (delta < -duration / 2) delta += duration;
  return delta;
}

export default function UseTheSourcePage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const isPlayerRoute = Boolean(id);
  const teacherSignupUrl = search.get("teacher_link") || "/teacher/register";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [session, setSession] = useState<SessionResponse["session"]>();
  const [leaderboard, setLeaderboard] = useState<SessionResponse["leaderboard"]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [round2, setRound2] = useState<Round2State>({ questions: [], quiz_items: [], answers: [] });
  const [overallHighscores, setOverallHighscores] = useState<OverallHighscores | null>(null);

  const [sourceRef, setSourceRef] = useState(search.get("source_ref") || "");
  const [sourceTitle, setSourceTitle] = useState(search.get("title") || "");
  const [sourceSnippet, setSourceSnippet] = useState(search.get("snippet") || "");
  const [sourceText, setSourceText] = useState(search.get("text") || "");
  const [sourceTv, setSourceTv] = useState(search.get("tv") || "");
  const [sourceKa, setSourceKa] = useState(search.get("ka") || "");
  const [sourceImage, setSourceImage] = useState(search.get("image") || "");
  const [mainQuestion, setMainQuestion] = useState(search.get("hq") || "");
  const [queryHints, setQueryHints] = useState<string[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [teacherStep, setTeacherStep] = useState<"select" | "game">("select");
  const [durationSeconds, setDurationSeconds] = useState(search.get("duration") || "90");
  const [termSeconds, setTermSeconds] = useState(search.get("terms") || "60");
  const [round2QuestionCount, setRound2QuestionCount] = useState(search.get("round2_count") || "5");
  const [teamsRaw, setTeamsRaw] = useState("Rebels, Empire");

  const [sessionId, setSessionId] = useState<string>(id || "");
  const [joinCode, setJoinCode] = useState(search.get("code") || "");
  const [playerName, setPlayerName] = useState(search.get("name") || "");
  const [playerKey, setPlayerKey] = useState(search.get("player_key") || "");
  const [joined, setJoined] = useState(Boolean(search.get("player_key")));
  const [termInput, setTermInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [round2Msg, setRound2Msg] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [musicOn, setMusicOn] = useState(true);
  const [musicVolumePct, setMusicVolumePct] = useState<number>(() => {
    if (typeof window === "undefined") return 65;
    const raw = Number(window.localStorage.getItem("uts_music_volume_pct") || "65");
    if (!Number.isFinite(raw)) return 65;
    return Math.max(0, Math.min(100, Math.trunc(raw)));
  });
  const [resolvedMusicUrl, setResolvedMusicUrl] = useState("");
  const [preTermsCountdown, setPreTermsCountdown] = useState(0);
  const [sourceImageOrientation, setSourceImageOrientation] = useState<"portrait" | "landscape" | "unknown">("unknown");

  const audioRef = useRef<AudioContext | null>(null);
  const trackRef = useRef<HTMLAudioElement | null>(null);
  const crawlStageRef = useRef<HTMLDivElement | null>(null);
  const crawlTextRef = useRef<HTMLDivElement | null>(null);
  const crawlTailRef = useRef<HTMLSpanElement | null>(null);
  const readingDoneRef = useRef<string>("");
  const autoQuizRef = useRef<string>("");
  const preTermsPhaseRef = useRef<string>("");
  const prevPhaseRef = useRef<string>("");
  const beepSecondRef = useRef<number>(-1);
  const musicStepRef = useRef<number>(0);
  const syncOffsetRef = useRef<number>(0);
  const [crawlMotion, setCrawlMotion] = useState({ startPx: 260, endPx: 180 });

  const clock = session?.clock || fallbackClock(session);
  const phase = clock?.phase || "waiting";
  const secondsLeft = Number(clock?.seconds_left_phase ?? 0);
  const sessionStatus = String(session?.status || "").toLowerCase();
  const sessionStarted = sessionStatus === "live" || sessionStatus === "finished";
  const inQuestionReading = phase === "question_reading";
  const inQuestionMaker = phase === "question_maker";
  const inQuiz = phase === "quiz";
  // Bron weg tijdens termfase en vraagmaakfase; terug tijdens leesrondes en na afloop.
  const sourceVisible =
    sessionStarted &&
    (phase === "waiting" ||
      phase === "reading" ||
      phase === "question_reading" ||
      phase === "time_up" ||
      phase === "finished");
  const sourceImageUrl = String((session?.source as any)?.image_url || (session?.source as any)?.imageUrl || "").trim();
  const crawlContent = useMemo(() => {
    const title = String(session?.source?.title || session?.title || "Bron").trim();
    const snippetRaw = String(session?.source?.snippet || "").trim();
    const textRaw = String(session?.source?.text || "").trim();
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
      if (parsed.length > 0) {
        blocks.push(...parsed);
      } else {
        blocks.push(textRaw);
      }
    }

    if (blocks.length === 0 && snippetRaw) blocks.push(snippetRaw);
    return { title, blocks };
  }, [session?.source?.title, session?.source?.snippet, session?.source?.text, session?.title]);
  const readingWpmSetting = normalizeWpm(
    Number((session?.settings as any)?.reading_wpm || (session as any)?.meta?.reading_wpm || 80)
  );
  const crawlWordCount = useMemo(() => {
    return countWords([crawlContent.title, ...crawlContent.blocks].join(" "));
  }, [crawlContent]);
  const crawlDuration = useMemo(() => {
    const fromWpm = Math.ceil((crawlWordCount / Math.max(1, readingWpmSetting)) * 60);
    const fromClock = Number(clock?.reading_seconds || 0);
    // Clock-timing is leidend; WPM alleen fallback als clock-data ontbreekt.
    return Math.max(1, fromClock || fromWpm || 1);
  }, [crawlWordCount, readingWpmSetting, clock?.reading_seconds]);
  const canSubmit = joined && phase === "terms" && preTermsCountdown === 0;
  const canSubmitQuestion = joined && inQuestionMaker;
  const quizQuestionCount = Math.max(2, Math.min(12, Number(session?.settings?.round2_question_count || 4)));
  const showPreTermsBriefing = sessionStarted && phase === "terms" && preTermsCountdown > 0;
  const countdownText = preTermsCountdown > 0 ? String(preTermsCountdown) : "";
  const inAutocuePhase = phase === "reading" || phase === "question_reading";
  const showNumericClock =
    phase === "terms" || phase === "question_maker" || phase === "quiz";
  const clockDisplay =
    phase === "waiting"
      ? "READY"
      : inAutocuePhase
      ? "AUTOCUE"
      : phase === "finished"
      ? "FINISHED"
      : phase === "time_up"
      ? "TIME UP"
      : `${secondsLeft}s`;
  const gameCode = session?.game_code || (sessionId ? `US${sessionId}` : "");
  const studentJoinPath = "/join";
  const studentJoinUrl = typeof window !== "undefined" ? `${window.location.origin}${studentJoinPath}` : studentJoinPath;
  const musicActive =
    musicOn &&
    (phase === "terms" ||
      phase === "question_maker" ||
      phase === "quiz" ||
      phase === "time_up" ||
      phase === "finished");
  const waitingMusicUrl = String(session?.settings?.waiting_music_url || "https://pixabay.com/nl/music/hoofdtitel-space-adventures-orchestral-music-star-wars-style-139660/").trim();
  const warmupMusicUrl = String(session?.settings?.warmup_music_url || "https://pixabay.com/nl/music/hoofdtitel-star-wars-style-chase-music-181118/").trim();
  const liveMusicUrl = String(session?.settings?.music_live_url || session?.settings?.music_url || BUNDLED_BATTLE_TRACK).trim();
  const musicVolume = Math.max(0, Math.min(1, musicVolumePct / 100));
  const readingSecondsTotal = Number(clock?.reading_seconds || 0);
  const readingProgress = phase === "reading" ? Math.max(0, readingSecondsTotal - secondsLeft) : 0;
  const missionTypingSeconds = Math.max(
    4,
    Math.ceil(MISSION_BRIEFING_TEXT.length / Math.max(1, MISSION_TYPING_CHARS_PER_SECOND))
  );
  const preAutocueTotalSeconds = missionTypingSeconds + PRE_AUTOCUE_COUNTDOWN_SECONDS;
  const missionBriefingActive =
    isPlayerRoute &&
    sessionStarted &&
    phase === "reading" &&
    readingProgress < preAutocueTotalSeconds;
  const missionTypedChars = missionBriefingActive
    ? Math.min(
        MISSION_BRIEFING_TEXT.length,
        Math.max(0, Math.floor(readingProgress * MISSION_TYPING_CHARS_PER_SECOND))
      )
    : MISSION_BRIEFING_TEXT.length;
  const missionTypedText = MISSION_BRIEFING_TEXT.slice(0, missionTypedChars);
  const missionTypingDone = readingProgress >= missionTypingSeconds;
  const showCrawl = sourceVisible && (phase === "reading" || phase === "question_reading") && !missionBriefingActive;
  const showExternalImagePanel = isPlayerRoute && showCrawl && !!sourceImageUrl;
  const playerGridClass = !isPlayerRoute
    ? ""
    : showExternalImagePanel
    ? sourceImageOrientation === "landscape"
      ? "uts-grid-player-image-landscape"
      : "uts-grid-player-image-portrait"
    : "uts-grid-player-no-image";
  const inWarmup = sessionStarted && phase === "reading" && readingProgress <= 10;
  const musicPhase =
    !sessionStarted
      ? "waiting"
      : inWarmup
      ? "warmup"
      : phase === "terms" || phase === "question_maker" || phase === "quiz" || phase === "time_up" || phase === "finished"
      ? "live"
      : "off";
  const requestedMusicUrlRaw = musicPhase === "waiting" ? waitingMusicUrl : musicPhase === "warmup" ? warmupMusicUrl : musicPhase === "live" ? liveMusicUrl : "";
  const requestedMusicUrl = normalizeRequestedAudioUrl(requestedMusicUrlRaw);
  const wantsTrack = musicOn && Boolean(requestedMusicUrl);
  const hasDirectMusicUrl = /^(https?:\/\/|\/).+\.(mp3|ogg|wav|m4a|mpga)(\?.*)?$/i.test(requestedMusicUrl);
  const syncOffsetSeconds = useMemo(() => {
    if (musicPhase === "warmup") return readingProgress;
    if (musicPhase === "live") {
      const elapsed = Number(clock?.elapsed_seconds || 0);
      return Math.max(0, elapsed - readingSecondsTotal);
    }
    return 0;
  }, [musicPhase, readingProgress, clock?.elapsed_seconds, readingSecondsTotal]);

  const topTeams = useMemo(() => {
    const lb = Array.isArray(leaderboard) ? [...leaderboard] : [];
    lb.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    return lb.slice(0, 2);
  }, [leaderboard]);

  const ropePercent = useMemo(() => {
    if (topTeams.length < 2) return 50;
    const a = Number(topTeams[0]?.score || 0);
    const b = Number(topTeams[1]?.score || 0);
    const denom = Math.max(Math.abs(a) + Math.abs(b), 1);
    const shift = Math.max(-40, Math.min(40, ((a - b) / denom) * 40));
    return 50 + shift;
  }, [topTeams]);

  const allPlayers = useMemo(() => {
    const rows: Array<{ id: number; display_name: string; score: number; team_name: string }> = [];
    for (const team of leaderboard || []) {
      for (const p of team.players || []) {
        rows.push({
          id: Number(p.id),
          display_name: String(p.display_name || "Leerling"),
          score: Number(p.score || 0),
          team_name: String(team.name || ""),
        });
      }
    }
    return rows;
  }, [leaderboard]);

  const activityByPlayer = useMemo(() => {
    const s = new Set<number>();
    for (const t of timeline || []) {
      const pid = Number(t.player_id || 0);
      if (Number.isFinite(pid) && pid > 0) s.add(pid);
    }
    for (const q of round2.questions || []) {
      const pid = Number(q.player_id || 0);
      if (Number.isFinite(pid) && pid > 0) s.add(pid);
    }
    for (const a of round2.answers || []) {
      const pid = Number(a.player_id || 0);
      if (Number.isFinite(pid) && pid > 0) s.add(pid);
    }
    return s;
  }, [timeline, round2.questions, round2.answers]);

  const topPlayers = useMemo(() => {
    const rows = [...allPlayers];
    rows.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    return rows.slice(0, 5);
  }, [allPlayers]);

  const npcPlayers = useMemo(() => {
    return [...allPlayers]
      .filter((p) => !activityByPlayer.has(Number(p.id)))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [allPlayers, activityByPlayer]);

  const liveChips = useMemo(() => {
    const now = Date.now();
    return [...(timeline || [])]
      .filter((t) => {
        const ts = Date.parse(String(t.submitted_at || ""));
        if (!Number.isFinite(ts)) return false;
        return now - ts <= 5000;
      })
      .sort((a, b) => Date.parse(String(b.submitted_at || "")) - Date.parse(String(a.submitted_at || "")))
      .slice(0, 12);
  }, [timeline, secondsLeft]);

  const selectedSource = useMemo(() => {
    return searchResults.find((s) => String(s.id) === String(selectedSourceId)) || null;
  }, [searchResults, selectedSourceId]);

  const sourceWordCount = useMemo(() => {
    const text = String(sourceText || selectedSource?.fullText || "").trim();
    return countWords(text);
  }, [sourceText, selectedSource]);

  const computedReadingSeconds = useMemo(() => {
    const text = String(sourceText || selectedSource?.fullText || "").trim();
    return estimateReadingSeconds(text, FIXED_READING_WPM);
  }, [sourceText, selectedSource]);

  const kaOptionsForSourceTv = useMemo(() => {
    const tvNum = Number(String(sourceTv || "").replace(/[^\d]/g, ""));
    if (!Number.isFinite(tvNum) || tvNum < 1) return [] as Array<{ value: string; label: string }>;
    return tvKaOptions
      .filter((opt) => opt.tv === tvNum)
      .map((opt) => ({ value: `KA${opt.ka}`, label: opt.kaLabel }));
  }, [sourceTv]);

  useEffect(() => {
    if (!kaOptionsForSourceTv.length) return;
    if (!kaOptionsForSourceTv.some((opt) => opt.value === sourceKa)) {
      setSourceKa(kaOptionsForSourceTv[0].value);
    }
  }, [kaOptionsForSourceTv, sourceKa]);

  const ownQuestion = useMemo(
    () => (round2.questions || []).find((q) => q.player_key === playerKey) || null,
    [round2.questions, playerKey]
  );

  const ownAnswersByItem = useMemo(() => {
    const m = new Map<number, Round2Answer>();
    for (const a of round2.answers || []) {
      if (a.player_key === playerKey) m.set(Number(a.quiz_item_id), a);
    }
    return m;
  }, [round2.answers, playerKey]);

  const teamsAnsweredRound2 = useMemo(() => {
    const ids = new Set((round2.answers || []).map((a) => Number(a.team_id)));
    return ids.size;
  }, [round2.answers]);

  const finishGate = useMemo(() => {
    const nTeams = Math.max(2, Number((leaderboard || []).length || 0));
    return (round2.quiz_items || []).length > 0 && teamsAnsweredRound2 >= Math.min(2, nTeams);
  }, [round2.quiz_items, teamsAnsweredRound2, leaderboard]);

  async function refreshSession(targetId: string) {
    if (!targetId) return;
    const res = await fetch(`/api/sourcegame/sessions/${targetId}`);
    const json = (await res.json()) as SessionResponse;
    if (!json.ok) throw new Error((json as any).error || "Kon sessie niet laden");
    setSession(json.session);
    setLeaderboard(json.leaderboard || []);
    setTimeline(Array.isArray(json.score_timeline) ? json.score_timeline : []);
    setRound2(
      json.round2 && typeof json.round2 === "object"
        ? {
            questions: Array.isArray(json.round2.questions) ? json.round2.questions : [],
            quiz_items: Array.isArray(json.round2.quiz_items) ? json.round2.quiz_items : [],
            answers: Array.isArray(json.round2.answers) ? json.round2.answers : [],
          }
        : { questions: [], quiz_items: [], answers: [] }
    );
  }

  async function refreshOverallHighscores(limit = 5) {
    const res = await fetch(`/api/sourcegame/highscores?limit=${Math.max(1, Math.min(50, Math.trunc(limit)))}`);
    const json = await res.json();
    if (!json?.ok) throw new Error(json?.error || "Kon overall highscores niet laden");
    const hs = json.highscores || {};
    setOverallHighscores({
      generated_at: String(hs.generated_at || ""),
      finished_sessions: Number(hs.finished_sessions || 0),
      teams_top: Array.isArray(hs.teams_top) ? hs.teams_top : [],
      mvp_top: Array.isArray(hs.mvp_top) ? hs.mvp_top : [],
    });
  }

  async function markReadingDone() {
    const sid = String(sessionId || "");
    if (!sid || !sessionStarted || (phase !== "reading" && phase !== "question_reading")) return;
    const key = `${sid}:${phase}`;
    if (readingDoneRef.current === key) return;
    readingDoneRef.current = key;
    try {
      const res = await fetch(`/api/sourcegame/sessions/${sid}/reading-done`, { method: "POST" });
      const json = await res.json();
      if (json?.ok) {
        await refreshSession(sid);
      }
    } catch {
      // fail-open: polling pakt fase vanzelf op
    }
  }

  async function teacherSkipAutocue() {
    if (isPlayerRoute) return;
    try {
      setBusy(true);
      await markReadingDone();
    } finally {
      setBusy(false);
    }
  }

  function playTone(freq: number, seconds: number, volume = 0.03) {
    try {
      const W = window as any;
      const Ctx = W.AudioContext || W.webkitAudioContext;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => void 0);
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.start(now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      osc.stop(now + seconds);
    } catch {
      // Stil falen op browsers die audio blokkeren
    }
  }

  function primeAudio() {
    try {
      const W = window as any;
      const Ctx = W.AudioContext || W.webkitAudioContext;
      if (!Ctx) return;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => void 0);
      }
    } catch {
      // no-op
    }
  }

  function playQuizLoopStep() {
    const step = musicStepRef.current++;
    const bass = [110, 123.47, 130.81, 146.83];
    const lead = [220, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94];
    const b = bass[step % bass.length];
    const l = lead[step % lead.length];
    const gain = Math.max(0.002, 0.02 * musicVolume);
    playTone(b, 0.30, gain * 0.6);
    setTimeout(() => playTone(l, 0.16, gain), 70);
    setTimeout(() => playTone(lead[(step + 3) % lead.length], 0.10, gain * 0.72), 250);
  }

  async function copyText(label: string, value: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyMsg(`${label} gekopieerd`);
      setTimeout(() => setCopyMsg(""), 1400);
    } catch {
      setCopyMsg(`Kopiëren mislukt`);
      setTimeout(() => setCopyMsg(""), 1400);
    }
  }

  function applySelectedSource(src: SearchSource) {
    const title = String(src.title || "").trim();
    const snippet = cleanText(src.description || "");
    const full = cleanText(src.fullText || "");
    const text = full || snippet;
    const tv = String(src.tv || "").trim();
    const ka = String(src.ka || "").trim();
    const image = String(src.imageUrl || "").trim();
    setSourceRef(String(src.id || ""));
    setSourceTitle(title);
    setSourceSnippet(snippet);
    setSourceText(text);
    setSourceTv(tv);
    setSourceKa(ka);
    setSourceImage(image);
  }

  async function enrichWithDetail(src: SearchSource): Promise<SearchSource> {
    const url = String(src.url || src.link || "").trim();
    if (!url || !url.includes("vgnkleio.nl/bronnen/")) return src;
    try {
      const res = await fetch("/api/source-detail", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!json?.ok) return src;
      return {
        ...src,
        title: String(json.title || src.title || "").trim() || src.title,
        fullText: cleanText(json.fullText || src.fullText || ""),
        description: cleanText(src.description || ""),
        imageUrl: String(json.imageUrl || src.imageUrl || "").trim() || src.imageUrl,
        type: String(json.type || src.type || "").trim() || src.type,
        provider: String(json.provider || src.provider || "").trim() || src.provider,
      };
    } catch {
      return src;
    }
  }

  async function selectSource(src: SearchSource) {
    setSelectedSourceId(String(src.id || ""));
    applySelectedSource(src);
    const enriched = await enrichWithDetail(src);
    applySelectedSource(enriched);
    setSearchResults((prev) =>
      prev.map((p) => (String(p.id) === String(src.id) ? { ...p, ...enriched } : p))
    );
  }

  async function runSourceSearch() {
    setSearchBusy(true);
    setError("");
    try {
      const q = mainQuestion.trim();
      if (!q) throw new Error("Voer eerst een hoofdvraag in");
      let queries = [q];
      try {
        const suggestRes = await fetch("/api/seed-source-suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tv: sourceTv.trim() ? [sourceTv.trim()] : [],
            ka: sourceKa.trim(),
            richting: q,
            presentisme: false,
          }),
        });
        const suggestJson = await suggestRes.json();
        const extra = Array.isArray(suggestJson?.queries) ? suggestJson.queries.map((x: unknown) => String(x || "").trim()) : [];
        queries = uniqList([q, ...extra]).slice(0, 8);
      } catch {
        // fail-open: zoek alsnog op hoofdvraag
      }

      const body = {
        query: queries,
        rows: 28,
        filters: {
          tv: sourceTv.trim() || undefined,
          ka: sourceKa.trim() || undefined,
          text: true,
          images: true,
          cito: true,
          kleio: true,
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
      const tokens = topTokens(q);
      const results = [...raw]
        .map((src) => {
          const blob = normLex([src.title, src.description, src.fullText].filter(Boolean).join(" "));
          const score = tokens.reduce((acc, t) => (blob.includes(t) ? acc + 1 : acc), 0);
          return { ...src, _score: score };
        })
        .sort((a, b) => Number(b._score || 0) - Number(a._score || 0));

      setQueryHints(queries);
      setSearchResults(results);
      if (results.length) {
        const first = results[0];
        await selectSource(first);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSearchBusy(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    refreshSession(sessionId).catch((e) => setError(String(e?.message || e)));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(() => {
      refreshSession(sessionId).catch(() => void 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  useEffect(() => {
    if (sessionStatus === "finished") {
      refreshOverallHighscores(5).catch(() => void 0);
      return;
    }
    setOverallHighscores(null);
  }, [sessionStatus, sessionId]);

  useEffect(() => {
    if (!showCrawl) return;
    const stage = crawlStageRef.current;
    const text = crawlTextRef.current;
    if (!stage || !text) return;

    const measure = () => {
      const stageH = Math.max(280, stage.clientHeight || 0);
      const textH = Math.max(120, text.scrollHeight || 0);
      const startPx = Math.round(stageH * 0.82);
      const endPx = Math.max(90, Math.round(textH - stageH * 0.24));
      setCrawlMotion((prev) =>
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
  }, [showCrawl, crawlContent.title, crawlContent.blocks]);

  useEffect(() => {
    if (!showCrawl || !sessionStarted || (phase !== "reading" && phase !== "question_reading")) return;
    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      const stage = crawlStageRef.current;
      const tail = crawlTailRef.current;
      if (stage && tail) {
        const stageRect = stage.getBoundingClientRect();
        const tailRect = tail.getBoundingClientRect();
        // Zodra de laatste regel uit beeld is, meteen door naar volgende fase.
        if (tailRect.bottom <= stageRect.top + 2) {
          void markReadingDone();
          stopped = true;
          return;
        }
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [showCrawl, sessionStarted, phase, sessionId]);

  useEffect(() => {
    if (!sourceImageUrl) {
      setSourceImageOrientation("unknown");
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const w = Number(img.naturalWidth || 0);
      const h = Number(img.naturalHeight || 0);
      if (w > 0 && h > 0) {
        setSourceImageOrientation(w >= h ? "landscape" : "portrait");
      } else {
        setSourceImageOrientation("unknown");
      }
    };
    img.onerror = () => {
      if (!cancelled) setSourceImageOrientation("unknown");
    };
    img.src = sourceImageUrl;
    return () => {
      cancelled = true;
    };
  }, [sourceImageUrl]);

  useEffect(() => {
    const prev = prevPhaseRef.current;

    if (phase === "terms" && prev && prev !== "terms") {
      playTone(880, 0.1, 0.04);
      setTimeout(() => playTone(1180, 0.1, 0.04), 120);
    }

    if (phase === "terms" && secondsLeft > 0 && secondsLeft <= 10) {
      if (beepSecondRef.current !== secondsLeft) {
        beepSecondRef.current = secondsLeft;
        playTone(660, 0.08, 0.03);
      }
    } else {
      beepSecondRef.current = -1;
    }

    prevPhaseRef.current = phase;
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (phase !== "reading" && phase !== "question_reading") {
      readingDoneRef.current = "";
    }
  }, [phase, sessionId]);

  useEffect(() => {
    const prev = preTermsPhaseRef.current;
    if (phase === "terms" && prev !== "terms") {
      setPreTermsCountdown(10);
    } else if (phase !== "terms") {
      setPreTermsCountdown(0);
    }
    preTermsPhaseRef.current = phase;
  }, [phase, sessionId]);

  useEffect(() => {
    if (preTermsCountdown <= 0) return;
    const t = window.setTimeout(() => {
      setPreTermsCountdown((v) => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [preTermsCountdown]);

  useEffect(() => {
    if (!sessionId || (phase !== "quiz" && phase !== "time_up")) {
      autoQuizRef.current = "";
      return;
    }
    if ((round2.quiz_items || []).length > 0) return;
    const key = `${sessionId}:${phase}`;
    if (autoQuizRef.current === key) return;
    autoQuizRef.current = key;
    void generateRound2Quiz();
  }, [sessionId, phase, round2.quiz_items]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("uts_music_volume_pct", String(Math.max(0, Math.min(100, Math.trunc(musicVolumePct)))));
  }, [musicVolumePct]);

  useEffect(() => {
    syncOffsetRef.current = Math.max(0, Number(syncOffsetSeconds || 0));
  }, [syncOffsetSeconds]);

  useEffect(() => {
    let cancelled = false;
    if (!wantsTrack) {
      setResolvedMusicUrl("");
      return () => {
        cancelled = true;
      };
    }

    if (hasDirectMusicUrl) {
      setResolvedMusicUrl(requestedMusicUrl);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const res = await fetch("/api/sourcegame/resolve-audio-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: requestedMusicUrl }),
        });
        const json = await res.json();
        if (!cancelled && json?.ok && String(json.resolved_url || "").trim()) {
          setResolvedMusicUrl(String(json.resolved_url || "").trim());
        } else if (!cancelled) {
          setResolvedMusicUrl("");
        }
      } catch {
        if (!cancelled) setResolvedMusicUrl("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wantsTrack, hasDirectMusicUrl, requestedMusicUrl]);

  useEffect(() => {
    if (!musicOn || !resolvedMusicUrl) {
      const active = trackRef.current;
      if (active) {
        active.pause();
        active.currentTime = 0;
        trackRef.current = null;
      }
      return;
    }

    const audio = new Audio(resolvedMusicUrl);
    audio.loop = true;
    audio.volume = musicVolume;
    audio.preload = "auto";
    audio.playsInline = true;
    audio.crossOrigin = "anonymous";

    const syncToClock = () => {
      const d = Number(audio.duration || 0);
      if (Number.isFinite(d) && d > 1) {
        audio.currentTime = normalizeLoopOffset(syncOffsetRef.current, d);
      }
    };

    if (audio.readyState >= 1) syncToClock();
    else audio.addEventListener("loadedmetadata", syncToClock, { once: true });

    const prev = trackRef.current;
    if (prev && prev !== audio) {
      prev.pause();
      prev.currentTime = 0;
    }

    trackRef.current = audio;
    audio.play().catch(() => void 0);

    return () => {
      if (trackRef.current === audio) {
        audio.pause();
        audio.currentTime = 0;
        trackRef.current = null;
      }
    };
  }, [musicOn, resolvedMusicUrl]);

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  useEffect(() => {
    if (!musicOn) return;
    const audio = trackRef.current;
    if (!audio) return;
    const d = Number(audio.duration || 0);
    if (!Number.isFinite(d) || d <= 1) return;
    const target = normalizeLoopOffset(syncOffsetSeconds, d);
    const current = normalizeLoopOffset(Number(audio.currentTime || 0), d);
    const drift = Math.abs(loopDriftSeconds(current, target, d));
    // Alleen hard resyncen als de audio echt uit de pas loopt.
    if (drift > 2.4) {
      audio.currentTime = target;
    }
  }, [musicOn, musicPhase, syncOffsetSeconds]);

  useEffect(() => {
    if (!musicActive || resolvedMusicUrl) return;
    primeAudio();
    const timer = window.setInterval(() => {
      playQuizLoopStep();
    }, 1100);
    return () => window.clearInterval(timer);
  }, [musicActive, resolvedMusicUrl, musicVolume]);

  async function handleCreateAndStart() {
    setBusy(true);
    setError("");
    try {
      const teams = teamsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (!sourceRef.trim()) throw new Error("Bron referentie ontbreekt");
      if (teams.length < 2) throw new Error("Geef minimaal 2 teams op");

      const baseSource: SearchSource = selectedSource || {
        id: selectedSourceId || sourceRef.trim(),
        title: sourceTitle,
        description: sourceSnippet,
        fullText: sourceText,
        tv: sourceTv,
        ka: sourceKa,
        imageUrl: sourceImage || null,
        type: "TEXT",
      };
      const effectiveSource = await enrichWithDetail(baseSource);
      applySelectedSource(effectiveSource);

      const effectiveReading = estimateReadingSeconds(
        cleanText(effectiveSource.fullText || sourceText || ""),
        FIXED_READING_WPM
      );
      const effectiveReadingWithBriefing = effectiveReading + preAutocueTotalSeconds;
      const inputTerm = toInt(termSeconds, 60);
      const effectiveDuration = Math.max(0, effectiveReadingWithBriefing + inputTerm);
      const questionCount = Math.max(2, Math.min(12, toInt(round2QuestionCount, 5)));

      const createRes = await fetch("/api/sourcegame/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: {
            id: selectedSourceId || sourceRef.trim(),
            ref: sourceRef.trim(),
            title: String(effectiveSource.title || sourceTitle || "").trim(),
            snippet: cleanText(effectiveSource.description || sourceSnippet || ""),
            text: cleanText(effectiveSource.fullText || sourceText || ""),
            tv: sourceTv,
            ka: sourceKa,
            image_url: String(effectiveSource.imageUrl || sourceImage || "").trim(),
            url: String(effectiveSource.url || effectiveSource.link || selectedSource?.url || selectedSource?.link || "").trim(),
            type: String(effectiveSource.type || selectedSource?.type || "TEXT"),
          },
          teams,
          settings: {
            duration_seconds: effectiveDuration,
            reading_seconds: effectiveReadingWithBriefing,
            term_seconds: inputTerm,
            lock_teams_on_start: true,
            bonus_tv: true,
            bonus_ka: true,
            round2_question_count: questionCount,
            question_reading_seconds: effectiveReading,
            question_maker_seconds: Math.max(30, Math.min(240, questionCount * 15)),
            quiz_seconds: Math.max(90, Math.min(900, questionCount * 35)),
            pre_reading_countdown_seconds: PRE_AUTOCUE_COUNTDOWN_SECONDS,
            pre_reading_typing_seconds: missionTypingSeconds,
          },
        }),
      });
      const created = await createRes.json();
      if (!created?.ok || !created?.session?.id) throw new Error(created?.error || "Sessie maken mislukt");
      const sid = String(created.session.id);
      setSessionId(sid);

      const startRes = await fetch(`/api/sourcegame/sessions/${sid}/start`, { method: "POST" });
      const started = await startRes.json();
      if (!started?.ok) throw new Error(started?.error || "Sessie starten mislukt");

      await refreshSession(sid);
      setTeacherStep("game");
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!sessionId) return;
    setBusy(true);
    setError("");
    try {
      const key = playerKey.trim() || `p_${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch(`/api/sourcegame/sessions/${sessionId}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_key: key,
          display_name: playerName.trim() || key,
          join_code: joinCode.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Join mislukt");
      setPlayerKey(key);
      setJoined(true);
      await refreshSession(sessionId);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function submitTerm() {
    if (!canSubmit || !termInput.trim() || !sessionId) return;
    const term = termInput.trim();
    setTermInput("");
    try {
      const res = await fetch(`/api/sourcegame/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_key: playerKey,
          term,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Term versturen mislukt");
      const result = json.result || {};
      setLeaderboard(json.leaderboard || []);
      if (Array.isArray(json.score_timeline)) setTimeline(json.score_timeline);
      await refreshSession(sessionId);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function submitQuestion() {
    if (!sessionId || !joined || !playerKey || !questionInput.trim()) return;
    setBusy(true);
    setRound2Msg("");
    setError("");
    try {
      const res = await fetch(`/api/sourcegame/sessions/${sessionId}/round2/question`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_key: playerKey,
          question: questionInput.trim(),
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Vraag insturen mislukt");
      setQuestionInput("");
      setRound2Msg(`Vraag beoordeeld: ${json?.result?.quality_points ?? 0} punt(en)`);
      setLeaderboard(json.leaderboard || []);
      if (json.round2) {
        setRound2({
          questions: Array.isArray(json.round2.questions) ? json.round2.questions : [],
          quiz_items: Array.isArray(json.round2.quiz_items) ? json.round2.quiz_items : [],
          answers: Array.isArray(json.round2.answers) ? json.round2.answers : [],
        });
      }
      await refreshSession(sessionId);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function generateRound2Quiz() {
    if (!sessionId) return;
    const count = Math.max(2, Math.min(12, Number(session?.settings?.round2_question_count || 4)));
    setBusy(true);
    setRound2Msg("");
    setError("");
    try {
      const res = await fetch(`/api/sourcegame/sessions/${sessionId}/round2/generate-mcq`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Meerkeuze genereren mislukt");
      setRound2Msg(`Meerkeuze klaar: ${json?.generated_count || 0} vragen`);
      if (json.round2) {
        setRound2({
          questions: Array.isArray(json.round2.questions) ? json.round2.questions : [],
          quiz_items: Array.isArray(json.round2.quiz_items) ? json.round2.quiz_items : [],
          answers: Array.isArray(json.round2.answers) ? json.round2.answers : [],
        });
      }
      await refreshSession(sessionId);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function submitRound2Answer(quizItemId: number, selectedIndex: number) {
    if (!sessionId || !joined || !playerKey) return;
    setBusy(true);
    setRound2Msg("");
    setError("");
    try {
      const res = await fetch(`/api/sourcegame/sessions/${sessionId}/round2/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_key: playerKey,
          quiz_item_id: quizItemId,
          selected_index: selectedIndex,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Antwoord insturen mislukt");
      const verdict = String(json?.result?.verdict || "fout");
      const points = Number(json?.result?.points || 0);
      const verdictTxt =
        verdict === "goed" ? "Goed" : verdict === "half_goed" ? "Half goed" : "Fout";
      setRound2Msg(`Beoordeling: ${verdictTxt} (${points > 0 ? `+${points}` : points})`);
      setLeaderboard(json.leaderboard || []);
      if (json.round2) {
        setRound2({
          questions: Array.isArray(json.round2.questions) ? json.round2.questions : [],
          quiz_items: Array.isArray(json.round2.quiz_items) ? json.round2.quiz_items : [],
          answers: Array.isArray(json.round2.answers) ? json.round2.answers : [],
        });
      }
      await refreshSession(sessionId);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function finishSession() {
    if (!sessionId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sourcegame/sessions/${sessionId}/finish`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Afronden mislukt");
      await refreshSession(sessionId);
      await refreshOverallHighscores(5).catch(() => void 0);
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
          <div className="uts-kicker">CLASSROOM ARENA</div>
          <h1>Use the Source</h1>
          <p>Read first. Remember fast. Score with historical precision.</p>
        </header>

        <section className={`uts-grid ${isPlayerRoute ? `uts-grid-player ${playerGridClass}` : ""}`.trim()}>
          {showExternalImagePanel ? (
            <article className="uts-panel uts-image-panel">
              <h2>Bronafbeelding</h2>
              <div className="uts-image-stage">
                <img src={sourceImageUrl} alt="Bronafbeelding" loading="lazy" />
              </div>
            </article>
          ) : null}

          {!isPlayerRoute && (
            <article className="uts-panel">
              <h2>Docentmodule</h2>
              <div className="uts-stepper">
                <button type="button" className={`uts-step ${teacherStep === "select" ? "active" : ""}`} onClick={() => setTeacherStep("select")}>
                  1. Hoofdvraag + bronkeuze
                </button>
                <button
                  type="button"
                  className={`uts-step ${teacherStep === "game" ? "active" : ""}`}
                  onClick={() => {
                    if (selectedSourceId || sessionId) setTeacherStep("game");
                  }}
                >
                  2. Game starten
                </button>
              </div>

              {teacherStep === "select" ? (
                <>
                  <label>Hoofdvraag</label>
                  <textarea
                    value={mainQuestion}
                    onChange={(e) => setMainQuestion(e.target.value)}
                    placeholder="Bijv. Hoe kon Stalin zoveel macht krijgen terwijl terreur zichtbaar was?"
                    rows={3}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") runSourceSearch();
                    }}
                  />
                  <div className="uts-inline">
                    <div>
                      <label>TV</label>
                      <select value={sourceTv} onChange={(e) => setSourceTv(e.target.value)}>
                        {TVS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>KA</label>
                      <select value={sourceKa} onChange={(e) => setSourceKa(e.target.value)}>
                        <option value="">-- Kies KA --</option>
                        {kaOptionsForSourceTv.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button className="uts-btn-secondary" type="button" onClick={runSourceSearch} disabled={searchBusy || !mainQuestion.trim()}>
                    {searchBusy ? "Matchen..." : "Match bronnen"}
                  </button>

                  {!!queryHints.length && (
                    <div className="uts-hints">
                      <strong>Zoeksporen:</strong>
                      <div className="uts-hint-tags">
                        {queryHints.slice(0, 6).map((h) => (
                          <span key={h}>{h}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!searchResults.length && (
                    <div className="uts-results">
                      {searchResults.map((src) => {
                        const active = String(src.id) === String(selectedSourceId);
                        return (
                          <button
                            key={src.id}
                            type="button"
                            className={`uts-result-item ${active ? "active" : ""}`}
                            onClick={() => {
                              selectSource(src).catch((e) => setError(String((e as any)?.message || e)));
                            }}
                          >
                            <strong>{src.title || src.id}</strong>
                            <span>
                              {src.provider || "DB"} · {src.tv || "TV?"} · {src.ka || "KA?"}
                              {typeof src._score === "number" ? ` · score ${src._score}` : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedSource && (
                    <div className="uts-source-mini">
                      <div><strong>Geselecteerd:</strong> {sourceTitle || selectedSource.title || selectedSource.id}</div>
                      <div className="uts-source-mini-meta">{sourceRef} · {sourceTv || "TV?"} · {sourceKa || "KA?"}</div>
                      <div className="uts-source-mini-meta">
                        Verwachte leestijd bron: <b>{computedReadingSeconds}s</b> · missiebriefing: <b>{preAutocueTotalSeconds}s</b> · totaal leesfase: <b>{computedReadingSeconds + preAutocueTotalSeconds}s</b>
                      </div>
                      {!!sourceSnippet && <p>{sourceSnippet.slice(0, 240)}</p>}
                    </div>
                  )}

                  <button className="uts-btn-primary" type="button" disabled={!selectedSourceId} onClick={() => setTeacherStep("game")}>
                    Volgende: game instellingen
                  </button>
                </>
              ) : (
                <>
                  <div className="uts-source-mini">
                    <div><strong>Bron voor game:</strong> {sourceTitle || selectedSource?.title || sourceRef || "(nog geen bron)"}</div>
                    <div className="uts-source-mini-meta">{sourceRef || "-"} · {sourceTv || "TV?"} · {sourceKa || "KA?"}</div>
                  </div>

                  <label>Teams (komma-gescheiden)</label>
                  <input value={teamsRaw} onChange={(e) => setTeamsRaw(e.target.value)} placeholder="Rebels, Empire" />
                  <div className="uts-inline">
                    <div>
                      <label>Leestempo (vast)</label>
                      <input value={`${FIXED_READING_WPM} woorden/min`} disabled />
                      <div className="uts-muted" style={{ marginTop: 4 }}>
                        Berekende leestijd bron: <b>{computedReadingSeconds}s</b> ({sourceWordCount} woorden) · missiebriefing: <b>{preAutocueTotalSeconds}s</b> · totaal leesfase: <b>{computedReadingSeconds + preAutocueTotalSeconds}s</b>
                      </div>
                    </div>
                    <div>
                      <label>Termtijd (s)</label>
                      <input value={termSeconds} onChange={(e) => setTermSeconds(e.target.value)} />
                    </div>
                    <div>
                      <label>Aantal quizvragen</label>
                      <input value={round2QuestionCount} onChange={(e) => setRound2QuestionCount(e.target.value)} />
                    </div>
                    <div>
                      <label>Totaal fallback (s)</label>
                      <input value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} />
                    </div>
                  </div>

                  <div className="uts-actions-row">
                    <button className="uts-btn-secondary" type="button" onClick={() => setTeacherStep("select")}>
                      Terug naar bronkeuze
                    </button>
                    <button className="uts-btn-primary" disabled={busy || !sourceRef.trim()} onClick={handleCreateAndStart}>
                      {busy ? "Bezig..." : "Launch Mission"}
                    </button>
                  </div>
                </>
              )}

              {sessionId && (
                <div className="uts-session-meta">
                  <div>
                    <strong>Sessie:</strong> #{sessionId}
                  </div>
                  <div>
                    <strong>Gamecode:</strong> {gameCode}
                    <button className="uts-copy" onClick={() => copyText("Gamecode", gameCode)} type="button">
                      Kopieer
                    </button>
                  </div>
                  <div>
                    <strong>Leerling-link:</strong>{" "}
                    <a href={studentJoinPath} target="_blank" rel="noreferrer">
                      {studentJoinPath}
                    </a>
                    <button className="uts-copy" onClick={() => copyText("Leerling-link", studentJoinUrl)} type="button">
                      Kopieer
                    </button>
                  </div>
                  <div>
                    <strong>Docent-account:</strong>{" "}
                    <a href={teacherSignupUrl} target="_blank" rel="noreferrer">
                      {teacherSignupUrl}
                    </a>
                  </div>
                  <div className="uts-links">
                    {(session?.teams || []).map((t) => (
                      <a key={t.id} href={`/sourcegame/play/${sessionId}?code=${t.join_code}`} target="_blank" rel="noreferrer">
                        {t.name}: {t.join_code}
                      </a>
                    ))}
                  </div>
                  {!!copyMsg && <div className="uts-copy-msg">{copyMsg}</div>}
                </div>
              )}
            </article>
          )}

          <article className={`uts-panel uts-main ${isPlayerRoute ? "uts-main-player" : ""}`.trim()}>
            <h2>{isPlayerRoute ? "Leerling Speelscherm" : "Live Controle"}</h2>
            <div className="uts-clock-wrap">
              <div
                className={`uts-clock ${showNumericClock && secondsLeft <= 10 ? "danger" : ""} ${
                  showNumericClock ? "" : "mode-autocue"
                }`.trim()}
              >
                {clockDisplay}
              </div>
              <div className="uts-phase">
                {phase === "reading"
                  ? "LEESFASE"
                  : phase === "terms"
                  ? "TERMFASE"
                  : phase === "question_reading"
                  ? "LEESFASE 2"
                  : phase === "question_maker"
                  ? "VRAAGMAAK"
                  : phase === "quiz"
                  ? "QUIZ"
                  : phase.toUpperCase()}
              </div>
              {!isPlayerRoute && (phase === "reading" || phase === "question_reading") ? (
                <button className="uts-btn-stop" type="button" onClick={teacherSkipAutocue} disabled={busy}>
                  Stop autocue → volgende ronde
                </button>
              ) : null}
              <button
                className={`uts-music-toggle ${musicOn ? "on" : "off"}`}
                type="button"
                onClick={() => {
                  setMusicOn((prev) => {
                    const next = !prev;
                    if (next) primeAudio();
                    return next;
                  });
                }}
              >
                Quizmuziek: {musicOn ? "aan" : "uit"}
              </button>
              {!isPlayerRoute ? (
                <div className="uts-volume-wrap">
                  <span className="uts-volume-label">Volume {musicVolumePct}%</span>
                  <input
                    className="uts-volume-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={musicVolumePct}
                    onChange={(e) => setMusicVolumePct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  />
                </div>
              ) : null}
            </div>

            {isPlayerRoute && !joined && (
              <div className="uts-join-row">
                <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Je naam" disabled={joined} />
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Team code" disabled={joined} />
                <button className="uts-btn-secondary" onClick={handleJoin} disabled={busy || joined}>
                  {joined ? "Gejoined" : "Join"}
                </button>
              </div>
            )}

            {!sessionStarted ? (
              <div className="uts-memory-box uts-prestart-box">
                <h3>Be strong with the Source.</h3>
                <p>Talent without training is nothing.</p>
              </div>
            ) : missionBriefingActive ? (
              <div className="uts-mission-terminal" aria-live="polite">
                <div className="uts-mission-head">MISSION BRIEFING // SOURCE OPS</div>
                <pre className="uts-mission-text">
                  {missionTypedText}
                  {!missionTypingDone ? <span className="uts-mission-cursor">█</span> : null}
                </pre>
                <div className="uts-mission-meta">{missionTypingDone ? "Autocue actief..." : "Transmissie opstarten..."}</div>
              </div>
            ) : sourceVisible ? (
              <div className={`uts-source-box ${showCrawl ? "crawl-mode" : ""}`}>
                {showCrawl ? (
                  <div className={`uts-crawl-layout ${sourceImageUrl && !showExternalImagePanel ? "with-image" : ""}`.trim()}>
                    <div
                      ref={crawlStageRef}
                      className="uts-crawl-stage"
                      style={{
                        ["--crawl-duration" as any]: `${crawlDuration}s`,
                        ["--crawl-start-px" as any]: `${crawlMotion.startPx}px`,
                        ["--crawl-end-px" as any]: `${crawlMotion.endPx}px`,
                      }}
                    >
                      <div className="uts-crawl-fade" />
                      <div className="uts-crawl-label">
                        {phase === "question_reading" ? "AUTOCUE · VRAAGVOORBEREIDING" : "AUTOCUE · LEESFASE"}
                      </div>
                      <div className="uts-crawl-perspective">
                        <div ref={crawlTextRef} className="uts-crawl-text" onAnimationEnd={() => { void markReadingDone(); }}>
                          <h3>{crawlContent.title}</h3>
                          {crawlContent.blocks.map((block, i) => (
                            <p key={`${i}-${block.slice(0, 24)}`}>{block}</p>
                          ))}
                          <span ref={crawlTailRef} className="uts-crawl-tail-sentinel" aria-hidden="true" />
                        </div>
                      </div>
                    </div>
                    {sourceImageUrl && !showExternalImagePanel ? (
                      <aside className="uts-crawl-side">
                        <div className="uts-crawl-side-label">Bronafbeelding</div>
                        <img className="uts-crawl-side-image" src={sourceImageUrl} alt="Bronafbeelding" loading="lazy" />
                      </aside>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <h3>{session?.source?.title || session?.title || "Bron"}</h3>
                    {sourceImageUrl ? (
                      <img className="uts-inline-source-image" src={sourceImageUrl} alt="Bronafbeelding" loading="lazy" />
                    ) : null}
                    {!!session?.source?.snippet && <p className="uts-snippet">{session?.source?.snippet}</p>}
                    {!!session?.source?.text && <p>{session?.source?.text}</p>}
                  </>
                )}
              </div>
            ) : showPreTermsBriefing ? (
              <div className="uts-mission-terminal uts-mission-terminal--brief" aria-live="assertive">
                <div className="uts-mission-head">MISSION BRIEFING // TERMFASE</div>
                <pre className="uts-mission-text uts-mission-text--brief">
                  Voer belangrijke begrippen in die bij deze source passen.
                  {"\n"}
                  Passende begrippen die niet letterlijk in de bron voorkomen leveren ook punten op.
                </pre>
                <div className="uts-pre-terms-countdown" aria-live="assertive">
                  {countdownText}
                </div>
              </div>
            ) : inQuestionMaker ? (
              <div className="uts-mission-terminal uts-mission-terminal--brief">
                <div className="uts-mission-head">MISSION BRIEFING // VRAAGMAAK</div>
                <pre className="uts-mission-text uts-mission-text--brief">
                  Maak nu 1 sterke bronvraag.
                  {"\n"}
                  Waarom/waardoor/hoe-kon vragen over oorzaken en historische context geven de meeste punten.
                  {"\n"}
                  Wat/wanneer/noem-vragen geven minder punten.
                </pre>
              </div>
            ) : (
              <div className="uts-memory-box">
                <h3>Transmission Lost</h3>
                <p>De bron is nu weg. Vertrouw op wat je net gelezen hebt en typ termen met precisie.</p>
              </div>
            )}

            <div className="uts-submit-row">
              <input
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                placeholder={
                  canSubmit
                    ? "Typ een relevante term (geen dubbelingen)..."
                    : inQuestionMaker
                    ? "Termfase voorbij. Nu vragenronde..."
                    : "Wacht op termfase..."
                }
                disabled={!canSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitTerm();
                }}
              />
              <button className="uts-btn-primary" disabled={!canSubmit} onClick={submitTerm}>
                Verstuur
              </button>
            </div>
            {canSubmit ? (
              <div className="uts-live-label">
                Voer belangrijke begrippen in die bij deze source passen. Passende begrippen die niet
                in de bron voorkwamen leveren ook punten op. Dubbel invoeren = strafpunt.
              </div>
            ) : null}

            {liveChips.length > 0 ? (
              <>
                <div className="uts-live-label">Live termen (beide teams · 5s zichtbaar)</div>
                <div className="uts-live-strip" aria-live="polite">
                {liveChips.map((c) => {
                  const good = Number(c.points || 0) > 0 || String(c.verdict || "").includes("accepted");
                  return (
                    <span key={`${c.id}-${c.submitted_at}`} className={`uts-live-chip ${good ? "good" : "bad"}`}>
                      <b>{c.team_name}</b>
                      <span>{c.term}</span>
                      <em>{Number(c.points || 0) > 0 ? `+${c.points}` : c.points}</em>
                    </span>
                  );
                })}
                </div>
              </>
            ) : null}

            {(inQuestionMaker || inQuiz || phase === "time_up" || phase === "finished") ? (
              <div className="uts-round2">
                <h3>Ronde 2 · Vraag & Meerkeuze (Kahoot-stijl)</h3>
                {inQuestionMaker ? (
                  <p className="uts-round2-help">
                    Vraagmaakronde: stel 1 sterke bronvraag. Waarom/waardoor/hoe-kon + historische context = hoogste score.
                  </p>
                ) : (
                  <p className="uts-round2-help">
                    Meerkeuzeronde: beantwoord de vragen op je eigen scherm.
                  </p>
                )}

                {inQuestionMaker ? (
                  joined ? (
                    <div className="uts-round2-question">
                      <label>Jouw bronvraag</label>
                      <div className="uts-submit-row">
                        <input
                          value={questionInput}
                          onChange={(e) => setQuestionInput(e.target.value)}
                          placeholder="Bijv. Waarom accepteerden groepen dit beleid in deze context?"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitQuestion();
                          }}
                        />
                        <button className="uts-btn-secondary" onClick={submitQuestion} disabled={busy || !questionInput.trim() || !canSubmitQuestion}>
                          Verstuur vraag
                        </button>
                      </div>
                      {ownQuestion ? (
                        <div className="uts-round2-own">
                          <b>{ownQuestion.quality_points}p</b> · {ownQuestion.question_text}
                          <div className="uts-muted">{ownQuestion.quality_reason}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="uts-round2-host">
                      <div className="uts-muted">
                        Vraagronde actief: <b>{(round2.questions || []).length}</b> vraag(en) ingestuurd.
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    {!joined ? (
                      <div className="uts-round2-host">
                        <button className="uts-btn-primary" onClick={generateRound2Quiz} disabled={busy}>
                          Herbouw quizvragen
                        </button>
                        <div className="uts-muted">
                          Doel: {quizQuestionCount} vraag(en) met Gemini + fallback.
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {!!round2Msg && <div className="uts-round2-msg">{round2Msg}</div>}

                {(round2.quiz_items || []).length > 0 ? (
                  <div className="uts-round2-quiz">
                    {(round2.quiz_items || []).map((item, idx) => {
                      const ownAnswer = ownAnswersByItem.get(Number(item.id));
                      return (
                        <div key={item.id} className="uts-round2-item">
                          <div className="uts-round2-prompt">
                            <span>Vraag {idx + 1}</span> {item.prompt}
                          </div>
                          <div className="uts-round2-options">
                            {(item.options || []).map((opt, optIdx) => (
                              <button
                                key={`${item.id}-${optIdx}`}
                                className={`uts-round2-option ${ownAnswer?.selected_index === optIdx ? "selected" : ""}`}
                                disabled={!joined || Boolean(ownAnswer) || busy || !(inQuiz || phase === "time_up")}
                                onClick={() => submitRound2Answer(Number(item.id), optIdx)}
                              >
                                <b>{String.fromCharCode(65 + optIdx)}.</b> {opt}
                              </button>
                            ))}
                          </div>
                          {ownAnswer ? (
                            <div className={`uts-round2-verdict ${ownAnswer.verdict}`}>
                              {ownAnswer.verdict === "goed"
                                ? "Goed"
                                : ownAnswer.verdict === "half_goed"
                                ? "Half goed"
                                : "Fout"}{" "}
                              ({ownAnswer.points > 0 ? `+${ownAnswer.points}` : ownAnswer.points})
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="uts-muted">
                    {inQuiz
                      ? "Quizvragen worden nu klaargezet (Gemini + fallback)..."
                      : "Meerkeuzeronde start na de vraagmaak-timer."}
                  </div>
                )}
              </div>
            ) : null}
          </article>

          <article className={`uts-panel ${isPlayerRoute ? "uts-score-panel" : ""}`.trim()}>
            <h2>Scoreboard</h2>
            <div className="uts-rope">
              <div className="uts-rope-line" />
              <div className="uts-rope-trophy" style={{ left: `${ropePercent}%` }} role="img" aria-label="Trofee">
                🏆
              </div>
            </div>
            <div className="uts-score-list">
              {(leaderboard || []).map((team) => (
                <div key={team.id} className="uts-score-row">
                  <span>{team.name}</span>
                  <strong>{team.score}</strong>
                </div>
              ))}
            </div>
            {(phase === "time_up" || phase === "finished") && topPlayers.length > 0 ? (
              <div className="uts-top5">
                <h3>Top 5 Most Productive Players</h3>
                <div className="uts-top5-list">
                  {topPlayers.map((p, idx) => (
                    <div key={`${p.id}-${idx}`} className="uts-top5-row">
                      <span>
                        #{idx + 1} {p.display_name}
                        {idx === 0 && activityByPlayer.has(Number(p.id)) ? <em className="uts-badge-mvp">MVP</em> : null}
                        {!activityByPlayer.has(Number(p.id)) ? <em className="uts-badge-npc">NPC</em> : null}
                      </span>
                      <span>{p.team_name}</span>
                      <strong>{p.score}</strong>
                    </div>
                  ))}
                </div>
                {npcPlayers.length > 0 ? (
                  <div className="uts-npc-wrap">
                    <h4>NPC badges (geen activiteit)</h4>
                    <div className="uts-npc-list">
                      {npcPlayers.map((p) => (
                        <span key={`npc-${p.id}`} className="uts-npc-chip">
                          {p.display_name} · {p.team_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {sessionStatus === "finished" && overallHighscores ? (
              <div className="uts-overall-final">
                <h3>Eindklassement Overall</h3>
                <div className="uts-overall-meta">
                  Op basis van {overallHighscores.finished_sessions} afgeronde spelletjes
                </div>
                <div className="uts-overall-grid">
                  <div className="uts-overall-col">
                    <h4>Top 5 Teams</h4>
                    <div className="uts-overall-list">
                      {(overallHighscores.teams_top || []).map((t, idx) => (
                        <div key={`${t.team_key}-${idx}`} className="uts-overall-row">
                          <span>#{idx + 1} {t.team_name}</span>
                          <em>{t.games_played} games</em>
                          <strong>{t.total_score}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="uts-overall-col">
                    <h4>Top 5 MVP</h4>
                    <div className="uts-overall-list">
                      {(overallHighscores.mvp_top || []).map((p, idx) => (
                        <div key={`${p.player_key}-${idx}`} className="uts-overall-row">
                          <span>#{idx + 1} {p.display_name}</span>
                          <em>{p.games_played} games</em>
                          <strong>{p.total_score}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            {(phase === "time_up" || phase === "finished") && (
              <button className="uts-btn-secondary" disabled={busy || !finishGate} onClick={finishSession}>
                Ronde afronden (na 2 rondes)
              </button>
            )}
            {(phase === "time_up" || phase === "finished") && !finishGate ? (
              <div className="uts-muted" style={{ marginTop: 8 }}>
                Finish pas mogelijk nadat ronde 2 is gespeeld door beide teams.
              </div>
            ) : null}
          </article>
        </section>

        {error && <div className="uts-error">{error}</div>}
      </div>
    </div>
  );
}
