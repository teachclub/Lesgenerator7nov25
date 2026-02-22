"use strict";

const express = require("express");
const { getPool } = require("../services/db.cjs");
const { runGeminiAndParse } = require("../services/gemini.cjs");

const router = express.Router();
const pool = getPool();

let ensurePromise = null;

const STOPWORDS = new Set([
  "de", "het", "een", "en", "of", "in", "op", "te", "met", "voor", "van", "aan", "bij", "als", "dan", "dat", "dit", "die", "deze",
  "ik", "jij", "hij", "zij", "wij", "jullie", "hun", "zijn", "haar", "toch", "nog", "wel", "niet", "geen"
]);

const CONCEPT_TOKENS = [
  "fascisme", "nazisme", "communisme", "totalitarisme", "antisemitisme", "propaganda", "persoonscultus",
  "zuiveringen", "dictatuur", "industrialisatie", "radicalisering", "ideologie", "klassenstrijd",
  "revolutie", "nationalisme", "imperialisme", "kolonie", "genocide", "discriminatie"
];

const QUESTION_STOPWORDS = new Set([
  "de", "het", "een", "en", "of", "in", "op", "te", "met", "voor", "van", "aan", "bij", "als",
  "dat", "dit", "die", "deze", "hoe", "wat", "waarom", "wie", "welke", "wanneer", "waar", "toen",
]);

function nInt(x, fallback = null) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function nBool(x, fallback = false) {
  if (x === true || x === "true" || x === 1 || x === "1") return true;
  if (x === false || x === "false" || x === 0 || x === "0") return false;
  return fallback;
}

function normTerm(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSourceIdMaybe(v) {
  if (typeof v === "number") return nInt(v, null);
  const s = String(v || "").trim();
  if (!s) return null;
  const direct = nInt(s, null);
  if (direct) return direct;
  const m = s.match(/(\d{1,12})$/);
  return m ? nInt(m[1], null) : null;
}

function nowIso() {
  return new Date().toISOString();
}

function isDirectAudioUrl(raw) {
  return /^https?:\/\/.+\.(mp3|ogg|wav|m4a|mpga)(\?.*)?$/i.test(String(raw || "").trim());
}

function decodeAudioUrlCandidate(raw) {
  return String(raw || "")
    .trim()
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/^"+|"+$/g, "");
}

async function resolveAudioUrl(rawUrl) {
  const sourceUrl = String(rawUrl || "").trim();
  if (!sourceUrl) return "";
  if (isDirectAudioUrl(sourceUrl)) return sourceUrl;

  let parsed = null;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return "";
  }

  const host = String(parsed.hostname || "").toLowerCase();
  if (!host.endsWith("pixabay.com")) return "";

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(sourceUrl, {
      method: "GET",
      signal: ctrl.signal,
      headers: {
        "user-agent": "lessie-sourcegame/1.0",
      },
    });
    if (!r.ok) return "";
    const html = String(await r.text());

    const patterns = [
      /https:\\\/\\\/cdn\.pixabay\.com\\\/download\\\/audio\\\/[^"'\\\s]+?\.(?:mp3|ogg|wav|m4a|mpga)(?:\\\?[^"'\\\s]*)?/gi,
      /https:\/\/cdn\.pixabay\.com\/download\/audio\/[^"'\\\s]+?\.(?:mp3|ogg|wav|m4a|mpga)(?:\?[^"'\\\s]*)?/gi,
      /"contentUrl"\s*:\s*"([^"]+)"/gi,
      /"url"\s*:\s*"(https?:\/\/cdn\.pixabay\.com[^"]+)"/gi,
      /data-audio-url="([^"]+)"/gi,
      /<audio[^>]+src="([^"]+)"/gi,
    ];

    for (const re of patterns) {
      let m;
      while ((m = re.exec(html)) !== null) {
        const candidate = decodeAudioUrlCandidate(m[1] || m[0]);
        if (isDirectAudioUrl(candidate)) return candidate;
      }
    }
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
  return "";
}

