import type { Repo } from '../db/queries/repos';
import type { Rfc } from '../db/queries/rfcs';
import type { AiAgentConfig } from '../config/parser';
import {
  insertAgentTask,
  updateAgentTask,
  getActiveTaskByRfcId,
  getActiveTaskByDraftPr,
  type AgentTask,
} from '../db/queries/agentTasks';
import { insertAgentIteration, updateAgentIteration, getLatestIteration } from '../db/queries/agentIterations';
import { assembleContext } from './contextAssembler';
import { generateLeanCode } from './claudeClient';
import {
  createAristotleProject,
  pollUntilComplete,
  downloadResult,
  extractLeanFromTarball,
  isAristotleConfigured,
  AristotleFailedError,
  AristotleTimeoutError,
} from './aristotleClient';

function injectAttribution(leanCode: string, authorLogin: string, issueNumber: number): string {
  if (leanCode.includes('Proof strategy credited to')) return leanCode;
  const attribution = `/-! Proof strategy credited to @${authorLogin}, RFC #${issueNumber} -/`;
  const match = /^(theorem|def|lemma|noncomputable|section|namespace|abbrev|structure|class|instance)\b/m.exec(leanCode);
  if (!match) return leanCode + '\n\n' + attribution;
  return leanCode.slice(0, match.index) + attribution + '\n' + leanCode.slice(match.index);
}

export type AgentOctokit = {
  rest: {
    issues: {
      createComment: (params: { owner: string; repo: string; issue_number: number; body: string }) => Promise<unknown>;
      removeLabel: (params: { owner: string; repo: string; issue_number: number; name: string }) => Promise<unknown>;
      addLabels: (params: { owner: string; repo: string; issue_number: number; labels: string[] }) => Promise<unknown>;
      listComments: (params: { owner: string; repo: string; issue_number: number; per_page?: number }) => Promise<{ data: Array<{ body?: string; user?: { login?: string }; created_at: string }> }>;
    };
    repos: {
      get: (params: { owner: string; repo: string }) => Promise<{ data: { default_branch: string } }>;
      getContent: (params: { owner: string; repo: string; path: string; ref?: string }) => Promise<{ data: unknown }>;
      createOrUpdateFileContents: (params: {
        owner: string;
        repo: string;
        path: string;
        message: string;
        content: string;
        branch: string;
        sha?: string;
      }) => Promise<unknown>;
    };
    git: {
      getRef: (params: { owner: string; repo: string; ref: string }) => Promise<{ data: { object: { sha: string } } }>;
      createRef: (params: { owner: string; repo: string; ref: string; sha: string }) => Promise<unknown>;
      deleteRef: (params: { owner: string; repo: string; ref: string }) => Promise<unknown>;
    };
    pulls: {
      create: (params: {
        owner: string;
        repo: string;
        title: string;
        body: string;
        head: string;
        base: string;
        draft: boolean;
      }) => Promise<{ data: { number: number } }>;
      update: (params: { owner: string; repo: string; pull_number: number; state?: string; draft?: boolean }) => Promise<unknown>;
    };
    checks: {
      listForRef: (params: { owner: string; repo: string; ref: string; per_page?: number }) => Promise<{
        data: { check_runs: Array<{ id: number; name: string; conclusion: string | null; output?: { text?: string | null; summary?: string | null } }> };
      }>;
    };
  };
};

async function postComment(
  octokit: AgentOctokit,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  await octokit.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
}

async function removeLabelSafe(
  octokit: AgentOctokit,
  owner: string,
  repo: string,
  issueNumber: number,
  labelName: string,
): Promise<void> {
  try {
    await octokit.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: labelName });
  } catch {
    // label not present — ignore
  }
}

