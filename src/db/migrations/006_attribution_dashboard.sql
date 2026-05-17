CREATE TABLE IF NOT EXISTS rfc_attributions (
  id BIGSERIAL PRIMARY KEY,
  rfc_id BIGINT NOT NULL REFERENCES rfcs(id) ON DELETE CASCADE,
  pr_number INTEGER NOT NULL,
  lean_file_path TEXT NOT NULL,
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rfc_id, lean_file_path)
);

CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id BIGSERIAL PRIMARY KEY,
  repo_id BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rfc_open INTEGER NOT NULL DEFAULT 0,
  rfc_approved INTEGER NOT NULL DEFAULT 0,
  rfc_abandoned INTEGER NOT NULL DEFAULT 0,
  rfc_closed INTEGER NOT NULL DEFAULT 0,
  theorems_formalized_with_rfc INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS rfc_attributions_rfc_id_idx ON rfc_attributions(rfc_id);
CREATE INDEX IF NOT EXISTS dashboard_snapshots_repo_id_idx ON dashboard_snapshots(repo_id);
