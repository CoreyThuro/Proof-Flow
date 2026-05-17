export interface LeanCodeResult {
    leanCode: string;
    promptTokens: number;
    completionTokens: number;
}
export declare function generateLeanCode(systemPrompt: string, userPrompt: string): Promise<LeanCodeResult>;
//# sourceMappingURL=claudeClient.d.ts.map