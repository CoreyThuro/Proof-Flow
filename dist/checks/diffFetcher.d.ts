export interface PrFile {
    filename: string;
    additions: number;
    patch?: string;
}
interface PullsOctokit {
    rest: {
        pulls: {
            listFiles: (params: {
                owner: string;
                repo: string;
                pull_number: number;
                per_page?: number;
            }) => Promise<{
                data: Array<{
                    filename: string;
                    additions: number;
                    patch?: string;
                }>;
            }>;
        };
    };
}
export declare function getPrFiles(octokit: PullsOctokit, owner: string, repo: string, prNumber: number): Promise<PrFile[]>;
export {};
//# sourceMappingURL=diffFetcher.d.ts.map