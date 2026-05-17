import { execSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE_URL = 'https://aristotle.harmonic.fun/api/v3';
const POLL_INTERVAL_MS = 30_000;
const MAX_WAIT_MS = 45 * 60 * 1000; // 45 minutes

type TaskStatus =
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'COMPLETE_WITH_ERRORS'
  | 'OUT_OF_BUDGET'
  | 'FAILED'
  | 'CANCELED'
  | 'UNKNOWN';

interface TaskResponse {
  agent_task_id: string;
  project_id: string;
  status: TaskStatus;
  output_summary: string | null;
}

interface TasksListResponse {
  agent_tasks: TaskResponse[];
}

interface ProjectResponse {
  project_id: string;
}

const TERMINAL_STATUSES = new Set<TaskStatus>([
  'COMPLETE',
  'COMPLETE_WITH_ERRORS',
  'OUT_OF_BUDGET',
  'FAILED',
  'CANCELED',
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey(): string {
  const key = process.env.ARISTOTLE_API_KEY;
  if (!key) throw new Error('ARISTOTLE_API_KEY not set');
  return key;
}

export function isAristotleConfigured(): boolean {
  return Boolean(process.env.ARISTOTLE_API_KEY);
}

export class AristotleFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AristotleFailedError';
  }
}

export class AristotleTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AristotleTimeoutError';
  }
}

// Create a project from the RFC body and return both IDs.
// Pass priorAttempt when retrying after a CI failure so Aristotle has the error context.
export async function createAristotleProject(
  rfcPrompt: string,
  priorAttempt?: { leanCode: string; ciOutput: string },
): Promise<{ projectId: string; taskId: string }> {
  const apiKey = getApiKey();

  let prompt = rfcPrompt;
  if (priorAttempt) {
    prompt +=
      '\n\n---\n\nA previous proof attempt compiled but failed CI:\n' +
      '```lean\n' +
      priorAttempt.leanCode +
      '\n```\n\nCI error:\n' +
      priorAttempt.ciOutput.slice(0, 2000) +
      '\n\nPlease fix the proof.';
  }

  // API expects form-encoded `body` field containing JSON {"prompt": "..."}
  const params = new URLSearchParams();
  params.append('body', JSON.stringify({ prompt }));

  const createRes = await fetch(`${BASE_URL}/project`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!createRes.ok) {
    throw new Error(`Aristotle create project: ${createRes.status} ${await createRes.text()}`);
  }
  const { project_id } = (await createRes.json()) as ProjectResponse;

  const tasksRes = await fetch(`${BASE_URL}/project/${project_id}/tasks?limit=1`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!tasksRes.ok) {
    throw new Error(`Aristotle get tasks: ${tasksRes.status} ${await tasksRes.text()}`);
  }
  const { agent_tasks } = (await tasksRes.json()) as TasksListResponse;
  if (!agent_tasks.length) {
    throw new Error(`Aristotle project ${project_id} created but no task was found`);
  }

  return { projectId: project_id, taskId: agent_tasks[0].agent_task_id };
}

// Poll a task until terminal status. Returns the final status.
// Throws AristotleFailedError for FAILED/CANCELED, AristotleTimeoutError on timeout.
export async function pollUntilComplete(taskId: string, timeoutMs = MAX_WAIT_MS): Promise<TaskStatus> {
  const apiKey = getApiKey();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const res = await fetch(`${BASE_URL}/task/${taskId}`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (!res.ok) continue; // transient network error — keep polling

    const task = (await res.json()) as TaskResponse;
    if (TERMINAL_STATUSES.has(task.status)) {
      if (task.status === 'FAILED' || task.status === 'CANCELED') {
        throw new AristotleFailedError(`Aristotle task ${taskId} ended with status ${task.status}`);
      }
      return task.status;
    }
  }

  throw new AristotleTimeoutError(`Aristotle task ${taskId} timed out after ${timeoutMs / 1000}s`);
}

// Download the result tarball for a completed project.
export async function downloadResult(projectId: string): Promise<Buffer> {
  const apiKey = getApiKey();
  const res = await fetch(`${BASE_URL}/project/${projectId}/result`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok) {
    throw new Error(`Aristotle result download: ${res.status} ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

const DECL_PATTERN = /^(theorem|def|lemma|noncomputable)\b/m;

// Extract the most relevant .lean file from the output tarball.
// Aristotle may split the proof across multiple files; we pick the one with
// actual theorem/def/lemma declarations, falling back to the largest file.
export function extractLeanFromTarball(tarBuffer: Buffer, taskId: string): string {
  const tarPath = join(tmpdir(), `aristotle-${taskId}.tar.gz`);
  try {
    writeFileSync(tarPath, tarBuffer);

    const leanFiles = execSync(`tar -tzf "${tarPath}"`, { maxBuffer: 10 * 1024 * 1024 })
      .toString('utf-8')
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.endsWith('.lean'));

    if (!leanFiles.length) {
      throw new Error('No .lean files found in Aristotle output tarball');
    }

    let bestContent = '';
    let bestHasDecl = false;

    for (const file of leanFiles) {
      try {
        const content = execSync(`tar -xzf "${tarPath}" -O "${file}"`, {
          maxBuffer: 10 * 1024 * 1024,
        }).toString('utf-8');

        const hasDecl = DECL_PATTERN.test(content);
        if (!bestContent || (hasDecl && (!bestHasDecl || content.length > bestContent.length))) {
          bestContent = content;
          bestHasDecl = hasDecl;
        }
      } catch {
        // skip unreadable files
      }
    }

    if (!bestContent) {
      throw new Error('Failed to extract any .lean file from Aristotle output tarball');
    }

    return bestContent;
  } finally {
    try {
      rmSync(tarPath);
    } catch {
      // ignore cleanup failures
    }
  }
}

// Used by the watchdog to non-blockingly check the latest task for a project.
// Returns null if the project has no tasks yet.
export async function getLatestTaskStatus(
  projectId: string,
): Promise<{ taskId: string; status: TaskStatus } | null> {
  const apiKey = getApiKey();
  const res = await fetch(`${BASE_URL}/project/${projectId}/tasks?limit=1`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!res.ok) throw new Error(`Aristotle task lookup: ${res.status}`);
  const { agent_tasks } = (await res.json()) as TasksListResponse;
  if (!agent_tasks.length) return null;
  return { taskId: agent_tasks[0].agent_task_id, status: agent_tasks[0].status };
}
