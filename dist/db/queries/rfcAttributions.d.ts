export interface RfcAttribution {
    id: bigint;
    rfc_id: bigint;
    pr_number: number;
    lean_file_path: string;
    attributed_at: Date;
}
export declare function insertRfcAttribution(rfcId: bigint, prNumber: number, leanFilePath: string): Promise<void>;
//# sourceMappingURL=rfcAttributions.d.ts.map