export async function handleStartAgent(
  octokit: AgentOctokit,
  repo: Repo,
  rfc: Rfc,
  issueNumber: number,
  issueTitle: string,
  issueBody: string,
  config: AiAgentConfig,
): Promise<void> {
  const owner = repo.github_owner;
  const repoName = repo.github_name;
  const maxIterations = config.maxIterations ?? 3;

  const existing = await getActiveTaskByRfcId(rfc.id);
  if (existing) {
    await removeLabelSafe(octokit, owner, repoName, issueNumber, 'proofflow:start-agent');
    await postComment(
      octokit, owner, repoName, issueNumber,
      `An agent task is already running for this RFC (task #${existing.id}). Wait for it to complete before starting a new one.`,
    );
    return;
  }

  const task = await insertAgentTask(rfc.id, repo.id, maxIterations);
  await removeLabelSafe(octokit, owner, repoName, issueNumber, 'proofflow:start-agent');
  await postComment(
    octokit, owner, repoName, issueNumber,
    isAristotleConfigured()
      ? `ProofFlow Agent starting — formalization attempt 1/${maxIterations}. Aristotle is working on the proof — track progress at https://aristotle.harmonic.fun. A draft PR will open when it completes.`
      : `ProofFlow Agent starting — formalization attempt 1/${maxIterations}. I'll open a draft PR shortly.`,
  );

  const useAristotle = isAristotleConfigured();

  try {
    // Always resolve branch/file info; only use prompts in the Claude fallback path
    const assembled = await assembleContext(
      octokit as Parameters<typeof assembleContext>[0],
      owner,
      repoName,
      issueNumber,
      issueBody,
      issueTitle,
      rfc.author_login,
      config.targetDirectory,
      undefined,
    );

    let leanCode: string;
    let promptTokens = 0;
    let completionTokens = 0;

    if (useAristotle) {
      const { projectId, taskId } = await createAristotleProject(`${issueTitle}\n\n${issueBody}`);
      await updateAgentTask(task.id, { state: 'running', aristotle_project_id: projectId });

      try {
        await pollUntilComplete(taskId);
      } catch (aristotleErr) {
        const reason = aristotleErr instanceof AristotleTimeoutError
          ? 'Aristotle timed out — the theorem may be too complex'
          : aristotleErr instanceof AristotleFailedError
            ? 'Aristotle returned FAILED — the proof attempt was unsuccessful'
            : `Aristotle error: ${aristotleErr instanceof Error ? aristotleErr.message : String(aristotleErr)}`;
        await updateAgentTask(task.id, { state: 'failed', completed_at: new Date(), failure_reason: reason });
        await postComment(
          octokit, owner, repoName, issueNumber,
          `ProofFlow Agent — attempt 1/${maxIterations} failed: ${reason}\n\nRFC #${issueNumber} returns to the open queue. To retry: re-apply \`proofflow:start-agent\`.`,
        );
        return;
      }

      const tarBuffer = await downloadResult(projectId);
      leanCode = injectAttribution(extractLeanFromTarball(tarBuffer, taskId), rfc.author_login, issueNumber);
    } else {
      const result = await generateLeanCode(assembled.systemPrompt, assembled.userPrompt);
      leanCode = result.leanCode;
      promptTokens = result.promptTokens;
      completionTokens = result.completionTokens;
    }

    const branchName = `proofflow/rfc-${issueNumber}-attempt-1`;

    const refData = await octokit.rest.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${assembled.defaultBranch}`,
    });
    const baseSha = refData.data.object.sha;

    await octokit.rest.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: assembled.targetFilePath,
      message: `feat: agent formalization attempt 1 for RFC #${issueNumber}`,
      content: Buffer.from(leanCode, 'utf-8').toString('base64'),
      branch: branchName,
    });

    const pr = await octokit.rest.pulls.create({
      owner,
      repo: repoName,
      title: `feat: formalize RFC #${issueNumber} [agent draft]`,
      body: [
        `RFC: #${issueNumber}`,
        '',
        `Agent-generated formalization attempt 1/${maxIterations}.`,
        '',
        '> ⚠️ **Human verification required:** Confirm the Lean theorem statement matches the RFC before merging.',
      ].join('\n'),
      head: branchName,
      base: assembled.defaultBranch,
      draft: true,
    });

    await updateAgentTask(task.id, {
      state: 'running',
      draft_pr_number: pr.data.number,
      branch_name: branchName,
      iteration_count: 1,
    });

    await insertAgentIteration(task.id, 1, leanCode, promptTokens, completionTokens, useAristotle ? 'aristotle' : 'claude');
  } catch (err) {
    await updateAgentTask(task.id, {
      state: 'failed',
      completed_at: new Date(),
      failure_reason: err instanceof Error ? err.message : String(err),
    });
    await postComment(
      octokit, owner, repoName, issueNumber,
      `ProofFlow Agent — setup failed: ${err instanceof Error ? err.message : 'unknown error'}. The task has been cancelled.`,
    );
  }
}

