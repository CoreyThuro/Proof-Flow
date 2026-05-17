import type { Context } from 'probot';
import type { Repo } from '../db/queries/repos';
import type { Rfc } from '../db/queries/rfcs';
export declare function lgtmProcessor(context: Context<'issue_comment.created'>, repo: Repo, rfc: Rfc): Promise<void>;
//# sourceMappingURL=lgtmProcessor.d.ts.map