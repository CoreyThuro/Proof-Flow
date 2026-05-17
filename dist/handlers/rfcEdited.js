"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRfcEdited = handleRfcEdited;
const repos_1 = require("../db/queries/repos");
const rfcs_1 = require("../db/queries/rfcs");
const bodyParser_1 = require("../rfc/bodyParser");
const bootstrap_1 = require("../rfc/bootstrap");
const comments_1 = require("../rfc/comments");
const parser_1 = require("../config/parser");
async function handleRfcEdited(context) {
    const labels = context.payload.issue.labels ?? [];
    const hasRfcLabel = labels.some((l) => l.name === 'proofflow-rfc');
    if (!hasRfcLabel) {
        return;
    }
    const repo = await (0, repos_1.getRepoByGithubId)(context.payload.repository.id);
    if (!repo) {
        return;
    }
    const config = { ...parser_1.DEFAULT_CONFIG, ...(repo.config_json ?? {}) };
    const issue = context.payload.issue;
    const parseResult = (0, bodyParser_1.parseRfcBody)(issue.body ?? '');
    const existing = await (0, rfcs_1.getRfcByIssueNumber)(repo.id, issue.number);
    if (!existing) {
        if (parseResult.valid) {
            // RFC not yet registered but body is now complete — bootstrap it.
            // Cast is safe: both events share the same issue/repository/octokit shape.
            await (0, bootstrap_1.bootstrapRfc)(context, repo, parseResult, config);
        }
        else {
            await (0, comments_1.postIncompleteComment)(context, parseResult.missingFields);
        }
        return;
    }
    // RFC exists — only re-validate while it's still open.
    if (existing.state !== 'open') {
        return;
    }
    await (0, comments_1.updateWelcomeComment)(context, existing, parseResult);
}
//# sourceMappingURL=rfcEdited.js.map