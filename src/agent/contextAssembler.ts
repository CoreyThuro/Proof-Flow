type AssemblerOctokit = {
  rest: {
    issues: {
      listComments: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        per_page?: number;
      }) => Promise<{ data: Array<{ body?: string; user?: { login?: string }; created_at: string }> }>;
    };
    repos: {
      get: (params: {
        owner: string;
        repo: string;
      }) => Promise<{ data: { default_branch: string } }>;
      getContent: (params: {
        owner: string;
        repo: string;
        path: string;
        ref?: string;
      }) => Promise<{ data: unknown }>;
    };
  };
};

export interface AssembledContext {
  systemPrompt: string;
  userPrompt: string;
  targetFilePath: string;
  defaultBranch: string;
}

const CHARS_PER_TOKEN = 4;
const BUDGET = {
  rfcBody: 3000 * CHARS_PER_TOKEN,
  comments: 2000 * CHARS_PER_TOKEN,
  leanFiles: 4000 * CHARS_PER_TOKEN,
  lakefile: 500 * CHARS_PER_TOKEN,
  priorError: 1000 * CHARS_PER_TOKEN,
};

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n[... truncated ...]';
}

function extractTargetFilePath(rfcBody: string, issueNumber: number, targetDirectory?: string): string {
  const fileMatch = /^File:\s*(.+\.lean)/im.exec(rfcBody);
  if (fileMatch?.[1]) return fileMatch[1].trim();
  const base = targetDirectory ? `${targetDirectory.replace(/\/$/, '')}/RFC${issueNumber}.lean` : `ProofflowAgentOutput/RFC${issueNumber}.lean`;
  return base;
}

function extractLeanFileRefs(rfcBody: string): string[] {
  const matches = [...rfcBody.matchAll(/[\w/.-]+\.lean/g)];
  return [...new Set(matches.map((m) => m[0]))];
}

async function fetchFileContent(
  octokit: AssemblerOctokit,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  try {
    const res = await octokit.rest.repos.getContent({ owner, repo, path, ref });
    const data = res.data as Record<string, unknown>;
    if (typeof data.content !== 'string') return null;
    return Buffer.from(data.content as string, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

export async function assembleContext(
  octokit: AssemblerOctokit,
  owner: string,
  repoName: string,
  issueNumber: number,
  rfcBody: string,
  rfcTitle: string,
  rfcAuthorLogin: string,
  targetDirectory: string | undefined,
  priorAttempt?: { leanCode: string; ciOutput: string },
): Promise<AssembledContext> {
  const repoData = await octokit.rest.repos.get({ owner, repo: repoName });
  const defaultBranch = repoData.data.default_branch;

  const [comments, lakefile, leanToolchain] = await Promise.all([
    octokit.rest.issues.listComments({ owner, repo: repoName, issue_number: issueNumber, per_page: 100 }),
    fetchFileContent(octokit, owner, repoName, 'lakefile.lean', defaultBranch)
      .then((c) => c ?? fetchFileContent(octokit, owner, repoName, 'lakefile.toml', defaultBranch)),
    fetchFileContent(octokit, owner, repoName, 'lean-toolchain', defaultBranch),
  ]);

  const commentText = [...comments.data]
    .reverse()
    .map((c) => `@${c.user?.login ?? 'unknown'}: ${c.body ?? ''}`)
    .join('\n\n');

  const leanFileRefs = extractLeanFileRefs(rfcBody);
  const leanFileContents = await Promise.all(
    leanFileRefs.map(async (path) => {
      const content = await fetchFileContent(octokit, owner, repoName, path, defaultBranch);
      return content ? `-- ${path}\n${content}` : null;
    }),
  );

  const sortedLeanFiles = leanFileContents
    .filter((c): c is string => c !== null)
    .sort((a, b) => a.length - b.length);

  let leanFilesSection = '';
  let remaining = BUDGET.leanFiles;
  for (const file of sortedLeanFiles) {
    if (file.length > remaining) continue;
    leanFilesSection += file + '\n\n';
    remaining -= file.length;
  }

  const targetFilePath = extractTargetFilePath(rfcBody, issueNumber, targetDirectory);

  const systemPrompt = `You are a Lean 4 formalization agent working on a mathematical proof.
Your task is to write correct, compilable Lean 4 code that formalizes the theorem described in the RFC below.

Rules:
- Never use \`sorry\` — any proof containing sorry will be rejected by CI
- Use only Mathlib imports available in the project's lakefile
- Follow the proof strategy described in the RFC exactly
- Output ONLY valid Lean 4 code — no explanations, no markdown fences, no commentary
- You MUST include this exact attribution comment at the top of the file, after any imports:
  /-! Proof strategy credited to @${rfcAuthorLogin}, RFC #${issueNumber} -/`;

  const sections: string[] = [];

  sections.push(`## RFC #${issueNumber}: ${rfcTitle}\n\n${truncate(rfcBody, BUDGET.rfcBody)}`);

  if (commentText.trim()) {
    sections.push(`## Reviewer feedback (most recent first):\n${truncate(commentText, BUDGET.comments)}`);
  }

  const envLines: string[] = [];
  if (leanToolchain) envLines.push(`Lean version: ${leanToolchain.trim()}`);
  if (lakefile) envLines.push(`Lakefile:\n${truncate(lakefile, BUDGET.lakefile)}`);
  if (envLines.length > 0) sections.push(`## Project Lean environment:\n${envLines.join('\n\n')}`);

  if (leanFilesSection.trim()) {
    sections.push(`## Existing related files:\n${leanFilesSection.trim()}`);
  }

  if (priorAttempt) {
    sections.push(
      `## Previous attempt — FAILED:\n\`\`\`lean\n${priorAttempt.leanCode}\n\`\`\`\n\n## Lean compiler error:\n${truncate(priorAttempt.ciOutput, BUDGET.priorError)}\n\nFix the error. Output the corrected complete file content.`,
    );
  }

  sections.push(`## Target:\nFile: ${targetFilePath}\nWrite the complete file content.`);

  return {
    systemPrompt,
    userPrompt: sections.join('\n\n---\n\n'),
    targetFilePath,
    defaultBranch,
  };
}
