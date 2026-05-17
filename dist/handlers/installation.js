"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInstallation = handleInstallation;
const repos_1 = require("../db/queries/repos");
const parser_1 = require("../config/parser");
function getRepos(context) {
    const payload = context.payload;
    if ('repositories' in payload && Array.isArray(payload.repositories)) {
        return payload.repositories;
    }
    if ('repositories_added' in payload && Array.isArray(payload.repositories_added)) {
        return payload.repositories_added;
    }
    return [];
}
async function handleInstallation(context) {
    const repos = getRepos(context);
    const owner = context.payload.installation.account.login;
    for (const repo of repos) {
        try {
            const [, repoName] = repo.full_name.split('/');
            const name = repoName ?? repo.name;
            await (0, repos_1.insertRepo)(repo.id, owner, name);
            const row = await (0, repos_1.getRepoByGithubId)(repo.id);
            if (!row) {
                context.log.error({ repo: repo.full_name }, 'Repo not found after insert');
                continue;
            }
            await (0, repos_1.updateRepoInstallationId)(row.id, context.payload.installation.id);
            const config = await (0, parser_1.fetchAndParseConfig)(context.octokit, owner, name);
            await (0, repos_1.updateRepoConfig)(row.id, config);
            context.log.info({ repo: repo.full_name }, 'Repo registered and config loaded');
        }
        catch (err) {
            context.log.error({ repo: repo.full_name, err }, 'Failed to register repo — skipping');
        }
    }
}
//# sourceMappingURL=installation.js.map