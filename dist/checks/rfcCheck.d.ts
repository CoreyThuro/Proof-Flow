import type { Context } from 'probot';
import type { Repo } from '../db/queries/repos';
import type { Rfc } from '../db/queries/rfcs';
type RfcCheckOctokit = {
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
            get: (params: {
                owner: string;
                repo: string;
                pull_number: number;
            }) => Promise<{
                data: {
                    number: number;
                    body: string | null;
                    head: {
                        sha: string;
                    };
                    state: string;
                    merged: boolean;
                };
            }>;
        };
    };
};
export declare function runRfcCheck(octokit: RfcCheckOctokit, repo: Repo, prNumber: number, prBody: string | null, prSha: string, existingCheckRunId?: number): Promise<void>;
export declare function triggerCheckUpdates(context: Context<'issue_comment.created'>, repo: Repo, rfc: Rfc): Promise<void>;
export {};
//# sourceMappingURL=rfcCheck.d.ts.map