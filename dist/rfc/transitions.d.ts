import type { Context } from 'probot';
import { Probot } from 'probot';
import type { Repo } from '../db/queries/repos';
import type { Rfc } from '../db/queries/rfcs';
import { removeLabel } from './labels';
export declare function transitionToApproved(context: Context<'issue_comment.created'>, repo: Repo, rfc: Rfc, actorLogin: string, requiredApprovals: number): Promise<void>;
export declare function transitionToAbandoned(rfcId: bigint, robot: Probot): Promise<void>;
export declare function transitionToOpen(octokit: Parameters<typeof removeLabel>[0] & {
    rest: {
        issues: {
            createComment: (p: {
                owner: string;
                repo: string;
                issue_number: number;
                body: string;
            }) => Promise<unknown>;
        };
    };
}, repo: Repo, rfc: Rfc, actorLogin: string, requiredApprovals: number, rfcAbandonDays: number): Promise<void>;
//# sourceMappingURL=transitions.d.ts.map