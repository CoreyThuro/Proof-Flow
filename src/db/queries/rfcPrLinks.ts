import { query, queryOne } from '../client';

export interface RfcPrLink {
  id: bigint;
  rfc_id: bigint;
  repo_id: bigint;
  pr_number: number;
  check_run_id: bigint | null;
  pr_state: 'open' | 'closed' | 'merged';
  created_at: Date;
}

export async function upsertRfcPrLink(
  rfcId: bigint,
  repoId: bigint,
  prNumber: number,
  checkRunId?: number,
): Promise<RfcPrLink> {
  const rows = await query<RfcPrLink>(
    `INSERT INTO rfc_pr_links (rfc_id, repo_id, pr_number, check_run_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (repo_id, pr_number, rfc_id)
     DO UPDATE SET check_run_id = EXCLUDED.check_run_id
     RETURNING *`,
    [rfcId, repoId, prNumber, checkRunId ?? null],
  );
  if (!rows[0]) {
    throw new Error('upsertRfcPrLink returned no rows');
  }
  return rows[0];
}

export async function getRfcPrLinksByRfcId(rfcId: bigint): Promise<RfcPrLink[]> {
  return query<RfcPrLink>(`SELECT * FROM rfc_pr_links WHERE rfc_id = $1`, [rfcId]);
}

export async function getOpenRfcPrLinks(rfcId: bigint): Promise<RfcPrLink[]> {
  return query<RfcPrLink>(
    `SELECT * FROM rfc_pr_links WHERE rfc_id = $1 AND pr_state = 'open'`,
    [rfcId],
  );
}

export async function updateCheckRunId(
  repoId: bigint,
  prNumber: number,
  rfcId: bigint,
  checkRunId: number,
): Promise<void> {
  await query(
    `UPDATE rfc_pr_links SET check_run_id = $1
     WHERE repo_id = $2 AND pr_number = $3 AND rfc_id = $4`,
    [checkRunId, repoId, prNumber, rfcId],
  );
}

export async function updatePrState(
  repoId: bigint,
  prNumber: number,
  state: 'open' | 'closed' | 'merged',
): Promise<void> {
  await query(
    `UPDATE rfc_pr_links SET pr_state = $1 WHERE repo_id = $2 AND pr_number = $3`,
    [state, repoId, prNumber],
  );
}
