import type { Context } from 'probot';
import type { Repo } from '../db/queries/repos';
import { getRfcByIssueNumber, updateRfcState } from '../db/queries/rfcs';
import { insertRfcAttribution } from '../db/queries/rfcAttributions';
import { logTransition } from '../rfc/stateLog';
import { buildDashboardSnapshot } from '../dashboard/snapshot';
import { parsePrRfcRefs } from '../checks/prParser';
import { getPrFiles } from '../checks/diffFetcher';

interface MergedPr {
  number: number;
  body: string | null;
  user: { login: string };
  merge_commit_sha: string | null;
}

type AttributionOctokit = {
  rest: {
    issues: {
      createComment: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        body: string;
      }) => Promise<unknown>;
      update: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        state: string;
        state_reason?: string;
      }) => Promise<unknown>;
    };
    pulls: {
      listFiles: (params: {
        owner: string;
        repo: string;
        pull_number: number;
        per_page?: number;
      }) => Promise<{ data: Array<{ filename: string; additions: number; patch?: string }> }>;
    };
  };
};

export async function runAttributionBot(
  context: Context<'pull_request.closed'>,
  repo: Repo,
  pr: MergedPr,
): Promise<void> {
  const owner = repo.github_owner;
  const repoName = repo.github_name;
  const octokit = context.octokit as unknown as AttributionOctokit;

  const rfcRefs = parsePrRfcRefs(pr.body ?? '');
  if (rfcRefs.length === 0) return;

  const files = await getPrFiles(octokit, owner, repoName, pr.number);
  const leanFiles = files.filter((f) => f.filename.endsWith('.lean'));

  const commitUrl = pr.merge_commit_sha
    ? `https://github.com/${owner}/${repoName}/commit/${pr.merge_commit_sha}`
    : `https://github.com/${owner}/${repoName}/pull/${pr.number}`;

  for (const issueNumber of rfcRefs) {
    const rfc = await getRfcByIssueNumber(repo.id, issueNumber);
    if (!rfc || (rfc.state !== 'approved' && rfc.state !== 'in_progress')) continue;

    for (const file of leanFiles) {
      await insertRfcAttribution(rfc.id, pr.number, file.filename);
    }

    await octokit.rest.issues.createComment({
      owner,
      repo: repoName,
      issue_number: issueNumber,
      body:
        `Formalization merged in PR #${pr.number} by @${pr.user.login}. ` +
        `Proof strategy credited to @${rfc.author_login}. ` +
        `[View commit](${commitUrl})`,
    });

    await updateRfcState(rfc.id, 'closed', new Date());
    await logTransition(rfc.id, rfc.state, 'closed', pr.user.login, 'formalization merged');

    await octokit.rest.issues.update({
      owner,
      repo: repoName,
      issue_number: issueNumber,
      state: 'closed',
      state_reason: 'completed',
    });
  }

  await buildDashboardSnapshot(repo.id);
}
