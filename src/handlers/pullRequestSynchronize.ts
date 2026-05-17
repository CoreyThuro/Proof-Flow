import type { Context } from 'probot';
import { getRepoByGithubId } from '../db/queries/repos';
import { runRfcCheck } from '../checks/rfcCheck';

export async function handlePullRequestSynchronize(
  context: Context<'pull_request.synchronize'>,
): Promise<void> {
  const repo = await getRepoByGithubId(context.payload.repository.id);
  if (!repo) return;

  const pr = context.payload.pull_request;
  await runRfcCheck(
    context.octokit as never,
    repo,
    pr.number,
    pr.body ?? null,
    pr.head.sha,
  );
}
