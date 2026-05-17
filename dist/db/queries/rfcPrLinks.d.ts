export interface RfcPrLink {
    id: bigint;
    rfc_id: bigint;
    repo_id: bigint;
    pr_number: number;
    check_run_id: bigint | null;
    pr_state: 'open' | 'closed' | 'merged';
    created_at: Date;
}
export declare function upsertRfcPrLink(rfcId: bigint, repoId: bigint, prNumber: number, checkRunId?: number): Promise<RfcPrLink>;
export declare function getRfcPrLinksByRfcId(rfcId: bigint): Promise<RfcPrLink[]>;
export declare function getOpenRfcPrLinks(rfcId: bigint): Promise<RfcPrLink[]>;
export declare function updateCheckRunId(repoId: bigint, prNumber: number, rfcId: bigint, checkRunId: number): Promise<void>;
export declare function updatePrState(repoId: bigint, prNumber: number, state: 'open' | 'closed' | 'merged'): Promise<void>;
//# sourceMappingURL=rfcPrLinks.d.ts.map