import { insertStateLog } from '../db/queries/stateLog';

export async function logTransition(
  rfcId: bigint,
  fromState: string | null,
  toState: string,
  actorLogin: string | null,
  reason?: string,
): Promise<void> {
  await insertStateLog(rfcId, fromState, toState, actorLogin, reason);
}
