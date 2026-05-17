"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRfcCheck = runRfcCheck;
exports.triggerCheckUpdates = triggerCheckUpdates;
const rfcs_1 = require("../db/queries/rfcs");
const rfcPrLinks_1 = require("../db/queries/rfcPrLinks");
const parser_1 = require("../config/parser");
const prParser_1 = require("./prParser");
const thresholdCheck_1 = require("./thresholdCheck");
const runner_1 = require("./runner");
const diffFetcher_1 = require("./diffFetcher");
const attributionDetector_1 = require("./attributionDetector");
const messages_1 = require("./messages");
async function runRfcCheck(octokit, repo, prNumber, prBody, prSha, existingCheckRunId) {
    const owner = repo.github_owner;
    const repoName = repo.github_name;
    const config = {
        ...parser_1.DEFAULT_CONFIG,
        ...(repo.config_json ?? {}),
    };
    const files = await (0, diffFetcher_1.getPrFiles)(octokit, owner, repoName, prNumber);
    const leanFiles = files.filter((f) => f.filename.endsWith('.lean'));
    const postResult = async (conclusion, title, summary, details) => {
        const params = {
            owner,
            repo: repoName,
            sha: prSha,
            status: 'completed',
            conclusion,
            title,
            summary,
            details,
        };
        if (existingCheckRunId) {
            await (0, runner_1.updateCheckRun)(octokit, existingCheckRunId, params);
            return existingCheckRunId;
        }
        return (0, runner_1.createCheckRun)(octokit, params);
    };
    if (leanFiles.length === 0) {
        await postResult('success', 'No .lean files changed', 'No Lean files were modified in this PR.');
        return;
    }
    const rfcRefs = (0, prParser_1.parsePrRfcRefs)(prBody ?? '');
    if (rfcRefs.length === 0) {
        if ((0, thresholdCheck_1.isBelowThreshold)(leanFiles.map((f) => f.filename), config)) {
            const msg = (0, messages_1.buildCheckMessage)('below_threshold_warning');
            await postResult('success', msg.title, msg.summary, msg.details);
        }
        else {
            const msg = (0, messages_1.buildCheckMessage)('no_rfc_linked');
            await postResult('failure', msg.title, msg.summary, msg.details);
        }
        return;
    }
    const rfcs = [];
    const unapprovedNums = [];
    for (const issueNumber of rfcRefs) {
        const rfc = await (0, rfcs_1.getRfcByIssueNumber)(repo.id, issueNumber);
        if (!rfc || rfc.state !== 'approved') {
            unapprovedNums.push(issueNumber);
        }
        else {
            rfcs.push(rfc);
        }
    }
    if (unapprovedNums.length > 0) {
        const msg = (0, messages_1.buildCheckMessage)('rfc_not_approved', { rfcNumbers: unapprovedNums });
        await postResult('failure', msg.title, msg.summary, msg.details);
        return;
    }
    const missingAttributionFiles = [];
    for (const file of leanFiles) {
        if (!file.patch || !(0, attributionDetector_1.hasAttributionDocstring)(file.patch)) {
            missingAttributionFiles.push(file.filename);
        }
    }
    if (missingAttributionFiles.length > 0) {
        const primaryRfc = rfcs[0];
        const template = primaryRfc
            ? (0, attributionDetector_1.getAttributionTemplate)(primaryRfc.author_login, primaryRfc.github_issue_number)
            : '';
        const msg = (0, messages_1.buildCheckMessage)('attribution_missing', {
            missingAttributionFiles,
            template,
        });
        await postResult('failure', msg.title, msg.summary, msg.details);
        return;
    }
    const rfcNums = rfcs.map((r) => r.github_issue_number);
    const successSummary = `RFC(s) ${rfcNums.map((n) => `#${n}`).join(', ')} approved. Attribution present.`;
    const checkRunId = await postResult('success', 'RFC approved and attribution present', successSummary);
    for (const rfc of rfcs) {
        await (0, rfcPrLinks_1.upsertRfcPrLink)(rfc.id, repo.id, prNumber, checkRunId);
    }
}
async function triggerCheckUpdates(context, repo, rfc) {
    const openLinks = await (0, rfcPrLinks_1.getOpenRfcPrLinks)(rfc.id);
    if (openLinks.length === 0)
        return;
    const octokit = context.octokit;
    const owner = repo.github_owner;
    const repoName = repo.github_name;
    for (const link of openLinks) {
        try {
            const prResponse = await octokit.rest.pulls.get({
                owner,
                repo: repoName,
                pull_number: link.pr_number,
            });
            const pr = prResponse.data;
            if (pr.state !== 'open')
                continue;
            const existingCheckRunId = link.check_run_id ? Number(link.check_run_id) : undefined;
            await runRfcCheck(octokit, repo, link.pr_number, pr.body, pr.head.sha, existingCheckRunId);
        }
        catch (err) {
            context.log.error({ prNumber: link.pr_number, err }, 'Failed to update check run for PR');
        }
    }
}
//# sourceMappingURL=rfcCheck.js.map