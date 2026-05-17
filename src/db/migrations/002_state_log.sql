CREATE TABLE IF NOT EXISTS rfc_state_log (
  id BIGSERIAL PRIMARY KEY,
  rfc_id BIGINT NOT NULL REFERENCES rfcs(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor_login TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS rfc_state_log_rfc_id_idx ON rfc_state_log(rfc_id);
