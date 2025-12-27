"use strict";

function normStr(x) {
  return String(x || "").trim();
}

function normPerson(x) {
  const v = normStr(x);
  return v.replace(/\s+/g, " ");
}

function normYear(x) {
  const v = normStr(x);
  const m = v.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return m ? m[1] : "";
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const v = normStr(x);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

async function upsertSourceEntities(pgPool, sourceId, payload) {
  const persons = uniq((payload && payload.persons) || []).map(normPerson).filter(Boolean);
  const years = uniq((payload && payload.years) || []).map(normYear).filter(Boolean);

  const spanText = normStr((payload && payload.span_text) || "");
  const confidence = Number.isFinite(Number(payload && payload.confidence)) ? Number(payload.confidence) : 0.0;
  const method = normStr((payload && payload.method) || "gemini") || "gemini";

  if (!pgPool) throw new Error("upsertSourceEntities: pgPool ontbreekt");
  if (!Number.isFinite(Number(sourceId))) throw new Error("upsertSourceEntities: sourceId ongeldig");

  const rows = [];
  for (const p of persons) rows.push({ kind: "PERSON", value: p });
  for (const y of years) rows.push({ kind: "YEAR", value: y });

  if (!rows.length) return { inserted: 0 };

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    let inserted = 0;

    for (const r of rows) {
      const q = `
        INSERT INTO lessie.source_entities (source_id, kind, value, span_text, confidence, method)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (source_id, kind, value)
        DO UPDATE SET
          span_text = EXCLUDED.span_text,
          confidence = GREATEST(lessie.source_entities.confidence, EXCLUDED.confidence),
          method = EXCLUDED.method
        RETURNING id
      `;
      const res = await client.query(q, [
        Number(sourceId),
        r.kind,
        r.value,
        spanText,
        confidence,
        method,
      ]);
      if (res && res.rowCount) inserted += res.rowCount;
    }

    await client.query("COMMIT");
    return { inserted };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  upsertSourceEntities,
};

