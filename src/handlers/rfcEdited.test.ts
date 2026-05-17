import { handleRfcEdited } from './rfcEdited';

const mockGetRepoByGithubId = jest.fn();
const mockGetRfcByIssueNumber = jest.fn();
const mockBootstrapRfc = jest.fn();
const mockPostIncompleteComment = jest.fn();
const mockUpdateWelcomeComment = jest.fn();

jest.mock('../db/queries/repos', () => ({
  getRepoByGithubId: (...args: unknown[]) => mockGetRepoByGithubId(...args),
}));

jest.mock('../db/queries/rfcs', () => ({
  getRfcByIssueNumber: (...args: unknown[]) => mockGetRfcByIssueNumber(...args),
}));

jest.mock('../rfc/bootstrap', () => ({
  bootstrapRfc: (...args: unknown[]) => mockBootstrapRfc(...args),
}));

jest.mock('../rfc/comments', () => ({
  postIncompleteComment: (...args: unknown[]) => mockPostIncompleteComment(...args),
  updateWelcomeComment: (...args: unknown[]) => mockUpdateWelcomeComment(...args),
}));

const VALID_BODY = `
## Proof strategy
By induction on list length.
## Prior work
See Mathlib.Data.List.Basic.
## Proposed decomposition
Base case and inductive step.
## Known obstacles
None identified yet.
## Alternatives considered
Tried direct recursion, rejected.
`;

const INVALID_BODY = `
## Proof strategy
N/A
`;

const fakeRepo = { id: BigInt(1), config_json: { seniorContributors: ['alice', 'bob'], rfcAbandonDays: 14, aiClaimable: false, rfcRequiredThreshold: { newFiles: true, minLines: 50, newDefinitions: true } } };

function makeContext(opts: {
  labels?: { name: string }[];
  body?: string;
  repoId?: number;
}) {
  return {
    payload: {
      issue: {
        number: 42,
        body: opts.body ?? VALID_BODY,
        labels: opts.labels ?? [{ name: 'proofflow-rfc' }],
        user: { login: 'contributor' },
      },
      repository: {
        id: opts.repoId ?? 999,
        name: 'lean-project',
        owner: { login: 'testorg' },
      },
    },
    octokit: {},
    log: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  };
}

describe('handleRfcEdited', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRepoByGithubId.mockResolvedValue(fakeRepo);
    mockGetRfcByIssueNumber.mockResolvedValue(null);
    mockBootstrapRfc.mockResolvedValue(undefined);
    mockPostIncompleteComment.mockResolvedValue(undefined);
    mockUpdateWelcomeComment.mockResolvedValue(undefined);
  });

  it('does nothing when the issue has no proofflow-rfc label', async () => {
    const context = makeContext({ labels: [{ name: 'bug' }, { name: 'enhancement' }] });

    await handleRfcEdited(context as never);

    expect(mockGetRepoByGithubId).not.toHaveBeenCalled();
    expect(mockBootstrapRfc).not.toHaveBeenCalled();
    expect(mockPostIncompleteComment).not.toHaveBeenCalled();
    expect(mockUpdateWelcomeComment).not.toHaveBeenCalled();
  });

  it('does nothing when the repo is not registered in the DB', async () => {
    mockGetRepoByGithubId.mockResolvedValue(null);
    const context = makeContext({});

    await handleRfcEdited(context as never);

    expect(mockGetRfcByIssueNumber).not.toHaveBeenCalled();
    expect(mockBootstrapRfc).not.toHaveBeenCalled();
  });

  it('calls bootstrapRfc when RFC is not in DB and body is now valid', async () => {
    mockGetRfcByIssueNumber.mockResolvedValue(null);
    const context = makeContext({ body: VALID_BODY });

    await handleRfcEdited(context as never);

    expect(mockBootstrapRfc).toHaveBeenCalledTimes(1);
    expect(mockPostIncompleteComment).not.toHaveBeenCalled();
    expect(mockUpdateWelcomeComment).not.toHaveBeenCalled();
  });

  it('calls postIncompleteComment when RFC is not in DB and body is still invalid', async () => {
    mockGetRfcByIssueNumber.mockResolvedValue(null);
    const context = makeContext({ body: INVALID_BODY });

    await handleRfcEdited(context as never);

    expect(mockPostIncompleteComment).toHaveBeenCalledTimes(1);
    expect(mockBootstrapRfc).not.toHaveBeenCalled();
    expect(mockUpdateWelcomeComment).not.toHaveBeenCalled();
  });

  it('calls updateWelcomeComment when RFC exists with state open', async () => {
    mockGetRfcByIssueNumber.mockResolvedValue({ id: BigInt(10), state: 'open' });
    const context = makeContext({ body: VALID_BODY });

    await handleRfcEdited(context as never);

    expect(mockUpdateWelcomeComment).toHaveBeenCalledTimes(1);
    expect(mockBootstrapRfc).not.toHaveBeenCalled();
    expect(mockPostIncompleteComment).not.toHaveBeenCalled();
  });

  it('does nothing when RFC exists with state approved (non-open state)', async () => {
    mockGetRfcByIssueNumber.mockResolvedValue({ id: BigInt(10), state: 'approved' });
    const context = makeContext({ body: VALID_BODY });

    await handleRfcEdited(context as never);

    expect(mockUpdateWelcomeComment).not.toHaveBeenCalled();
    expect(mockBootstrapRfc).not.toHaveBeenCalled();
    expect(mockPostIncompleteComment).not.toHaveBeenCalled();
  });

  it('does nothing when RFC exists with state abandoned (non-open state)', async () => {
    mockGetRfcByIssueNumber.mockResolvedValue({ id: BigInt(10), state: 'abandoned' });
    const context = makeContext({});

    await handleRfcEdited(context as never);

    expect(mockUpdateWelcomeComment).not.toHaveBeenCalled();
  });
});
