"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHECK_RUN_NAME = void 0;
exports.createCheckRun = createCheckRun;
exports.updateCheckRun = updateCheckRun;
exports.CHECK_RUN_NAME = 'proofflow/rfc-check';
async function createCheckRun(octokit, params) {
    const response = await octokit.rest.checks.create({
        owner: params.owner,
        repo: params.repo,
        name: exports.CHECK_RUN_NAME,
        head_sha: params.sha,
        status: params.status,
        conclusion: params.conclusion,
        output: {
            title: params.title,
            summary: params.summary,
            text: params.details,
        },
    });
    return response.data.id;
}
async function updateCheckRun(octokit, checkRunId, params) {
    await octokit.rest.checks.update({
        owner: params.owner,
        repo: params.repo,
        check_run_id: checkRunId,
        status: params.status,
        conclusion: params.conclusion,
        output: {
            title: params.title,
            summary: params.summary,
            text: params.details,
        },
    });
}
//# sourceMappingURL=runner.js.map