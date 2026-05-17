import { handleInstallation } from './installation';

const mockInsertRepo = jest.fn();
const mockGetRepoByGithubId = jest.fn();
const mockUpdateRepoConfig = jest.fn();
const mockUpdateRepoInstallationId = jest.fn();
const mockFetchAndParseConfig = jest.fn();

jest.mock('../db/queries/repos', () => ({
  insertRepo: (...args: unknown[]) => mockInsertRepo(...args),
  getRepoByGithubId: (...args: unknown[]) => mockGetRepoByGithubId(...args),
  updateRepoConfig: (...args: unknown[]) => mockUpdateRepoConfig(...args),
  updateRepoInstallationId: (...args: unknown[]) => mockUpdateRepoInstallationId(...args),
}));

jest.mock('../config/parser', () => ({
  fetchAndParseConfig: (...args: unknown[]) => mockFetchAndParseConfig(...args),
}));

function makeContext(repos: { id: number; name: string; full_name: string }[], eventType: 'created' | 'added' = 'created') {
  const payload =
    eventType === 'created'
      ? { installation: { id: 12345, account: { login: 'testorg' } }, repositories: repos }
      : { installation: { id: 12345, account: { login: 'testorg' } }, repositories_added: repos };

  return {
    payload,
    octokit: {},
    log: {
      info: jest.fn(),
      error: jest.fn(),
    },
  };
}

describe('handleInstallation', () => {
  const fakeConfig = {
    seniorContributors: ['alice'],
    rfcAbandonDays: 14,
    aiClaimable: false,
    rfcRequiredThreshold: { newFiles: true, minLines: 50, newDefinitions: true },
  };
  const fakeRow = { id: BigInt(1), github_repo_id: BigInt(101) };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInsertRepo.mockResolvedValue(undefined);
    mockGetRepoByGithubId.mockResolvedValue(fakeRow);
    mockUpdateRepoConfig.mockResolvedValue(undefined);
    mockUpdateRepoInstallationId.mockResolvedValue(undefined);
    mockFetchAndParseConfig.mockResolvedValue(fakeConfig);
  });

  it('calls insertRepo, getRepoByGithubId, fetchAndParseConfig, updateRepoConfig for each repo', async () => {
    const repos = [
      { id: 101, name: 'lean-project', full_name: 'testorg/lean-project' },
      { id: 102, name: 'lean-lib', full_name: 'testorg/lean-lib' },
    ];
    const context = makeContext(repos);

    await handleInstallation(context as never);

    expect(mockInsertRepo).toHaveBeenCalledTimes(2);
    expect(mockInsertRepo).toHaveBeenCalledWith(101, 'testorg', 'lean-project');
    expect(mockInsertRepo).toHaveBeenCalledWith(102, 'testorg', 'lean-lib');

    expect(mockGetRepoByGithubId).toHaveBeenCalledWith(101);
    expect(mockGetRepoByGithubId).toHaveBeenCalledWith(102);

    expect(mockFetchAndParseConfig).toHaveBeenCalledTimes(2);
    expect(mockUpdateRepoConfig).toHaveBeenCalledTimes(2);
    expect(mockUpdateRepoConfig).toHaveBeenCalledWith(fakeRow.id, fakeConfig);
  });

  it('handles installation_repositories.added payload using repositories_added field', async () => {
    const repos = [{ id: 201, name: 'new-repo', full_name: 'testorg/new-repo' }];
    const context = makeContext(repos, 'added');

    await handleInstallation(context as never);

    expect(mockInsertRepo).toHaveBeenCalledWith(201, 'testorg', 'new-repo');
  });

  it('continues processing remaining repos when one repo fails', async () => {
    const repos = [
      { id: 301, name: 'repo-a', full_name: 'testorg/repo-a' },
      { id: 302, name: 'repo-b', full_name: 'testorg/repo-b' },
    ];
    const context = makeContext(repos);

    mockInsertRepo
      .mockRejectedValueOnce(new Error('DB connection error'))
      .mockResolvedValueOnce(undefined);

    await handleInstallation(context as never);

    // repo-a failed, repo-b should still be processed
    expect(mockInsertRepo).toHaveBeenCalledTimes(2);
    expect(mockGetRepoByGithubId).toHaveBeenCalledTimes(1);
    expect(mockGetRepoByGithubId).toHaveBeenCalledWith(302);
    expect((context.log.error as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('logs error and skips remaining steps when getRepoByGithubId returns null', async () => {
    const repos = [{ id: 401, name: 'ghost-repo', full_name: 'testorg/ghost-repo' }];
    const context = makeContext(repos);

    mockGetRepoByGithubId.mockResolvedValue(null);

    await handleInstallation(context as never);

    expect(mockFetchAndParseConfig).not.toHaveBeenCalled();
    expect(mockUpdateRepoConfig).not.toHaveBeenCalled();
    expect(context.log.error).toHaveBeenCalled();
  });
});
