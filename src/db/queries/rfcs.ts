import { queryOne, query } from '../client';

export type RfcState = 'open' | 'approved' | 'abandoned' | 'in_progress' | 'closed';

export interface Rfc {
  id: bigint;
  repo_id: bigint;
  github_issue_number: number;
  state: RfcState;
  author_login: string;
  opened_at: Date;
  state_updated_at: Date;
  abandon_after: Date | null;
}

export async function insertRfc(
  repoId: bigint,
  issueNumber: number,
  authorLogin: string,
  state: RfcState,
  abandonAfter: Date | null,
): Promise<Rfc> {
  const now = new Date();
  const rows = await query<Rfc>(
    `INSERT INTO rfcs
       (repo_id, github_issue_number, state, author_login, opened_at, state_updated_at, abandon_after)
     VALUES ($1, $2, $3, $4, $5, $5, $6)
     RETURNING *`,
    [repoId, issueNumber, state, authorLogin, now, abandonAfter],
  );
  if (!rows[0]) {
    throw new Error('insertRfc returned no rows');
  }
  return rows[0];
}

export async function getRfcByIssueNumber(
  repoId: bigint,
  issueNumber: number,
): Promise<Rfc | null> {
  return queryOne<Rfc>(
    `SELECT * FROM rfcs WHERE repo_id = $1 AND github_issue_number = $2`,
    [repoId, issueNumber],
  );
}

export async function getRfcById(rfcId: bigint): Promise<Rfc | null> {
  return queryOne<Rfc>(`SELECT * FROM rfcs WHERE id = $1`, [rfcId]);
}

export async function updateRfcState(
  rfcId: bigint,
  state: RfcState,
  stateUpdatedAt: Date,
  abandonAfter?: Date | null,
): Promise<void> {
  if (abandonAfter !== undefined) {
    await query(
      `UPDATE rfcs SET state = $1, state_updated_at = $2, abandon_after = $3 WHERE id = $4`,
      [state, stateUpdatedAt, abandonAfter, rfcId],
    );
  } else {
    await query(`UPDATE rfcs SET state = $1, state_updated_at = $2 WHERE id = $3`, [
      state,
      stateUpdatedAt,
      rfcId,
    ]);
  }
}
