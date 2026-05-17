import { query } from '../client';

export async function insertStateLog(
  rfcId: bigint,
  fromState: string | null,
  toState: string,
  actorLogin: string | null,
  reason?: string,
): Promise<void> {
  await query(
    `INSERT INTO rfc_state_log (rfc_id, from_state, to_state, actor_login, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [rfcId, fromState, toState, actorLogin, reason ?? null],
  );
}
