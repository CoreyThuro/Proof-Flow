import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface LeanCodeResult {
  leanCode: string;
  promptTokens: number;
  completionTokens: number;
}

export async function generateLeanCode(
  systemPrompt: string,
  userPrompt: string,
): Promise<LeanCodeResult> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const leanCode = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  return {
    leanCode,
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
  };
}
