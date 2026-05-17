"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePullRequestClosed = handlePullRequestClosed;
const repos_1 = require("../db/queries/repos");
const rfcPrLinks_1 = require("../db/queries/rfcPrLinks");
const bot_1 = require("../attribution/bot");
async function handlePullRequestClosed(context) {
    const repo = await (0, repos_1.getRepoByGithubId)(context.payload.repository.id);
    if (!repo)
        return;
    const pr = context.payload.pull_request;
    const state = pr.merged ? 'merged' : 'closed';
    await (0, rfcPrLinks_1.updatePrState)(repo.id, pr.number, state);
    if (pr.merged) {
        await (0, bot_1.runAttributionBot)(context, repo, {
            number: pr.number,
            body: pr.body,
            user: { login: pr.user.login },
            merge_commit_sha: pr.merge_commit_sha ?? null,
        });
    }
}
//# sourceMappingURL=pullRequestClosed.js.map