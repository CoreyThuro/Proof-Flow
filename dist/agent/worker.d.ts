import type { Repo } from '../db/queries/repos';
import type { Rfc } from '../db/queries/rfcs';
import type { AiAgentConfig } from '../config/parser';
export type AgentOctokit = {
    rest: {
        issues: {
            createComment: (params: {
                owner: string;
                repo: string;
                issue_number: number;
                body: string;
            }) => Promise<unknown>;
            removeLabel: (params: {
                owner: string;
                repo: string;
                issue_number: number;
                name: string;
            }) => Promise<unknown>;
            addLabels: (params: {
                owner: string;
                repo: string;
                issue_number: number;
                labels: string[];
            }) => Promise<unknown>;
            listComments: (params: {
                owner: string;
                repo: string;
                issue_number: number;
                per_page?: number;
            }) => Promise<{
                data: Array<{
                    body?: string;
                    user?: {
                        login?: string;
                    };
                    created_at: string;
                }>;
            }>;
        };
        repos: {
            get: (params: {
                owner: string;
                repo: string;
            }) => Promise<{
                data: {
                    default_branch: string;
                };
            }>;
            getContent: (params: {
                owner: string;
                repo: string;
                path: string;
                ref?: string;
            }) => Promise<{
                data: unknown;
            }>;
            createOrUpdateFileContents: (params: {
                owner: string;
                repo: string;
                path: string;
                message: string;
                content: string;
                branch: string;
                sha?: string;
            }) => Promise<unknown>;
        };
        git: {
            getRef: (params: {
                owner: string;
                repo: string;
                ref: string;
            }) => Promise<{
                data: {
                    object: {
                        sha: string;
                    };
                };
            }>;
            createRef: (params: {
                owner: string;
                repo: string;
                ref: string;
                sha: string;
            }) => Promise<unknown>;
            deleteRef: (params: {
                owner: string;
                repo: string;
                ref: string;
            }) => Promise<unknown>;
        };
        pulls: {
            create: (params: {
                owner: string;
                repo: string;
                title: string;
                body: string;
                head: string;
                base: string;
                draft: boolean;
            }) => Promise<{
                data: {
                    number: number;
                };
            }>;
            update: (params: {
                owner: string;
                repo: string;
                pull_number: number;
                state?: string;
                draft?: boolean;
            }) => Promise<unknown>;
        };
        checks: {
            listForRef: (params: {
                owner: string;
                repo: string;
                ref: string;
                per_page?: number;
            }) => Promise<{
                data: {
                    check_runs: Array<{
                        id: number;
                        name: string;
                        conclusion: string | null;
                        output?: {
                            text?: string | null;
                        };
                    }>;
                };
            }>;
        };
    };
};
export declare function handleStartAgent(octokit: AgentOctokit, repo: Repo, rfc: Rfc, issueNumber: number, issueTitle: string, issueBody: string, config: AiAgentConfig): Promise<void>;
export declare function handleCheckRunCompleted(octokit: AgentOctokit, owner: string, repoName: string, branchName: string, prNumber: number, conclusion: string, ciOutput: string, issueNumber: number, rfcBody: string, rfcTitle: string, rfcAuthorLogin: string, targetDirectory: string | undefined): Promise<void>;
//# sourceMappingURL=worker.d.ts.map