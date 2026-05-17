"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCheckRunCompletedEvent = handleCheckRunCompletedEvent;
const repos_1 = require("../db/queries/repos");
const rfcs_1 = require("../db/queries/rfcs");
const agentTasks_1 = require("../db/queries/agentTasks");
const worker_1 = require("../agent/worker");
const parser_1 = require("../config/parser");
const PROOFFLOW_CHECK_NAMES = new Set(['proofflow/rfc-check', 'proofflow-rfc-check']);
async function handleCheckRunCompletedEvent(context) {
    const checkRun = context.payload.check_run;
    const branchName = checkRun.check_suite?.head_branch;
    if (!branchName?.startsWith('proofflow/rfc-'))
        return;
    // Don't react to ProofFlow's own attribution/validation check — only to CI (Lean build) checks
    if (PROOFFLOW_CHECK_NAMES.has(checkRun.name))
        return;
    const repo = await (0, repos_1.getRepoByGithubId)(context.payload.repository.id);
    if (!repo)
        return;
    // GitHub doesn't always populate pull_requests for draft PRs; fall back to branch name lookup
    const webhookPrNumber = checkRun.pull_requests?.[0]?.number;
    const task = webhookPrNumber
        ? await (0, agentTasks_1.getActiveTaskByDraftPr)(webhookPrNumber)
        : await (0, agentTasks_1.getActiveTaskByBranchName)(branchName);
    if (!task)
        return;
    // draft_pr_number is set once the PR is opened; required to proceed
    if (!task.draft_pr_number)
        return;
    const prNumber = task.draft_pr_number;
    const rfc = await (0, rfcs_1.getRfcById)(task.rfc_id);
    if (!rfc)
        return;
    const config = {
        ...parser_1.DEFAULT_CONFIG,
        ...(repo.config_json ?? {}),
    };
    const octokit = context.octokit;
    const owner = repo.github_owner;
    const repoName = repo.github_name;
    const issueData = await octokit.rest.issues.get({
        owner,
        repo: repoName,
        issue_number: rfc.github_issue_number,
    });
    const conclusion = checkRun.conclusion ?? 'failure';
    const ciOutput = checkRun.output?.text ?? checkRun.output?.summary ?? '';
    await (0, worker_1.handleCheckRunCompleted)(octokit, owner, repoName, branchName, prNumber, conclusion, ciOutput, rfc.github_issue_number, issueData.data.body ?? '', issueData.data.title, rfc.author_login, config.aiAgent?.targetDirectory);
}
//# sourceMappingURL=checkRunCompleted.js.map