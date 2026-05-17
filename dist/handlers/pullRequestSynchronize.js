"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePullRequestSynchronize = handlePullRequestSynchronize;
const repos_1 = require("../db/queries/repos");
const rfcCheck_1 = require("../checks/rfcCheck");
async function handlePullRequestSynchronize(context) {
    const repo = await (0, repos_1.getRepoByGithubId)(context.payload.repository.id);
    if (!repo)
        return;
    const pr = context.payload.pull_request;
    await (0, rfcCheck_1.runRfcCheck)(context.octokit, repo, pr.number, pr.body ?? null, pr.head.sha);
}
//# sourceMappingURL=pullRequestSynchronize.js.map