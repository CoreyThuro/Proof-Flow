ALTER TABLE agent_tasks
  ADD COLUMN IF NOT EXISTS aristotle_project_id TEXT;

ALTER TABLE agent_iterations
  ADD COLUMN IF NOT EXISTS prover TEXT NOT NULL DEFAULT 'claude';
