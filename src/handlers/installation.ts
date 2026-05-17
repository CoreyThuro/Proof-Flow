import type { Context } from 'probot';
import { insertRepo, getRepoByGithubId, updateRepoConfig, updateRepoInstallationId } from '../db/queries/repos';
import { fetchAndParseConfig } from '../config/parser';

type InstallationContext =
  | Context<'installation.created'>
  | Context<'installation_repositories.added'>;

interface RepoEntry {
  id: number;
  name: string;
  full_name: string;
}

function getRepos(context: InstallationContext): RepoEntry[] {
  const payload = context.payload;
  if ('repositories' in payload && Array.isArray(payload.repositories)) {
    return payload.repositories as RepoEntry[];
  }
  if ('repositories_added' in payload && Array.isArray(payload.repositories_added)) {
    return payload.repositories_added as RepoEntry[];
  }
  return [];
}

export async function handleInstallation(context: InstallationContext): Promise<void> {
  const repos = getRepos(context);
  const owner = context.payload.installation.account.login;

  for (const repo of repos) {
    try {
      const [, repoName] = repo.full_name.split('/');
      const name = repoName ?? repo.name;

      await insertRepo(repo.id, owner, name);

      const row = await getRepoByGithubId(repo.id);
      if (!row) {
        context.log.error({ repo: repo.full_name }, 'Repo not found after insert');
        continue;
      }

      await updateRepoInstallationId(row.id, context.payload.installation.id);

      const config = await fetchAndParseConfig(context.octokit, owner, name);
      await updateRepoConfig(row.id, config as unknown as Record<string, unknown>);

      context.log.info({ repo: repo.full_name }, 'Repo registered and config loaded');
    } catch (err: unknown) {
      context.log.error({ repo: repo.full_name, err }, 'Failed to register repo — skipping');
    }
  }
}
