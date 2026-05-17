import { query } from '../db/client';
import { insertSnapshot } from '../db/queries/dashboardSnapshots';

export async function buildDashboardSnapshot(repoId: bigint): Promise<void> {
  const stateCounts = await query<{ state: string; count: string }>(
    `SELECT state, COUNT(*) AS count FROM rfcs WHERE repo_id = $1 GROUP BY state`,
    [repoId],
  );

  const counts = { rfc_open: 0, rfc_approved: 0, rfc_abandoned: 0, rfc_closed: 0 };
  for (const row of stateCounts) {
    if (row.state === 'open') counts.rfc_open = parseInt(row.count, 10);
    else if (row.state === 'approved') counts.rfc_approved = parseInt(row.count, 10);
    else if (row.state === 'abandoned') counts.rfc_abandoned = parseInt(row.count, 10);
    else if (row.state === 'closed') counts.rfc_closed = parseInt(row.count, 10);
  }

  const attributionRows = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT rfc_id) AS count FROM rfc_attributions
     WHERE rfc_id IN (SELECT id FROM rfcs WHERE repo_id = $1)`,
    [repoId],
  );
  const theorems = parseInt(attributionRows[0]?.count ?? '0', 10);

  await insertSnapshot(repoId, { ...counts, theorems_formalized_with_rfc: theorems });
}
