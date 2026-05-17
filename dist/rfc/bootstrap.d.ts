import type { Context } from 'probot';
import type { Repo } from '../db/queries/repos';
import type { RfcBodyParseResult } from './bodyParser';
import type { ProofFlowConfig } from '../config/parser';
export declare function bootstrapRfc(context: Context<'issues.labeled'>, repo: Repo, parseResult: RfcBodyParseResult, config: ProofFlowConfig): Promise<void>;
//# sourceMappingURL=bootstrap.d.ts.map