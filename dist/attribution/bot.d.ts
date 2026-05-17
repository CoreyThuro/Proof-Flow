import type { Context } from 'probot';
import type { Repo } from '../db/queries/repos';
interface MergedPr {
    number: number;
    body: string | null;
    user: {
        login: string;
    };
    merge_commit_sha: string | null;
}
export declare function runAttributionBot(context: Context<'pull_request.closed'>, repo: Repo, pr: MergedPr): Promise<void>;
export {};
//# sourceMappingURL=bot.d.ts.map