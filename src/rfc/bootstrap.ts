import type { Context } from 'probot';
import type { Repo } from '../db/queries/repos';
import type { RfcBodyParseResult } from './bodyParser';
import { getRfcByIssueNumber, insertRfc } from '../db/queries/rfcs';
import { logTransition } from './stateLog';
import { applyLabel, LABEL_RFC_OPEN } from './labels';
import { postIncompleteComment, postWelcomeComment, updateWelcomeComment } from './comments';
import type { ProofFlowConfig } from '../config/parser';
import { buildDashboardSnapshot } from '../dashboard/snapshot';

export async function bootstrapRfc(
  context: Context<'issues.labeled'>,
  repo: Repo,
  parseResult: RfcBodyParseResult,
  config: ProofFlowConfig,
): Promise<void> {
  const issue = context.payload.issue;
  const existing = await getRfcByIssueNumber(repo.id, issue.number);

  if (existing) {
    await updateWelcomeComment(context, existing, parseResult);
    return;
  }

  if (!parseResult.valid) {
    await postIncompleteComment(context, parseResult.missingFields);
    return;
  }

  const authorLogin = issue.user?.login ?? 'unknown';
  const abandonAfter = new Date(
    Date.now() + config.rfcAbandonDays * 24 * 60 * 60 * 1000,
  );

  const rfc = await insertRfc(repo.id, issue.number, authorLogin, 'open', abandonAfter);

  await logTransition(rfc.id, null, 'open', authorLogin, 'RFC created');

  await applyLabel(
    context,
    context.payload.repository.owner.login,
    context.payload.repository.name,
    issue.number,
    LABEL_RFC_OPEN.name,
    LABEL_RFC_OPEN.color,
  );

  const requiredApprovals = config.seniorContributors.length >= 2 ? 2 : config.seniorContributors.length;
  await postWelcomeComment(context, rfc.id, 0, requiredApprovals);
  await buildDashboardSnapshot(repo.id);
}
