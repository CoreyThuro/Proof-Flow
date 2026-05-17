import type { Context } from 'probot';
import type { Repo } from '../db/queries/repos';
import type { Rfc } from '../db/queries/rfcs';
import {
  insertRfcApproval,
  getRfcApprovalCount,
  getRfcApproval,
} from '../db/queries/rfcApprovals';
import { DEFAULT_CONFIG } from '../config/parser';
import type { ProofFlowConfig } from '../config/parser';
import { isLgtmComment } from './lgtmDetector';
import { transitionToApproved } from './transitions';

export async function lgtmProcessor(
  context: Context<'issue_comment.created'>,
  repo: Repo,
  rfc: Rfc,
): Promise<void> {
  const config: ProofFlowConfig = {
    ...DEFAULT_CONFIG,
    ...(repo.config_json as unknown as Partial<ProofFlowConfig> ?? {}),
  };

  const commenterLogin = context.payload.comment.user.login;

  if (!isLgtmComment(context.payload.comment.body, commenterLogin, config)) {
    return;
  }

  const existing = await getRfcApproval(rfc.id, commenterLogin);
  if (existing) {
    await context.octokit.rest.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: 'Your LGTM was already recorded.',
    });
    return;
  }

  await insertRfcApproval(rfc.id, commenterLogin, context.payload.comment.id);

  const count = await getRfcApprovalCount(rfc.id);
  const requiredApprovals =
    config.seniorContributors.length >= 2 ? 2 : config.seniorContributors.length;

  if (count >= requiredApprovals) {
    await transitionToApproved(context, repo, rfc, commenterLogin, requiredApprovals);
  } else {
    const remaining = requiredApprovals - count;
    await context.octokit.rest.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue.number,
      body: `LGTM recorded (${count}/${requiredApprovals}). ${remaining} more needed.`,
    });
  }
}
