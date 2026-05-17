"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapRfc = bootstrapRfc;
const rfcs_1 = require("../db/queries/rfcs");
const stateLog_1 = require("./stateLog");
const labels_1 = require("./labels");
const comments_1 = require("./comments");
const snapshot_1 = require("../dashboard/snapshot");
async function bootstrapRfc(context, repo, parseResult, config) {
    const issue = context.payload.issue;
    const existing = await (0, rfcs_1.getRfcByIssueNumber)(repo.id, issue.number);
    if (existing) {
        await (0, comments_1.updateWelcomeComment)(context, existing, parseResult);
        return;
    }
    if (!parseResult.valid) {
        await (0, comments_1.postIncompleteComment)(context, parseResult.missingFields);
        return;
    }
    const authorLogin = issue.user?.login ?? 'unknown';
    const abandonAfter = new Date(Date.now() + config.rfcAbandonDays * 24 * 60 * 60 * 1000);
    const rfc = await (0, rfcs_1.insertRfc)(repo.id, issue.number, authorLogin, 'open', abandonAfter);
    await (0, stateLog_1.logTransition)(rfc.id, null, 'open', authorLogin, 'RFC created');
    await (0, labels_1.applyLabel)(context, context.payload.repository.owner.login, context.payload.repository.name, issue.number, labels_1.LABEL_RFC_OPEN.name, labels_1.LABEL_RFC_OPEN.color);
    const requiredApprovals = config.seniorContributors.length >= 2 ? 2 : config.seniorContributors.length;
    await (0, comments_1.postWelcomeComment)(context, rfc.id, 0, requiredApprovals);
    await (0, snapshot_1.buildDashboardSnapshot)(repo.id);
}
//# sourceMappingURL=bootstrap.js.map