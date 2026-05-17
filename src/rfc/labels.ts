import type { Context } from 'probot';

export const LABEL_RFC_OPEN = { name: 'rfc:open', color: '0075ca' } as const;
export const LABEL_RFC_APPROVED = { name: 'rfc:approved', color: '2ea44f' } as const;
export const LABEL_RFC_ABANDONED = { name: 'rfc:abandoned', color: 'e4e669' } as const;

interface OctokitIssues {
  rest: {
    issues: {
      getLabel: (params: {
        owner: string;
        repo: string;
        name: string;
      }) => Promise<unknown>;
      createLabel: (params: {
        owner: string;
        repo: string;
        name: string;
        color: string;
      }) => Promise<unknown>;
      addLabels: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        labels: string[];
      }) => Promise<unknown>;
      removeLabel: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        name: string;
      }) => Promise<unknown>;
    };
  };
}

export async function ensureLabel(
  octokit: OctokitIssues,
  owner: string,
  repo: string,
  name: string,
  color: string,
): Promise<void> {
  try {
    await octokit.rest.issues.getLabel({ owner, repo, name });
  } catch (err: unknown) {
    if (isHttpError(err) && err.status === 404) {
      await octokit.rest.issues.createLabel({ owner, repo, name, color });
    } else {
      throw err;
    }
  }
}

export async function applyLabel(
  context: Context<'issues.labeled'>,
  owner: string,
  repo: string,
  issueNumber: number,
  labelName: string,
  labelColor: string,
): Promise<void> {
  await ensureLabel(context.octokit, owner, repo, labelName, labelColor);
  await context.octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: [labelName],
  });
}

export async function applyLabelWithOctokit(
  octokit: OctokitIssues,
  owner: string,
  repo: string,
  issueNumber: number,
  labelName: string,
  labelColor: string,
): Promise<void> {
  await ensureLabel(octokit, owner, repo, labelName, labelColor);
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: [labelName],
  });
}

export async function removeLabel(
  octokit: OctokitIssues,
  owner: string,
  repo: string,
  issueNumber: number,
  labelName: string,
): Promise<void> {
  try {
    await octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: issueNumber,
      name: labelName,
    });
  } catch (err: unknown) {
    if (!isHttpError(err) || err.status !== 404) {
      throw err;
    }
  }
}

function isHttpError(err: unknown): err is { status: number } {
  return typeof err === 'object' && err !== null && 'status' in err;
}
