export interface Repo {
    id: bigint;
    github_repo_id: bigint;
    github_owner: string;
    github_name: string;
    installed_at: Date;
    config_json: Record<string, unknown>;
    installation_id: bigint | null;
}
export declare function insertRepo(githubRepoId: number, owner: string, name: string): Promise<void>;
export declare function getRepoByGithubId(githubRepoId: number): Promise<Repo | null>;
export declare function getRepoById(repoId: bigint): Promise<Repo | null>;
export declare function getRepoByOwnerAndName(owner: string, name: string): Promise<Repo | null>;
export declare function updateRepoInstallationId(repoId: bigint, installationId: number): Promise<void>;
export declare function updateRepoConfig(repoId: bigint, configJson: Record<string, unknown>): Promise<void>;
//# sourceMappingURL=repos.d.ts.map