import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import "./use-the-source.css";
import { tvKaOptions } from "../../data/tvKaPresets";

type Team = {
  id: number;
  name: string;
  score: number;
  join_code: string;
  jokers_remaining?: number;
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
  correct_index?: number | null;
  half_index?: number | null;
  rationale?: string;
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
  verdict: "goed" | "fout";
  points: number;
  rationale?: string;
  created_at: string;
};

type Round2State = {
  questions: Round2Question[];
  quiz_items: Round2QuizItem[];
  answers: Round2Answer[];
};

type ChipRainChip = {
  chip_key: string;
  term: string;
  points_abs?: number;
  spawn_ms: number;
  fall_ms: number;
  left_pct: number;
  drift_px: number;
  scale: number;
  monster_variant?: number;
  captured?: boolean;
  captured_verdict?: "good" | "bad" | "";
  captured_points?: number;
};

type ChipRainHit = {
  id: number;
  chip_key: string;
  term: string;
  verdict: string;
  points: number;
  team_id: number;
  team_name: string;
  player_id?: number;
  player_key?: string;
  display_name?: string;
  created_at: string;
};

type ChipRainState = {
  phase_active?: boolean;
  total_chips: number;
  chips: ChipRainChip[];
  hits: ChipRainHit[];
};

type LaserShot = {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  angle: number;
  length: number;
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

type BonusReviewSummary = {
  reviewed: number;
  awarded: number;
  rejected: number;
  bonus_points_total: number;
  reviewed_at?: string;
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
      enable_chip_rain?: boolean;
      chip_rain_seconds?: number;
      quiz_seconds?: number;
      round2_question_count?: number;
      round2_question_seconds?: number;
      round2_active_index?: number;
      round2_reveal?: boolean;
      round2_active_started_at?: string | null;
      round2_question_seconds_left?: number;
      bonus_review_summary?: BonusReviewSummary | null;
    };
    teams: Team[];
    clock?: {
      phase: "waiting" | "reading" | "terms" | "chip_rain" | "question_reading" | "question_maker" | "quiz" | "time_up" | "finished";
      elapsed_seconds: number;
      seconds_left_total: number;
      seconds_left_phase: number;
      total_seconds: number;
      reading_seconds: number;
      term_seconds: number;
      chip_rain_seconds?: number;
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
  chip_rain?: ChipRainState;
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
const TV_PERIOD_BY_CODE: Record<string, string> = {
  TV1: "tot 3000 v.Chr.",
  TV2: "3000 v.Chr. - 500 n.Chr.",
  TV3: "500 - 1000",
  TV4: "1000 - 1500",
  TV5: "1500 - 1600",
  TV6: "1600 - 1700",
  TV7: "1700 - 1800",
  TV8: "1800 - 1900",
  TV9: "1900 - 1950 (20e eeuw, eerste helft)",
  TV10: "1950 - heden (20e/21e eeuw)",
};

function formatTvHuman(tvRaw: string): string {
  const tvCode = String(tvRaw || "").trim().toUpperCase();
  if (!tvCode) return "Tijdvak onbekend";
  const tvNum = Number(tvCode.replace(/[^\d]/g, ""));
  const tvLabel = tvKaOptions.find((opt) => opt.tv === tvNum)?.tvLabel || tvCode;
  const period = TV_PERIOD_BY_CODE[tvCode];
  return period ? `${tvLabel} - ${period}` : tvLabel;
}

function formatKaHuman(kaRaw: string, tvRaw: string): string {
  const kaCode = String(kaRaw || "").trim().toUpperCase();
  if (!kaCode) return "Kenmerkend aspect onbekend";
  const tvNum = Number(String(tvRaw || "").replace(/[^\d]/g, ""));
  const kaNum = Number(kaCode.replace(/[^\d]/g, ""));
  const hit = tvKaOptions.find((opt) => opt.tv === tvNum && Number(opt.ka) === kaNum)
    || tvKaOptions.find((opt) => Number(opt.ka) === kaNum);
  if (!hit) return kaCode;
  const cleanLabel = String(hit.kaLabel || "").replace(/^KA\d+\s*-\s*/i, "").trim();
  return cleanLabel ? `Kenmerkend aspect: ${cleanLabel}` : kaCode;
}

function toInt(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function fallbackClock(session: SessionResponse["session"] | undefined) {
  if (!session) return null;
  const reading = Number(session.timing?.reading_seconds || 0);
  const term = Number(session.timing?.term_seconds || session.timing?.duration_seconds || 60);
  const chipRainEnabled = Boolean((session.settings as any)?.enable_chip_rain ?? true);
  const chipRain = chipRainEnabled ? Number((session.settings as any)?.chip_rain_seconds || 30) : 0;
  const questionReading = Number(session.settings?.question_reading_seconds || reading || 0);
  const questionMaker = Number(session.settings?.question_maker_seconds || 60);
  const quiz = Number(session.settings?.quiz_seconds || 90);
  const total = reading + term + chipRain + questionReading + questionMaker + quiz;
  return {
    phase: "waiting" as const,
    elapsed_seconds: 0,
    seconds_left_total: total,
    seconds_left_phase: reading || term || chipRain || questionReading || questionMaker || quiz,
    total_seconds: total,
    reading_seconds: reading,
    term_seconds: term,
    chip_rain_seconds: chipRain,
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
const PRE_AUTOCUE_COUNTDOWN_SECONDS = 30;
const READING_GRACE_AFTER_CRAWL_SECONDS = 30;
const MISSION_TYPING_CHARS_PER_SECOND = 28;
const PRE_PHASE_BRIEFING_TYPING_CHARS_PER_SECOND = 30;
const PRE_QUESTION_COUNTDOWN_SECONDS = 30;
const TERMS_INTERMISSION_SECONDS = 30;
const MISSION_BRIEFING_TEXT = [
  "Jullie Missie:",
  "",
  "Lees de bron straks als een detective: rustig, scherp, niet haasten.",
  "Spot belangrijke personen, gebeurtenissen en historische begrippen.",
  "Onthoud wat je leest, want de bron verdwijnt daarna tijdelijk van je scherm.",
  "In de termfase scoor je punten met begrippen die echt bij de bron passen.",
  "Pro-tip: ook slimme begrippen die niet letterlijk in de bron staan kunnen punten opleveren.",
  "Dubbel invoeren = strafpunten. Blind gokken = ook niet handig ;)",
  "",
  "May the source be with you!",
].join("\n");
const QUESTION_MAKER_BRIEFING_TEXT = [
  "Mission Briefing // Vraagmaker",
  "",
  "Zo meteen start de vraagmaker.",
  "Je ziet de bron dan als normale tekst op je scherm.",
  "Bedenk 1 sterke vraag die je klasgenoten echt laat nadenken.",
  "Waarom/waardoor/hoe-kon + historische context geeft de meeste punten.",
  "",
  "Check je missie. Vraagmaker start zo.",
].join("\n");
const CHIP_MONSTER_ICONS = ["👾", "🛸", "👽", "🤖", "🛰️", "🪐"];

function buildPhaseBriefingState({
  active,
  nowMs,
  phaseStartMs,
  text,
  typingCharsPerSecond,
  countdownSeconds,
  startDelaySeconds = 0,
}: {
  active: boolean;
  nowMs: number;
  phaseStartMs: number;
  text: string;
  typingCharsPerSecond: number;
  countdownSeconds: number;
  startDelaySeconds?: number;
}) {
  if (!active) {
    return {
      active: false,
      typingDone: true,
      countdownLeft: 0,
      typedText: text,
      showCursor: false,
      delayLeft: 0,
    };
  }
  if (!phaseStartMs) {
    return {
      active: true,
      typingDone: false,
      countdownLeft: Math.max(0, countdownSeconds),
      typedText: "",
      showCursor: true,
      delayLeft: Math.max(0, startDelaySeconds),
    };
  }
  const elapsedSeconds = Math.max(0, (nowMs - phaseStartMs) / 1000);
  const delaySeconds = Math.max(0, Number(startDelaySeconds || 0));
  const delayLeft = Math.max(0, Math.ceil(delaySeconds - elapsedSeconds));
  const typingSeconds = Math.max(2, Math.ceil(text.length / Math.max(1, typingCharsPerSecond)));
  const totalSeconds = delaySeconds + typingSeconds + Math.max(0, countdownSeconds);
  const stillActive = elapsedSeconds < totalSeconds;
  if (!stillActive) {
    return {
      active: false,
      typingDone: true,
      countdownLeft: 0,
      typedText: text,
      showCursor: false,
      delayLeft: 0,
    };
  }
  if (delayLeft > 0) {
    return {
      active: true,
      typingDone: false,
      countdownLeft: Math.max(0, countdownSeconds),
      typedText: "",
      showCursor: false,
      delayLeft,
    };
  }
  const elapsedBriefing = Math.max(0, elapsedSeconds - delaySeconds);
  const typingDone = elapsedBriefing >= typingSeconds;
  const typedChars = Math.min(text.length, Math.max(0, Math.floor(elapsedBriefing * typingCharsPerSecond)));
  const countdownLeft = typingDone ? Math.max(0, Math.ceil(totalSeconds - elapsedSeconds)) : Math.max(0, countdownSeconds);
  return {
    active: true,
    typingDone,
    countdownLeft,
    typedText: text.slice(0, typedChars),
    showCursor: !typingDone,
    delayLeft: 0,
  };
}

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
  const [chipRain, setChipRain] = useState<ChipRainState>({ total_chips: 0, chips: [], hits: [] });
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
  const [round2QuestionSeconds, setRound2QuestionSeconds] = useState(search.get("round2_qsec") || "20");
  const [teamsRaw, setTeamsRaw] = useState("Rebels, Empire");

  const [sessionId, setSessionId] = useState<string>(id || "");
  const [joinCode, setJoinCode] = useState(search.get("code") || "");
  const [playerName, setPlayerName] = useState(search.get("name") || "");
  const [playerKey, setPlayerKey] = useState(search.get("player_key") || "");
  const [joined, setJoined] = useState(Boolean(search.get("player_key")));
  const [termInput, setTermInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [round2Msg, setRound2Msg] = useState("");
  const [chipMsg, setChipMsg] = useState("");
  const [chipFeedbackTone, setChipFeedbackTone] = useState<"" | "good" | "bad">("");
  const [chipFeedback, setChipFeedback] = useState<{
    verdict: string;
    term: string;
    points: number;
  } | null>(null);
  const [chipBusyKey, setChipBusyKey] = useState("");
  const [laserShots, setLaserShots] = useState<LaserShot[]>([]);
  const [shipFiring, setShipFiring] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const [finishBonusSummary, setFinishBonusSummary] = useState<BonusReviewSummary | null>(null);
  const [useJokerNext, setUseJokerNext] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [musicVolumePct, setMusicVolumePct] = useState<number>(() => {
    if (typeof window === "undefined") return 65;
    const raw = Number(window.localStorage.getItem("uts_music_volume_pct") || "65");
    if (!Number.isFinite(raw)) return 65;
    return Math.max(0, Math.min(100, Math.trunc(raw)));
  });
  const [resolvedMusicUrl, setResolvedMusicUrl] = useState("");
  const [sourceImageOrientation, setSourceImageOrientation] = useState<"portrait" | "landscape" | "unknown">("unknown");
  const [phaseNowMs, setPhaseNowMs] = useState<number>(() => Date.now());
  const [questionReadingPhaseStartMs, setQuestionReadingPhaseStartMs] = useState<number>(0);

  const audioRef = useRef<AudioContext | null>(null);
  const trackRef = useRef<HTMLAudioElement | null>(null);
  const crawlStageRef = useRef<HTMLDivElement | null>(null);
  const crawlTextRef = useRef<HTMLDivElement | null>(null);
  const crawlTailRef = useRef<HTMLSpanElement | null>(null);
  const chipRainStageRef = useRef<HTMLDivElement | null>(null);
  const chipShotSeqRef = useRef<number>(1);
  const readingDoneRef = useRef<string>("");
  const readingDoneTimerRef = useRef<number | null>(null);
  const autoQuizRef = useRef<string>("");
  const phaseEntryRef = useRef<string>("");
  const prevPhaseRef = useRef<string>("");
  const beepSecondRef = useRef<number>(-1);
  const musicStepRef = useRef<number>(0);
  const syncOffsetRef = useRef<number>(0);
  const [crawlMotion, setCrawlMotion] = useState({ startPx: 260, endPx: 180 });

  const clock = session?.clock || fallbackClock(session);
  const phase = clock?.phase || "waiting";
  const phaseKey = String(phase || "").toLowerCase();
  const phaseLooksWaiting =
    phaseKey === "waiting" ||
    phaseKey.includes("waiting") ||
    phaseKey.includes("lobby") ||
    phaseKey.includes("pre_start") ||
    phaseKey.includes("prepare");
  const secondsLeft = Number(clock?.seconds_left_phase ?? 0);
  const sessionStatus = String(session?.status || "").toLowerCase();
  const sessionStarted = sessionStatus === "live" || sessionStatus === "finished";
  const inChipRain = phaseKey === "chip_rain";
  const inQuestionReading = phaseKey === "question_reading";
  const inQuestionMaker = phaseKey === "question_maker";
  const inQuiz = phaseKey === "quiz";
  // Bron weg tijdens begrippenfases; zichtbaar tijdens lees- en vraagmaakfase.
  const sourceVisible =
    sessionStarted &&
    (phase === "waiting" ||
      phase === "reading" ||
      phase === "question_maker" ||
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
    const likelyIncludesGrace = fromClock > 0 && fromWpm > 0 && fromClock - fromWpm >= 20;
    const fromClockCrawl = likelyIncludesGrace
      ? Math.max(1, fromClock - READING_GRACE_AFTER_CRAWL_SECONDS)
      : fromClock;
    return Math.max(1, fromClockCrawl || fromWpm || 1);
  }, [crawlWordCount, readingWpmSetting, clock?.reading_seconds]);
  const readingSecondsTotal = Number(clock?.reading_seconds || 0);
  const readingProgress = phase === "reading" ? Math.max(0, readingSecondsTotal - secondsLeft) : 0;
  const missionTypingSeconds = 0;
  const preAutocueTotalSeconds = READING_GRACE_AFTER_CRAWL_SECONDS;
  const questionBriefingTypingSeconds = Math.max(
    4,
    Math.ceil(QUESTION_MAKER_BRIEFING_TEXT.length / Math.max(1, PRE_PHASE_BRIEFING_TYPING_CHARS_PER_SECOND))
  );
  const questionBriefingTotalSeconds = questionBriefingTypingSeconds + PRE_QUESTION_COUNTDOWN_SECONDS;
  const missionBriefingActive = false;

  const chipRainPhaseTotal = Math.max(0, Number(clock?.chip_rain_seconds || 0));
  const questionReadingPhaseTotal = Math.max(0, Number(clock?.question_reading_seconds || 0));
  const chipRainElapsed = inChipRain ? Math.max(0, chipRainPhaseTotal - Math.max(0, secondsLeft)) : 0;
  const questionReadingElapsed = inQuestionReading
    ? Math.max(0, questionReadingPhaseTotal - Math.max(0, secondsLeft))
    : 0;
  const termsIntermissionApplies =
    (inChipRain && chipRainPhaseTotal > 0) ||
    (inQuestionReading && chipRainPhaseTotal <= 0);
  const termsIntermissionElapsed = inChipRain ? chipRainElapsed : questionReadingElapsed;
  const termsIntermissionActive =
    sessionStarted &&
    termsIntermissionApplies &&
    termsIntermissionElapsed < TERMS_INTERMISSION_SECONDS;
  const termsIntermissionLeft = termsIntermissionActive
    ? Math.max(0, Math.ceil(TERMS_INTERMISSION_SECONDS - termsIntermissionElapsed))
    : 0;

  const questionPrepBriefing = buildPhaseBriefingState({
    active: sessionStarted && phase === "question_reading",
    nowMs: phaseNowMs,
    phaseStartMs: questionReadingPhaseStartMs,
    text: QUESTION_MAKER_BRIEFING_TEXT,
    typingCharsPerSecond: PRE_PHASE_BRIEFING_TYPING_CHARS_PER_SECOND,
    countdownSeconds: PRE_QUESTION_COUNTDOWN_SECONDS,
    startDelaySeconds:
      sessionStarted && phase === "question_reading" && chipRainPhaseTotal <= 0
        ? TERMS_INTERMISSION_SECONDS
        : 0,
  });
  const canSubmit = joined && phase === "terms";
  const canSubmitQuestion = joined && inQuestionMaker;
  const quizQuestionCount = Math.max(2, Math.min(12, Number(session?.settings?.round2_question_count || 4)));
  const questionPrepBriefingActive = questionPrepBriefing.active;
  const waitingCountdown = Math.max(0, Math.trunc(secondsLeft));
  const showWaitingCountdown =
    phaseLooksWaiting &&
    waitingCountdown > 0 &&
    waitingCountdown <= PRE_AUTOCUE_COUNTDOWN_SECONDS;
  const showNumericClock =
    showWaitingCountdown ||
    phaseKey === "terms" ||
    (phaseKey === "chip_rain" && !termsIntermissionActive) ||
    (phaseKey === "question_reading" && !questionPrepBriefingActive && !termsIntermissionActive) ||
    phaseKey === "question_maker" ||
    phaseKey === "quiz";
  const clockDisplay =
    !sessionStarted
      ? showWaitingCountdown
        ? `${waitingCountdown}s`
        : "READY"
      : phaseLooksWaiting
      ? showWaitingCountdown
        ? `${waitingCountdown}s`
        : "READY"
      : termsIntermissionActive
      ? "TOP 5"
      : phaseKey === "reading"
      ? missionBriefingActive
        ? "BRIEFING"
        : "AUTOCUE"
      : phaseKey === "question_reading"
      ? questionPrepBriefingActive
        ? "BRIEFING"
        : `${secondsLeft}s`
      : phaseKey === "chip_rain"
      ? `${secondsLeft}s`
      : phaseKey === "finished"
      ? "FINISHED"
      : phaseKey === "time_up"
      ? "TIME UP"
      : showNumericClock
      ? `${secondsLeft}s`
      : "READY";
  const gameCode = session?.game_code || (sessionId ? `US${sessionId}` : "");
  const studentJoinPath = "/join";
  const studentJoinUrl = typeof window !== "undefined" ? `${window.location.origin}${studentJoinPath}` : studentJoinPath;
  const musicActive =
    musicOn &&
    (phase === "terms" ||
      phase === "chip_rain" ||
      phase === "question_maker" ||
      phase === "quiz" ||
      phase === "time_up" ||
      phase === "finished");
  const waitingMusicUrl = String(session?.settings?.waiting_music_url || "https://pixabay.com/nl/music/hoofdtitel-space-adventures-orchestral-music-star-wars-style-139660/").trim();
  const warmupMusicUrl = String(session?.settings?.warmup_music_url || "https://pixabay.com/nl/music/hoofdtitel-star-wars-style-chase-music-181118/").trim();
  const liveMusicUrl = String(session?.settings?.music_live_url || session?.settings?.music_url || BUNDLED_BATTLE_TRACK).trim();
  const musicVolume = Math.max(0, Math.min(1, musicVolumePct / 100));
  const missionTypedChars = missionBriefingActive
    ? Math.min(
        MISSION_BRIEFING_TEXT.length,
        Math.max(0, Math.floor(readingProgress * MISSION_TYPING_CHARS_PER_SECOND))
      )
    : MISSION_BRIEFING_TEXT.length;
  const missionTypedText = MISSION_BRIEFING_TEXT.slice(0, missionTypedChars);
  const missionTypingDone = readingProgress >= missionTypingSeconds;
  const missionCountdownLeft =
    missionBriefingActive && missionTypingDone
      ? Math.max(0, Math.ceil(preAutocueTotalSeconds - readingProgress))
      : 0;
  const showCrawl = sourceVisible && phase === "reading" && !missionBriefingActive;
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
      : phase === "terms" ||
        phase === "chip_rain" ||
        phase === "question_maker" ||
        phase === "quiz" ||
        phase === "time_up" ||
        phase === "finished"
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

  const myTeam = useMemo(() => {
    if (!playerKey) return null;
    for (const team of leaderboard || []) {
      if ((team.players || []).some((p) => String(p.player_key || "") === String(playerKey))) {
        return team;
      }
    }
    return null;
  }, [leaderboard, playerKey]);

  const jokersLeft = Math.max(0, Number((myTeam as any)?.jokers_remaining || 0));

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
    for (const h of chipRain.hits || []) {
      const pid = Number(h.player_id || 0);
      if (Number.isFinite(pid) && pid > 0) s.add(pid);
    }
    return s;
  }, [timeline, round2.questions, round2.answers, chipRain.hits]);

  const topPlayers = useMemo(() => {
    const rows = [...allPlayers];
    rows.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    return rows.slice(0, 5);
  }, [allPlayers]);
  const persistedBonusSummary = useMemo(() => {
    const raw = (session?.settings as any)?.bonus_review_summary;
    if (!raw || typeof raw !== "object") return null;
    return {
      reviewed: Number((raw as any).reviewed || 0),
      awarded: Number((raw as any).awarded || 0),
      rejected: Number((raw as any).rejected || 0),
      bonus_points_total: Number((raw as any).bonus_points_total || 0),
      reviewed_at: String((raw as any).reviewed_at || ""),
    } as BonusReviewSummary;
  }, [session?.settings]);
  const bonusSummary = finishBonusSummary || persistedBonusSummary;

  const topTeams5 = useMemo(() => {
    const rows = [...(leaderboard || [])];
    rows.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    return rows.slice(0, 5);
  }, [leaderboard]);

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

  const recentChipHits = useMemo(() => {
    const now = Date.now();
    return [...(chipRain.hits || [])]
      .filter((h) => {
        const ts = Date.parse(String(h.created_at || ""));
        if (!Number.isFinite(ts)) return false;
        return now - ts <= 5000;
      })
      .sort((a, b) => Date.parse(String(b.created_at || "")) - Date.parse(String(a.created_at || "")))
      .slice(0, 10);
  }, [chipRain.hits, secondsLeft]);

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
      .map((opt) => ({
        value: `KA${opt.ka}`,
        label: String(opt.kaLabel || "").replace(/^KA\d+\s*-\s*/i, "") || String(opt.kaLabel || ""),
      }));
  }, [sourceTv]);

  useEffect(() => {
    if (!kaOptionsForSourceTv.length) return;
    if (!kaOptionsForSourceTv.some((opt) => opt.value === sourceKa)) {
      setSourceKa(kaOptionsForSourceTv[0].value);
    }
  }, [kaOptionsForSourceTv, sourceKa]);

  const sourceTvHumanLabel = useMemo(() => formatTvHuman(sourceTv), [sourceTv]);
  const sourceKaHumanLabel = useMemo(() => formatKaHuman(sourceKa, sourceTv), [sourceKa, sourceTv]);

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

  const round2ActiveIndex = Math.max(0, Number((session?.settings as any)?.round2_active_index || 0));
  const round2Reveal = Boolean((session?.settings as any)?.round2_reveal);
  const sessionRound2QuestionSeconds = Math.max(
    8,
    Math.min(240, Number((session?.settings as any)?.round2_question_seconds || 20))
  );
  const round2ActiveStartedAt = String((session?.settings as any)?.round2_active_started_at || "").trim();
  const activeQuizItem = (round2.quiz_items || [])[round2ActiveIndex] || null;
  const ownActiveAnswer = activeQuizItem ? ownAnswersByItem.get(Number(activeQuizItem.id)) : null;
  const activeQuizTeamAnswers = useMemo(() => {
    if (!activeQuizItem) return 0;
    const ids = new Set<number>();
    for (const a of round2.answers || []) {
      if (Number(a.quiz_item_id) === Number(activeQuizItem.id)) ids.add(Number(a.team_id));
    }
    return ids.size;
  }, [round2.answers, activeQuizItem]);
  const quizQuestionSecondsLeft = useMemo(() => {
    const fromServer = Number((session?.settings as any)?.round2_question_seconds_left || 0);
    if (fromServer > 0) return fromServer;
    if (!round2ActiveStartedAt) return sessionRound2QuestionSeconds;
    const ms = Date.parse(round2ActiveStartedAt);
    if (!Number.isFinite(ms)) return sessionRound2QuestionSeconds;
    const elapsed = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    return Math.max(0, sessionRound2QuestionSeconds - elapsed);
  }, [session?.settings, round2ActiveStartedAt, sessionRound2QuestionSeconds, secondsLeft]);
  const quizItemCount = (round2.quiz_items || []).length;
  const isLastQuizItem = quizItemCount > 0 && round2ActiveIndex >= quizItemCount - 1;

  const finishGate = useMemo(() => {
    const items = round2.quiz_items || [];
    const nTeams = Math.min(2, Math.max(2, Number((leaderboard || []).length || 2)));
    if (items.length < 1) return false;
    const itemToTeams = new Map<number, Set<number>>();
    for (const a of round2.answers || []) {
      const qid = Number(a.quiz_item_id || 0);
      const tid = Number(a.team_id || 0);
      if (!qid || !tid) continue;
      if (!itemToTeams.has(qid)) itemToTeams.set(qid, new Set());
      itemToTeams.get(qid)!.add(tid);
    }
    return items.every((it) => (itemToTeams.get(Number(it.id))?.size || 0) >= nTeams);
  }, [round2.quiz_items, round2.answers, leaderboard]);

  const betweenstandTitle = useMemo(() => {
    if (!sessionStarted) return "";
    if (phase === "terms") return "Tussenstand na ronde 1 (begrippen)";
    if (phase === "chip_rain") return "Tussenstand bonusronde (chip-rain)";
    if (phase === "question_reading" || phase === "question_maker") return "Tussenstand na ronde 2 (vraagmaker)";
    if (phase === "quiz") {
      const nr = Math.max(1, Math.min(quizItemCount || 1, round2ActiveIndex + 1));
      return `Tussenstand na quizvraag ${nr}`;
    }
    if (phase === "time_up" || phase === "finished") return "Eindtussenstand";
    return "Live tussenstand";
  }, [sessionStarted, phase, quizItemCount, round2ActiveIndex]);
  const canAnswerActiveQuiz = Boolean(
    joined &&
      activeQuizItem &&
      !ownActiveAnswer &&
      !round2Reveal &&
      (inQuiz || phase === "time_up") &&
      quizQuestionSecondsLeft > 0
  );
  const canHitChip = Boolean(joined && inChipRain && !termsIntermissionActive);
  const canTeacherAdvanceQuiz = Boolean(
    !isPlayerRoute &&
      activeQuizItem &&
      (inQuiz || phase === "time_up" || phase === "finished")
  );
  const activeCorrectOption = useMemo(() => {
    if (!activeQuizItem) return "";
    const idx = Number(activeQuizItem.correct_index);
    if (!Number.isFinite(idx) || idx < 0 || idx > 3) return "";
    const label = String.fromCharCode(65 + idx);
    const text = String((activeQuizItem.options || [])[idx] || "").trim();
    return text ? `${label}. ${text}` : "";
  }, [activeQuizItem]);

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
    setChipRain(
      json.chip_rain && typeof json.chip_rain === "object"
        ? {
            total_chips: Number((json.chip_rain as any).total_chips || 0),
            chips: Array.isArray((json.chip_rain as any).chips) ? (json.chip_rain as any).chips : [],
            hits: Array.isArray((json.chip_rain as any).hits) ? (json.chip_rain as any).hits : [],
            phase_active: Boolean((json.chip_rain as any).phase_active),
          }
        : { total_chips: 0, chips: [], hits: [] }
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

  function scheduleReadingDone(delayMs = 0) {
    if (readingDoneTimerRef.current != null) {
      window.clearTimeout(readingDoneTimerRef.current);
      readingDoneTimerRef.current = null;
    }
    const wait = Math.max(0, Math.trunc(delayMs));
    readingDoneTimerRef.current = window.setTimeout(() => {
      readingDoneTimerRef.current = null;
      void markReadingDone();
    }, wait);
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
    setFinishBonusSummary(null);
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
        // Laat de klas na de laatste zin nog 30s de bron vasthouden.
        if (tailRect.bottom <= stageRect.top + 2) {
          const delay = phase === "reading" ? READING_GRACE_AFTER_CRAWL_SECONDS * 1000 : 0;
          scheduleReadingDone(delay);
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
      if (readingDoneTimerRef.current != null) {
        window.clearTimeout(readingDoneTimerRef.current);
        readingDoneTimerRef.current = null;
      }
      readingDoneRef.current = "";
    }
  }, [phase, sessionId]);

  useEffect(() => {
    return () => {
      if (readingDoneTimerRef.current != null) {
        window.clearTimeout(readingDoneTimerRef.current);
        readingDoneTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const prev = phaseEntryRef.current;
    if (phase === "question_reading" && prev !== "question_reading") {
      const phaseTotal = Math.max(0, Number(clock?.question_reading_seconds || 0));
      const elapsedInPhase = Math.max(0, phaseTotal - Math.max(0, secondsLeft));
      setQuestionReadingPhaseStartMs(Date.now() - elapsedInPhase * 1000);
    } else if (phase !== "question_reading") {
      setQuestionReadingPhaseStartMs(0);
    }
    phaseEntryRef.current = phase;
  }, [phase, secondsLeft, clock?.chip_rain_seconds, clock?.question_reading_seconds]);

  useEffect(() => {
    if (!(sessionStarted && (phase === "chip_rain" || phase === "question_reading"))) return;
    setPhaseNowMs(Date.now());
    const t = window.setInterval(() => {
      setPhaseNowMs(Date.now());
    }, 120);
    return () => window.clearInterval(t);
  }, [sessionStarted, phase, sessionId]);

  useEffect(() => {
    if (!(sessionStarted && phase === "question_reading")) return;
    if (questionPrepBriefing.active || termsIntermissionActive) return;
    void markReadingDone();
  }, [sessionStarted, phase, questionPrepBriefing.active, termsIntermissionActive]);

  useEffect(() => {
    if (jokersLeft <= 0 && useJokerNext) {
      setUseJokerNext(false);
    }
  }, [jokersLeft, useJokerNext]);

  useEffect(() => {
    if (!chipMsg) return;
    const t = window.setTimeout(() => setChipMsg(""), 1800);
    return () => window.clearTimeout(t);
  }, [chipMsg]);

  useEffect(() => {
    if (!chipFeedback) return;
    const t = window.setTimeout(() => setChipFeedback(null), 1800);
    return () => window.clearTimeout(t);
  }, [chipFeedback]);

  useEffect(() => {
    if (!chipFeedbackTone) return;
    const t = window.setTimeout(() => setChipFeedbackTone(""), 280);
    return () => window.clearTimeout(t);
  }, [chipFeedbackTone]);

  useEffect(() => {
    if (phase === "chip_rain") return;
    setLaserShots([]);
    setShipFiring(false);
    setChipFeedback(null);
    setChipFeedbackTone("");
  }, [phase]);

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
      const perQuestionSeconds = Math.max(8, Math.min(240, toInt(round2QuestionSeconds, 20)));

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
            round2_question_seconds: perQuestionSeconds,
            question_reading_seconds: questionBriefingTotalSeconds,
            question_maker_seconds: Math.max(30, Math.min(240, questionCount * 15)),
            quiz_seconds: Math.max(90, Math.min(1800, questionCount * (perQuestionSeconds + 18))),
            pre_reading_countdown_seconds: 0,
            pre_reading_typing_seconds: 0,
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
    const jokerNow = Boolean(useJokerNext && jokersLeft > 0);
    setTermInput("");
    try {
      const res = await fetch(`/api/sourcegame/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_key: playerKey,
          term,
          use_joker: jokerNow,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Term versturen mislukt");
      if (jokerNow) setUseJokerNext(false);
      setLeaderboard(json.leaderboard || []);
      if (Array.isArray(json.score_timeline)) setTimeline(json.score_timeline);
      if (json.chip_rain) {
        setChipRain({
          total_chips: Number(json.chip_rain.total_chips || 0),
          chips: Array.isArray(json.chip_rain.chips) ? json.chip_rain.chips : [],
          hits: Array.isArray(json.chip_rain.hits) ? json.chip_rain.hits : [],
          phase_active: Boolean(json.chip_rain.phase_active),
        });
      }
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

  function fireChipLaser(targetEl?: HTMLElement | null) {
    const stageEl = chipRainStageRef.current;
    if (!stageEl || !targetEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height || !targetRect.width || !targetRect.height) return;

    const startX = stageRect.width * 0.5;
    const startY = stageRect.height - 20;
    const targetX = targetRect.left + targetRect.width / 2 - stageRect.left;
    const targetY = targetRect.top + targetRect.height / 2 - stageRect.top;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const length = Math.max(24, Math.hypot(dx, dy));
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const shotId = chipShotSeqRef.current++;

    setShipFiring(true);
    setLaserShots((prev) => [
      ...prev.slice(-5),
      { id: shotId, startX, startY, targetX, targetY, angle, length },
    ]);

    window.setTimeout(() => {
      setLaserShots((prev) => prev.filter((shot) => shot.id !== shotId));
    }, 260);
    window.setTimeout(() => {
      setShipFiring(false);
    }, 120);
  }

  async function submitChipHit(chipKey: string, chipEl?: HTMLElement | null) {
    if (!sessionId || !joined || !playerKey || !chipKey || !canHitChip) return;
    fireChipLaser(chipEl);
    setChipBusyKey(chipKey);
    setChipMsg("");
    setChipFeedback(null);
    setChipFeedbackTone("");
    setError("");
    try {
      const res = await fetch(`/api/sourcegame/sessions/${sessionId}/chip-rain/hit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_key: playerKey,
          chip_key: chipKey,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Chip-hit mislukt");
      const verdict = String(json?.result?.verdict || "rejected");
      const pts = Number(json?.result?.points || 0);
      const label =
        verdict === "accepted" ? "RAAK" : verdict === "duplicate" ? "TE LAAT" : "MIS";
      setChipMsg(`${label}: ${json?.result?.term || chipKey} (${pts > 0 ? `+${pts}` : pts})`);
      setChipFeedback({
        verdict,
        term: String(json?.result?.term || chipKey),
        points: pts,
      });
      setChipFeedbackTone(pts > 0 ? "good" : "bad");
      if (json.leaderboard) setLeaderboard(json.leaderboard || []);
      if (json.chip_rain) {
        setChipRain({
          total_chips: Number(json.chip_rain.total_chips || 0),
          chips: Array.isArray(json.chip_rain.chips) ? json.chip_rain.chips : [],
          hits: Array.isArray(json.chip_rain.hits) ? json.chip_rain.hits : [],
          phase_active: Boolean(json.chip_rain.phase_active),
        });
      }
    } catch (e: any) {
      setError(String(e?.message || e));
      setChipFeedback({
        verdict: "error",
        term: chipKey,
        points: 0,
      });
      setChipFeedbackTone("bad");
    } finally {
      setChipBusyKey("");
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
      const verdictTxt = verdict === "goed" ? "Goed" : "Fout";
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

  async function advanceRound2QuizStep() {
    if (!sessionId || isPlayerRoute) return;
    setBusy(true);
    setRound2Msg("");
    setError("");
    try {
      const res = await fetch(`/api/sourcegame/sessions/${sessionId}/round2/next`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Quizdoorgang mislukt");
      const progress = json?.progress || {};
      const activeIdx = Number(progress.active_index || 0) + 1;
      const total = Number(progress.total_items || (round2.quiz_items || []).length || 0);
      if (progress.reveal) {
        setRound2Msg(`Goed antwoord getoond · vraag ${Math.max(1, activeIdx)} van ${Math.max(1, total)}`);
      } else {
        setRound2Msg(`Volgende quizvraag · vraag ${Math.max(1, activeIdx)} van ${Math.max(1, total)}`);
      }
      if (json.round2) {
        setRound2({
          questions: Array.isArray(json.round2.questions) ? json.round2.questions : [],
          quiz_items: Array.isArray(json.round2.quiz_items) ? json.round2.quiz_items : [],
          answers: Array.isArray(json.round2.answers) ? json.round2.answers : [],
        });
      }
      setLeaderboard(json.leaderboard || []);
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
      if (json?.bonus_summary && typeof json.bonus_summary === "object") {
        setFinishBonusSummary({
          reviewed: Number(json.bonus_summary.reviewed || 0),
          awarded: Number(json.bonus_summary.awarded || 0),
          rejected: Number(json.bonus_summary.rejected || 0),
          bonus_points_total: Number(json.bonus_summary.bonus_points_total || 0),
          reviewed_at: new Date().toISOString(),
        });
      }
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
                              {src.provider || "DB"} · {formatTvHuman(String(src.tv || ""))} · {formatKaHuman(String(src.ka || ""), String(src.tv || ""))}
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
                      <div className="uts-source-mini-meta">{sourceRef} · {sourceTvHumanLabel} · {sourceKaHumanLabel}</div>
                      <div className="uts-source-mini-meta">
                        Verwachte leestijd bron: <b>{computedReadingSeconds}s</b> · uitloop na laatste zin: <b>{preAutocueTotalSeconds}s</b> · totaal leesfase: <b>{computedReadingSeconds + preAutocueTotalSeconds}s</b>
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
                    <div className="uts-source-mini-meta">{sourceRef || "-"} · {sourceTvHumanLabel} · {sourceKaHumanLabel}</div>
                  </div>

                  <label>Teams (komma-gescheiden)</label>
                  <input value={teamsRaw} onChange={(e) => setTeamsRaw(e.target.value)} placeholder="Rebels, Empire" />
                  <div className="uts-inline">
                    <div>
                      <label>Leestempo (vast)</label>
                      <input value={`${FIXED_READING_WPM} woorden/min`} disabled />
                      <div className="uts-muted" style={{ marginTop: 4 }}>
                        Berekende leestijd bron: <b>{computedReadingSeconds}s</b> ({sourceWordCount} woorden) · uitloop na laatste zin: <b>{preAutocueTotalSeconds}s</b> · totaal leesfase: <b>{computedReadingSeconds + preAutocueTotalSeconds}s</b>
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
                      <label>Quiztijd per vraag (s)</label>
                      <input value={round2QuestionSeconds} onChange={(e) => setRound2QuestionSeconds(e.target.value)} />
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
                {termsIntermissionActive
                  ? "TUSSENSTAND"
                  : phase === "reading"
                  ? "LEESFASE"
                  : phase === "terms"
                  ? "TERMFASE"
                  : phase === "chip_rain"
                  ? "CHIP RAIN"
                  : phase === "question_reading"
                  ? "VRAAG BRIEFING"
                  : phase === "question_maker"
                  ? "VRAAGMAAK"
                  : phase === "quiz"
                  ? "QUIZ"
                  : phaseLooksWaiting
                  ? "WAITING"
                  : phase.toUpperCase()}
              </div>
              {!isPlayerRoute && phase === "reading" ? (
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
            ) : termsIntermissionActive ? (
              <div className="uts-terms-intermission" aria-live="polite">
                <div className="uts-terms-intermission-head">Tussenstand na begrippenronde</div>
                <div className="uts-terms-intermission-count">
                  Volgende instructie over <b>{termsIntermissionLeft}s</b>
                </div>
                <div className="uts-terms-intermission-grid">
                  <section className="uts-terms-intermission-col">
                    <h3>Top 5 Teams</h3>
                    {topTeams5.length > 0 ? (
                      <div className="uts-terms-intermission-list">
                        {topTeams5.map((team, idx) => (
                          <div key={`inter-team-${team.id}-${idx}`} className="uts-terms-intermission-row">
                            <span>#{idx + 1} {team.name}</span>
                            <strong>{team.score}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="uts-muted">Nog geen scores.</div>
                    )}
                  </section>
                  <section className="uts-terms-intermission-col">
                    <h3>Top 5 MVP</h3>
                    {topPlayers.length > 0 ? (
                      <div className="uts-terms-intermission-list">
                        {topPlayers.map((player, idx) => (
                          <div key={`inter-player-${player.id}-${idx}`} className="uts-terms-intermission-row">
                            <span>#{idx + 1} {player.display_name}</span>
                            <strong>{player.score}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="uts-muted">Nog geen spelersscore.</div>
                    )}
                  </section>
                </div>
              </div>
            ) : missionBriefingActive ? (
              <div className="uts-mission-terminal uts-mission-terminal--cockpit" aria-live="polite">
                <div className="uts-mission-viewport">
                  <div className="uts-mission-head">MISSION BRIEFING // SOURCE OPS</div>
                  <pre className="uts-mission-text">
                    {missionTypedText}
                    {!missionTypingDone ? <span className="uts-mission-cursor">█</span> : null}
                  </pre>
                  <div className="uts-mission-meta">
                    {missionTypingDone
                      ? missionCountdownLeft > 0
                        ? `Autocue start in ${missionCountdownLeft}s...`
                        : "Autocue actief..."
                      : "Transmissie opstarten..."}
                  </div>
                </div>
              </div>
            ) : questionPrepBriefingActive ? (
              <div className="uts-mission-terminal uts-mission-terminal--brief uts-mission-terminal--cockpit" aria-live="assertive">
                <div className="uts-mission-viewport">
                  <div className="uts-mission-head">MISSION BRIEFING // VRAAGMAAK</div>
                  <pre className="uts-mission-text uts-mission-text--brief">
                    {questionPrepBriefing.typedText}
                    {questionPrepBriefing.showCursor ? <span className="uts-mission-cursor">█</span> : null}
                  </pre>
                  <div className="uts-mission-meta">
                    {!questionPrepBriefing.typingDone
                      ? "Instructie laden..."
                      : questionPrepBriefing.countdownLeft > 0
                      ? `Vraagmaker start in ${questionPrepBriefing.countdownLeft}s...`
                      : "Vraagmaker actief..."}
                  </div>
                </div>
              </div>
            ) : sourceVisible ? (
              <div className={`uts-source-box ${showCrawl ? "crawl-mode uts-source-box--cockpit" : ""}`}>
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
                      <div className="uts-crawl-label">AUTOCUE · LEESFASE</div>
                      <div className="uts-crawl-perspective">
                        <div
                          ref={crawlTextRef}
                          className="uts-crawl-text"
                          onAnimationEnd={() => {
                            const delay = phase === "reading" ? READING_GRACE_AFTER_CRAWL_SECONDS * 1000 : 0;
                            scheduleReadingDone(delay);
                          }}
                        >
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
            ) : inChipRain ? (
                <div className="uts-chip-rain-box uts-chip-rain-box--cockpit">
                  <div className="uts-chip-rain-head">
                    <h3>Chip Rain</h3>
                    <span>
                      Gevangen chips: {chipRain.hits.length}/{Math.max(1, Number(chipRain.total_chips || chipRain.chips.length || 0))}
                    </span>
                  </div>
                  <p className="uts-chip-rain-help">
                    Klik snelle, passende termen voor punten. Foute of al gepakte chips geven strafpunten.
                  </p>
                  <div
                    ref={chipRainStageRef}
                    className={`uts-chip-rain-stage ${chipFeedbackTone ? `hit-${chipFeedbackTone}` : ""}`.trim()}
                    aria-live="polite"
                  >
                    {laserShots.map((shot) => (
                      <span
                        key={`laser-${shot.id}`}
                        className="uts-laser-shot"
                        style={
                          {
                            left: `${shot.startX}px`,
                            top: `${shot.startY}px`,
                            width: `${shot.length}px`,
                            transform: `rotate(${shot.angle}deg)`,
                          } as any
                        }
                        aria-hidden
                      />
                    ))}
                    {laserShots.map((shot) => (
                      <span
                        key={`impact-${shot.id}`}
                        className="uts-laser-impact"
                        style={
                          {
                            left: `${shot.targetX}px`,
                            top: `${shot.targetY}px`,
                          } as any
                        }
                        aria-hidden
                      />
                    ))}
                    <div className={`uts-chip-rain-ship ${shipFiring ? "firing" : ""}`.trim()} aria-hidden>
                      🚀
                    </div>
                    {(chipRain.chips || []).map((chip) => {
                      const variant = Math.abs(Number(chip.monster_variant || 0)) % CHIP_MONSTER_ICONS.length;
                      const icon = CHIP_MONSTER_ICONS[variant];
                      const capturedPoints = Number(chip.captured_points || 0);
                      return (
                        <button
                          key={chip.chip_key}
                          type="button"
                          className={`uts-fall-chip monster-${variant} ${chip.captured ? `captured ${String(chip.captured_verdict || "")}` : ""} ${
                            chipBusyKey === chip.chip_key ? "pending" : ""
                          }`.trim()}
                          style={
                            {
                              ["--chip-delay" as any]: `${Math.max(0, Number(chip.spawn_ms || 0))}ms`,
                              ["--chip-fall" as any]: `${Math.max(1800, Number(chip.fall_ms || 7000))}ms`,
                              ["--chip-left" as any]: `${Math.max(2, Math.min(98, Number(chip.left_pct || 50)))}%`,
                              ["--chip-drift" as any]: `${Math.max(-120, Math.min(120, Number(chip.drift_px || 0)))}px`,
                              ["--chip-scale" as any]: `${Math.max(0.82, Math.min(1.6, Number(chip.scale || 1)))}`,
                            } as any
                          }
                          disabled={!canHitChip || Boolean(chip.captured) || chipBusyKey === chip.chip_key}
                          onClick={(e) => submitChipHit(chip.chip_key, e.currentTarget as HTMLButtonElement)}
                        >
                          <span className="uts-fall-chip-head">
                            <span className="uts-fall-monster" aria-hidden>{icon}</span>
                            <span className="uts-fall-term">{chip.term}</span>
                          </span>
                          {chip.captured ? (
                            <span className={`uts-fall-points ${capturedPoints >= 0 ? "good" : "bad"}`.trim()}>
                              {capturedPoints > 0 ? `+${capturedPoints}` : `${capturedPoints}`}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  {chipFeedback ? (
                    <div className={`uts-chip-hit-feedback ${chipFeedback.points > 0 ? "good" : "bad"}`.trim()}>
                      {chipFeedback.points > 0 ? `+${chipFeedback.points}` : `${chipFeedback.points}`} · {chipFeedback.term}
                    </div>
                  ) : null}
                  {!!chipMsg && (
                    <div className={`uts-chip-rain-msg ${chipFeedback && chipFeedback.points > 0 ? "good" : "bad"}`.trim()}>
                      {chipMsg}
                    </div>
                  )}
                  {recentChipHits.length > 0 ? (
                    <div className="uts-chip-rain-hits">
                      {recentChipHits.map((h) => (
                        <span
                          key={`hit-${h.id}`}
                          className={`uts-chip-hit ${
                            Number(h.points || 0) > 0 ? "good" : "bad"
                          }`.trim()}
                        >
                          <b>{h.team_name}</b> {h.term} {Number(h.points || 0) > 0 ? `+${h.points}` : h.points}
                        </span>
                      ))}
                    </div>
                  ) : null}
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
                    : inChipRain
                    ? "Chip-rain actief: klik vallende begrippen..."
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
              <div className="uts-joker-row">
                <button
                  type="button"
                  className={`uts-btn-joker ${useJokerNext ? "active" : ""}`.trim()}
                  disabled={jokersLeft <= 0}
                  onClick={() => setUseJokerNext((v) => !v)}
                >
                  {useJokerNext ? "Joker actief voor volgende term" : "Gebruik joker op volgende term"}
                </button>
                <span>Jokers over: <b>{jokersLeft}</b></span>
              </div>
            ) : null}
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
                    {activeQuizItem ? (
                      <div className="uts-round2-item">
                        <div className="uts-round2-step">
                          <span>
                            Vraag {Math.min(quizItemCount, round2ActiveIndex + 1)} / {quizItemCount}
                          </span>
                          {!round2Reveal ? (
                            <em>{Math.max(0, quizQuestionSecondsLeft)}s</em>
                          ) : (
                            <em>Antwoordfase</em>
                          )}
                        </div>
                        <div className="uts-round2-prompt">
                          {activeQuizItem.prompt}
                        </div>
                        <div className="uts-round2-options">
                          {(activeQuizItem.options || []).map((opt, optIdx) => (
                            <button
                              key={`${activeQuizItem.id}-${optIdx}`}
                              className={`uts-round2-option ${
                                ownActiveAnswer?.selected_index === optIdx ? "selected" : ""
                              } ${
                                round2Reveal &&
                                activeQuizItem.correct_index != null &&
                                Number(activeQuizItem.correct_index) === Number(optIdx)
                                  ? "correct"
                                  : ""
                              }`.trim()}
                              disabled={!canAnswerActiveQuiz}
                              onClick={() => submitRound2Answer(Number(activeQuizItem.id), optIdx)}
                            >
                              <b>{String.fromCharCode(65 + optIdx)}.</b> {opt}
                            </button>
                          ))}
                        </div>
                        {ownActiveAnswer ? (
                          <div className={`uts-round2-verdict ${ownActiveAnswer.verdict}`}>
                            {ownActiveAnswer.verdict === "goed"
                              ? "Goed"
                              : "Fout"}{" "}
                            ({ownActiveAnswer.points > 0 ? `+${ownActiveAnswer.points}` : ownActiveAnswer.points})
                          </div>
                        ) : null}
                        {round2Reveal && activeCorrectOption ? (
                          <div className="uts-round2-correct">
                            Goed antwoord: <b>{activeCorrectOption}</b>
                            {activeQuizTeamAnswers > 0 ? (
                              <span> · {activeQuizTeamAnswers} team(s) beantwoord</span>
                            ) : null}
                          </div>
                        ) : null}
                        {canTeacherAdvanceQuiz ? (
                          <div className="uts-round2-host-nav">
                            <button
                              className="uts-btn-secondary"
                              type="button"
                              onClick={advanceRound2QuizStep}
                              disabled={busy}
                            >
                              {!round2Reveal
                                ? "Toon goed antwoord"
                                : isLastQuizItem
                                ? "Laatste vraag blijft zichtbaar"
                                : "Volgende quizvraag"}
                            </button>
                            {!round2Reveal ? (
                              <span className="uts-muted">
                                Beide teams kunnen antwoorden; je kunt ook handmatig doorgaan.
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="uts-muted">Quizvragen afgerond.</div>
                    )}
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
                  <span>
                    {team.name}
                    <em className="uts-team-meta"> · jokers {Math.max(0, Number((team as any).jokers_remaining || 0))}</em>
                  </span>
                  <strong>{team.score}</strong>
                </div>
              ))}
            </div>
            {sessionStarted ? <div className="uts-live-label">{betweenstandTitle}</div> : null}
            {sessionStarted && topTeams5.length > 0 ? (
              <div className="uts-top5">
                <h3>Top 5 Teams</h3>
                <div className="uts-top5-list">
                  {topTeams5.map((t, idx) => (
                    <div key={`${t.id}-${idx}`} className="uts-top5-row">
                      <span>#{idx + 1} {t.name}</span>
                      <span>{(t.players || []).length} spelers</span>
                      <strong>{t.score}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {sessionStarted && topPlayers.length > 0 ? (
              <div className="uts-top5">
                <h3>Top 5 MVP</h3>
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
            {sessionStatus === "finished" && bonusSummary ? (
              <div className="uts-bonus-review">
                <h3>Gemini eindreview begrippen</h3>
                <div className="uts-bonus-review-grid">
                  <div>
                    Herzien: <b>{bonusSummary.reviewed}</b>
                  </div>
                  <div>
                    Alsnog goed: <b>{bonusSummary.awarded}</b>
                  </div>
                  <div>
                    Afgewezen: <b>{bonusSummary.rejected}</b>
                  </div>
                  <div>
                    Puntencorrectie: <b>{bonusSummary.bonus_points_total > 0 ? `+${bonusSummary.bonus_points_total}` : bonusSummary.bonus_points_total}</b>
                  </div>
                </div>
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
