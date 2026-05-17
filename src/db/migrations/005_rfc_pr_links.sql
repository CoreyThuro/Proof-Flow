CREATE TABLE IF NOT EXISTS rfc_pr_links (
  id BIGSERIAL PRIMARY KEY,
  rfc_id BIGINT NOT NULL REFERENCES rfcs(id) ON DELETE CASCADE,
  repo_id BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  pr_number INTEGER NOT NULL,
  check_run_id BIGINT,
  pr_state TEXT NOT NULL DEFAULT 'open' CHECK (pr_state IN ('open', 'closed', 'merged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(repo_id, pr_number, rfc_id)
);

CREATE INDEX IF NOT EXISTS rfc_pr_links_rfc_id_idx ON rfc_pr_links(rfc_id);
CREATE INDEX IF NOT EXISTS rfc_pr_links_repo_pr_idx ON rfc_pr_links(repo_id, pr_number);
