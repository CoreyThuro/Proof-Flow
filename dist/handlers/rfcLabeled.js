"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRfcLabeled = handleRfcLabeled;
const repos_1 = require("../db/queries/repos");
const rfcs_1 = require("../db/queries/rfcs");
const bodyParser_1 = require("../rfc/bodyParser");
const bootstrap_1 = require("../rfc/bootstrap");
const parser_1 = require("../config/parser");
const worker_1 = require("../agent/worker");
async function handleRfcLabeled(context) {
    const labelName = context.payload.label?.name;
    const repo = await (0, repos_1.getRepoByGithubId)(context.payload.repository.id);
    if (!repo) {
        context.log.warn({ repoId: context.payload.repository.id }, 'Received issues.labeled for unregistered repo — skipping');
        return;
    }
    const config = { ...parser_1.DEFAULT_CONFIG, ...(repo.config_json ?? {}) };
    const issue = context.payload.issue;
    const owner = context.payload.repository.owner.login;
    const repoName = context.payload.repository.name;
    const octokit = context.octokit;
    if (labelName === 'proofflow-rfc') {
        const body = issue.body ?? '';
        const parseResult = (0, bodyParser_1.parseRfcBody)(body);
        await (0, bootstrap_1.bootstrapRfc)(context, repo, parseResult, config);
        return;
    }
    if (labelName === 'ai-claimable') {
        const rfc = await (0, rfcs_1.getRfcByIssueNumber)(repo.id, issue.number);
        const reasons = [];
        if (!rfc)
            reasons.push('no ProofFlow RFC exists for this issue');
        else if (rfc.state !== 'approved')
            reasons.push(`RFC is in state \`${rfc.state}\` — must be \`approved\``);
        if (!config.aiAgent?.enabled)
            reasons.push('`aiAgent.enabled` is not set to `true` in `.proofflow.yml`');
        if (!config.aiAgent?.costModel)
            reasons.push('`aiAgent.cost_model` is not set in `.proofflow.yml`');
        if (reasons.length > 0) {
            await octokit.rest.issues.removeLabel({ owner, repo: repoName, issue_number: issue.number, name: 'ai-claimable' }).catch(() => undefined);
            await octokit.rest.issues.createComment({
                owner, repo: repoName, issue_number: issue.number,
                body: `Cannot mark as \`ai-claimable\`:\n${reasons.map((r) => `- ${r}`).join('\n')}`,
            });
            return;
        }
        await octokit.rest.issues.createComment({
            owner, repo: repoName, issue_number: issue.number,
            body: `RFC marked as \`ai-claimable\`. Apply the \`proofflow:start-agent\` label to this issue when you're ready to start the agent.`,
        });
        return;
    }
    if (labelName === 'proofflow:start-agent') {
        const rfc = await (0, rfcs_1.getRfcByIssueNumber)(repo.id, issue.number);
        const issueLabels = (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
        const reasons = [];
        if (!rfc)
            reasons.push('no ProofFlow RFC exists for this issue');
        else if (rfc.state !== 'approved')
            reasons.push(`RFC is in state \`${rfc.state}\` — must be \`approved\``);
        if (!issueLabels.includes('ai-claimable'))
            reasons.push('`ai-claimable` label is not present on this issue');
        if (!config.aiAgent?.enabled)
            reasons.push('`aiAgent.enabled` is not set in `.proofflow.yml`');
        if (!config.aiAgent?.costModel)
            reasons.push('`aiAgent.cost_model` is not set in `.proofflow.yml`');
        if (reasons.length > 0 || !rfc || !config.aiAgent) {
            await octokit.rest.issues.removeLabel({ owner, repo: repoName, issue_number: issue.number, name: 'proofflow:start-agent' }).catch(() => undefined);
            await octokit.rest.issues.createComment({
                owner, repo: repoName, issue_number: issue.number,
                body: `Cannot start agent:\n${reasons.map((r) => `- ${r}`).join('\n')}`,
            });
            return;
        }
        await (0, worker_1.handleStartAgent)(octokit, repo, rfc, issue.number, issue.title, issue.body ?? '', config.aiAgent);
        return;
    }
}
//# sourceMappingURL=rfcLabeled.js.map