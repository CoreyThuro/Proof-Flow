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
export declare function insertRfc(repoId: bigint, issueNumber: number, authorLogin: string, state: RfcState, abandonAfter: Date | null): Promise<Rfc>;
export declare function getRfcByIssueNumber(repoId: bigint, issueNumber: number): Promise<Rfc | null>;
export declare function getRfcById(rfcId: bigint): Promise<Rfc | null>;
export declare function updateRfcState(rfcId: bigint, state: RfcState, stateUpdatedAt: Date, abandonAfter?: Date | null): Promise<void>;
//# sourceMappingURL=rfcs.d.ts.map