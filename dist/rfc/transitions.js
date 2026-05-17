"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionToApproved = transitionToApproved;
exports.transitionToAbandoned = transitionToAbandoned;
exports.transitionToOpen = transitionToOpen;
const rfcs_1 = require("../db/queries/rfcs");
const repos_1 = require("../db/queries/repos");
const stateLog_1 = require("./stateLog");
const labels_1 = require("./labels");
const parser_1 = require("../config/parser");
const rfcCheck_1 = require("../checks/rfcCheck");
const snapshot_1 = require("../dashboard/snapshot");
async function transitionToApproved(context, repo, rfc, actorLogin, requiredApprovals) {
    await (0, rfcs_1.updateRfcState)(rfc.id, 'approved', new Date());
    await (0, stateLog_1.logTransition)(rfc.id, 'open', 'approved', actorLogin, 'Required LGTMs received');
    const { repository } = context.payload;
    const owner = repository.owner.login;
    const repoName = repository.name;
    const issueNumber = context.payload.issue.number;
    const octokit = context.octokit;
    await (0, labels_1.removeLabel)(octokit, owner, repoName, issueNumber, labels_1.LABEL_RFC_OPEN.name);
    await (0, labels_1.applyLabelWithOctokit)(octokit, owner, repoName, issueNumber, labels_1.LABEL_RFC_APPROVED.name, labels_1.LABEL_RFC_APPROVED.color);
    await context.octokit.rest.issues.createComment({
        owner,
        repo: repoName,
        issue_number: issueNumber,
        body: `RFC approved (${requiredApprovals}/${requiredApprovals} LGTMs). ` +
            `Ready for formalization. @${rfc.author_login} — your strategy has been accepted.`,
    });
    await (0, rfcCheck_1.triggerCheckUpdates)(context, repo, rfc);
    await (0, snapshot_1.buildDashboardSnapshot)(repo.id);
}
async function transitionToAbandoned(rfcId, robot) {
    const rfc = await (0, rfcs_1.getRfcById)(rfcId);
    if (!rfc)
        return;
    const repo = await (0, repos_1.getRepoById)(rfc.repo_id);
    if (!repo || repo.installation_id == null)
        return;
    await (0, rfcs_1.updateRfcState)(rfcId, 'abandoned', new Date());
    await (0, stateLog_1.logTransition)(rfcId, 'open', 'abandoned', null, 'timeout');
    const octokit = await robot.auth(Number(repo.installation_id));
    const labelOctokit = octokit;
    await (0, labels_1.removeLabel)(labelOctokit, repo.github_owner, repo.github_name, rfc.github_issue_number, labels_1.LABEL_RFC_OPEN.name);
    await (0, labels_1.applyLabelWithOctokit)(labelOctokit, repo.github_owner, repo.github_name, rfc.github_issue_number, labels_1.LABEL_RFC_ABANDONED.name, labels_1.LABEL_RFC_ABANDONED.color);
    const config = {
        ...parser_1.DEFAULT_CONFIG,
        ...(repo.config_json ?? {}),
    };
    await octokit.rest.issues.createComment({
        owner: repo.github_owner,
        repo: repo.github_name,
        issue_number: rfc.github_issue_number,
        body: `This RFC has been marked abandoned — no approval after ${config.rfcAbandonDays} days. ` +
            `Reopen the issue to restart the review clock.`,
    });
    await (0, snapshot_1.buildDashboardSnapshot)(repo.id);
}
async function transitionToOpen(octokit, repo, rfc, actorLogin, requiredApprovals, rfcAbandonDays) {
    const abandonAfter = new Date(Date.now() + rfcAbandonDays * 24 * 60 * 60 * 1000);
    await (0, rfcs_1.updateRfcState)(rfc.id, 'open', new Date(), abandonAfter);
    await (0, stateLog_1.logTransition)(rfc.id, 'abandoned', 'open', actorLogin, 're-opened');
    await (0, labels_1.removeLabel)(octokit, repo.github_owner, repo.github_name, rfc.github_issue_number, labels_1.LABEL_RFC_ABANDONED.name);
    await (0, labels_1.applyLabelWithOctokit)(octokit, repo.github_owner, repo.github_name, rfc.github_issue_number, labels_1.LABEL_RFC_OPEN.name, labels_1.LABEL_RFC_OPEN.color);
    await octokit.rest.issues.createComment({
        owner: repo.github_owner,
        repo: repo.github_name,
        issue_number: rfc.github_issue_number,
        body: `RFC re-opened. Review clock reset (${rfcAbandonDays} days). ` +
            `0/${requiredApprovals} LGTMs.`,
    });
    await (0, snapshot_1.buildDashboardSnapshot)(repo.id);
}
//# sourceMappingURL=transitions.js.map