"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidationError = exports.DEFAULT_CONFIG = void 0;
exports.parseConfig = parseConfig;
exports.fetchAndParseConfig = fetchAndParseConfig;
const js_yaml_1 = require("js-yaml");
exports.DEFAULT_CONFIG = {
    rfcRequiredThreshold: {
        newFiles: true,
        minLines: 50,
        newDefinitions: true,
    },
    seniorContributors: [],
    rfcAbandonDays: 14,
    aiClaimable: false,
};
class ConfigValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConfigValidationError';
    }
}
exports.ConfigValidationError = ConfigValidationError;
function parseConfig(raw) {
    if (raw === null || raw === undefined) {
        return { ...exports.DEFAULT_CONFIG };
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) {
        throw new ConfigValidationError('.proofflow.yml must be a YAML mapping, not a scalar or list');
    }
    const r = raw;
    const contributors = r.senior_contributors;
    if (contributors === undefined || contributors === null) {
        throw new ConfigValidationError('.proofflow.yml must include senior_contributors with at least one GitHub login');
    }
    if (!Array.isArray(contributors) || contributors.length === 0) {
        throw new ConfigValidationError('senior_contributors must be a non-empty list of GitHub logins');
    }
    const seniorContributors = contributors.map((c, i) => {
        if (typeof c !== 'string' || c.trim() === '') {
            throw new ConfigValidationError(`senior_contributors[${i}] must be a non-empty string`);
        }
        return c.trim();
    });
    const threshold = r.rfc_required_threshold ?? {};
    const rawThreshold = typeof threshold === 'object' && !Array.isArray(threshold) ? threshold : {};
    const t = rawThreshold;
    const rfcRequiredThreshold = {
        newFiles: typeof t?.new_files === 'boolean' ? t.new_files : exports.DEFAULT_CONFIG.rfcRequiredThreshold.newFiles,
        minLines: typeof t?.min_lines === 'number' ? t.min_lines : exports.DEFAULT_CONFIG.rfcRequiredThreshold.minLines,
        newDefinitions: typeof t?.new_definitions === 'boolean'
            ? t.new_definitions
            : exports.DEFAULT_CONFIG.rfcRequiredThreshold.newDefinitions,
    };
    const rfcAbandonDays = typeof r.rfc_abandon_days === 'number'
        ? r.rfc_abandon_days
        : exports.DEFAULT_CONFIG.rfcAbandonDays;
    const aiClaimable = typeof r.ai_claimable === 'boolean' ? r.ai_claimable : exports.DEFAULT_CONFIG.aiClaimable;
    let aiAgent;
    if (r.ai_agent && typeof r.ai_agent === 'object') {
        const ag = r.ai_agent;
        const enabled = typeof ag.enabled === 'boolean' ? ag.enabled : false;
        const costModel = ag.cost_model === 'maintainer' || ag.cost_model === 'foundation' || ag.cost_model === 'self-hosted'
            ? ag.cost_model
            : 'maintainer';
        const maxIterations = typeof ag.max_iterations === 'number' && ag.max_iterations >= 1 && ag.max_iterations <= 5
            ? ag.max_iterations
            : 3;
        const targetDirectory = typeof ag.target_directory === 'string' ? ag.target_directory : undefined;
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
async function fetchAndParseConfig(octokit, owner, repo) {
    let response;
    try {
        response = await octokit.rest.repos.getContent({ owner, repo, path: '.proofflow.yml' });
    }
    catch (err) {
        if (isHttpError(err) && err.status === 404) {
            return { ...exports.DEFAULT_CONFIG };
        }
        throw err;
    }
    const data = response.data;
    if (typeof data !== 'object' ||
        data === null ||
        !('content' in data) ||
        typeof data.content !== 'string') {
        throw new ConfigValidationError('.proofflow.yml could not be read as a file (may be a directory)');
    }
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const parsed = (0, js_yaml_1.load)(content);
    return parseConfig(parsed);
}
function isHttpError(err) {
    return typeof err === 'object' && err !== null && 'status' in err;
}
//# sourceMappingURL=parser.js.map