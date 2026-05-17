"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAttributionBot = runAttributionBot;
const rfcs_1 = require("../db/queries/rfcs");
const rfcAttributions_1 = require("../db/queries/rfcAttributions");
const stateLog_1 = require("../rfc/stateLog");
const snapshot_1 = require("../dashboard/snapshot");
const prParser_1 = require("../checks/prParser");
const diffFetcher_1 = require("../checks/diffFetcher");
async function runAttributionBot(context, repo, pr) {
    const owner = repo.github_owner;
    const repoName = repo.github_name;
    const octokit = context.octokit;
    const rfcRefs = (0, prParser_1.parsePrRfcRefs)(pr.body ?? '');
    if (rfcRefs.length === 0)
        return;
    const files = await (0, diffFetcher_1.getPrFiles)(octokit, owner, repoName, pr.number);
    const leanFiles = files.filter((f) => f.filename.endsWith('.lean'));
    const commitUrl = pr.merge_commit_sha
        ? `https://github.com/${owner}/${repoName}/commit/${pr.merge_commit_sha}`
        : `https://github.com/${owner}/${repoName}/pull/${pr.number}`;
    for (const issueNumber of rfcRefs) {
        const rfc = await (0, rfcs_1.getRfcByIssueNumber)(repo.id, issueNumber);
        if (!rfc || (rfc.state !== 'approved' && rfc.state !== 'in_progress'))
            continue;
        for (const file of leanFiles) {
            await (0, rfcAttributions_1.insertRfcAttribution)(rfc.id, pr.number, file.filename);
        }
        await octokit.rest.issues.createComment({
            owner,
            repo: repoName,
            issue_number: issueNumber,
            body: `Formalization merged in PR #${pr.number} by @${pr.user.login}. ` +
                `Proof strategy credited to @${rfc.author_login}. ` +
                `[View commit](${commitUrl})`,
        });
        await (0, rfcs_1.updateRfcState)(rfc.id, 'closed', new Date());
        await (0, stateLog_1.logTransition)(rfc.id, rfc.state, 'closed', pr.user.login, 'formalization merged');
        await octokit.rest.issues.update({
            owner,
            repo: repoName,
            issue_number: issueNumber,
            state: 'closed',
            state_reason: 'completed',
        });
    }
    await (0, snapshot_1.buildDashboardSnapshot)(repo.id);
}
//# sourceMappingURL=bot.js.map