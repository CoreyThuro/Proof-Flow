"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrFiles = getPrFiles;
async function getPrFiles(octokit, owner, repo, prNumber) {
    const response = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
    });
    return response.data.map((f) => ({
        filename: f.filename,
        additions: f.additions,
        patch: f.patch,
    }));
}
//# sourceMappingURL=diffFetcher.js.map