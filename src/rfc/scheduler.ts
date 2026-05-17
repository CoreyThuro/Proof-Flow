import { Probot } from 'probot';
import { schedule } from 'node-cron';
import { query } from '../db/client';
import { transitionToAbandoned } from './transitions';
import { getStaleRunningTasks, getStaleNoPrTasks, updateAgentTask } from '../db/queries/agentTasks';
import { getRfcById } from '../db/queries/rfcs';
import { getRepoById } from '../db/queries/repos';
import { handleCheckRunCompleted } from '../agent/worker';
import type { AgentOctokit } from '../agent/worker';
import type { ProofFlowConfig } from '../config/parser';
import { DEFAULT_CONFIG } from '../config/parser';
import { getLatestTaskStatus } from '../agent/aristotleClient';

export function startAbandonmentScheduler(robot: Probot): void {
  schedule('0 0 * * *', () => {
    runAbandonmentCheck(robot).catch((err: unknown) => {
      robot.log.error({ err }, 'Abandonment check failed');
    });
  });
}

async function runAbandonmentCheck(robot: Probot): Promise<void> {
  const rows = await query<{ id: bigint }>(
    `SELECT id FROM rfcs WHERE state = 'open' AND abandon_after < NOW()`,
    [],
  );

  for (const row of rows) {
    try {
      await transitionToAbandoned(row.id, robot);
    } catch (err: unknown) {
      robot.log.error({ rfcId: row.id, err }, 'Failed to abandon RFC');
    }
  }
}

export function startAgentWatchdog(robot: Probot): void {
  schedule('*/15 * * * *', () => {
    Promise.all([
      runAgentWatchdog(robot),
      runNoPrWatchdog(robot),
    ]).catch((err: unknown) => {
      robot.log.error({ err }, 'Agent watchdog failed');
    });
  });
}

async function runAgentWatchdog(robot: Probot): Promise<void> {
  const staleTasks = await getStaleRunningTasks();

  for (const task of staleTasks) {
    try {
      const [rfc, repo] = await Promise.all([
        getRfcById(task.rfc_id),
        getRepoById(task.repo_id),
      ]);

      if (!rfc || !repo || repo.installation_id == null) {
        await updateAgentTask(task.id, { state: 'failed', completed_at: new Date(), failure_reason: 'watchdog: repo or RFC not found' });
        continue;
      }

      if (!task.draft_pr_number || !task.branch_name) {
        await updateAgentTask(task.id, { state: 'failed', completed_at: new Date(), failure_reason: 'watchdog: no draft PR recorded' });
        continue;
      }

      const octokit = await robot.auth(Number(repo.installation_id));
      const agentOctokit = octokit as unknown as AgentOctokit;
      const owner = repo.github_owner;
      const repoName = repo.github_name;

      const checksResponse = await agentOctokit.rest.checks.listForRef({
        owner,
        repo: repoName,
        ref: task.branch_name,
        per_page: 10,
      });

      const latestCheck = checksResponse.data.check_runs
        .filter((c) => c.conclusion !== null)
        .sort((a, b) => b.id - a.id)[0];

      if (!latestCheck) {
        robot.log.info({ taskId: task.id }, 'Agent watchdog: no completed check run yet, skipping');
        continue;
      }

      const config: ProofFlowConfig = {
        ...DEFAULT_CONFIG,
        ...(repo.config_json as unknown as Partial<ProofFlowConfig> ?? {}),
      };

      const issueOctokit = octokit as unknown as AgentOctokit & {
        rest: { issues: { get: (p: { owner: string; repo: string; issue_number: number }) => Promise<{ data: { title: string; body: string | null } }> } };
      };
      const issueData = await issueOctokit.rest.issues.get({
        owner,
        repo: repoName,
        issue_number: rfc.github_issue_number,
      });

      await handleCheckRunCompleted(
        agentOctokit,
        owner,
        repoName,
        task.branch_name,
        task.draft_pr_number,
        latestCheck.conclusion ?? 'failure',
        latestCheck.output?.text ?? latestCheck.output?.summary ?? '',
        rfc.github_issue_number,
        issueData.data.body ?? '',
        issueData.data.title,
        rfc.author_login,
        config.aiAgent?.targetDirectory,
      );
    } catch (err: unknown) {
      robot.log.error({ taskId: task.id, err }, 'Agent watchdog failed for task');
    }
  }
}

async function runNoPrWatchdog(robot: Probot): Promise<void> {
  const staleTasks = await getStaleNoPrTasks();

  for (const task of staleTasks) {
    try {
      const [rfc, repo] = await Promise.all([
        getRfcById(task.rfc_id),
        getRepoById(task.repo_id),
      ]);

      if (!rfc || !repo) {
        await updateAgentTask(task.id, { state: 'failed', completed_at: new Date(), failure_reason: 'watchdog: repo or RFC not found' });
        continue;
      }

      // If we have an Aristotle project ID, check whether it's still running
      if (task.aristotle_project_id) {
        try {
          const result = await getLatestTaskStatus(task.aristotle_project_id);
          if (result && (result.status === 'QUEUED' || result.status === 'IN_PROGRESS')) {
            robot.log.info({ taskId: task.id, status: result.status }, 'No-PR watchdog: Aristotle still running, skipping');
            continue;
          }
        } catch {
          // Status check failed — treat as stalled
        }
      }

      const reason = task.aristotle_project_id
        ? `watchdog: Aristotle project stalled (app likely restarted during solve)`
        : 'watchdog: task stalled before branch/PR creation';

      await updateAgentTask(task.id, { state: 'failed', completed_at: new Date(), failure_reason: reason });

      if (repo.installation_id != null) {
        const octokit = await robot.auth(Number(repo.installation_id));
        await octokit.rest.issues.createComment({
          owner: repo.github_owner,
          repo: repo.github_name,
          issue_number: rfc.github_issue_number,
          body: `ProofFlow Agent — attempt stalled and recovered by watchdog.\n\n${reason}\n\nTo retry: re-apply \`proofflow:start-agent\`.`,
        });
      }
    } catch (err: unknown) {
      robot.log.error({ taskId: task.id, err }, 'No-PR watchdog failed for task');
    }
  }
}
