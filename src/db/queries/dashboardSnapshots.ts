import { query, queryOne } from '../client';

export interface DashboardSnapshot {
  id: bigint;
  repo_id: bigint;
  snapshot_at: Date;
  rfc_open: number;
  rfc_approved: number;
  rfc_abandoned: number;
  rfc_closed: number;
  theorems_formalized_with_rfc: number;
}

export interface SnapshotCounts {
  rfc_open: number;
  rfc_approved: number;
  rfc_abandoned: number;
  rfc_closed: number;
  theorems_formalized_with_rfc: number;
}

export async function insertSnapshot(
  repoId: bigint,
  counts: SnapshotCounts,
): Promise<DashboardSnapshot> {
  const rows = await query<DashboardSnapshot>(
    `INSERT INTO dashboard_snapshots
       (repo_id, rfc_open, rfc_approved, rfc_abandoned, rfc_closed, theorems_formalized_with_rfc)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      repoId,
      counts.rfc_open,
      counts.rfc_approved,
      counts.rfc_abandoned,
      counts.rfc_closed,
      counts.theorems_formalized_with_rfc,
    ],
  );
  if (!rows[0]) throw new Error('insertSnapshot returned no rows');
  return rows[0];
}

export async function getLatestSnapshot(repoId: bigint): Promise<DashboardSnapshot | null> {
  return queryOne<DashboardSnapshot>(
    `SELECT * FROM dashboard_snapshots WHERE repo_id = $1 ORDER BY snapshot_at DESC LIMIT 1`,
    [repoId],
  );
}
