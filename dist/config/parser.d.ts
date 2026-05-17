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
export declare const DEFAULT_CONFIG: ProofFlowConfig;
export declare class ConfigValidationError extends Error {
    constructor(message: string);
}
export declare function parseConfig(raw: unknown): ProofFlowConfig;
interface OctokitReposGetContent {
    rest: {
        repos: {
            getContent: (params: {
                owner: string;
                repo: string;
                path: string;
            }) => Promise<{
                data: unknown;
            }>;
        };
    };
}
export declare function fetchAndParseConfig(octokit: OctokitReposGetContent, owner: string, repo: string): Promise<ProofFlowConfig>;
export {};
//# sourceMappingURL=parser.d.ts.map