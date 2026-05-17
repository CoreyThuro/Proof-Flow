CREATE TABLE IF NOT EXISTS repos (
  id BIGSERIAL PRIMARY KEY,
  github_repo_id BIGINT NOT NULL UNIQUE,
  github_owner TEXT NOT NULL,
  github_name TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  config_json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS rfcs (
  id BIGSERIAL PRIMARY KEY,
  repo_id BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  github_issue_number INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('open', 'approved', 'abandoned', 'in_progress', 'closed')),
  author_login TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  abandon_after TIMESTAMPTZ,
  UNIQUE(repo_id, github_issue_number)
);

CREATE INDEX IF NOT EXISTS rfcs_repo_id_state_idx ON rfcs(repo_id, state);
CREATE INDEX IF NOT EXISTS rfcs_abandon_after_idx ON rfcs(abandon_after) WHERE state = 'open';
