"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIssueReopened = handleIssueReopened;
const repos_1 = require("../db/queries/repos");
const rfcs_1 = require("../db/queries/rfcs");
const rfcApprovals_1 = require("../db/queries/rfcApprovals");
const parser_1 = require("../config/parser");
const transitions_1 = require("../rfc/transitions");
async function handleIssueReopened(context) {
    const repo = await (0, repos_1.getRepoByGithubId)(context.payload.repository.id);
    if (!repo)
        return;
    const rfc = await (0, rfcs_1.getRfcByIssueNumber)(repo.id, context.payload.issue.number);
    if (!rfc)
        return;
    if (rfc.state !== 'abandoned')
        return;
    const config = {
        ...parser_1.DEFAULT_CONFIG,
        ...(repo.config_json ?? {}),
    };
    const requiredApprovals = config.seniorContributors.length >= 2 ? 2 : config.seniorContributors.length;
    await (0, rfcApprovals_1.deleteRfcApprovals)(rfc.id);
    const actorLogin = context.payload.sender.login;
    const octokit = context.octokit;
    await (0, transitions_1.transitionToOpen)(octokit, repo, rfc, actorLogin, requiredApprovals, config.rfcAbandonDays);
}
//# sourceMappingURL=issueReopened.js.map