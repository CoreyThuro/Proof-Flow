type AssemblerOctokit = {
    rest: {
        issues: {
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
        };
    };
};
export interface AssembledContext {
    systemPrompt: string;
    userPrompt: string;
    targetFilePath: string;
    defaultBranch: string;
}
export declare function assembleContext(octokit: AssemblerOctokit, owner: string, repoName: string, issueNumber: number, rfcBody: string, rfcTitle: string, rfcAuthorLogin: string, targetDirectory: string | undefined, priorAttempt?: {
    leanCode: string;
    ciOutput: string;
}, mode?: 'statement' | 'full-proof'): Promise<AssembledContext>;
export {};
//# sourceMappingURL=contextAssembler.d.ts.map