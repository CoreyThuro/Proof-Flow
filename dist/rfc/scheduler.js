"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAbandonmentScheduler = startAbandonmentScheduler;
exports.startAgentWatchdog = startAgentWatchdog;
const node_cron_1 = require("node-cron");
const client_1 = require("../db/client");
const transitions_1 = require("./transitions");
const agentTasks_1 = require("../db/queries/agentTasks");
const rfcs_1 = require("../db/queries/rfcs");
const repos_1 = require("../db/queries/repos");
const worker_1 = require("../agent/worker");
const parser_1 = require("../config/parser");
const aristotleClient_1 = require("../agent/aristotleClient");
function startAbandonmentScheduler(robot) {
    (0, node_cron_1.schedule)('0 0 * * *', () => {
        runAbandonmentCheck(robot).catch((err) => {
            robot.log.error({ err }, 'Abandonment check failed');
        });
    });
}
async function runAbandonmentCheck(robot) {
    const rows = await (0, client_1.query)(`SELECT id FROM rfcs WHERE state = 'open' AND abandon_after < NOW()`, []);
    for (const row of rows) {
        try {
            await (0, transitions_1.transitionToAbandoned)(row.id, robot);
        }
        catch (err) {
            robot.log.error({ rfcId: row.id, err }, 'Failed to abandon RFC');
        }
    }
}
function startAgentWatchdog(robot) {
    (0, node_cron_1.schedule)('*/15 * * * *', () => {
        Promise.all([
            runAgentWatchdog(robot),
            runNoPrWatchdog(robot),
        ]).catch((err) => {
            robot.log.error({ err }, 'Agent watchdog failed');
        });
    });
}
async function runAgentWatchdog(robot) {
    const staleTasks = await (0, agentTasks_1.getStaleRunningTasks)();
    for (const task of staleTasks) {
        try {
            const [rfc, repo] = await Promise.all([
                (0, rfcs_1.getRfcById)(task.rfc_id),
                (0, repos_1.getRepoById)(task.repo_id),
            ]);
            if (!rfc || !repo || repo.installation_id == null) {
                await (0, agentTasks_1.updateAgentTask)(task.id, { state: 'failed', completed_at: new Date(), failure_reason: 'watchdog: repo or RFC not found' });
                continue;
            }
            if (!task.draft_pr_number || !task.branch_name) {
                await (0, agentTasks_1.updateAgentTask)(task.id, { state: 'failed', completed_at: new Date(), failure_reason: 'watchdog: no draft PR recorded' });
                continue;
            }
            const octokit = await robot.auth(Number(repo.installation_id));
            const agentOctokit = octokit;
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
            const config = {
                ...parser_1.DEFAULT_CONFIG,
                ...(repo.config_json ?? {}),
            };
            const issueOctokit = octokit;
            const issueData = await issueOctokit.rest.issues.get({
                owner,
                repo: repoName,
                issue_number: rfc.github_issue_number,
            });
            await (0, worker_1.handleCheckRunCompleted)(agentOctokit, owner, repoName, task.branch_name, task.draft_pr_number, latestCheck.conclusion ?? 'failure', latestCheck.output?.text ?? '', rfc.github_issue_number, issueData.data.body ?? '', issueData.data.title, rfc.author_login, config.aiAgent?.targetDirectory);
        }
        catch (err) {
            robot.log.error({ taskId: task.id, err }, 'Agent watchdog failed for task');
        }
    }
}
async function runNoPrWatchdog(robot) {
    const staleTasks = await (0, agentTasks_1.getStaleNoPrTasks)();
    for (const task of staleTasks) {
        try {
            const [rfc, repo] = await Promise.all([
                (0, rfcs_1.getRfcById)(task.rfc_id),
                (0, repos_1.getRepoById)(task.repo_id),
            ]);
            if (!rfc || !repo) {
                await (0, agentTasks_1.updateAgentTask)(task.id, { state: 'failed', completed_at: new Date(), failure_reason: 'watchdog: repo or RFC not found' });
                continue;
            }
            // If we have an Aristotle project ID, check whether it's still running
            if (task.aristotle_project_id) {
                try {
                    const status = await (0, aristotleClient_1.checkProjectStatus)(task.aristotle_project_id);
                    if (status === 'QUEUED' || status === 'IN_PROGRESS') {
                        robot.log.info({ taskId: task.id, status }, 'No-PR watchdog: Aristotle still running, skipping');
                        continue;
                    }
                }
                catch {
                    // Status check failed — treat as stalled
                }
            }
            const reason = task.aristotle_project_id
                ? `watchdog: Aristotle project stalled (app likely restarted during solve)`
                : 'watchdog: task stalled before branch/PR creation';
            await (0, agentTasks_1.updateAgentTask)(task.id, { state: 'failed', completed_at: new Date(), failure_reason: reason });
            if (repo.installation_id != null) {
                const octokit = await robot.auth(Number(repo.installation_id));
                await octokit.rest.issues.createComment({
                    owner: repo.github_owner,
                    repo: repo.github_name,
                    issue_number: rfc.github_issue_number,
                    body: `ProofFlow Agent — attempt stalled and recovered by watchdog.\n\n${reason}\n\nTo retry: re-apply \`proofflow:start-agent\`.`,
                });
            }
        }
        catch (err) {
            robot.log.error({ taskId: task.id, err }, 'No-PR watchdog failed for task');
        }
    }
}
//# sourceMappingURL=scheduler.js.map