export async function handleCheckRunCompleted(
  octokit: AgentOctokit,
  owner: string,
  repoName: string,
  branchName: string,
  prNumber: number,
  conclusion: string,
  ciOutput: string,
  issueNumber: number,
  rfcBody: string,
  rfcTitle: string,
  rfcAuthorLogin: string,
  targetDirectory: string | undefined,
): Promise<void> {
  const task = await getActiveTaskByDraftPr(prNumber);
  if (!task) return;

  const latestIteration = await getLatestIteration(task.id);
  if (!latestIteration) return;

  await updateAgentIteration(latestIteration.id, {
    ci_output: ciOutput,
    ci_passed: conclusion === 'success',
  });

  if (conclusion === 'success') {
    await updateAgentTask(task.id, { state: 'succeeded', completed_at: new Date() });
    await octokit.rest.pulls.update({ owner, repo: repoName, pull_number: prNumber, draft: false });
    await postComment(
      octokit, owner, repoName, issueNumber,
      `ProofFlow Agent — formalization succeeded! Draft PR #${prNumber} is ready for review. Please verify the theorem statement matches the RFC before merging.`,
    );
    return;
  }

  if (task.iteration_count >= task.max_iterations) {
    await handleFailure(octokit, owner, repoName, issueNumber, prNumber, branchName, task, ciOutput, latestIteration.lean_code);
    return;
  }

  const nextIteration = task.iteration_count + 1;
  const useAristotle = isAristotleConfigured();

  try {
    const assembled = await assembleContext(
      octokit as Parameters<typeof assembleContext>[0],
      owner,
      repoName,
      issueNumber,
      rfcBody,
      rfcTitle,
      rfcAuthorLogin,
      targetDirectory,
      { leanCode: latestIteration.lean_code, ciOutput },
    );

    let leanCode: string;
    let promptTokens = 0;
    let completionTokens = 0;

    if (useAristotle) {
      const { projectId, taskId } = await createAristotleProject(`${rfcTitle}\n\n${rfcBody}`, {
        leanCode: latestIteration.lean_code,
        ciOutput,
      });
      await updateAgentTask(task.id, { iteration_count: nextIteration, aristotle_project_id: projectId });

      try {
        await pollUntilComplete(taskId);
      } catch (aristotleErr) {
        const reason = aristotleErr instanceof AristotleTimeoutError
          ? `Aristotle timed out on attempt ${nextIteration}`
          : aristotleErr instanceof AristotleFailedError
            ? `Aristotle returned FAILED on attempt ${nextIteration}`
            : `Aristotle error on attempt ${nextIteration}: ${aristotleErr instanceof Error ? aristotleErr.message : String(aristotleErr)}`;
        await handleFailure(octokit, owner, repoName, issueNumber, prNumber, branchName, task, reason, latestIteration.lean_code);
        return;
      }

      const tarBuffer = await downloadResult(projectId);
      leanCode = injectAttribution(extractLeanFromTarball(tarBuffer, taskId), rfcAuthorLogin, issueNumber);
    } else {
      await updateAgentTask(task.id, { iteration_count: nextIteration });
      const result = await generateLeanCode(assembled.systemPrompt, assembled.userPrompt);
      leanCode = result.leanCode;
      promptTokens = result.promptTokens;
      completionTokens = result.completionTokens;
    }

    let existingSha: string | undefined;
    try {
      const existing = await octokit.rest.repos.getContent({
        owner, repo: repoName, path: assembled.targetFilePath, ref: branchName,
      });
      const data = existing.data as Record<string, unknown>;
      if (typeof data.sha === 'string') existingSha = data.sha;
    } catch {
      // file doesn't exist yet on this branch
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: assembled.targetFilePath,
      message: `feat: agent formalization attempt ${nextIteration} for RFC #${issueNumber}`,
      content: Buffer.from(leanCode, 'utf-8').toString('base64'),
      branch: branchName,
      sha: existingSha,
    });

    await insertAgentIteration(task.id, nextIteration, leanCode, promptTokens, completionTokens, useAristotle ? 'aristotle' : 'claude');
  } catch (err) {
    await handleFailure(
      octokit, owner, repoName, issueNumber, prNumber, branchName, task,
      err instanceof Error ? err.message : String(err),
      latestIteration.lean_code,
    );
  }
}

async function handleFailure(
  octokit: AgentOctokit,
  owner: string,
  repoName: string,
  issueNumber: number,
  prNumber: number,
  branchName: string,
  task: AgentTask,
  ciOutput: string,
  finalLeanCode: string,
): Promise<void> {
  await updateAgentTask(task.id, {
    state: 'failed',
    completed_at: new Date(),
    failure_reason: ciOutput.slice(0, 2000),
  });

  const errorPreview = ciOutput.trim()
    ? ciOutput.split('\n').slice(0, 30).join('\n')
    : 'No output captured. Check the CI logs on the draft PR for details.';

  const failureComment = [
    `**ProofFlow Agent — Task Failed (${task.iteration_count}/${task.max_iterations} iterations)**`,
    '',
    '**Where it failed:**',
    '```',
    errorPreview,
    '```',
    '',
    `RFC #${issueNumber} returns to the open queue. A human contributor can pick this up.`,
    `Draft PR #${prNumber} has been closed and the branch deleted.`,
    '',
    'To retry: re-apply the `ai-claimable` label and then `proofflow:start-agent`.',
  ].join('\n');

  await postComment(octokit, owner, repoName, issueNumber, failureComment);

  try { await octokit.rest.pulls.update({ owner, repo: repoName, pull_number: prNumber, state: 'closed' }); } catch { /* ignore */ }
  try { await octokit.rest.git.deleteRef({ owner, repo: repoName, ref: `heads/${branchName}` }); } catch { /* ignore */ }
  try { await removeLabelSafe(octokit, owner, repoName, issueNumber, 'ai-claimable'); } catch { /* ignore */ }

  await octokit.rest.issues.addLabels({ owner, repo: repoName, issue_number: issueNumber, labels: ['ai-failed'] }).catch(() => undefined);

  void finalLeanCode; // available in agent_iterations table for post-mortem
}
