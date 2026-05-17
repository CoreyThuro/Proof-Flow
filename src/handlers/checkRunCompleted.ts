import type { Context } from 'probot';
import { getRepoByGithubId } from '../db/queries/repos';
import { getRfcById } from '../db/queries/rfcs';
import { getActiveTaskByDraftPr, getActiveTaskByBranchName } from '../db/queries/agentTasks';
import { handleCheckRunCompleted } from '../agent/worker';
import type { AgentOctokit } from '../agent/worker';
import type { ProofFlowConfig } from '../config/parser';
import { DEFAULT_CONFIG } from '../config/parser';

// Checks to ignore: ProofFlow's own validation check and known always-failing unrelated checks
const IGNORED_CHECK_NAMES = new Set(['proofflow/rfc-check', 'proofflow-rfc-check', 'budget-check']);

type IssueOctokit = AgentOctokit & {
  rest: {
    issues: {
      get: (params: { owner: string; repo: string; issue_number: number }) => Promise<{
        data: { title: string; body: string | null };
      }>;
    } & AgentOctokit['rest']['issues'];
  };
};

export async function handleCheckRunCompletedEvent(
  context: Context<'check_run'>,
): Promise<void> {
  const checkRun = context.payload.check_run;
  const branchName = checkRun.check_suite?.head_branch;

  if (!branchName?.startsWith('proofflow/rfc-')) return;

  // Don't react to ProofFlow's own check or known unrelated checks (e.g. budget-check)
  if (IGNORED_CHECK_NAMES.has(checkRun.name)) return;

  const repo = await getRepoByGithubId(context.payload.repository.id);
  if (!repo) return;

  // GitHub doesn't always populate pull_requests for draft PRs; fall back to branch name lookup
  const webhookPrNumber = checkRun.pull_requests?.[0]?.number;
  const task = webhookPrNumber
    ? await getActiveTaskByDraftPr(webhookPrNumber)
    : await getActiveTaskByBranchName(branchName);
  if (!task) return;

  // draft_pr_number is set once the PR is opened; required to proceed
  if (!task.draft_pr_number) return;
  const prNumber = task.draft_pr_number;

  const rfc = await getRfcById(task.rfc_id);
  if (!rfc) return;

  const config: ProofFlowConfig = {
    ...DEFAULT_CONFIG,
    ...(repo.config_json as unknown as Partial<ProofFlowConfig> ?? {}),
  };

  const octokit = context.octokit as unknown as IssueOctokit;
  const owner = repo.github_owner;
  const repoName = repo.github_name;

  const issueData = await octokit.rest.issues.get({
    owner,
    repo: repoName,
    issue_number: rfc.github_issue_number,
  });

  const conclusion = checkRun.conclusion ?? 'failure';
  const ciOutput = checkRun.output?.text ?? checkRun.output?.summary ?? '';

  await handleCheckRunCompleted(
    octokit,
    owner,
    repoName,
    branchName,
    prNumber,
    conclusion,
    ciOutput,
    rfc.github_issue_number,
    issueData.data.body ?? '',
    issueData.data.title,
    rfc.author_login,
    config.aiAgent?.targetDirectory,
  );
}
