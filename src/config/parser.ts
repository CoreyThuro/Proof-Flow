import { load as parseYaml } from 'js-yaml';

export interface RfcRequiredThreshold {
  newFiles: boolean;
  minLines: number;
  newDefinitions: boolean;
}

export interface AiAgentConfig {
  enabled: boolean;
  costModel: 'maintainer' | 'foundation' | 'self-hosted';
  maxIterations: number;
  targetDirectory?: string;
}

export interface ProofFlowConfig {
  rfcRequiredThreshold: RfcRequiredThreshold;
  seniorContributors: string[];
  rfcAbandonDays: number;
  aiClaimable: boolean;
  aiAgent?: AiAgentConfig;
}

export const DEFAULT_CONFIG: ProofFlowConfig = {
  rfcRequiredThreshold: {
    newFiles: true,
    minLines: 50,
    newDefinitions: true,
  },
  seniorContributors: [],
  rfcAbandonDays: 14,
  aiClaimable: false,
};

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

interface RawConfig {
  rfc_required_threshold?: {
    new_files?: unknown;
    min_lines?: unknown;
    new_definitions?: unknown;
  };
  senior_contributors?: unknown;
  rfc_abandon_days?: unknown;
  ai_claimable?: unknown;
  ai_agent?: {
    enabled?: unknown;
    cost_model?: unknown;
    max_iterations?: unknown;
    target_directory?: unknown;
  };
}

export function parseConfig(raw: unknown): ProofFlowConfig {
  if (raw === null || raw === undefined) {
    return { ...DEFAULT_CONFIG };
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ConfigValidationError('.proofflow.yml must be a YAML mapping, not a scalar or list');
  }

  const r = raw as RawConfig;

  const contributors = r.senior_contributors;
  if (contributors === undefined || contributors === null) {
    throw new ConfigValidationError(
      '.proofflow.yml must include senior_contributors with at least one GitHub login',
    );
  }
  if (!Array.isArray(contributors) || contributors.length === 0) {
    throw new ConfigValidationError(
      'senior_contributors must be a non-empty list of GitHub logins',
    );
  }
  const seniorContributors = contributors.map((c, i) => {
    if (typeof c !== 'string' || c.trim() === '') {
      throw new ConfigValidationError(`senior_contributors[${i}] must be a non-empty string`);
    }
    return c.trim();
  });

  const threshold = r.rfc_required_threshold ?? {};
  const rawThreshold = typeof threshold === 'object' && !Array.isArray(threshold) ? threshold : {};
  const t = rawThreshold as RawConfig['rfc_required_threshold'];

  const rfcRequiredThreshold: RfcRequiredThreshold = {
    newFiles: typeof t?.new_files === 'boolean' ? t.new_files : DEFAULT_CONFIG.rfcRequiredThreshold.newFiles,
    minLines: typeof t?.min_lines === 'number' ? t.min_lines : DEFAULT_CONFIG.rfcRequiredThreshold.minLines,
    newDefinitions:
      typeof t?.new_definitions === 'boolean'
        ? t.new_definitions
        : DEFAULT_CONFIG.rfcRequiredThreshold.newDefinitions,
  };

  const rfcAbandonDays =
    typeof r.rfc_abandon_days === 'number'
      ? r.rfc_abandon_days
      : DEFAULT_CONFIG.rfcAbandonDays;

  const aiClaimable =
    typeof r.ai_claimable === 'boolean' ? r.ai_claimable : DEFAULT_CONFIG.aiClaimable;

  let aiAgent: AiAgentConfig | undefined;
  if (r.ai_agent && typeof r.ai_agent === 'object') {
    const ag = r.ai_agent;
    const enabled = typeof ag.enabled === 'boolean' ? ag.enabled : false;
    const costModel =
      ag.cost_model === 'maintainer' || ag.cost_model === 'foundation' || ag.cost_model === 'self-hosted'
        ? (ag.cost_model as AiAgentConfig['costModel'])
        : 'maintainer';
    const maxIterations =
      typeof ag.max_iterations === 'number' && ag.max_iterations >= 1 && ag.max_iterations <= 5
        ? ag.max_iterations
        : 3;
    const targetDirectory =
      typeof ag.target_directory === 'string' ? ag.target_directory : undefined;
    aiAgent = { enabled, costModel, maxIterations, targetDirectory };
  }

  return {
    rfcRequiredThreshold,
    seniorContributors,
    rfcAbandonDays,
    aiClaimable,
    aiAgent,
  };
}

interface OctokitReposGetContent {
  rest: {
    repos: {
      getContent: (params: {
        owner: string;
        repo: string;
        path: string;
      }) => Promise<{ data: unknown }>;
    };
  };
}

export async function fetchAndParseConfig(
  octokit: OctokitReposGetContent,
  owner: string,
  repo: string,
): Promise<ProofFlowConfig> {
  let response: { data: unknown };

  try {
    response = await octokit.rest.repos.getContent({ owner, repo, path: '.proofflow.yml' });
  } catch (err: unknown) {
    if (isHttpError(err) && err.status === 404) {
      return { ...DEFAULT_CONFIG };
    }
    throw err;
  }

  const data = response.data;
  if (
    typeof data !== 'object' ||
    data === null ||
    !('content' in data) ||
    typeof (data as Record<string, unknown>).content !== 'string'
  ) {
    throw new ConfigValidationError(
      '.proofflow.yml could not be read as a file (may be a directory)',
    );
  }

  const content = Buffer.from(
    (data as Record<string, string>).content,
    'base64',
  ).toString('utf-8');

  const parsed = parseYaml(content);
  return parseConfig(parsed);
}

function isHttpError(err: unknown): err is { status: number } {
  return typeof err === 'object' && err !== null && 'status' in err;
}
