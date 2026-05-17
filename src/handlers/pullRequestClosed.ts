import type { Context } from 'probot';
import { getRepoByGithubId } from '../db/queries/repos';
import { updatePrState } from '../db/queries/rfcPrLinks';
import { runAttributionBot } from '../attribution/bot';

export async function handlePullRequestClosed(
  context: Context<'pull_request.closed'>,
): Promise<void> {
  const repo = await getRepoByGithubId(context.payload.repository.id);
  if (!repo) return;

  const pr = context.payload.pull_request;
  const state = pr.merged ? 'merged' : 'closed';
  await updatePrState(repo.id, pr.number, state);

  if (pr.merged) {
    await runAttributionBot(context, repo, {
      number: pr.number,
      body: pr.body,
      user: { login: pr.user.login },
      merge_commit_sha: pr.merge_commit_sha ?? null,
    });
  }
}
