export interface AgentTask {
    id: bigint;
    rfc_id: bigint;
    repo_id: bigint;
    state: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
    iteration_count: number;
    max_iterations: number;
    draft_pr_number: number | null;
    branch_name: string | null;
    aristotle_project_id: string | null;
    started_at: Date;
    completed_at: Date | null;
    failure_reason: string | null;
}
export declare function insertAgentTask(rfcId: bigint, repoId: bigint, maxIterations: number): Promise<AgentTask>;
export declare function updateAgentTask(taskId: bigint, fields: Partial<Pick<AgentTask, 'state' | 'iteration_count' | 'draft_pr_number' | 'branch_name' | 'aristotle_project_id' | 'completed_at' | 'failure_reason'>>): Promise<void>;
export declare function getActiveTaskByRfcId(rfcId: bigint): Promise<AgentTask | null>;
export declare function getActiveTaskByDraftPr(prNumber: number): Promise<AgentTask | null>;
export declare function getStaleNoPrTasks(): Promise<AgentTask[]>;
export declare function getActiveTaskByBranchName(branchName: string): Promise<AgentTask | null>;
export declare function getStaleRunningTasks(): Promise<AgentTask[]>;
//# sourceMappingURL=agentTasks.d.ts.map