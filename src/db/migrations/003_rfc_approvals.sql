CREATE TABLE IF NOT EXISTS rfc_approvals (
  id BIGSERIAL PRIMARY KEY,
  rfc_id BIGINT NOT NULL REFERENCES rfcs(id) ON DELETE CASCADE,
  approver_login TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comment_id BIGINT NOT NULL,
  UNIQUE(rfc_id, approver_login)
);

CREATE INDEX IF NOT EXISTS rfc_approvals_rfc_id_idx ON rfc_approvals(rfc_id);
