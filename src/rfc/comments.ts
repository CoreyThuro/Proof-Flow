import type { Context } from 'probot';
import type { Rfc } from '../db/queries/rfcs';
import type { RfcBodyParseResult } from './bodyParser';

export async function postIncompleteComment(
  context: Context<'issues.labeled'>,
  missingFields: string[],
): Promise<void> {
  const fieldList = missingFields.map((f) => `- ${f}`).join('\n');
  const body =
    `ProofFlow RFC validation failed. Missing required fields:\n${fieldList}\n\n` +
    `Edit this issue to add the missing sections, then re-add the \`proofflow-rfc\` label.`;

  await context.octokit.rest.issues.createComment({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    issue_number: context.payload.issue.number,
    body,
  });
}

export async function postWelcomeComment(
  context: Context<'issues.labeled'>,
  rfcId: bigint,
  approvalCount: number,
  requiredApprovals: number,
): Promise<void> {
  const { repository, issue } = context.payload;
  const rfcUrl = `https://github.com/${repository.owner.login}/${repository.name}/issues/${issue.number}`;
  const body =
    `ProofFlow RFC registered (#${rfcId}). ` +
    `Strategy review: ${approvalCount}/${requiredApprovals} LGTMs needed.\n\n` +
    `${requiredApprovals} senior contributor${requiredApprovals === 1 ? '' : 's'} must comment "LGTM" on this issue to approve the proof strategy. ` +
    `[RFC #${issue.number}](${rfcUrl})`;

  await context.octokit.rest.issues.createComment({
    owner: repository.owner.login,
    repo: repository.name,
    issue_number: issue.number,
    body,
  });
}

export async function updateWelcomeComment(
  context: Context<'issues.labeled'>,
  rfc: Rfc,
  parseResult: RfcBodyParseResult,
): Promise<void> {
  if (!parseResult.valid) {
    await postIncompleteComment(context, parseResult.missingFields);
    return;
  }

  const { repository, issue } = context.payload;
  const body =
    `ProofFlow RFC #${rfc.id} — fields updated. All required sections are now present. ` +
    `Current state: \`${rfc.state}\`.`;

  await context.octokit.rest.issues.createComment({
    owner: repository.owner.login,
    repo: repository.name,
    issue_number: issue.number,
    body,
  });
}
