import { query, queryOne } from '../client';

export interface RfcApproval {
  id: bigint;
  rfc_id: bigint;
  approver_login: string;
  approved_at: Date;
  comment_id: bigint;
}

export async function insertRfcApproval(
  rfcId: bigint,
  approverLogin: string,
  commentId: number,
): Promise<RfcApproval> {
  const rows = await query<RfcApproval>(
    `INSERT INTO rfc_approvals (rfc_id, approver_login, comment_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [rfcId, approverLogin, commentId],
  );
  if (!rows[0]) {
    throw new Error('insertRfcApproval returned no rows');
  }
  return rows[0];
}

export async function getRfcApprovalCount(rfcId: bigint): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM rfc_approvals WHERE rfc_id = $1`,
    [rfcId],
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function getRfcApproval(
  rfcId: bigint,
  approverLogin: string,
): Promise<RfcApproval | null> {
  return queryOne<RfcApproval>(
    `SELECT * FROM rfc_approvals WHERE rfc_id = $1 AND approver_login = $2`,
    [rfcId, approverLogin],
  );
}

export async function deleteRfcApprovals(rfcId: bigint): Promise<void> {
  await query(`DELETE FROM rfc_approvals WHERE rfc_id = $1`, [rfcId]);
}
