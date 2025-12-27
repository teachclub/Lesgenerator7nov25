BEGIN;

CREATE TABLE IF NOT EXISTS lessie.source_entities (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES lessie.sources(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('PERSON','YEAR')),
  value TEXT NOT NULL,
  span_text TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL DEFAULT 0.0,
  method TEXT NOT NULL DEFAULT 'gemini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_source_entities_source_kind_value
  ON lessie.source_entities(source_id, kind, value);

CREATE INDEX IF NOT EXISTS ix_source_entities_kind_value
  ON lessie.source_entities(kind, value);

CREATE INDEX IF NOT EXISTS ix_source_entities_source
  ON lessie.source_entities(source_id);

CREATE TABLE IF NOT EXISTS lessie.subquestion_entities (
  id BIGSERIAL PRIMARY KEY,
  subquestion_id BIGINT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('PERSON','YEAR')),
  value TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.0,
  origin TEXT NOT NULL DEFAULT 'from_sources_summary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_subquestion_entities_sq_kind_value
  ON lessie.subquestion_entities(subquestion_id, kind, value);

CREATE INDEX IF NOT EXISTS ix_subquestion_entities_kind_value
  ON lessie.subquestion_entities(kind, value);

CREATE INDEX IF NOT EXISTS ix_subquestion_entities_sq
  ON lessie.subquestion_entities(subquestion_id);

COMMIT;

