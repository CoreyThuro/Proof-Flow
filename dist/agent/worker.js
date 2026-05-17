"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStartAgent = handleStartAgent;
exports.handleCheckRunCompleted = handleCheckRunCompleted;
const agentTasks_1 = require("../db/queries/agentTasks");
const agentIterations_1 = require("../db/queries/agentIterations");
const contextAssembler_1 = require("./contextAssembler");
const claudeClient_1 = require("./claudeClient");
const aristotleClient_1 = require("./aristotleClient");
async function postComment(octokit, owner, repo, issueNumber, body) {
    await octokit.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
}
async function removeLabelSafe(octokit, owner, repo, issueNumber, labelName) {
    try {
        await octokit.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name: labelName });
    }
    catch {
        // label not present — ignore
    }
}
async function handleStartAgent(octokit, repo, rfc, issueNumber, issueTitle, issueBody, config) {
    const owner = repo.github_owner;
    const repoName = repo.github_name;
    const maxIterations = config.maxIterations ?? 3;
    const existing = await (0, agentTasks_1.getActiveTaskByRfcId)(rfc.id);
    if (existing) {
        await removeLabelSafe(octokit, owner, repoName, issueNumber, 'proofflow:start-agent');
        await postComment(octokit, owner, repoName, issueNumber, `An agent task is already running for this RFC (task #${existing.id}). Wait for it to complete before starting a new one.`);
        return;
    }
    const task = await (0, agentTasks_1.insertAgentTask)(rfc.id, repo.id, maxIterations);
    await removeLabelSafe(octokit, owner, repoName, issueNumber, 'proofflow:start-agent');
    await postComment(octokit, owner, repoName, issueNumber, `ProofFlow Agent starting — formalization attempt 1/${maxIterations}. I'll open a draft PR shortly.`);
    const useAristotle = (0, aristotleClient_1.isAristotleConfigured)();
    const mode = useAristotle ? 'statement' : 'full-proof';
    try {
        const assembled = await (0, contextAssembler_1.assembleContext)(octokit, owner, repoName, issueNumber, issueBody, issueTitle, rfc.author_login, config.targetDirectory, undefined, mode);
        const { leanCode: claudeCode, promptTokens, completionTokens } = await (0, claudeClient_1.generateLeanCode)(assembled.systemPrompt, assembled.userPrompt);
        let leanCode = claudeCode;
        if (useAristotle) {
            // Submit code + persist project ID before blocking poll so watchdog can recover
            const aristotleProjectId = await (0, aristotleClient_1.createAristotleProject)(claudeCode);
            await (0, agentTasks_1.updateAgentTask)(task.id, { state: 'running', aristotle_project_id: aristotleProjectId });
            try {
                leanCode = await (0, aristotleClient_1.pollUntilComplete)(aristotleProjectId);
            }
            catch (aristotleErr) {
                const reason = aristotleErr instanceof aristotleClient_1.AristotleTimeoutError
                    ? 'Aristotle timed out — the theorem statement may be too complex or malformed'
                    : aristotleErr instanceof aristotleClient_1.AristotleFailedError
                        ? 'Aristotle returned FAILED — the theorem statement could not be proved as written'
                        : `Aristotle error: ${aristotleErr instanceof Error ? aristotleErr.message : String(aristotleErr)}`;
                await (0, agentTasks_1.updateAgentTask)(task.id, { state: 'failed', completed_at: new Date(), failure_reason: reason });
                await postComment(octokit, owner, repoName, issueNumber, `ProofFlow Agent — attempt 1/${maxIterations} failed: ${reason}\n\nRFC #${issueNumber} returns to the open queue. To retry: re-apply \`proofflow:start-agent\`.`);
                return;
            }
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
        await (0, agentTasks_1.updateAgentTask)(task.id, {
            state: 'running',
            draft_pr_number: pr.data.number,
            branch_name: branchName,
            iteration_count: 1,
        });
        await (0, agentIterations_1.insertAgentIteration)(task.id, 1, leanCode, promptTokens, completionTokens, useAristotle ? 'aristotle' : 'claude');
    }
    catch (err) {
        await (0, agentTasks_1.updateAgentTask)(task.id, {
            state: 'failed',
            completed_at: new Date(),
            failure_reason: err instanceof Error ? err.message : String(err),
        });
        await postComment(octokit, owner, repoName, issueNumber, `ProofFlow Agent — setup failed: ${err instanceof Error ? err.message : 'unknown error'}. The task has been cancelled.`);
    }
}
async function handleCheckRunCompleted(octokit, owner, repoName, branchName, prNumber, conclusion, ciOutput, issueNumber, rfcBody, rfcTitle, rfcAuthorLogin, targetDirectory) {
    const task = await (0, agentTasks_1.getActiveTaskByDraftPr)(prNumber);
    if (!task)
        return;
    const latestIteration = await (0, agentIterations_1.getLatestIteration)(task.id);
    if (!latestIteration)
        return;
    await (0, agentIterations_1.updateAgentIteration)(latestIteration.id, {
        ci_output: ciOutput,
        ci_passed: conclusion === 'success',
    });
    if (conclusion === 'success') {
        await (0, agentTasks_1.updateAgentTask)(task.id, { state: 'succeeded', completed_at: new Date() });
        await octokit.rest.pulls.update({ owner, repo: repoName, pull_number: prNumber, draft: false });
        await postComment(octokit, owner, repoName, issueNumber, `ProofFlow Agent — formalization succeeded! Draft PR #${prNumber} is ready for review. Please verify the theorem statement matches the RFC before merging.`);
        return;
    }
    if (task.iteration_count >= task.max_iterations) {
        await handleFailure(octokit, owner, repoName, issueNumber, prNumber, branchName, task, ciOutput, latestIteration.lean_code);
        return;
    }
    const nextIteration = task.iteration_count + 1;
    const useAristotle = (0, aristotleClient_1.isAristotleConfigured)();
    const mode = useAristotle ? 'statement' : 'full-proof';
    try {
        const assembled = await (0, contextAssembler_1.assembleContext)(octokit, owner, repoName, issueNumber, rfcBody, rfcTitle, rfcAuthorLogin, targetDirectory, { leanCode: latestIteration.lean_code, ciOutput }, mode);
        const { leanCode: claudeCode, promptTokens, completionTokens } = await (0, claudeClient_1.generateLeanCode)(assembled.systemPrompt, assembled.userPrompt);
        let leanCode = claudeCode;
        if (useAristotle) {
            const aristotleProjectId = await (0, aristotleClient_1.createAristotleProject)(claudeCode);
            await (0, agentTasks_1.updateAgentTask)(task.id, { iteration_count: nextIteration, aristotle_project_id: aristotleProjectId });
            try {
                leanCode = await (0, aristotleClient_1.pollUntilComplete)(aristotleProjectId);
            }
            catch (aristotleErr) {
                const reason = aristotleErr instanceof aristotleClient_1.AristotleTimeoutError
                    ? `Aristotle timed out on attempt ${nextIteration}`
                    : aristotleErr instanceof aristotleClient_1.AristotleFailedError
                        ? `Aristotle returned FAILED on attempt ${nextIteration} — statement could not be proved as written`
                        : `Aristotle error on attempt ${nextIteration}: ${aristotleErr instanceof Error ? aristotleErr.message : String(aristotleErr)}`;
                await handleFailure(octokit, owner, repoName, issueNumber, prNumber, branchName, task, reason, latestIteration.lean_code);
                return;
            }
        }
        else {
            await (0, agentTasks_1.updateAgentTask)(task.id, { iteration_count: nextIteration });
        }
        let existingSha;
        try {
            const existing = await octokit.rest.repos.getContent({
                owner, repo: repoName, path: assembled.targetFilePath, ref: branchName,
            });
            const data = existing.data;
            if (typeof data.sha === 'string')
                existingSha = data.sha;
        }
        catch {
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
        await (0, agentIterations_1.insertAgentIteration)(task.id, nextIteration, leanCode, promptTokens, completionTokens, useAristotle ? 'aristotle' : 'claude');
    }
    catch (err) {
        await handleFailure(octokit, owner, repoName, issueNumber, prNumber, branchName, task, err instanceof Error ? err.message : String(err), latestIteration.lean_code);
    }
}
async function handleFailure(octokit, owner, repoName, issueNumber, prNumber, branchName, task, ciOutput, finalLeanCode) {
    await (0, agentTasks_1.updateAgentTask)(task.id, {
        state: 'failed',
        completed_at: new Date(),
        failure_reason: ciOutput.slice(0, 2000),
    });
    const errorPreview = ciOutput.split('\n').slice(0, 30).join('\n');
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
    try {
        await octokit.rest.pulls.update({ owner, repo: repoName, pull_number: prNumber, state: 'closed' });
    }
    catch { /* ignore */ }
    try {
        await octokit.rest.git.deleteRef({ owner, repo: repoName, ref: `heads/${branchName}` });
    }
    catch { /* ignore */ }
    try {
        await removeLabelSafe(octokit, owner, repoName, issueNumber, 'ai-claimable');
    }
    catch { /* ignore */ }
    await octokit.rest.issues.addLabels({ owner, repo: repoName, issue_number: issueNumber, labels: ['ai-failed'] }).catch(() => undefined);
    void finalLeanCode; // available in agent_iterations table for post-mortem
}
//# sourceMappingURL=worker.js.map