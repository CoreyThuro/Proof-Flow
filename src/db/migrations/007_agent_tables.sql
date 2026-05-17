CREATE TABLE IF NOT EXISTS agent_tasks (
  id                BIGSERIAL PRIMARY KEY,
  rfc_id            BIGINT NOT NULL REFERENCES rfcs(id) ON DELETE CASCADE,
  repo_id           BIGINT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  state             TEXT NOT NULL CHECK (state IN ('pending','running','succeeded','failed','cancelled')),
  iteration_count   INTEGER NOT NULL DEFAULT 0,
  max_iterations    INTEGER NOT NULL DEFAULT 3,
  draft_pr_number   INTEGER,
  branch_name       TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  failure_reason    TEXT
);

CREATE TABLE IF NOT EXISTS agent_iterations (
  id                  BIGSERIAL PRIMARY KEY,
  task_id             BIGINT NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
  iteration_number    INTEGER NOT NULL,
  lean_code           TEXT NOT NULL,
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  ci_output           TEXT,
  ci_passed           BOOLEAN,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, iteration_number)
);

CREATE INDEX IF NOT EXISTS agent_tasks_rfc_id_state_idx ON agent_tasks (rfc_id, state);
CREATE INDEX IF NOT EXISTS agent_tasks_state_started_idx ON agent_tasks (state, started_at);
CREATE INDEX IF NOT EXISTS agent_iterations_task_id_idx ON agent_iterations (task_id);
