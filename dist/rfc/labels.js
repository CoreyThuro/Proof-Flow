"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LABEL_RFC_ABANDONED = exports.LABEL_RFC_APPROVED = exports.LABEL_RFC_OPEN = void 0;
exports.ensureLabel = ensureLabel;
exports.applyLabel = applyLabel;
exports.applyLabelWithOctokit = applyLabelWithOctokit;
exports.removeLabel = removeLabel;
exports.LABEL_RFC_OPEN = { name: 'rfc:open', color: '0075ca' };
exports.LABEL_RFC_APPROVED = { name: 'rfc:approved', color: '2ea44f' };
exports.LABEL_RFC_ABANDONED = { name: 'rfc:abandoned', color: 'e4e669' };
async function ensureLabel(octokit, owner, repo, name, color) {
    try {
        await octokit.rest.issues.getLabel({ owner, repo, name });
    }
    catch (err) {
        if (isHttpError(err) && err.status === 404) {
            await octokit.rest.issues.createLabel({ owner, repo, name, color });
        }
        else {
            throw err;
        }
    }
}
async function applyLabel(context, owner, repo, issueNumber, labelName, labelColor) {
    await ensureLabel(context.octokit, owner, repo, labelName, labelColor);
    await context.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels: [labelName],
    });
}
async function applyLabelWithOctokit(octokit, owner, repo, issueNumber, labelName, labelColor) {
    await ensureLabel(octokit, owner, repo, labelName, labelColor);
    await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels: [labelName],
    });
}
async function removeLabel(octokit, owner, repo, issueNumber, labelName) {
    try {
        await octokit.rest.issues.removeLabel({
            owner,
            repo,
            issue_number: issueNumber,
            name: labelName,
        });
    }
    catch (err) {
        if (!isHttpError(err) || err.status !== 404) {
            throw err;
        }
    }
}
function isHttpError(err) {
    return typeof err === 'object' && err !== null && 'status' in err;
}
//# sourceMappingURL=labels.js.map