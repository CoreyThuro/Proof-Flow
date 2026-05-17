import type { Context } from 'probot';
import { getRepoByGithubId } from '../db/queries/repos';
import { getRfcByIssueNumber } from '../db/queries/rfcs';
import { lgtmProcessor } from '../rfc/lgtmProcessor';

export async function handleIssueCommentCreated(
  context: Context<'issue_comment.created'>,
): Promise<void> {
  const repo = await getRepoByGithubId(context.payload.repository.id);
  if (!repo) return;

  const rfc = await getRfcByIssueNumber(repo.id, context.payload.issue.number);
  if (!rfc) return;

  if (rfc.state !== 'open') return;

  await lgtmProcessor(context, repo, rfc);
}
