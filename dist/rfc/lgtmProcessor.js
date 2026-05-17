"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lgtmProcessor = lgtmProcessor;
const rfcApprovals_1 = require("../db/queries/rfcApprovals");
const parser_1 = require("../config/parser");
const lgtmDetector_1 = require("./lgtmDetector");
const transitions_1 = require("./transitions");
async function lgtmProcessor(context, repo, rfc) {
    const config = {
        ...parser_1.DEFAULT_CONFIG,
        ...(repo.config_json ?? {}),
    };
    const commenterLogin = context.payload.comment.user.login;
    if (!(0, lgtmDetector_1.isLgtmComment)(context.payload.comment.body, commenterLogin, config)) {
        return;
    }
    const existing = await (0, rfcApprovals_1.getRfcApproval)(rfc.id, commenterLogin);
    if (existing) {
        await context.octokit.rest.issues.createComment({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            issue_number: context.payload.issue.number,
            body: 'Your LGTM was already recorded.',
        });
        return;
    }
    await (0, rfcApprovals_1.insertRfcApproval)(rfc.id, commenterLogin, context.payload.comment.id);
    const count = await (0, rfcApprovals_1.getRfcApprovalCount)(rfc.id);
    const requiredApprovals = config.seniorContributors.length >= 2 ? 2 : config.seniorContributors.length;
    if (count >= requiredApprovals) {
        await (0, transitions_1.transitionToApproved)(context, repo, rfc, commenterLogin, requiredApprovals);
    }
    else {
        const remaining = requiredApprovals - count;
        await context.octokit.rest.issues.createComment({
            owner: context.payload.repository.owner.login,
            repo: context.payload.repository.name,
            issue_number: context.payload.issue.number,
            body: `LGTM recorded (${count}/${requiredApprovals}). ${remaining} more needed.`,
        });
    }
}
//# sourceMappingURL=lgtmProcessor.js.map