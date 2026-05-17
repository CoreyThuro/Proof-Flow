"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertRepo = insertRepo;
exports.getRepoByGithubId = getRepoByGithubId;
exports.getRepoById = getRepoById;
exports.getRepoByOwnerAndName = getRepoByOwnerAndName;
exports.updateRepoInstallationId = updateRepoInstallationId;
exports.updateRepoConfig = updateRepoConfig;
const client_1 = require("../client");
async function insertRepo(githubRepoId, owner, name) {
    await (0, client_1.query)(`INSERT INTO repos (github_repo_id, github_owner, github_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (github_repo_id) DO NOTHING`, [githubRepoId, owner, name]);
}
async function getRepoByGithubId(githubRepoId) {
    return (0, client_1.queryOne)(`SELECT id, github_repo_id, github_owner, github_name, installed_at, config_json, installation_id
     FROM repos
     WHERE github_repo_id = $1`, [githubRepoId]);
}
async function getRepoById(repoId) {
    return (0, client_1.queryOne)(`SELECT id, github_repo_id, github_owner, github_name, installed_at, config_json, installation_id
     FROM repos
     WHERE id = $1`, [repoId]);
}
async function getRepoByOwnerAndName(owner, name) {
    return (0, client_1.queryOne)(`SELECT id, github_repo_id, github_owner, github_name, installed_at, config_json, installation_id
     FROM repos
     WHERE github_owner = $1 AND github_name = $2`, [owner, name]);
}
async function updateRepoInstallationId(repoId, installationId) {
    await (0, client_1.query)(`UPDATE repos SET installation_id = $1 WHERE id = $2`, [installationId, repoId]);
}
async function updateRepoConfig(repoId, configJson) {
    await (0, client_1.query)(`UPDATE repos SET config_json = $1 WHERE id = $2`, [configJson, repoId]);
}
//# sourceMappingURL=repos.js.map