"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLeanCode = generateLeanCode;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const client = new sdk_1.default();
async function generateLeanCode(systemPrompt, userPrompt) {
    const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
    });
    const leanCode = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
    return {
        leanCode,
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
    };
}
//# sourceMappingURL=claudeClient.js.map