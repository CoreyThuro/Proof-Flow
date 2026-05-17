import {
  parseConfig,
  fetchAndParseConfig,
  DEFAULT_CONFIG,
  ConfigValidationError,
} from './parser';

describe('parseConfig', () => {
  it('throws ConfigValidationError when seniorContributors is missing', () => {
    expect(() => parseConfig({ rfc_abandon_days: 7 })).toThrow(ConfigValidationError);
    expect(() => parseConfig({ rfc_abandon_days: 7 })).toThrow('senior_contributors');
  });

  it('throws ConfigValidationError when seniorContributors is empty array', () => {
    expect(() => parseConfig({ senior_contributors: [] })).toThrow(ConfigValidationError);
  });

  it('throws ConfigValidationError when seniorContributors is not an array', () => {
    expect(() => parseConfig({ senior_contributors: 'alice' })).toThrow(ConfigValidationError);
  });

  it('applies all defaults when only seniorContributors is provided', () => {
    const result = parseConfig({ senior_contributors: ['alice'] });

    expect(result.seniorContributors).toEqual(['alice']);
    expect(result.rfcAbandonDays).toBe(DEFAULT_CONFIG.rfcAbandonDays);
    expect(result.aiClaimable).toBe(DEFAULT_CONFIG.aiClaimable);
    expect(result.rfcRequiredThreshold).toEqual(DEFAULT_CONFIG.rfcRequiredThreshold);
  });

  it('uses provided values over defaults', () => {
    const result = parseConfig({
      senior_contributors: ['alice', 'bob'],
      rfc_abandon_days: 7,
      ai_claimable: true,
      rfc_required_threshold: {
        new_files: false,
        min_lines: 100,
        new_definitions: false,
      },
    });

    expect(result.seniorContributors).toEqual(['alice', 'bob']);
    expect(result.rfcAbandonDays).toBe(7);
    expect(result.aiClaimable).toBe(true);
    expect(result.rfcRequiredThreshold.newFiles).toBe(false);
    expect(result.rfcRequiredThreshold.minLines).toBe(100);
    expect(result.rfcRequiredThreshold.newDefinitions).toBe(false);
  });

  it('applies partial threshold defaults', () => {
    const result = parseConfig({
      senior_contributors: ['alice'],
      rfc_required_threshold: { min_lines: 200 },
    });

    expect(result.rfcRequiredThreshold.minLines).toBe(200);
    expect(result.rfcRequiredThreshold.newFiles).toBe(DEFAULT_CONFIG.rfcRequiredThreshold.newFiles);
    expect(result.rfcRequiredThreshold.newDefinitions).toBe(
      DEFAULT_CONFIG.rfcRequiredThreshold.newDefinitions,
    );
  });

  it('throws when raw is an array (not a mapping)', () => {
    expect(() => parseConfig(['alice'])).toThrow(ConfigValidationError);
  });

  it('returns a copy of DEFAULT_CONFIG when raw is null', () => {
    const result = parseConfig(null);
    expect(result).toEqual(DEFAULT_CONFIG);
    expect(result).not.toBe(DEFAULT_CONFIG);
  });
});

describe('fetchAndParseConfig', () => {
  it('returns DEFAULT_CONFIG when .proofflow.yml does not exist', async () => {
    const octokit = {
      rest: {
        repos: {
          getContent: jest.fn().mockRejectedValue({ status: 404 }),
        },
      },
    };

    const result = await fetchAndParseConfig(octokit, 'owner', 'repo');
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it('parses a valid .proofflow.yml file', async () => {
    const yamlContent = Buffer.from(
      `senior_contributors:\n  - alice\n  - bob\nrfc_abandon_days: 7\n`,
    ).toString('base64');

    const octokit = {
      rest: {
        repos: {
          getContent: jest.fn().mockResolvedValue({
            data: { content: yamlContent, encoding: 'base64' },
          }),
        },
      },
    };

    const result = await fetchAndParseConfig(octokit, 'owner', 'repo');
    expect(result.seniorContributors).toEqual(['alice', 'bob']);
    expect(result.rfcAbandonDays).toBe(7);
  });

  it('rethrows non-404 errors', async () => {
    const octokit = {
      rest: {
        repos: {
          getContent: jest.fn().mockRejectedValue({ status: 500, message: 'Server error' }),
        },
      },
    };

    await expect(fetchAndParseConfig(octokit, 'owner', 'repo')).rejects.toMatchObject({
      status: 500,
    });
  });
});
