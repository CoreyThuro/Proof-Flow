import type { Context } from 'probot';
import type { Repo } from '../db/queries/repos';
import type { Rfc } from '../db/queries/rfcs';
import { getRfcByIssueNumber } from '../db/queries/rfcs';
import { upsertRfcPrLink, getOpenRfcPrLinks } from '../db/queries/rfcPrLinks';
import { DEFAULT_CONFIG } from '../config/parser';
import type { ProofFlowConfig } from '../config/parser';
import { parsePrRfcRefs } from './prParser';
import { isBelowThreshold } from './thresholdCheck';
import { createCheckRun, updateCheckRun } from './runner';
import { getPrFiles } from './diffFetcher';
import type { PrFile } from './diffFetcher';
import { hasAttributionDocstring, getAttributionTemplate } from './attributionDetector';
import { buildCheckMessage } from './messages';

type RfcCheckOctokit = {
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
    pulls: {
      listFiles: (params: {
        owner: string;
        repo: string;
        pull_number: number;
        per_page?: number;
      }) => Promise<{ data: Array<{ filename: string; additions: number; patch?: string }> }>;
      get: (params: {
        owner: string;
        repo: string;
        pull_number: number;
      }) => Promise<{
        data: {
          number: number;
          body: string | null;
          head: { sha: string };
          state: string;
          merged: boolean;
        };
      }>;
    };
  };
};

export async function runRfcCheck(
  octokit: RfcCheckOctokit,
  repo: Repo,
  prNumber: number,
  prBody: string | null,
  prSha: string,
  existingCheckRunId?: number,
): Promise<void> {
  const owner = repo.github_owner;
  const repoName = repo.github_name;

  const config: ProofFlowConfig = {
    ...DEFAULT_CONFIG,
    ...(repo.config_json as unknown as Partial<ProofFlowConfig> ?? {}),
  };

  const files = await getPrFiles(octokit, owner, repoName, prNumber);
  const leanFiles = files.filter((f) => f.filename.endsWith('.lean'));

  const postResult = async (
    conclusion: 'success' | 'failure' | 'neutral',
    title: string,
    summary: string,
    details?: string,
  ): Promise<number> => {
    const params = {
      owner,
      repo: repoName,
      sha: prSha,
      status: 'completed' as const,
      conclusion,
      title,
      summary,
      details,
    };
    if (existingCheckRunId) {
      await updateCheckRun(octokit, existingCheckRunId, params);
      return existingCheckRunId;
    }
    return createCheckRun(octokit, params);
  };

  if (leanFiles.length === 0) {
    await postResult('success', 'No .lean files changed', 'No Lean files were modified in this PR.');
    return;
  }

  const rfcRefs = parsePrRfcRefs(prBody ?? '');

  if (rfcRefs.length === 0) {
    if (isBelowThreshold(leanFiles.map((f) => f.filename), config)) {
      const msg = buildCheckMessage('below_threshold_warning');
      await postResult('success', msg.title, msg.summary, msg.details);
    } else {
      const msg = buildCheckMessage('no_rfc_linked');
      await postResult('failure', msg.title, msg.summary, msg.details);
    }
    return;
  }

  const rfcs: Rfc[] = [];
  const unapprovedNums: number[] = [];

  for (const issueNumber of rfcRefs) {
    const rfc = await getRfcByIssueNumber(repo.id, issueNumber);
    if (!rfc || rfc.state !== 'approved') {
      unapprovedNums.push(issueNumber);
    } else {
      rfcs.push(rfc);
    }
  }

  if (unapprovedNums.length > 0) {
    const msg = buildCheckMessage('rfc_not_approved', { rfcNumbers: unapprovedNums });
    await postResult('failure', msg.title, msg.summary, msg.details);
    return;
  }

  const missingAttributionFiles: string[] = [];
  for (const file of leanFiles) {
    if (!file.patch || !hasAttributionDocstring(file.patch)) {
      missingAttributionFiles.push(file.filename);
    }
  }

  if (missingAttributionFiles.length > 0) {
    const primaryRfc = rfcs[0];
    const template = primaryRfc
      ? getAttributionTemplate(primaryRfc.author_login, primaryRfc.github_issue_number)
      : '';
    const msg = buildCheckMessage('attribution_missing', {
      missingAttributionFiles,
      template,
    });
    await postResult('failure', msg.title, msg.summary, msg.details);
    return;
  }

  const rfcNums = rfcs.map((r) => r.github_issue_number);
  const successSummary = `RFC(s) ${rfcNums.map((n) => `#${n}`).join(', ')} approved. Attribution present.`;
  const checkRunId = await postResult('success', 'RFC approved and attribution present', successSummary);

  for (const rfc of rfcs) {
    await upsertRfcPrLink(rfc.id, repo.id, prNumber, checkRunId);
  }
}

export async function triggerCheckUpdates(
  context: Context<'issue_comment.created'>,
  repo: Repo,
  rfc: Rfc,
): Promise<void> {
  const openLinks = await getOpenRfcPrLinks(rfc.id);
  if (openLinks.length === 0) return;

  const octokit = context.octokit as unknown as RfcCheckOctokit;
  const owner = repo.github_owner;
  const repoName = repo.github_name;

  for (const link of openLinks) {
    try {
      const prResponse = await octokit.rest.pulls.get({
        owner,
        repo: repoName,
        pull_number: link.pr_number,
      });
      const pr = prResponse.data;
      if (pr.state !== 'open') continue;

      const existingCheckRunId = link.check_run_id ? Number(link.check_run_id) : undefined;

      await runRfcCheck(
        octokit,
        repo,
        link.pr_number,
        pr.body,
        pr.head.sha,
        existingCheckRunId,
      );
    } catch (err: unknown) {
      context.log.error({ prNumber: link.pr_number, err }, 'Failed to update check run for PR');
    }
  }
}
