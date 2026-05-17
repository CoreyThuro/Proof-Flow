import { query, queryOne } from '../client';

export interface AgentTask {
  id: bigint;
  rfc_id: bigint;
  repo_id: bigint;
  state: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  iteration_count: number;
  max_iterations: number;
  draft_pr_number: number | null;
  branch_name: string | null;
  aristotle_project_id: string | null;
  started_at: Date;
  completed_at: Date | null;
  failure_reason: string | null;
}

export async function insertAgentTask(
  rfcId: bigint,
  repoId: bigint,
  maxIterations: number,
): Promise<AgentTask> {
  const rows = await query<AgentTask>(
    `INSERT INTO agent_tasks (rfc_id, repo_id, state, max_iterations)
     VALUES ($1, $2, 'pending', $3)
     RETURNING *`,
    [rfcId, repoId, maxIterations],
  );
  if (!rows[0]) throw new Error('insertAgentTask returned no rows');
  return rows[0];
}

export async function updateAgentTask(
  taskId: bigint,
  fields: Partial<Pick<AgentTask, 'state' | 'iteration_count' | 'draft_pr_number' | 'branch_name' | 'aristotle_project_id' | 'completed_at' | 'failure_reason'>>,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (fields.state !== undefined) { sets.push(`state = $${i++}`); values.push(fields.state); }
  if (fields.iteration_count !== undefined) { sets.push(`iteration_count = $${i++}`); values.push(fields.iteration_count); }
  if (fields.draft_pr_number !== undefined) { sets.push(`draft_pr_number = $${i++}`); values.push(fields.draft_pr_number); }
  if (fields.branch_name !== undefined) { sets.push(`branch_name = $${i++}`); values.push(fields.branch_name); }
  if ('aristotle_project_id' in fields) { sets.push(`aristotle_project_id = $${i++}`); values.push(fields.aristotle_project_id ?? null); }
  if (fields.completed_at !== undefined) { sets.push(`completed_at = $${i++}`); values.push(fields.completed_at); }
  if (fields.failure_reason !== undefined) { sets.push(`failure_reason = $${i++}`); values.push(fields.failure_reason); }

  if (sets.length === 0) return;
  values.push(taskId);
  await query(`UPDATE agent_tasks SET ${sets.join(', ')} WHERE id = $${i}`, values);
}

export async function getActiveTaskByRfcId(rfcId: bigint): Promise<AgentTask | null> {
  return queryOne<AgentTask>(
    `SELECT * FROM agent_tasks WHERE rfc_id = $1 AND state IN ('pending', 'running')`,
    [rfcId],
  );
}

export async function getActiveTaskByDraftPr(prNumber: number): Promise<AgentTask | null> {
  return queryOne<AgentTask>(
    `SELECT * FROM agent_tasks WHERE draft_pr_number = $1 AND state IN ('pending', 'running')`,
    [prNumber],
  );
}

export async function getStaleNoPrTasks(): Promise<AgentTask[]> {
  return query<AgentTask>(
    `SELECT * FROM agent_tasks
     WHERE state = 'running' AND draft_pr_number IS NULL AND started_at < NOW() - INTERVAL '30 minutes'`,
    [],
  );
}

export async function getActiveTaskByBranchName(branchName: string): Promise<AgentTask | null> {
  return queryOne<AgentTask>(
    `SELECT * FROM agent_tasks WHERE branch_name = $1 AND state IN ('pending', 'running')`,
    [branchName],
  );
}

export async function getStaleRunningTasks(): Promise<AgentTask[]> {
  return query<AgentTask>(
    `SELECT * FROM agent_tasks
     WHERE state = 'running' AND started_at < NOW() - INTERVAL '30 minutes'`,
    [],
  );
}
