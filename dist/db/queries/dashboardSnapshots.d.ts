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
export declare function insertSnapshot(repoId: bigint, counts: SnapshotCounts): Promise<DashboardSnapshot>;
export declare function getLatestSnapshot(repoId: bigint): Promise<DashboardSnapshot | null>;
//# sourceMappingURL=dashboardSnapshots.d.ts.map