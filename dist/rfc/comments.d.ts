import type { Context } from 'probot';
import type { Rfc } from '../db/queries/rfcs';
import type { RfcBodyParseResult } from './bodyParser';
export declare function postIncompleteComment(context: Context<'issues.labeled'>, missingFields: string[]): Promise<void>;
export declare function postWelcomeComment(context: Context<'issues.labeled'>, rfcId: bigint, approvalCount: number, requiredApprovals: number): Promise<void>;
export declare function updateWelcomeComment(context: Context<'issues.labeled'>, rfc: Rfc, parseResult: RfcBodyParseResult): Promise<void>;
//# sourceMappingURL=comments.d.ts.map