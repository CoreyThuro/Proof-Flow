import { query, queryOne } from '../client';

export interface AgentIteration {
  id: bigint;
  task_id: bigint;
  iteration_number: number;
  lean_code: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  ci_output: string | null;
  ci_passed: boolean | null;
  prover: string;
  created_at: Date;
}

export async function insertAgentIteration(
  taskId: bigint,
  iterationNumber: number,
  leanCode: string,
  promptTokens: number,
  completionTokens: number,
  prover: 'claude' | 'aristotle' = 'claude',
): Promise<AgentIteration> {
  const rows = await query<AgentIteration>(
    `INSERT INTO agent_iterations
       (task_id, iteration_number, lean_code, prompt_tokens, completion_tokens, prover)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [taskId, iterationNumber, leanCode, promptTokens, completionTokens, prover],
  );
  if (!rows[0]) throw new Error('insertAgentIteration returned no rows');
  return rows[0];
}

export async function updateAgentIteration(
  id: bigint,
  fields: Partial<Pick<AgentIteration, 'ci_output' | 'ci_passed'>>,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (fields.ci_output !== undefined) { sets.push(`ci_output = $${i++}`); values.push(fields.ci_output); }
  if (fields.ci_passed !== undefined) { sets.push(`ci_passed = $${i++}`); values.push(fields.ci_passed); }

  if (sets.length === 0) return;
  values.push(id);
  await query(`UPDATE agent_iterations SET ${sets.join(', ')} WHERE id = $${i}`, values);
}

export async function getIterationsByTaskId(taskId: bigint): Promise<AgentIteration[]> {
  return query<AgentIteration>(
    `SELECT * FROM agent_iterations WHERE task_id = $1 ORDER BY iteration_number ASC`,
    [taskId],
  );
}

export async function getLatestIteration(taskId: bigint): Promise<AgentIteration | null> {
  return queryOne<AgentIteration>(
    `SELECT * FROM agent_iterations WHERE task_id = $1 ORDER BY iteration_number DESC LIMIT 1`,
    [taskId],
  );
}
