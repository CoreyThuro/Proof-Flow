"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIssueCommentCreated = handleIssueCommentCreated;
const repos_1 = require("../db/queries/repos");
const rfcs_1 = require("../db/queries/rfcs");
const lgtmProcessor_1 = require("../rfc/lgtmProcessor");
async function handleIssueCommentCreated(context) {
    const repo = await (0, repos_1.getRepoByGithubId)(context.payload.repository.id);
    if (!repo)
        return;
    const rfc = await (0, rfcs_1.getRfcByIssueNumber)(repo.id, context.payload.issue.number);
    if (!rfc)
        return;
    if (rfc.state !== 'open')
        return;
    await (0, lgtmProcessor_1.lgtmProcessor)(context, repo, rfc);
}
//# sourceMappingURL=issueCommentCreated.js.map