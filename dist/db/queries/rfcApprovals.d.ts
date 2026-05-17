export interface RfcApproval {
    id: bigint;
    rfc_id: bigint;
    approver_login: string;
    approved_at: Date;
    comment_id: bigint;
}
export declare function insertRfcApproval(rfcId: bigint, approverLogin: string, commentId: number): Promise<RfcApproval>;
export declare function getRfcApprovalCount(rfcId: bigint): Promise<number>;
export declare function getRfcApproval(rfcId: bigint, approverLogin: string): Promise<RfcApproval | null>;
export declare function deleteRfcApprovals(rfcId: bigint): Promise<void>;
//# sourceMappingURL=rfcApprovals.d.ts.map