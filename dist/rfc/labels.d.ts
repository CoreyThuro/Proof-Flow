import type { Context } from 'probot';
export declare const LABEL_RFC_OPEN: {
    readonly name: "rfc:open";
    readonly color: "0075ca";
};
export declare const LABEL_RFC_APPROVED: {
    readonly name: "rfc:approved";
    readonly color: "2ea44f";
};
export declare const LABEL_RFC_ABANDONED: {
    readonly name: "rfc:abandoned";
    readonly color: "e4e669";
};
interface OctokitIssues {
    rest: {
        issues: {
            getLabel: (params: {
                owner: string;
                repo: string;
                name: string;
            }) => Promise<unknown>;
            createLabel: (params: {
                owner: string;
                repo: string;
                name: string;
                color: string;
            }) => Promise<unknown>;
            addLabels: (params: {
                owner: string;
                repo: string;
                issue_number: number;
                labels: string[];
            }) => Promise<unknown>;
            removeLabel: (params: {
                owner: string;
                repo: string;
                issue_number: number;
                name: string;
            }) => Promise<unknown>;
        };
    };
}
export declare function ensureLabel(octokit: OctokitIssues, owner: string, repo: string, name: string, color: string): Promise<void>;
export declare function applyLabel(context: Context<'issues.labeled'>, owner: string, repo: string, issueNumber: number, labelName: string, labelColor: string): Promise<void>;
export declare function applyLabelWithOctokit(octokit: OctokitIssues, owner: string, repo: string, issueNumber: number, labelName: string, labelColor: string): Promise<void>;
export declare function removeLabel(octokit: OctokitIssues, owner: string, repo: string, issueNumber: number, labelName: string): Promise<void>;
export {};
//# sourceMappingURL=labels.d.ts.map