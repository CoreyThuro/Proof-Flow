export interface AgentIteration {
    id: bigint;
    task_id: bigint;
    iteration_number: number;
    lean_code: string;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    ci_output: string | null;
    ci_passed: boolean | null;
    prover: string;
    created_at: Date;
}
export declare function insertAgentIteration(taskId: bigint, iterationNumber: number, leanCode: string, promptTokens: number, completionTokens: number, prover?: 'claude' | 'aristotle'): Promise<AgentIteration>;
export declare function updateAgentIteration(id: bigint, fields: Partial<Pick<AgentIteration, 'ci_output' | 'ci_passed'>>): Promise<void>;
export declare function getIterationsByTaskId(taskId: bigint): Promise<AgentIteration[]>;
export declare function getLatestIteration(taskId: bigint): Promise<AgentIteration | null>;
//# sourceMappingURL=agentIterations.d.ts.map