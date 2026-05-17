export declare const CHECK_RUN_NAME = "proofflow/rfc-check";
export interface CheckRunParams {
    owner: string;
    repo: string;
    sha: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion?: 'success' | 'failure' | 'neutral';
    title: string;
    summary: string;
    details?: string;
}
interface ChecksOctokit {
    rest: {
        checks: {
            create: (params: {
                owner: string;
                repo: string;
                name: string;
                head_sha: string;
                status: string;
                conclusion?: string;
                output: {
                    title: string;
                    summary: string;
                    text?: string;
                };
            }) => Promise<{
                data: {
                    id: number;
                };
            }>;
            update: (params: {
                owner: string;
                repo: string;
                check_run_id: number;
                status: string;
                conclusion?: string;
                output: {
                    title: string;
                    summary: string;
                    text?: string;
                };
            }) => Promise<unknown>;
        };
    };
}
export declare function createCheckRun(octokit: ChecksOctokit, params: CheckRunParams): Promise<number>;
export declare function updateCheckRun(octokit: ChecksOctokit, checkRunId: number, params: Omit<CheckRunParams, 'sha'> & {
    owner: string;
    repo: string;
}): Promise<void>;
export {};
//# sourceMappingURL=runner.d.ts.map