import { query, queryOne } from '../client';

export interface Repo {
  id: bigint;
  github_repo_id: bigint;
  github_owner: string;
  github_name: string;
  installed_at: Date;
  config_json: Record<string, unknown>;
  installation_id: bigint | null;
}

export async function insertRepo(
  githubRepoId: number,
  owner: string,
  name: string,
): Promise<void> {
  await query(
    `INSERT INTO repos (github_repo_id, github_owner, github_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (github_repo_id) DO NOTHING`,
    [githubRepoId, owner, name],
  );
}

export async function getRepoByGithubId(githubRepoId: number): Promise<Repo | null> {
  return queryOne<Repo>(
    `SELECT id, github_repo_id, github_owner, github_name, installed_at, config_json, installation_id
     FROM repos
     WHERE github_repo_id = $1`,
    [githubRepoId],
  );
}

export async function getRepoById(repoId: bigint): Promise<Repo | null> {
  return queryOne<Repo>(
    `SELECT id, github_repo_id, github_owner, github_name, installed_at, config_json, installation_id
     FROM repos
     WHERE id = $1`,
    [repoId],
  );
}

export async function getRepoByOwnerAndName(
  owner: string,
  name: string,
): Promise<Repo | null> {
  return queryOne<Repo>(
    `SELECT id, github_repo_id, github_owner, github_name, installed_at, config_json, installation_id
     FROM repos
     WHERE github_owner = $1 AND github_name = $2`,
    [owner, name],
  );
}

export async function updateRepoInstallationId(
  repoId: bigint,
  installationId: number,
): Promise<void> {
  await query(`UPDATE repos SET installation_id = $1 WHERE id = $2`, [installationId, repoId]);
}

export async function updateRepoConfig(
  repoId: bigint,
  configJson: Record<string, unknown>,
): Promise<void> {
  await query(`UPDATE repos SET config_json = $1 WHERE id = $2`, [configJson, repoId]);
}
