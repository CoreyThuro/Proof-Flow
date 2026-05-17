type ProjectStatus = 'NOT_STARTED' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED' | 'CANCELED' | 'UNKNOWN';
export declare function isAristotleConfigured(): boolean;
export declare class AristotleFailedError extends Error {
    constructor(message: string);
}
export declare class AristotleTimeoutError extends Error {
    constructor(message: string);
}
export declare function createAristotleProject(leanCodeWithSorry: string): Promise<string>;
export declare function pollUntilComplete(projectId: string): Promise<string>;
export declare function checkProjectStatus(projectId: string): Promise<ProjectStatus>;
export {};
//# sourceMappingURL=aristotleClient.d.ts.map