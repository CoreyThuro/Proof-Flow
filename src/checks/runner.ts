export const CHECK_RUN_NAME = 'proofflow/rfc-check';

export interface CheckRunParams {
  owner: string;
  repo: string;
  sha: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral';
  title: string;
  summary: string;
  details?: string;
}

interface ChecksOctokit {
  rest: {
    checks: {
      create: (params: {
        owner: string;
        repo: string;
        name: string;
        head_sha: string;
        status: string;
        conclusion?: string;
        output: { title: string; summary: string; text?: string };
      }) => Promise<{ data: { id: number } }>;
      update: (params: {
        owner: string;
        repo: string;
        check_run_id: number;
        status: string;
        conclusion?: string;
        output: { title: string; summary: string; text?: string };
      }) => Promise<unknown>;
    };
  };
}

export async function createCheckRun(
  octokit: ChecksOctokit,
  params: CheckRunParams,
): Promise<number> {
  const response = await octokit.rest.checks.create({
    owner: params.owner,
    repo: params.repo,
    name: CHECK_RUN_NAME,
    head_sha: params.sha,
    status: params.status,
    conclusion: params.conclusion,
    output: {
      title: params.title,
      summary: params.summary,
      text: params.details,
    },
  });
  return response.data.id;
}

export async function updateCheckRun(
  octokit: ChecksOctokit,
  checkRunId: number,
  params: Omit<CheckRunParams, 'sha'> & { owner: string; repo: string },
): Promise<void> {
  await octokit.rest.checks.update({
    owner: params.owner,
    repo: params.repo,
    check_run_id: checkRunId,
    status: params.status,
    conclusion: params.conclusion,
    output: {
      title: params.title,
      summary: params.summary,
      text: params.details,
    },
  });
}
