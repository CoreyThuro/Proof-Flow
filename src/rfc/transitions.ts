import type { Context } from 'probot';
import { Probot } from 'probot';
import type { Repo } from '../db/queries/repos';
import type { Rfc } from '../db/queries/rfcs';
import { getRfcById, updateRfcState } from '../db/queries/rfcs';
import { getRepoById } from '../db/queries/repos';
import { logTransition } from './stateLog';
import {
  LABEL_RFC_OPEN,
  LABEL_RFC_APPROVED,
  LABEL_RFC_ABANDONED,
  removeLabel,
  applyLabelWithOctokit,
} from './labels';
import { DEFAULT_CONFIG } from '../config/parser';
import type { ProofFlowConfig } from '../config/parser';
import { triggerCheckUpdates } from '../checks/rfcCheck';
import { buildDashboardSnapshot } from '../dashboard/snapshot';

export async function transitionToApproved(
  context: Context<'issue_comment.created'>,
  repo: Repo,
  rfc: Rfc,
  actorLogin: string,
  requiredApprovals: number,
): Promise<void> {
  await updateRfcState(rfc.id, 'approved', new Date());
  await logTransition(rfc.id, 'open', 'approved', actorLogin, 'Required LGTMs received');

  const { repository } = context.payload;
  const owner = repository.owner.login;
  const repoName = repository.name;
  const issueNumber = context.payload.issue.number;
  const octokit = context.octokit as unknown as Parameters<typeof removeLabel>[0];

  await removeLabel(octokit, owner, repoName, issueNumber, LABEL_RFC_OPEN.name);
  await applyLabelWithOctokit(octokit, owner, repoName, issueNumber, LABEL_RFC_APPROVED.name, LABEL_RFC_APPROVED.color);

  await context.octokit.rest.issues.createComment({
    owner,
    repo: repoName,
    issue_number: issueNumber,
    body:
      `RFC approved (${requiredApprovals}/${requiredApprovals} LGTMs). ` +
      `Ready for formalization. @${rfc.author_login} — your strategy has been accepted.`,
  });

  await triggerCheckUpdates(context, repo, rfc);
  await buildDashboardSnapshot(repo.id);
}

export async function transitionToAbandoned(rfcId: bigint, robot: Probot): Promise<void> {
  const rfc = await getRfcById(rfcId);
  if (!rfc) return;

  const repo = await getRepoById(rfc.repo_id);
  if (!repo || repo.installation_id == null) return;

  await updateRfcState(rfcId, 'abandoned', new Date());
  await logTransition(rfcId, 'open', 'abandoned', null, 'timeout');

  const octokit = await robot.auth(Number(repo.installation_id));
  const labelOctokit = octokit as unknown as Parameters<typeof removeLabel>[0];

  await removeLabel(labelOctokit, repo.github_owner, repo.github_name, rfc.github_issue_number, LABEL_RFC_OPEN.name);
  await applyLabelWithOctokit(labelOctokit, repo.github_owner, repo.github_name, rfc.github_issue_number, LABEL_RFC_ABANDONED.name, LABEL_RFC_ABANDONED.color);

  const config: ProofFlowConfig = {
    ...DEFAULT_CONFIG,
    ...(repo.config_json as unknown as Partial<ProofFlowConfig> ?? {}),
  };

  await octokit.rest.issues.createComment({
    owner: repo.github_owner,
    repo: repo.github_name,
    issue_number: rfc.github_issue_number,
    body:
      `This RFC has been marked abandoned — no approval after ${config.rfcAbandonDays} days. ` +
      `Reopen the issue to restart the review clock.`,
  });

  await buildDashboardSnapshot(repo.id);
}

export async function transitionToOpen(
  octokit: Parameters<typeof removeLabel>[0] & {
    rest: { issues: { createComment: (p: { owner: string; repo: string; issue_number: number; body: string }) => Promise<unknown> } };
  },
  repo: Repo,
  rfc: Rfc,
  actorLogin: string,
  requiredApprovals: number,
  rfcAbandonDays: number,
): Promise<void> {
  const abandonAfter = new Date(Date.now() + rfcAbandonDays * 24 * 60 * 60 * 1000);

  await updateRfcState(rfc.id, 'open', new Date(), abandonAfter);
  await logTransition(rfc.id, 'abandoned', 'open', actorLogin, 're-opened');

  await removeLabel(octokit, repo.github_owner, repo.github_name, rfc.github_issue_number, LABEL_RFC_ABANDONED.name);
  await applyLabelWithOctokit(octokit, repo.github_owner, repo.github_name, rfc.github_issue_number, LABEL_RFC_OPEN.name, LABEL_RFC_OPEN.color);

  await octokit.rest.issues.createComment({
    owner: repo.github_owner,
    repo: repo.github_name,
    issue_number: rfc.github_issue_number,
    body:
      `RFC re-opened. Review clock reset (${rfcAbandonDays} days). ` +
      `0/${requiredApprovals} LGTMs.`,
  });

  await buildDashboardSnapshot(repo.id);
}