async function ensureSchema() {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    await pool.query(`
      create table if not exists lessie.source_game_sessions (
        id bigserial primary key,
        created_by text,
        source_id bigint,
        source_ref text,
        source_title text,
        source_payload jsonb not null default '{}'::jsonb,
        tv text,
        ka text,
        status text not null default 'draft',
        duration_seconds int not null default 60,
        reading_seconds int not null default 0,
        term_seconds int,
        evidence_seconds int,
        reflection_seconds int,
        team_size_limit int,
        lock_teams_on_start boolean not null default true,
        bonus_tv boolean not null default true,
        bonus_ka boolean not null default true,
        started_at timestamptz,
        ended_at timestamptz,
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    await pool.query(`
      create table if not exists lessie.source_game_teams (
        id bigserial primary key,
        session_id bigint not null references lessie.source_game_sessions(id) on delete cascade,
        name text not null,
        join_code text not null,
        position int not null default 0,
        score int not null default 0,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(session_id, join_code),
        unique(session_id, position)
      );
    `);

    await pool.query(`
      create table if not exists lessie.source_game_players (
        id bigserial primary key,
        session_id bigint not null references lessie.source_game_sessions(id) on delete cascade,
        team_id bigint not null references lessie.source_game_teams(id) on delete cascade,
        player_key text not null,
        display_name text,
        score int not null default 0,
        joined_at timestamptz not null default now(),
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(session_id, player_key)
      );
    `);

    await pool.query(`
      create table if not exists lessie.source_game_term_keys (
        id bigserial primary key,
        session_id bigint not null references lessie.source_game_sessions(id) on delete cascade,
        term text not null,
        normalized_term text not null,
        term_type text not null default 'keyword',
        weight int not null default 2,
        origin text not null default 'gemini',
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(session_id, normalized_term)
      );
    `);

    await pool.query(`
      create table if not exists lessie.source_game_submissions (
        id bigserial primary key,
        session_id bigint not null references lessie.source_game_sessions(id) on delete cascade,
        team_id bigint not null references lessie.source_game_teams(id) on delete cascade,
        player_id bigint not null references lessie.source_game_players(id) on delete cascade,
        term text not null,
        normalized_term text not null,
        verdict text not null default 'rejected',
        points int not null default 0,
        reason text,
        submitted_at timestamptz not null default now(),
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    await pool.query(`
      create table if not exists lessie.source_game_questions (
        id bigserial primary key,
        session_id bigint not null references lessie.source_game_sessions(id) on delete cascade,
        team_id bigint not null references lessie.source_game_teams(id) on delete cascade,
        player_id bigint not null references lessie.source_game_players(id) on delete cascade,
        question_text text not null,
        normalized_question text not null,
        quality_points int not null default 0,
        quality_reason text,
        quality_source text not null default 'heuristic',
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(session_id, player_id)
      );
    `);

    await pool.query(`
      create table if not exists lessie.source_game_quiz_items (
        id bigserial primary key,
        session_id bigint not null references lessie.source_game_sessions(id) on delete cascade,
        asked_by_team_id bigint references lessie.source_game_teams(id) on delete set null,
        source_question_id bigint references lessie.source_game_questions(id) on delete set null,
        prompt text not null,
        options jsonb not null,
        correct_index int not null default 0,
        half_index int,
        origin text not null default 'gemini',
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);

    await pool.query(`
      create table if not exists lessie.source_game_quiz_answers (
        id bigserial primary key,
        session_id bigint not null references lessie.source_game_sessions(id) on delete cascade,
        quiz_item_id bigint not null references lessie.source_game_quiz_items(id) on delete cascade,
        team_id bigint not null references lessie.source_game_teams(id) on delete cascade,
        player_id bigint not null references lessie.source_game_players(id) on delete cascade,
        selected_index int not null,
        verdict text not null default 'fout',
        points int not null default 0,
        rationale text,
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(quiz_item_id, player_id)
      );
    `);

    await pool.query(`
      create table if not exists lessie.source_game_learned_labels (
        id bigserial primary key,
        source_ref text not null,
        source_id bigint,
        term text not null,
        normalized_term text not null,
        weight numeric not null default 0,
        mentions_count int not null default 0,
        status text not null default 'pending',
        last_session_id bigint,
        meta jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique(source_ref, normalized_term)
      );
    `);

    await pool.query("create index if not exists source_game_sessions_status_idx on lessie.source_game_sessions(status);");
    await pool.query("create index if not exists source_game_teams_session_idx on lessie.source_game_teams(session_id);");
    await pool.query("create index if not exists source_game_players_session_idx on lessie.source_game_players(session_id);");
    await pool.query("create index if not exists source_game_submissions_session_time_idx on lessie.source_game_submissions(session_id, submitted_at);");
    await pool.query("create index if not exists source_game_questions_session_idx on lessie.source_game_questions(session_id, quality_points desc);");
    await pool.query("create index if not exists source_game_quiz_items_session_idx on lessie.source_game_quiz_items(session_id, id asc);");
    await pool.query("create index if not exists source_game_quiz_answers_session_idx on lessie.source_game_quiz_answers(session_id, created_at asc);");
    await pool.query("create index if not exists source_game_labels_ref_idx on lessie.source_game_learned_labels(source_ref);");
  })().catch((e) => {
    ensurePromise = null;
    throw e;
  });
  return ensurePromise;
}

function makeJoinCode(seed) {
  const p = String(seed || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${(p || "TEAM").slice(0, 2)}${rnd}`;
}

function makeGameCode(sessionId) {
  return `US${String(sessionId || "").trim()}`;
}

function parseGameCode(raw) {
  const code = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return null;
  const m = code.match(/^US(\d+)$/) || code.match(/^(\d+)$/);
  if (!m) return null;
  return nInt(m[1], null);
}

function phaseDurations(session) {
  const reading = Math.max(0, nInt(session.reading_seconds, 0) || 0);
  let term = Math.max(0, nInt(session.term_seconds, 0) || 0);
  if (!term) {
    term = Math.max(15, nInt(session.duration_seconds, 60) || 60);
  }
  const meta = session.meta || {};
  const questionReading = Math.max(
    0,
    Math.min(3600, nInt(meta.question_reading_seconds, reading) || reading)
  );
  const questionMaker = Math.max(
    15,
    Math.min(1200, nInt(meta.question_maker_seconds, 60) || 60)
  );
  const quiz = Math.max(
    45,
    Math.min(
      2400,
      nInt(
        meta.quiz_seconds,
        Math.max(90, (nInt(meta.round2_question_count, 4) || 4) * 24)
      ) || 90
    )
  );
  return { reading, term, questionReading, questionMaker, quiz };
}

function sessionClock(session) {
  const d = phaseDurations(session);
  const total = d.reading + d.term + d.questionReading + d.questionMaker + d.quiz;
  const startsAt = session.started_at ? new Date(session.started_at).toISOString() : null;
  const nominalEndsAt = startsAt ? new Date(Date.parse(startsAt) + total * 1000).toISOString() : null;

  if (session.status === "finished") {
    return {
      phase: "finished",
      elapsed_seconds: total,
      seconds_left_total: 0,
      seconds_left_phase: 0,
      total_seconds: total,
      reading_seconds: d.reading,
      term_seconds: d.term,
      question_reading_seconds: d.questionReading,
      question_maker_seconds: d.questionMaker,
      quiz_seconds: d.quiz,
      starts_at: startsAt,
      ends_at: session.ended_at ? new Date(session.ended_at).toISOString() : nominalEndsAt,
    };
  }

  const firstPhaseLeft =
    d.reading || d.term || d.questionReading || d.questionMaker || d.quiz || 0;
  if (!session.started_at) {
    return {
      phase: "waiting",
      elapsed_seconds: 0,
      seconds_left_total: total,
      seconds_left_phase: firstPhaseLeft,
      total_seconds: total,
      reading_seconds: d.reading,
      term_seconds: d.term,
      question_reading_seconds: d.questionReading,
      question_maker_seconds: d.questionMaker,
      quiz_seconds: d.quiz,
      starts_at: null,
      ends_at: null,
    };
  }

  const elapsed = Math.max(0, Math.floor((Date.now() - Date.parse(session.started_at)) / 1000));
  let phase = "time_up";
  let phaseLeft = 0;
  const cutRead = d.reading;
  const cutTerm = d.reading + d.term;
  const cutQuestionRead = cutTerm + d.questionReading;
  const cutQuestionMaker = cutQuestionRead + d.questionMaker;
  if (elapsed < cutRead) {
    phase = "reading";
    phaseLeft = Math.max(0, cutRead - elapsed);
  } else if (elapsed < cutTerm) {
    phase = "terms";
    phaseLeft = Math.max(0, cutTerm - elapsed);
  } else if (elapsed < cutQuestionRead) {
    phase = "question_reading";
    phaseLeft = Math.max(0, cutQuestionRead - elapsed);
  } else if (elapsed < cutQuestionMaker) {
    phase = "question_maker";
    phaseLeft = Math.max(0, cutQuestionMaker - elapsed);
  } else if (elapsed < total) {
    phase = "quiz";
    phaseLeft = Math.max(0, total - elapsed);
  }

  return {
    phase,
    elapsed_seconds: elapsed,
    seconds_left_total: Math.max(0, total - elapsed),
    seconds_left_phase: phaseLeft,
    total_seconds: total,
    reading_seconds: d.reading,
    term_seconds: d.term,
    question_reading_seconds: d.questionReading,
    question_maker_seconds: d.questionMaker,
    quiz_seconds: d.quiz,
    starts_at: startsAt,
    ends_at: nominalEndsAt,
  };
}

async function closeSessionIfTimeUp(session) {
  if (!session || session.status !== "live") return session;
  const clock = sessionClock(session);
  if (clock.phase !== "time_up") return session;
  const autoFinish = nBool((session.meta || {}).auto_finish_on_timeout, false);
  if (!autoFinish) return session;
  const up = await pool.query(
    `update lessie.source_game_sessions set status='finished', ended_at=coalesce(ended_at, now()), updated_at=now() where id=$1 returning *`,
    [session.id]
  );
  return up.rows[0] || session;
}

async function buildAutoTermKeysForSource({ sessionId, sourceId, sourceRef, tv, ka }) {
  const out = [];
  const seen = new Set();

  const pushTerm = (term, termType, weight, origin, meta = {}) => {
    const t = String(term || "").trim();
    const normalized = normTerm(t);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push({
      term: t,
      normalized_term: normalized,
      term_type: String(termType || "keyword"),
      weight: Math.max(1, Math.min(10, nInt(weight, 2) || 2)),
      origin: String(origin || "auto"),
      meta,
    });
  };

  if (sourceId) {
    try {
      const ent = await pool.query(
        `
        select kind, value, confidence
        from lessie.source_entities
        where source_id=$1
          and kind in ('TERM','PERSON','YEAR','DIM')
        order by confidence desc nulls last, kind asc, value asc
        limit 120
        `,
        [sourceId]
      );
      for (const r of ent.rows || []) {
        const kind = String(r.kind || "").toUpperCase();
        const base =
          kind === "PERSON" ? 5 :
          kind === "TERM" ? 4 :
          kind === "YEAR" ? 3 :
          kind === "DIM" ? 2 : 2;
        const conf = Number(r.confidence || 0);
        const weight = base + (conf >= 0.95 ? 1 : 0);
        pushTerm(r.value, kind.toLowerCase(), weight, "source_entities", { confidence: conf });
      }
    } catch (_) {
      // table kan ontbreken op sommige omgevingen
    }
  }

  if (sourceRef) {
    try {
      const learned = await pool.query(
        `
        select term, normalized_term, weight, status
        from lessie.source_game_learned_labels
        where source_ref=$1
          and status in ('approved','pending')
        order by status asc, weight desc, updated_at desc
        limit 80
        `,
        [String(sourceRef)]
      );
      for (const r of learned.rows || []) {
        const w = Math.max(2, Math.min(8, Math.round(Number(r.weight || 2))));
        pushTerm(r.term || r.normalized_term, "learned", w, "learned_labels", { status: r.status });
      }
    } catch (_) {
      // best effort
    }
  }

  if (tv) pushTerm(tv, "tv", 2, "session_meta");
  if (ka) {
    pushTerm(ka, "ka", 3, "session_meta");
    const kaWords = normTerm(ka).split(" ").filter(Boolean);
    for (const w of kaWords) {
      if (w.length >= 4) pushTerm(w, "ka_term", 2, "session_meta");
    }
  }

  // Altijd iets bruikbaars
  if (!out.length && sourceRef) {
    const fallback = normTerm(sourceRef).split(" ").filter(Boolean).slice(0, 6);
    for (const f of fallback) {
      if (f.length >= 4) pushTerm(f, "fallback", 1, "source_ref");
    }
  }

  return out.slice(0, 160);
}

function historicalConceptCandidate(normalized) {
  if (!normalized || normalized.length < 5) return false;
  if (CONCEPT_TOKENS.some((t) => normalized.includes(t))) return true;
  if (/(isme|atie|ering|heid)$/.test(normalized)) return true;
  const words = normalized.split(" ").filter(Boolean);
  return words.length >= 2 && words.every((w) => w.length >= 4);
}

function hasStrongMatch(normalized, termKeyRows, sourceBlob) {
  const exact = termKeyRows.find((r) => r.normalized_term === normalized);
  if (exact) return { kind: "exact", points: Number(exact.weight || 2), reason: `exacte match op '${exact.term}'` };

  const partial = termKeyRows.find((r) => r.normalized_term.includes(normalized) || normalized.includes(r.normalized_term));
  if (partial && normalized.length >= 4) {
    return { kind: "partial", points: 1, reason: `gedeeltelijke match op '${partial.term}'` };
  }

  if (normalized.length >= 4 && sourceBlob.includes(normalized)) {
    return { kind: "content", points: 1, reason: "komt inhoudelijk voor in de bron" };
  }

  return null;
}

async function getSession(sessionId) {
  const r = await pool.query(`select * from lessie.source_game_sessions where id=$1`, [sessionId]);
  return r.rows[0] || null;
}

async function getTeams(sessionId) {
  const r = await pool.query(
    `
    select t.*, coalesce(p.n,0)::int as players_count
    from lessie.source_game_teams t
    left join (
      select team_id, count(*)::int as n
      from lessie.source_game_players
      where session_id=$1
      group by team_id
    ) p on p.team_id=t.id
    where t.session_id=$1
    order by t.position asc
    `,
    [sessionId]
  );
  return r.rows || [];
}

async function getPlayers(sessionId) {
  const r = await pool.query(
    `
    select p.*, t.name as team_name
    from lessie.source_game_players p
    join lessie.source_game_teams t on t.id=p.team_id
    where p.session_id=$1
    order by p.score desc, p.joined_at asc
    `,
    [sessionId]
  );
  return r.rows || [];
}

async function getLeaderboard(sessionId) {
  const teams = await getTeams(sessionId);
  for (const t of teams) {
    const r = await pool.query(
      `select id, player_key, display_name, score from lessie.source_game_players where session_id=$1 and team_id=$2 order by score desc, joined_at asc`,
      [sessionId, t.id]
    );
    t.players = r.rows || [];
  }
  return teams;
}

async function getOverallHighscores(limitRaw = 5) {
  const limit = Math.max(1, Math.min(50, nInt(limitRaw, 5) || 5));

  const finishedRes = await pool.query(
    `select count(*)::int as n from lessie.source_game_sessions where status='finished'`
  );
  const finishedSessions = Number(finishedRes.rows?.[0]?.n || 0);

  const teamsRes = await pool.query(
    `
    select
      lower(trim(t.name)) as team_key,
      min(trim(t.name)) as team_name,
      sum(coalesce(t.score,0))::int as total_score,
      count(distinct t.session_id)::int as games_played
    from lessie.source_game_teams t
    join lessie.source_game_sessions s on s.id=t.session_id
    where s.status='finished'
      and trim(coalesce(t.name,'')) <> ''
    group by lower(trim(t.name))
    order by total_score desc, games_played desc, team_key asc
    limit $1
    `,
    [limit]
  );

  const mvpRes = await pool.query(
    `
    select
      lower(trim(coalesce(nullif(p.display_name,''), p.player_key))) as player_key,
      min(trim(coalesce(nullif(p.display_name,''), p.player_key))) as display_name,
      sum(coalesce(p.score,0))::int as total_score,
      count(distinct p.session_id)::int as games_played
    from lessie.source_game_players p
    join lessie.source_game_sessions s on s.id=p.session_id
    where s.status='finished'
      and trim(coalesce(nullif(p.display_name,''), p.player_key)) <> ''
    group by lower(trim(coalesce(nullif(p.display_name,''), p.player_key)))
    order by total_score desc, games_played desc, player_key asc
    limit $1
    `,
    [limit]
  );

  return {
    generated_at: nowIso(),
    finished_sessions: finishedSessions,
    teams_top: teamsRes.rows || [],
    mvp_top: mvpRes.rows || [],
  };
}

async function getTimeline(sessionId) {
  const r = await pool.query(
    `
    select s.id, s.submitted_at, s.team_id, t.name as team_name,
           s.player_id, p.display_name as player_name,
           s.term, s.verdict, s.points
    from lessie.source_game_submissions s
    join lessie.source_game_teams t on t.id=s.team_id
    join lessie.source_game_players p on p.id=s.player_id
    where s.session_id=$1
    order by s.submitted_at asc, s.id asc
    `,
    [sessionId]
  );
  return r.rows || [];
}

function ropeFromLeaderboard(leaderboard) {
  if (!leaderboard || leaderboard.length < 2) return { enabled: false };
  const sorted = [...leaderboard].sort((a, b) => Number(b.score) - Number(a.score));
  const leader = sorted[0];
  const trailer = sorted[1];
  const diff = Number(leader.score || 0) - Number(trailer.score || 0);
  const denom = Math.max(Math.abs(Number(leader.score || 0)) + Math.abs(Number(trailer.score || 0)), 1);
  const ratio = Math.round((diff / denom) * 1000) / 10;
  return {
    enabled: true,
    leader_team_id: leader.id,
    trailer_team_id: trailer.id,
    score_diff: diff,
    rope_position: ratio,
  };
}

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function reactionMultiplier10x(phaseSecondsLeft, phaseTotalSeconds) {
  const total = Math.max(1, Number(phaseTotalSeconds || 0));
  const left = Math.max(0, Math.min(total, Number(phaseSecondsLeft || 0)));
  const elapsedWhole = Math.max(0, Math.floor(total - left));
  // 10-x seconden: seconde 0 => x10, seconde 9+ => x1
  return Math.max(1, 10 - Math.min(9, elapsedWhole));
}

function scaleTermPointsKahoot({ basePoints, verdict, phaseSecondsLeft, phaseTotalSeconds }) {
  const base = Number(basePoints || 0);
  const speedMultiplier = reactionMultiplier10x(phaseSecondsLeft, phaseTotalSeconds);
  const elapsedSeconds = Math.max(0, Math.floor(Math.max(0, Number(phaseTotalSeconds || 0)) - Math.max(0, Number(phaseSecondsLeft || 0))));

  if (base > 0) {
    return {
      points: Math.max(100, Math.round(base * 100 * speedMultiplier)),
      speed_multiplier: speedMultiplier,
      elapsed_seconds: elapsedSeconds,
    };
  }

  if (String(verdict) === "duplicate" || String(verdict) === "rejected") {
    return { points: -150, speed_multiplier: 1, elapsed_seconds: elapsedSeconds };
  }

  return { points: 0, speed_multiplier: 1, elapsed_seconds: elapsedSeconds };
}

function scoreQuizAnswerKahoot({ selectedIndex, correctIndex, halfIndex, phaseSecondsLeft, phaseTotalSeconds }) {
  const total = Math.max(1, Number(phaseTotalSeconds || 1));
  const left = Math.max(0, Math.min(total, Number(phaseSecondsLeft || 0)));
  const speedRatio = clamp01(left / total); // sneller => hogere ratio
  const speedMultiplier = reactionMultiplier10x(left, total);

  if (Number(selectedIndex) === Number(correctIndex)) {
    const points = Math.max(500, Math.round(500 + 500 * speedRatio)); // 500..1000
    return {
      verdict: "goed",
      points,
      rationale: `juist antwoord · snelheid x${speedMultiplier}`,
      speed_multiplier: speedMultiplier,
    };
  }

  if (halfIndex != null && Number(selectedIndex) === Number(halfIndex)) {
    const points = Math.max(250, Math.round(250 + 250 * speedRatio)); // 250..500
    return {
      verdict: "half_goed",
      points,
      rationale: `gedeeltelijk juist · snelheid x${speedMultiplier}`,
      speed_multiplier: speedMultiplier,
    };
  }

  return {
    verdict: "fout",
    points: 0,
    rationale: "onjuist antwoord",
    speed_multiplier: 1,
  };
}

async function scoreSubmission(session, player, termRaw) {
  const normalized = normTerm(termRaw);
  const submittedAt = nowIso();

  if (!normalized) return { normalized, verdict: "rejected", points: -1, reason: "term te kort of leeg", submittedAt };
  if (STOPWORDS.has(normalized)) return { normalized, verdict: "rejected", points: -1, reason: "te algemene term", submittedAt };

  const dup = await pool.query(
    `select 1 from lessie.source_game_submissions where session_id=$1 and team_id=$2 and normalized_term=$3 limit 1`,
    [session.id, player.team_id, normalized]
  );
  if (dup.rowCount) return { normalized, verdict: "duplicate", points: -1, reason: "al genoemd door je team", submittedAt };

  const takenByOtherTeam = await pool.query(
    `select 1 from lessie.source_game_submissions where session_id=$1 and team_id<>$2 and normalized_term=$3 and verdict in ('accepted','accepted_bonus') limit 1`,
    [session.id, player.team_id, normalized]
  );
  if (takenByOtherTeam.rowCount) {
    return { normalized, verdict: "duplicate", points: -1, reason: "al gescoord door de andere partij", submittedAt };
  }

  const keys = await pool.query(
    `select term, normalized_term, weight from lessie.source_game_term_keys where session_id=$1 order by weight desc`,
    [session.id]
  );

  const payload = session.source_payload || {};
  const sourceBlob = [payload.title, payload.snippet, payload.text, payload.context_s].filter(Boolean).join(" ").toLowerCase();

  const strong = hasStrongMatch(normalized, keys.rows || [], sourceBlob);
  let verdict = "rejected";
  let points = -1;
  let reason = "geen sterke inhoudelijke match";

  const bonusTv = nBool(session.bonus_tv, true);
  const bonusKa = nBool(session.bonus_ka, true);
  let bonus = 0;

  if (bonusTv) {
    const tv = normTerm(payload.tv);
    if (tv && tv === normalized) bonus += 1;
  }

  if (bonusKa) {
    const kaRaw = String(payload.ka || "");
    const kaCode = (kaRaw.match(/KA\d+/i) || [""])[0].toLowerCase();
    if (kaCode && normalized === kaCode) bonus += 1;
    const kaWords = normTerm(kaRaw).split(" ").filter(Boolean);
    if (kaWords.includes(normalized) && normalized.length >= 4) bonus += 1;
  }

  if (strong) {
    verdict = "accepted";
    points = Number(strong.points || 1) + bonus;
    reason = strong.reason;
  } else if (historicalConceptCandidate(normalized)) {
    verdict = "pending_review";
    points = 0;
    reason = "mogelijk historisch begrip, bonus-check na ronde";
  } else if (bonus > 0) {
    verdict = "accepted";
    points = bonus;
    reason = "bonusmatch op TV/KA";
  }

  return { normalized, verdict, points, reason, submittedAt };
}

function tokenizeQuestion(s) {
  return normTerm(s)
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !QUESTION_STOPWORDS.has(w));
}

function heuristicQuestionQuality(questionText, sourcePayload) {
  const q = String(questionText || "").trim();
  const qNorm = normTerm(q).replace(/\?+$/, "").trim();
  const qTokens = tokenizeQuestion(q);
  const srcBlob = normTerm([
    sourcePayload?.title,
    sourcePayload?.snippet,
    sourcePayload?.text,
    sourcePayload?.context_s,
  ].filter(Boolean).join(" "));
  const srcTokens = new Set(tokenizeQuestion(srcBlob));
  const overlap = qTokens.filter((t) => srcTokens.has(t)).length;
  const overlapRatio = qTokens.length ? overlap / qTokens.length : 0;

  const isCausal =
    /^(waarom|waardoor)\b/.test(qNorm) ||
    /^hoe\b/.test(qNorm) ||
    /\b(oorzaak|oorzaken|mechanisme|verklaren|zorgde|leidde|kon|kreeg|acceptabel|steun|draagvlak)\b/.test(qNorm);
  const isReproductive = /^(wat|wanneer|noem|welk|welke|wie)\b/.test(qNorm);
  const hasContextFocus = /\b(context|tijdvak|ka\d+|achtergrond|omstandigheden|historisch)\b/.test(qNorm);
  const hasQuestionForm = q.endsWith("?") || q.includes("?");
  const complexity =
    (qTokens.length >= 9 ? 1 : 0) +
    (qTokens.length >= 13 ? 1 : 0) +
    (/\b(omdat|waardoor|terwijl|ondanks)\b/.test(qNorm) ? 1 : 0);

  let score = 0;
  if (q.length >= 16) score = 1;
  if (overlap >= 1) score += 1;
  if (overlap >= 2 && overlapRatio >= 0.2) score += 1;
  if (isCausal) score += 2;
  if (hasContextFocus) score += 1;
  if (complexity >= 2) score += 1;
  if (!hasQuestionForm) score = Math.max(0, score - 1);
  if (isReproductive) score = Math.min(score, 2);
  score = Math.max(0, Math.min(5, score));

  let reason = "vraag is te vaag of te weinig brongebonden";
  if (isReproductive && score <= 2) {
    reason = "reproductieve vraag (feitgericht), beperkte diepgang";
  } else if (score >= 4) {
    reason = "sterke verklarende vraag met oorzaken/context";
  } else if (score >= 3) {
    reason = "goede bronvraag, maar kan nog scherper verklarend";
  } else if (score >= 1) {
    reason = "bruikbare start, nog te algemeen";
  }
  const rewritten = q.endsWith("?") ? q : `${q}?`;

  return {
    score,
    reason,
    rewritten_question: rewritten,
    quality_source: "heuristic",
    normalized_question: normTerm(rewritten),
  };
}

async function geminiQuestionQuality(questionText, sourcePayload) {
  const prompt = `
Je beoordeelt een leerlingvraag over een historische bron.
Geef ALLEEN JSON terug met keys:
- score (0,1,2,3,4,5)
- question_type ("CAUSAAL"|"CONTEXT"|"REPRODUCTIEF"|"ONDUIDELIJK")
- reason (korte reden, max 140 tekens)
- rewritten_question (verbeterde versie in leerlingtaal, 1 zin, vraagvorm)

Regels:
- 0 = zwak/niet relevant voor de bron
- 1-2 = vooral reproductie (wat/wanneer/noem), laag niveau
- 3 = bruikbaar en brongebonden
- 4-5 = sterke verklarende oorzaak/context-vraag (waarom/waardoor/hoe kon)
- rewritten_question moet concreet en toetsbaar zijn.
- Vragen over historische context zijn goed.

BRON TITEL:
${JSON.stringify(String(sourcePayload?.title || ""))}

BRON SNIPPET:
${JSON.stringify(String(sourcePayload?.snippet || "").slice(0, 800))}

BRON TEKST:
${JSON.stringify(String(sourcePayload?.text || "").slice(0, 2200))}

LEERLINGVRAAG:
${JSON.stringify(String(questionText || ""))}
`.trim();

  const out = await runGeminiAndParse({
    label: "sourcegame.question-quality",
    prompt,
    timeoutMs: 12000,
  });

  const score = Math.max(0, Math.min(5, nInt(out?.score, 0) || 0));
  const rewritten = String(out?.rewritten_question || questionText || "").trim() || String(questionText || "");
  return {
    score,
    reason: String(out?.reason || "").trim() || "beoordeeld door model",
    rewritten_question: rewritten.endsWith("?") ? rewritten : `${rewritten}?`,
    quality_source: "gemini",
    normalized_question: normTerm(rewritten),
  };
}

async function scoreQuestionQuality(questionText, sourcePayload) {
  const heuristic = heuristicQuestionQuality(questionText, sourcePayload);
  if (!process.env.GEMINI_API_KEY) return heuristic;
  try {
    const gem = await geminiQuestionQuality(questionText, sourcePayload);
    if (gem.score <= 1 && heuristic.score >= 3) return heuristic;
    return gem;
  } catch (_) {
    return heuristic;
  }
}

function normalizeMcqItem(item, origin = "gemini") {
  const prompt = String(item?.prompt || item?.vraag || "").trim();
  const opts = Array.isArray(item?.options) ? item.options : Array.isArray(item?.antwoorden) ? item.antwoorden : [];
  const options = opts.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 4);
  if (!prompt || options.length < 4) return null;
  const correctIndex = Math.max(0, Math.min(3, nInt(item?.correct_index, 0) || 0));
  let halfIndex = nInt(item?.half_index, null);
  if (halfIndex == null || halfIndex < 0 || halfIndex > 3 || halfIndex === correctIndex) halfIndex = null;
  return {
    prompt,
    options,
    correct_index: correctIndex,
    half_index: halfIndex,
    origin,
    meta: { rationale: String(item?.rationale || item?.reason || "").trim() },
  };
}

function fallbackMcqFromQuestions({ questions, termKeys, sourcePayload, count = 3 }) {
  const items = [];
  const termPool = (termKeys || [])
    .map((k) => String(k.term || "").trim())
    .filter(Boolean);

  const sourceTokens = tokenizeQuestion([
    sourcePayload?.title,
    sourcePayload?.snippet,
    sourcePayload?.text,
  ].filter(Boolean).join(" "));

  const rankedQuestions = [...(questions || [])]
    .sort((a, b) => Number(b.quality_points || 0) - Number(a.quality_points || 0));

  const fallbackPrompts = [
    `Welke oorzaak verklaart het best wat je in deze bron ziet?`,
    `Welke historische context maakt deze bron het best begrijpelijk?`,
    `Welke combinatie van motieven en omstandigheden past het meest bij de bron?`,
    `Waarom kon dit in deze periode maatschappelijk of politiek geaccepteerd raken?`,
    `Welke uitleg gaat verder dan feiten noemen en verklaart juist het mechanisme?`,
  ];

  const baseChoices = uniqArray([
    termPool[0],
    termPool[1],
    sourceTokens[0],
    sourceTokens[1],
    "historische context",
    "machtsmechanisme",
    "propaganda en ideologie",
    "economische en sociale druk",
  ]).filter(Boolean);

  const distractPool = uniqArray([
    termPool[2],
    sourceTokens[2],
    "toeval",
    "een losse gebeurtenis zonder context",
    "persoonlijke smaak",
    "natuurverschijnselen",
  ]).filter(Boolean);

  const seeds = rankedQuestions.length
    ? rankedQuestions.map((q) => String(q.question_text || "").trim())
    : fallbackPrompts;

  for (const seed of seeds) {
    if (items.length >= count) break;
    const prompt = seed || fallbackPrompts[items.length % fallbackPrompts.length];
    const correct = baseChoices[items.length % baseChoices.length] || "historische context";
    const half = baseChoices[(items.length + 1) % baseChoices.length] || "gedeeltelijke context";
    const wrongA = distractPool[items.length % distractPool.length] || "toeval";
    const wrongB = distractPool[(items.length + 1) % distractPool.length] || "persoonlijke smaak";
    items.push({
      prompt,
      options: [correct, half, wrongA, wrongB],
      correct_index: 0,
      half_index: 1,
      origin: "fallback",
      meta: { rationale: "fallback context/cause mcq" },
    });
  }

  while (items.length < count) {
    const base = sourceTokens[items.length] || termPool[items.length] || "de broncontext";
    items.push({
      prompt: `Welke factor verklaart in historische context het best ${base}?`,
      options: [
        base,
        "gedeeltelijke context zonder kernoorzaak",
        "een los incident",
        "een toevallige gebeurtenis",
      ],
      correct_index: 0,
      half_index: 1,
      origin: "fallback",
      meta: { rationale: "fallback generic" },
    });
  }

  return items.slice(0, count);
}

function uniqArray(xs) {
  return [...new Set((xs || []).map((x) => String(x || "").trim()).filter(Boolean))];
}

async function geminiGenerateMcq({ sourcePayload, questions, count = 3 }) {
  if (!process.env.GEMINI_API_KEY) return [];

  const prompt = `
Maak meerkeuzevragen (historische leesvaardigheid) op basis van bron + leerlingvragen.
Geef ALLEEN JSON terug:
{
  "items": [
    {
      "prompt": "...",
      "options": ["A","B","C","D"],
      "correct_index": 0,
      "half_index": 1,
      "rationale": "kort"
    }
  ]
}

Eisen:
- ${count} items.
- Nederlands, leerlingtaal.
- 4 antwoordopties per item.
- exact 1 duidelijk correct antwoord.
- 1 optie mag half-goed zijn (half_index), maar nooit gelijk aan correct_index.
- Focus op oorzaken/mechanismen/context, niet alleen feiten opdreunen.
- Voeg ook historische-context vragen toe (tijdvak/achtergrond/omstandigheden rond de bron).
- Gebruik leerlingvragen waar bruikbaar; verbeter ze indien nodig.

BRON TITEL:
${JSON.stringify(String(sourcePayload?.title || ""))}

BRON SNIPPET:
${JSON.stringify(String(sourcePayload?.snippet || "").slice(0, 900))}

BRON TEKST:
${JSON.stringify(String(sourcePayload?.text || "").slice(0, 2600))}

LEERLINGVRAGEN:
${JSON.stringify((questions || []).map((q) => q.question_text || q))}
`.trim();

  const out = await runGeminiAndParse({
    label: "sourcegame.mcq-generate",
    prompt,
    timeoutMs: 16000,
  });

  const itemsRaw = Array.isArray(out?.items) ? out.items : [];
  return itemsRaw
    .map((it) => normalizeMcqItem(it, "gemini"))
    .filter(Boolean)
    .slice(0, count);
}

async function getRound2State(sessionId) {
  const questionsQ = await pool.query(
    `
    select q.id, q.team_id, t.name as team_name, q.player_id, p.player_key, p.display_name,
           q.question_text, q.quality_points, q.quality_reason, q.quality_source, q.created_at
    from lessie.source_game_questions q
    join lessie.source_game_players p on p.id=q.player_id
    join lessie.source_game_teams t on t.id=q.team_id
    where q.session_id=$1
    order by q.quality_points desc, q.created_at asc
    `,
    [sessionId]
  );

  const itemsQ = await pool.query(
    `
    select id, asked_by_team_id, source_question_id, prompt, options, origin, created_at
    from lessie.source_game_quiz_items
    where session_id=$1
    order by id asc
    `,
    [sessionId]
  );

  const answersQ = await pool.query(
    `
    select a.id, a.quiz_item_id, a.team_id, t.name as team_name, a.player_id, p.player_key, p.display_name,
           a.selected_index, a.verdict, a.points, a.rationale, a.created_at
    from lessie.source_game_quiz_answers a
    join lessie.source_game_teams t on t.id=a.team_id
    join lessie.source_game_players p on p.id=a.player_id
    where a.session_id=$1
    order by a.created_at asc, a.id asc
    `,
    [sessionId]
  );

  return {
    questions: questionsQ.rows || [],
    quiz_items: (itemsQ.rows || []).map((r) => ({
      ...r,
      options: Array.isArray(r.options) ? r.options : [],
    })),
    answers: answersQ.rows || [],
  };
}

async function resolvePendingBonus(session) {
  const out = { reviewed: 0, awarded: 0, rejected: 0, bonus_points_total: 0 };

  const pending = await pool.query(
    `
    select s.*, p.team_id, p.id as pid
    from lessie.source_game_submissions s
    join lessie.source_game_players p on p.id=s.player_id
    where s.session_id=$1 and s.verdict='pending_review'
    order by s.submitted_at asc, s.id asc
    `,
    [session.id]
  );

  if (!pending.rowCount) return out;

  out.reviewed = pending.rowCount;
  const payload = session.source_payload || {};
  const sourceBlob = [payload.title, payload.snippet, payload.text, payload.context_s].filter(Boolean).join(" ").toLowerCase();

  const approved = await pool.query(
    `select normalized_term, weight from lessie.source_game_learned_labels where source_ref=$1 and status='approved'`,
    [String(session.source_ref || "")]
  );
  const approvedMap = new Map((approved.rows || []).map((r) => [r.normalized_term, Number(r.weight || 0)]));

  for (const row of pending.rows) {
    let bonus = 0;
    const reasons = [];
    const norm = String(row.normalized_term || "");

    if (norm && sourceBlob.includes(norm)) {
      bonus += 1;
      reasons.push("term komt voor in bron");
    }
    if (historicalConceptCandidate(norm)) {
      bonus += 1;
      reasons.push("herkend historisch begrip");
    }
    const w = approvedMap.get(norm) || 0;
    if (w > 0) {
      bonus += Math.max(1, Math.round(w));
      reasons.push("eerder goedgekeurd label");
    }
    bonus = Math.max(0, Math.min(3, bonus));

    if (bonus > 0) {
      await pool.query("begin");
      try {
        await pool.query(
          `update lessie.source_game_submissions set verdict='accepted_bonus', points=$2, reason=$3, updated_at=now() where id=$1`,
          [row.id, bonus, reasons.join(", ") || "bonus toegekend na eindreview"]
        );
        await pool.query(`update lessie.source_game_teams set score=score+$2, updated_at=now() where id=$1`, [row.team_id, bonus]);
        await pool.query(`update lessie.source_game_players set score=score+$2, updated_at=now() where id=$1`, [row.pid, bonus]);
        await pool.query("commit");
        out.awarded += 1;
        out.bonus_points_total += bonus;
      } catch (e) {
        await pool.query("rollback");
        throw e;
      }
    } else {
      await pool.query(
        `update lessie.source_game_submissions set verdict='rejected', reason='na eindreview niet specifiek genoeg', updated_at=now() where id=$1`,
        [row.id]
      );
      out.rejected += 1;
    }
  }

  return out;
}

async function learnLabelsAndEntities(session) {
  const sourceRef = String(session.source_ref || "").trim();
  if (!sourceRef) return { labels_upserted: 0, entities_upserted: 0 };

  const acc = await pool.query(
    `
    select normalized_term, max(term) as term, count(*)::int as mentions_count, sum(points)::numeric as points_sum
    from lessie.source_game_submissions
    where session_id=$1 and points >= 1
    group by normalized_term
    `,
    [session.id]
  );

  let labelsUpserted = 0;
  let entitiesUpserted = 0;
  for (const row of acc.rows || []) {
    const weight = Number(row.points_sum || 0) / Math.max(Number(row.mentions_count || 1), 1);

    await pool.query(
      `
      insert into lessie.source_game_learned_labels
        (source_ref, source_id, term, normalized_term, weight, mentions_count, status, last_session_id, meta, created_at, updated_at)
      values ($1,$2,$3,$4,$5,$6,'pending',$7,$8::jsonb,now(),now())
      on conflict (source_ref, normalized_term)
      do update set
        term=excluded.term,
        source_id=coalesce(excluded.source_id, lessie.source_game_learned_labels.source_id),
        weight=greatest(lessie.source_game_learned_labels.weight, excluded.weight),
        mentions_count=lessie.source_game_learned_labels.mentions_count + excluded.mentions_count,
        last_session_id=excluded.last_session_id,
        updated_at=now(),
        meta=coalesce(lessie.source_game_learned_labels.meta,'{}'::jsonb) || excluded.meta
      `,
      [
        sourceRef,
        nInt(session.source_id, null),
        String(row.term || row.normalized_term),
        row.normalized_term,
        weight,
        Number(row.mentions_count || 0),
        session.id,
        JSON.stringify({ last_auto_update_at: nowIso(), from: "sourcegame" })
      ]
    );
    labelsUpserted += 1;

    const sourceId = nInt(session.source_id, null);
    if (sourceId) {
      await pool.query(
        `
        insert into lessie.source_entities (source_id, kind, value, span_text, confidence, method)
        values ($1,'TERM',$2,$3,$4,'sourcegame')
        on conflict (source_id, kind, value)
        do update set
          confidence=greatest(lessie.source_entities.confidence, excluded.confidence),
          method=excluded.method,
          span_text=excluded.span_text
        `,
        [sourceId, String(row.term || row.normalized_term), "game_learned", Math.min(1, Math.max(0.5, weight / 3))]
      );
      entitiesUpserted += 1;
    }
  }

  return { labels_upserted: labelsUpserted, entities_upserted: entitiesUpserted };
}

function sessionOut(session, teams) {
  const payload = session.source_payload || {};
  const base = String((session.meta || {}).join_base_url || "").trim().replace(/\/$/, "");
  const sessionId = session.id;
  const clock = sessionClock(session);
  return {
    id: sessionId,
    game_code: makeGameCode(sessionId),
    status: session.status,
    title: payload.title || session.source_title || "",
    source_ref: session.source_ref,
    source_id: session.source_id,
    source: payload,
    timing: {
      duration_seconds: Number(session.duration_seconds || 60),
      reading_seconds: Number(session.reading_seconds || 0),
      term_seconds: Number(session.term_seconds || session.duration_seconds || 60),
      question_reading_seconds: Number(clock.question_reading_seconds || 0),
      question_maker_seconds: Number(clock.question_maker_seconds || 0),
      quiz_seconds: Number(clock.quiz_seconds || 0),
      evidence_seconds: Number(session.evidence_seconds || 0),
      reflection_seconds: Number(session.reflection_seconds || 0),
    },
    settings: {
      team_size_limit: session.team_size_limit,
      lock_teams_on_start: nBool(session.lock_teams_on_start, true),
      bonus_tv: nBool(session.bonus_tv, true),
      bonus_ka: nBool(session.bonus_ka, true),
      reading_wpm: Number((session.meta || {}).reading_wpm || 80),
      waiting_music_url: String((session.meta || {}).waiting_music_url || ""),
      warmup_music_url: String((session.meta || {}).warmup_music_url || ""),
      music_live_url: String((session.meta || {}).music_live_url || ""),
      music_url: String((session.meta || {}).music_url || ""),
      question_maker_seconds: Number((session.meta || {}).question_maker_seconds || 60),
      question_reading_seconds: Number((session.meta || {}).question_reading_seconds || Number(session.reading_seconds || 0)),
      quiz_seconds: Number((session.meta || {}).quiz_seconds || 90),
      round2_question_count: Math.max(2, Math.min(12, nInt((session.meta || {}).round2_question_count, 4) || 4)),
    },
    started_at: clock.starts_at,
    ended_at: session.ended_at || clock.ends_at,
    clock,
    teams: (teams || []).map((t) => ({
      id: t.id,
      name: t.name,
      score: Number(t.score || 0),
      position: Number(t.position || 0),
      join_code: t.join_code,
      join_path: `/sourcegame/play/${sessionId}?code=${t.join_code}`,
      join_url: base ? `${base}/sourcegame/play/${sessionId}?code=${t.join_code}` : null,
      players_count: Number(t.players_count || 0),
      full: session.team_size_limit ? Number(t.players_count || 0) >= Number(session.team_size_limit) : false,
    })),
  };
}

router.post("/sourcegame/sessions", async (req, res) => {
  try {
    await ensureSchema();

    const b = req.body || {};
    const source = b.source && typeof b.source === "object" ? b.source : {};
    const settings = b.settings && typeof b.settings === "object" ? b.settings : {};

    const teamsRaw = Array.isArray(b.teams) ? b.teams.filter(Boolean).map((x) => String(x).trim()) : [];
    const teams = teamsRaw.length >= 2 ? teamsRaw : ["Team A", "Team B"];

    const sourceIdParsed = parseSourceIdMaybe(source.id || source.source_id || source.ref || source.source_ref);
    const sourceRef = String(source.ref || source.source_ref || source.id || sourceIdParsed || "").trim();
    if (!sourceRef) return res.status(400).json({ ok: false, error: "source.ref of source.id ontbreekt" });

    const sourcePayload = {
      id: sourceIdParsed || source.id || null,
      ref: sourceRef,
      title: source.title || "",
      snippet: source.snippet || "",
      text: source.text || source.main_text || "",
      context_s: source.context_s || "",
      tv: source.tv || "",
      ka: source.ka || "",
      url: source.url || "",
      type: source.type || "",
      year: source.year || null,
      image_url: source.image_url || "",
    };

    const meta = b.meta && typeof b.meta === "object" ? { ...b.meta } : {};
    const readingSecondsSetting = Math.max(0, Math.min(3600, nInt(settings.reading_seconds, 0)));
    const round2QuestionCount = Math.max(2, Math.min(12, nInt(settings.round2_question_count, 4) || 4));
    const questionReadingSeconds = Math.max(
      0,
      Math.min(3600, nInt(settings.question_reading_seconds, readingSecondsSetting) || readingSecondsSetting)
    );
    const questionMakerSeconds = Math.max(15, Math.min(1200, nInt(settings.question_maker_seconds, 60) || 60));
    const quizSeconds = Math.max(
      45,
      Math.min(2400, nInt(settings.quiz_seconds, Math.max(90, round2QuestionCount * 24)) || 90)
    );
    meta.round2_question_count = round2QuestionCount;
    meta.question_reading_seconds = questionReadingSeconds;
    meta.question_maker_seconds = questionMakerSeconds;
    meta.quiz_seconds = quizSeconds;
    if (b.join_base_url) meta.join_base_url = String(b.join_base_url);

    const ins = await pool.query(
      `
      insert into lessie.source_game_sessions
      (created_by, source_id, source_ref, source_title, source_payload, tv, ka, status,
       duration_seconds, reading_seconds, term_seconds, evidence_seconds, reflection_seconds,
       team_size_limit, lock_teams_on_start, bonus_tv, bonus_ka, meta, created_at, updated_at)
      values
      ($1,$2,$3,$4,$5::jsonb,$6,$7,'draft',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,now(),now())
      returning *
      `,
      [
        String(b.created_by || "teacher"),
        sourceIdParsed,
        sourceRef,
        String(source.title || ""),
        JSON.stringify(sourcePayload),
        String(source.tv || ""),
        String(source.ka || ""),
        Math.max(15, Math.min(600, nInt(settings.duration_seconds, 60))),
        readingSecondsSetting,
        Math.max(15, Math.min(300, nInt(settings.term_seconds, nInt(settings.duration_seconds, 60) || 60))),
        Math.max(0, Math.min(180, nInt(settings.evidence_seconds, 0))),
        Math.max(0, Math.min(180, nInt(settings.reflection_seconds, 0))),
        settings.team_size_limit == null ? null : Math.max(1, Math.min(40, nInt(settings.team_size_limit, 1))),
        nBool(settings.lock_teams_on_start, true),
        nBool(settings.bonus_tv, true),
        nBool(settings.bonus_ka, true),
        JSON.stringify(meta || {}),
      ]
    );

    const session = ins.rows[0];

    for (let i = 0; i < teams.length; i += 1) {
      const name = teams[i];
      await pool.query(
        `insert into lessie.source_game_teams(session_id, name, join_code, position, score, created_at, updated_at)
         values($1,$2,$3,$4,0,now(),now())`,
        [session.id, name, makeJoinCode(`${session.id}-${name}`), i]
      );
    }

    let termKeys = Array.isArray(b.term_keys) ? b.term_keys : [];
    if (!termKeys.length) {
      termKeys = await buildAutoTermKeysForSource({
        sessionId: session.id,
        sourceId: sourceIdParsed,
        sourceRef,
        tv: String(source.tv || ""),
        ka: String(source.ka || ""),
      });
    }
    for (const k of termKeys) {
      const term = String((k && (k.term || k.value)) || "").trim();
      const normalized = normTerm(term);
      if (!normalized) continue;
      await pool.query(
        `
        insert into lessie.source_game_term_keys
        (session_id, term, normalized_term, term_type, weight, origin, meta, created_at, updated_at)
        values($1,$2,$3,$4,$5,$6,$7::jsonb,now(),now())
        on conflict (session_id, normalized_term)
        do update set
          term=excluded.term,
          term_type=excluded.term_type,
          weight=excluded.weight,
          origin=excluded.origin,
          meta=excluded.meta,
          updated_at=now()
        `,
        [
          session.id,
          term,
          normalized,
          String(k.term_type || "keyword"),
          Math.max(1, Math.min(10, nInt(k.weight, 2))),
          String(k.origin || "gemini"),
          JSON.stringify((k && k.meta) || {}),
        ]
      );
    }

    const teamRows = await getTeams(session.id);
    return res.json({ ok: true, session: sessionOut(session, teamRows) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/resolve-audio-url", async (req, res) => {
  try {
    const url = String(req.body?.url || "").trim();
    if (!url) return res.status(400).json({ ok: false, error: "url ontbreekt" });
    const resolved = await resolveAudioUrl(url);
    if (!resolved) return res.status(422).json({ ok: false, error: "Kon geen directe audio-url vinden" });
    return res.json({ ok: true, resolved_url: resolved });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "resolve mislukt" });
  }
});

router.get("/sourcegame/lookup", async (req, res) => {
  try {
    await ensureSchema();
    const gameCode = String(req.query?.game_code || "");
    const sessionId = parseGameCode(gameCode);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige gamecode" });

    let session = await getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "sessie niet gevonden" });
    session = await closeSessionIfTimeUp(session);

    const teams = await getTeams(sessionId);
    return res.json({ ok: true, session: sessionOut(session, teams) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.get("/sourcegame/sessions/:id", async (req, res) => {
  try {
    await ensureSchema();
    const id = nInt(req.params.id, null);
    if (!id) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    let session = await getSession(id);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });
    session = await closeSessionIfTimeUp(session);

    const teams = await getTeams(id);
    const leaderboard = await getLeaderboard(id);
    const timeline = await getTimeline(id);
    const round2 = await getRound2State(id);

    return res.json({
      ok: true,
      session: sessionOut(session, teams),
      leaderboard,
      tug_of_war: ropeFromLeaderboard(leaderboard),
      score_timeline: timeline,
      round2,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/sessions/:id/start", async (req, res) => {
  try {
    await ensureSchema();
    const id = nInt(req.params.id, null);
    if (!id) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    const session = await getSession(id);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });

    const joined = await pool.query(`select count(*)::int as n from lessie.source_game_players where session_id=$1`, [id]);
    const joinedCount = Number(joined.rows?.[0]?.n || 0);
    if (joinedCount < 1) {
      return res.status(422).json({ ok: false, error: "start kan pas na minimaal 1 gejoinde leerling" });
    }

    const up = await pool.query(
      `update lessie.source_game_sessions set status='live', started_at=coalesce(started_at, now()), ended_at=null, updated_at=now() where id=$1 returning *`,
      [id]
    );

    const updated = up.rows[0];
    const teams = await getTeams(id);
    return res.json({ ok: true, session: sessionOut(updated, teams) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/sessions/:id/reading-done", async (req, res) => {
  try {
    await ensureSchema();
    const id = nInt(req.params.id, null);
    if (!id) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    let session = await getSession(id);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });
    session = await closeSessionIfTimeUp(session);
    if (session.status !== "live") {
      const teams = await getTeams(id);
      return res.json({ ok: true, session: sessionOut(session, teams), changed: false });
    }

    const clock = sessionClock(session);
    if (clock.phase !== "reading" && clock.phase !== "question_reading") {
      const teams = await getTeams(id);
      return res.json({ ok: true, session: sessionOut(session, teams), changed: false });
    }

    const d = phaseDurations(session);
    const targetElapsed =
      clock.phase === "reading"
        ? d.reading
        : d.reading + d.term + d.questionReading;
    const shiftedStart = new Date(Date.now() - targetElapsed * 1000);
    const up = await pool.query(
      `update lessie.source_game_sessions set started_at=$2, updated_at=now() where id=$1 returning *`,
      [id, shiftedStart.toISOString()]
    );
    const updated = up.rows[0] || session;
    const teams = await getTeams(id);
    return res.json({ ok: true, session: sessionOut(updated, teams), changed: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/sessions/:id/join", async (req, res) => {
  try {
    await ensureSchema();

    const sessionId = nInt(req.params.id, null);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    const b = req.body || {};
    const playerKey = String(b.player_key || "").trim();
    if (!playerKey) return res.status(400).json({ ok: false, error: "player_key ontbreekt" });

    let session = await getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });
    session = await closeSessionIfTimeUp(session);
    if (session.status === "finished") return res.status(422).json({ ok: false, error: "spel is al afgelopen" });

    const existing = await pool.query(
      `select p.*, t.name as team_name from lessie.source_game_players p join lessie.source_game_teams t on t.id=p.team_id where p.session_id=$1 and p.player_key=$2`,
      [sessionId, playerKey]
    );
    if (existing.rowCount) {
      return res.json({ ok: true, joined: true, player: existing.rows[0] });
    }

    if (session.status === "live" && nBool(session.lock_teams_on_start, true)) {
      return res.status(403).json({ ok: false, error: "teams zijn vergrendeld na de start" });
    }

    let team = null;
    if (b.team_id) {
      const r = await pool.query(`select * from lessie.source_game_teams where session_id=$1 and id=$2 limit 1`, [sessionId, nInt(b.team_id, null)]);
      team = r.rows[0] || null;
    } else if (b.join_code) {
      const r = await pool.query(`select * from lessie.source_game_teams where session_id=$1 and upper(join_code)=upper($2) limit 1`, [sessionId, String(b.join_code)]);
      team = r.rows[0] || null;
    } else {
      const r = await pool.query(
        `
        select t.*, coalesce(p.n,0)::int as players_count
        from lessie.source_game_teams t
        left join (
          select team_id, count(*)::int as n
          from lessie.source_game_players
          where session_id=$1
          group by team_id
        ) p on p.team_id=t.id
        where t.session_id=$1
        order by coalesce(p.n,0) asc, t.position asc
        `,
        [sessionId]
      );
      const allTeams = r.rows || [];
      if (session.team_size_limit) {
        team = allTeams.find((t) => Number(t.players_count || 0) < Number(session.team_size_limit));
      } else {
        team = allTeams[0];
      }
    }

    if (!team) return res.status(422).json({ ok: false, error: "geen team beschikbaar" });

    if (session.team_size_limit) {
      const cnt = await pool.query(`select count(*)::int as n from lessie.source_game_players where session_id=$1 and team_id=$2`, [sessionId, team.id]);
      if (Number(cnt.rows[0]?.n || 0) >= Number(session.team_size_limit)) {
        return res.status(422).json({ ok: false, error: "team zit vol" });
      }
    }

    const ins = await pool.query(
      `
      insert into lessie.source_game_players(session_id, team_id, player_key, display_name, score, joined_at, meta, created_at, updated_at)
      values($1,$2,$3,$4,0,now(),'{}'::jsonb,now(),now())
      returning *
      `,
      [sessionId, team.id, playerKey, String(b.display_name || playerKey)]
    );

    const player = ins.rows[0];
    player.team_name = team.name;
    return res.status(201).json({ ok: true, joined: true, player });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/sessions/:id/submit", async (req, res) => {
  try {
    await ensureSchema();

    const sessionId = nInt(req.params.id, null);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    const b = req.body || {};
    const playerKey = String(b.player_key || "").trim();
    const term = String(b.term || "");
    if (!playerKey) return res.status(400).json({ ok: false, error: "player_key ontbreekt" });

    let session = await getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });
    session = await closeSessionIfTimeUp(session);
    if (session.status !== "live") {
      return res.status(422).json({ ok: false, error: "spel is niet actief", code: "NOT_LIVE", clock: sessionClock(session) });
    }

    const clock = sessionClock(session);
    if (clock.phase === "reading" || clock.phase === "question_reading") {
      return res.status(422).json({ ok: false, error: "leesfase actief: wacht tot de termfase", code: "READING_PHASE", clock });
    }
    if (clock.phase !== "terms") {
      return res.status(422).json({ ok: false, error: "termfase is voorbij", code: "NOT_TERMS_PHASE", clock });
    }
    if (clock.phase === "time_up" || clock.phase === "finished") {
      session = await closeSessionIfTimeUp(session);
      return res.status(422).json({ ok: false, error: "tijd is op", code: "TIME_UP", clock: sessionClock(session) });
    }

    const playerRes = await pool.query(
      `select p.*, t.name as team_name from lessie.source_game_players p join lessie.source_game_teams t on t.id=p.team_id where p.session_id=$1 and p.player_key=$2`,
      [sessionId, playerKey]
    );
    const player = playerRes.rows[0];
    if (!player) return res.status(403).json({ ok: false, error: "je bent nog niet gejoined" });

    const score = await scoreSubmission(session, player, term);
    const scaled = scaleTermPointsKahoot({
      basePoints: score.points,
      verdict: score.verdict,
      phaseSecondsLeft: clock.seconds_left_phase,
      phaseTotalSeconds: clock.term_seconds,
    });
    const finalPoints = Number(scaled.points || 0);
    const finalReason = `${score.reason}${finalPoints > 0 ? ` · snelheid x${scaled.speed_multiplier}` : ""}`;

    await pool.query("begin");
    try {
      await pool.query(
        `
        insert into lessie.source_game_submissions
          (session_id, team_id, player_id, term, normalized_term, verdict, points, reason, submitted_at, meta, created_at, updated_at)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,'{}'::jsonb,now(),now())
        `,
        [
          sessionId,
          player.team_id,
          player.id,
          term,
          score.normalized,
          score.verdict,
          finalPoints,
          finalReason,
          score.submittedAt,
        ]
      );

      await pool.query(`update lessie.source_game_teams set score=score+$2, updated_at=now() where id=$1`, [player.team_id, finalPoints]);
      await pool.query(`update lessie.source_game_players set score=score+$2, updated_at=now() where id=$1`, [player.id, finalPoints]);
      await pool.query("commit");
    } catch (e) {
      await pool.query("rollback");
      throw e;
    }

    const leaderboard = await getLeaderboard(sessionId);
    const timeline = await getTimeline(sessionId);
    const round2 = await getRound2State(sessionId);
    return res.json({
      ok: true,
      result: {
        verdict: score.verdict,
        points: finalPoints,
        reason: finalReason,
        normalized_term: score.normalized,
        submitted_at: score.submittedAt,
        speed_multiplier: scaled.speed_multiplier,
        base_points: score.points,
      },
      leaderboard,
      tug_of_war: ropeFromLeaderboard(leaderboard),
      score_timeline: timeline,
      round2,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.get("/sourcegame/sessions/:id/leaderboard", async (req, res) => {
  try {
    await ensureSchema();
    const sessionId = nInt(req.params.id, null);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    let session = await getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });
    session = await closeSessionIfTimeUp(session);

    const leaderboard = await getLeaderboard(sessionId);
    const timeline = await getTimeline(sessionId);
    const round2 = await getRound2State(sessionId);

    return res.json({
      ok: true,
      seconds_left: sessionClock(session).seconds_left_total,
      clock: sessionClock(session),
      leaderboard,
      tug_of_war: ropeFromLeaderboard(leaderboard),
      score_timeline: timeline,
      round2,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.get("/sourcegame/highscores", async (req, res) => {
  try {
    await ensureSchema();
    const limit = Math.max(1, Math.min(50, nInt(req.query?.limit, 5) || 5));
    const highscores = await getOverallHighscores(limit);
    return res.json({ ok: true, highscores });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/sessions/:id/finish", async (req, res) => {
  try {
    await ensureSchema();
    const sessionId = nInt(req.params.id, null);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    const teamsBefore = await getTeams(sessionId);
    const round2Before = await getRound2State(sessionId);
    const teamsAnswered = new Set((round2Before.answers || []).map((a) => Number(a.team_id))).size;
    if ((round2Before.quiz_items || []).length < 1 || teamsAnswered < Math.min(2, teamsBefore.length || 2)) {
      return res.status(422).json({
        ok: false,
        error: "Ronde 2 (meerkeuze) is nog niet volledig afgerond door beide teams.",
        round2: round2Before,
      });
    }

    const up = await pool.query(
      `update lessie.source_game_sessions set status='finished', ended_at=coalesce(ended_at, now()), updated_at=now() where id=$1 returning *`,
      [sessionId]
    );
    if (!up.rowCount) return res.status(404).json({ ok: false, error: "session niet gevonden" });

    const session = up.rows[0];
    const bonus_summary = await resolvePendingBonus(session);
    const learned_summary = await learnLabelsAndEntities(session);

    const leaderboard = await getLeaderboard(sessionId);
    const timeline = await getTimeline(sessionId);
    const round2 = await getRound2State(sessionId);

    return res.json({
      ok: true,
      session: sessionOut(session, await getTeams(sessionId)),
      bonus_summary,
      learned_summary,
      leaderboard,
      tug_of_war: ropeFromLeaderboard(leaderboard),
      score_timeline: timeline,
      round2,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.get("/sourcegame/sessions/:id/round2", async (req, res) => {
  try {
    await ensureSchema();
    const sessionId = nInt(req.params.id, null);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige session id" });
    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });
    const round2 = await getRound2State(sessionId);
    return res.json({ ok: true, round2 });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/sessions/:id/round2/question", async (req, res) => {
  try {
    await ensureSchema();
    const sessionId = nInt(req.params.id, null);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    let session = await getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });
    session = await closeSessionIfTimeUp(session);
    if (!["live"].includes(String(session.status || ""))) {
      return res.status(422).json({ ok: false, error: "vraagronde kan alleen tijdens een actieve sessie" });
    }
    const clock = sessionClock(session);
    if (clock.phase !== "question_maker") {
      return res.status(422).json({
        ok: false,
        error: "vraagronde is nu niet actief",
        code: "NOT_QUESTION_PHASE",
        clock,
      });
    }

    const b = req.body || {};
    const playerKey = String(b.player_key || "").trim();
    const questionTextRaw = String(b.question || "").trim();
    if (!playerKey) return res.status(400).json({ ok: false, error: "player_key ontbreekt" });
    if (questionTextRaw.length < 12) return res.status(400).json({ ok: false, error: "vraag is te kort" });

    const playerRes = await pool.query(
      `select p.*, t.name as team_name
       from lessie.source_game_players p
       join lessie.source_game_teams t on t.id=p.team_id
       where p.session_id=$1 and p.player_key=$2`,
      [sessionId, playerKey]
    );
    const player = playerRes.rows[0];
    if (!player) return res.status(403).json({ ok: false, error: "je bent nog niet gejoined" });

    const quality = await scoreQuestionQuality(questionTextRaw, session.source_payload || {});
    const questionText = String(quality.rewritten_question || questionTextRaw).trim();
    const normalized = String(quality.normalized_question || normTerm(questionText));
    const qualityScoreRaw = Math.max(0, Math.min(5, nInt(quality.score, 0) || 0));
    const points = qualityScoreRaw * 100;
    const reason = String(quality.reason || "").trim() || "beoordeeld";
    const source = String(quality.quality_source || "heuristic");

    await pool.query("begin");
    try {
      const prev = await pool.query(
        `select id, quality_points from lessie.source_game_questions where session_id=$1 and player_id=$2 limit 1`,
        [sessionId, player.id]
      );
      const prevPoints = Number(prev.rows?.[0]?.quality_points || 0);

      await pool.query(
        `
        insert into lessie.source_game_questions
          (session_id, team_id, player_id, question_text, normalized_question, quality_points, quality_reason, quality_source, meta, created_at, updated_at)
        values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now(),now())
        on conflict (session_id, player_id)
        do update set
          question_text=excluded.question_text,
          normalized_question=excluded.normalized_question,
          quality_points=excluded.quality_points,
          quality_reason=excluded.quality_reason,
          quality_source=excluded.quality_source,
          meta=excluded.meta,
          updated_at=now()
        `,
        [
          sessionId,
          player.team_id,
          player.id,
          questionText,
          normalized,
          points,
          reason,
          source,
          JSON.stringify({ submitted_at: nowIso() }),
        ]
      );

      const delta = points - prevPoints;
      if (delta !== 0) {
        await pool.query(`update lessie.source_game_teams set score=score+$2, updated_at=now() where id=$1`, [player.team_id, delta]);
        await pool.query(`update lessie.source_game_players set score=score+$2, updated_at=now() where id=$1`, [player.id, delta]);
      }
      await pool.query("commit");
    } catch (e) {
      await pool.query("rollback");
      throw e;
    }

    const round2 = await getRound2State(sessionId);
    const leaderboard = await getLeaderboard(sessionId);
    return res.json({
      ok: true,
      result: {
        question: questionText,
        quality_points: points,
        quality_reason: reason,
        quality_source: source,
        quality_score_raw: qualityScoreRaw,
      },
      leaderboard,
      tug_of_war: ropeFromLeaderboard(leaderboard),
      round2,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/sessions/:id/round2/generate-mcq", async (req, res) => {
  try {
    await ensureSchema();
    const sessionId = nInt(req.params.id, null);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    let session = await getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });
    session = await closeSessionIfTimeUp(session);

    const requestedCount = nInt(req.body?.count, null);
    const sessionCount = nInt((session.meta || {}).round2_question_count, 4) || 4;
    const count = Math.max(2, Math.min(12, requestedCount || sessionCount));
    const force = nBool(req.body?.force, false);
    if (!force) {
      const existingRound2 = await getRound2State(sessionId);
      if ((existingRound2.quiz_items || []).length > 0) {
        return res.json({
          ok: true,
          round2: existingRound2,
          generated_count: (existingRound2.quiz_items || []).length,
          reused: true,
        });
      }
    }

    const qRes = await pool.query(
      `
      select id, team_id, question_text, quality_points
      from lessie.source_game_questions
      where session_id=$1
      order by quality_points desc, created_at asc
      `,
      [sessionId]
    );
    const questions = qRes.rows || [];
    const strong = questions.filter((q) => Number(q.quality_points || 0) >= 300);

    const keysRes = await pool.query(
      `select term, normalized_term, weight from lessie.source_game_term_keys where session_id=$1 order by weight desc limit 40`,
      [sessionId]
    );

    let items = [];
    try {
      items = await geminiGenerateMcq({
        sourcePayload: session.source_payload || {},
        questions: strong.length ? strong : questions,
        count,
      });
    } catch (_) {
      items = [];
    }

    if (!items.length || items.length < count) {
      const fb = fallbackMcqFromQuestions({
        questions: strong.length ? strong : questions,
        termKeys: keysRes.rows || [],
        sourcePayload: session.source_payload || {},
        count,
      });
      items = uniqArray([...(items || []).map((x) => x.prompt), ...fb.map((x) => x.prompt)])
        .map((prompt) => (items || []).find((x) => x.prompt === prompt) || fb.find((x) => x.prompt === prompt))
        .filter(Boolean)
        .slice(0, count);
    }

    if (!items.length) {
      return res.status(422).json({ ok: false, error: "Kon geen meerkeuzevragen maken" });
    }

    await pool.query("begin");
    try {
      const oldTeam = await pool.query(
        `select team_id, sum(points)::int as pts from lessie.source_game_quiz_answers where session_id=$1 group by team_id`,
        [sessionId]
      );
      const oldPlayer = await pool.query(
        `select player_id, sum(points)::int as pts from lessie.source_game_quiz_answers where session_id=$1 group by player_id`,
        [sessionId]
      );
      for (const r of oldTeam.rows || []) {
        await pool.query(`update lessie.source_game_teams set score=score-$2, updated_at=now() where id=$1`, [r.team_id, Number(r.pts || 0)]);
      }
      for (const r of oldPlayer.rows || []) {
        await pool.query(`update lessie.source_game_players set score=score-$2, updated_at=now() where id=$1`, [r.player_id, Number(r.pts || 0)]);
      }

      await pool.query(`delete from lessie.source_game_quiz_answers where session_id=$1`, [sessionId]);
      await pool.query(`delete from lessie.source_game_quiz_items where session_id=$1`, [sessionId]);

      for (let i = 0; i < items.length; i += 1) {
        const it = normalizeMcqItem(items[i], items[i]?.origin || "gemini");
        if (!it) continue;
        await pool.query(
          `
          insert into lessie.source_game_quiz_items
            (session_id, asked_by_team_id, source_question_id, prompt, options, correct_index, half_index, origin, meta, created_at, updated_at)
          values
            ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,now(),now())
          `,
          [
            sessionId,
            strong[i]?.team_id || null,
            strong[i]?.id || null,
            it.prompt,
            JSON.stringify(it.options),
            it.correct_index,
            it.half_index,
            it.origin,
            JSON.stringify(it.meta || {}),
          ]
        );
      }

      await pool.query(
        `update lessie.source_game_sessions set updated_at=now(), meta=coalesce(meta,'{}'::jsonb) || $2::jsonb where id=$1`,
        [sessionId, JSON.stringify({ round2_generated_at: nowIso() })]
      );
      await pool.query("commit");
    } catch (e) {
      await pool.query("rollback");
      throw e;
    }

    const round2 = await getRound2State(sessionId);
    return res.json({ ok: true, round2, generated_count: (round2.quiz_items || []).length });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/sessions/:id/round2/answer", async (req, res) => {
  try {
    await ensureSchema();
    const sessionId = nInt(req.params.id, null);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    const b = req.body || {};
    const playerKey = String(b.player_key || "").trim();
    const quizItemId = nInt(b.quiz_item_id, null);
    const selectedIndex = nInt(b.selected_index, null);
    if (!playerKey) return res.status(400).json({ ok: false, error: "player_key ontbreekt" });
    if (!quizItemId) return res.status(400).json({ ok: false, error: "quiz_item_id ontbreekt" });
    if (selectedIndex == null || selectedIndex < 0 || selectedIndex > 3) {
      return res.status(400).json({ ok: false, error: "selected_index ongeldig" });
    }

    let session = await getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });
    session = await closeSessionIfTimeUp(session);
    if (!["live"].includes(String(session.status || ""))) {
      return res.status(422).json({ ok: false, error: "quizronde alleen in actieve sessie" });
    }
    const clock = sessionClock(session);
    if (clock.phase !== "quiz" && clock.phase !== "time_up") {
      return res.status(422).json({
        ok: false,
        error: "quizronde is nu niet actief",
        code: "NOT_QUIZ_PHASE",
        clock,
      });
    }

    const playerRes = await pool.query(
      `select p.*, t.name as team_name
       from lessie.source_game_players p
       join lessie.source_game_teams t on t.id=p.team_id
       where p.session_id=$1 and p.player_key=$2`,
      [sessionId, playerKey]
    );
    const player = playerRes.rows[0];
    if (!player) return res.status(403).json({ ok: false, error: "je bent nog niet gejoined" });

    const itemRes = await pool.query(
      `select * from lessie.source_game_quiz_items where session_id=$1 and id=$2`,
      [sessionId, quizItemId]
    );
    const item = itemRes.rows[0];
    if (!item) return res.status(404).json({ ok: false, error: "quiz item niet gevonden" });

    const dup = await pool.query(
      `select id from lessie.source_game_quiz_answers where quiz_item_id=$1 and player_id=$2 limit 1`,
      [quizItemId, player.id]
    );
    if (dup.rowCount) return res.status(409).json({ ok: false, error: "je hebt deze vraag al beantwoord" });

    const correct = Number(item.correct_index || 0);
    const half = item.half_index == null ? null : Number(item.half_index);

    const scored = scoreQuizAnswerKahoot({
      selectedIndex,
      correctIndex: correct,
      halfIndex: half,
      phaseSecondsLeft: clock.seconds_left_phase,
      phaseTotalSeconds: clock.quiz_seconds,
    });
    const verdict = scored.verdict;
    const points = Number(scored.points || 0);
    const rationale = scored.rationale;
    const speedMultiplier = Number(scored.speed_multiplier || 1);

    await pool.query("begin");
    try {
      await pool.query(
        `
        insert into lessie.source_game_quiz_answers
          (session_id, quiz_item_id, team_id, player_id, selected_index, verdict, points, rationale, meta, created_at, updated_at)
        values
          ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now(),now())
        `,
        [
          sessionId,
          quizItemId,
          player.team_id,
          player.id,
          selectedIndex,
          verdict,
          points,
          rationale,
          JSON.stringify({
            speed_multiplier: speedMultiplier,
            seconds_left_phase: Number(clock.seconds_left_phase || 0),
            quiz_seconds: Number(clock.quiz_seconds || 0),
          }),
        ]
      );
      if (points !== 0) {
        await pool.query(`update lessie.source_game_teams set score=score+$2, updated_at=now() where id=$1`, [player.team_id, points]);
        await pool.query(`update lessie.source_game_players set score=score+$2, updated_at=now() where id=$1`, [player.id, points]);
      }
      await pool.query("commit");
    } catch (e) {
      await pool.query("rollback");
      throw e;
    }

    const leaderboard = await getLeaderboard(sessionId);
    const round2 = await getRound2State(sessionId);
    return res.json({
      ok: true,
      result: { verdict, points, rationale, speed_multiplier: speedMultiplier },
      leaderboard,
      tug_of_war: ropeFromLeaderboard(leaderboard),
      round2,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

router.post("/sourcegame/sessions/:id/review-labels", async (req, res) => {
  try {
    await ensureSchema();
    const sessionId = nInt(req.params.id, null);
    if (!sessionId) return res.status(400).json({ ok: false, error: "ongeldige session id" });

    const session = await getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "session niet gevonden" });

    const labels = Array.isArray(req.body?.labels) ? req.body.labels : [];
    let n = 0;

    for (const l of labels) {
      const term = String((l && l.term) || "").trim();
      const normalized = normTerm(term);
      if (!normalized) continue;

      const statusRaw = String((l && l.status) || "approved").toLowerCase();
      const status = ["pending", "approved", "rejected"].includes(statusRaw) ? statusRaw : "approved";
      const weight = Math.max(0, Number(l && l.weight) || 1);
      const mentions = Math.max(1, nInt(l && l.mentions_count, 1));

      await pool.query(
        `
        insert into lessie.source_game_learned_labels
          (source_ref, source_id, term, normalized_term, weight, mentions_count, status, last_session_id, meta, created_at, updated_at)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now(),now())
        on conflict (source_ref, normalized_term)
        do update set
          term=excluded.term,
          source_id=coalesce(excluded.source_id, lessie.source_game_learned_labels.source_id),
          status=excluded.status,
          weight=greatest(lessie.source_game_learned_labels.weight, excluded.weight),
          mentions_count=greatest(lessie.source_game_learned_labels.mentions_count, excluded.mentions_count),
          last_session_id=excluded.last_session_id,
          updated_at=now(),
          meta=coalesce(lessie.source_game_learned_labels.meta,'{}'::jsonb) || excluded.meta
        `,
        [
          String(session.source_ref || ""),
          nInt(session.source_id, null),
          term,
          normalized,
          weight,
          mentions,
          status,
          sessionId,
          JSON.stringify({ from: "review_labels", reviewed_at: nowIso() })
        ]
      );
      n += 1;
    }

    return res.json({ ok: true, source_ref: session.source_ref, n_labels: n });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

module.exports = function sourceGameRouterFactory() {
  return router;
};
