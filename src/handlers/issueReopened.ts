import type { Context } from 'probot';
import { getRepoByGithubId } from '../db/queries/repos';
import { getRfcByIssueNumber } from '../db/queries/rfcs';
import { deleteRfcApprovals } from '../db/queries/rfcApprovals';
import { DEFAULT_CONFIG } from '../config/parser';
import type { ProofFlowConfig } from '../config/parser';
import { transitionToOpen } from '../rfc/transitions';
import { removeLabel } from '../rfc/labels';

export async function handleIssueReopened(
  context: Context<'issues.reopened'>,
): Promise<void> {
  const repo = await getRepoByGithubId(context.payload.repository.id);
  if (!repo) return;

  const rfc = await getRfcByIssueNumber(repo.id, context.payload.issue.number);
  if (!rfc) return;

  if (rfc.state !== 'abandoned') return;

  const config: ProofFlowConfig = {
    ...DEFAULT_CONFIG,
    ...(repo.config_json as unknown as Partial<ProofFlowConfig> ?? {}),
  };

  const requiredApprovals =
    config.seniorContributors.length >= 2 ? 2 : config.seniorContributors.length;

  await deleteRfcApprovals(rfc.id);

  const actorLogin = context.payload.sender.login;
  const octokit = context.octokit as unknown as Parameters<typeof removeLabel>[0] & {
    rest: { issues: { createComment: (p: { owner: string; repo: string; issue_number: number; body: string }) => Promise<unknown> } };
  };

  await transitionToOpen(
    octokit,
    repo,
    rfc,
    actorLogin,
    requiredApprovals,
    config.rfcAbandonDays,
  );
}
