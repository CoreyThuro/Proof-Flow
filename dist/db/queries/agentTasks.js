"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertAgentTask = insertAgentTask;
exports.updateAgentTask = updateAgentTask;
exports.getActiveTaskByRfcId = getActiveTaskByRfcId;
exports.getActiveTaskByDraftPr = getActiveTaskByDraftPr;
exports.getStaleNoPrTasks = getStaleNoPrTasks;
exports.getActiveTaskByBranchName = getActiveTaskByBranchName;
exports.getStaleRunningTasks = getStaleRunningTasks;
const client_1 = require("../client");
async function insertAgentTask(rfcId, repoId, maxIterations) {
    const rows = await (0, client_1.query)(`INSERT INTO agent_tasks (rfc_id, repo_id, state, max_iterations)
     VALUES ($1, $2, 'pending', $3)
     RETURNING *`, [rfcId, repoId, maxIterations]);
    if (!rows[0])
        throw new Error('insertAgentTask returned no rows');
    return rows[0];
}
async function updateAgentTask(taskId, fields) {
    const sets = [];
    const values = [];
    let i = 1;
    if (fields.state !== undefined) {
        sets.push(`state = $${i++}`);
        values.push(fields.state);
    }
    if (fields.iteration_count !== undefined) {
        sets.push(`iteration_count = $${i++}`);
        values.push(fields.iteration_count);
    }
    if (fields.draft_pr_number !== undefined) {
        sets.push(`draft_pr_number = $${i++}`);
        values.push(fields.draft_pr_number);
    }
    if (fields.branch_name !== undefined) {
        sets.push(`branch_name = $${i++}`);
        values.push(fields.branch_name);
    }
    if ('aristotle_project_id' in fields) {
        sets.push(`aristotle_project_id = $${i++}`);
        values.push(fields.aristotle_project_id ?? null);
    }
    if (fields.completed_at !== undefined) {
        sets.push(`completed_at = $${i++}`);
        values.push(fields.completed_at);
    }
    if (fields.failure_reason !== undefined) {
        sets.push(`failure_reason = $${i++}`);
        values.push(fields.failure_reason);
    }
    if (sets.length === 0)
        return;
    values.push(taskId);
    await (0, client_1.query)(`UPDATE agent_tasks SET ${sets.join(', ')} WHERE id = $${i}`, values);
}
async function getActiveTaskByRfcId(rfcId) {
    return (0, client_1.queryOne)(`SELECT * FROM agent_tasks WHERE rfc_id = $1 AND state IN ('pending', 'running')`, [rfcId]);
}
async function getActiveTaskByDraftPr(prNumber) {
    return (0, client_1.queryOne)(`SELECT * FROM agent_tasks WHERE draft_pr_number = $1 AND state IN ('pending', 'running')`, [prNumber]);
}
async function getStaleNoPrTasks() {
    return (0, client_1.query)(`SELECT * FROM agent_tasks
     WHERE state = 'running' AND draft_pr_number IS NULL AND started_at < NOW() - INTERVAL '30 minutes'`, []);
}
async function getActiveTaskByBranchName(branchName) {
    return (0, client_1.queryOne)(`SELECT * FROM agent_tasks WHERE branch_name = $1 AND state IN ('pending', 'running')`, [branchName]);
}
async function getStaleRunningTasks() {
    return (0, client_1.query)(`SELECT * FROM agent_tasks
     WHERE state = 'running' AND started_at < NOW() - INTERVAL '30 minutes'`, []);
}
//# sourceMappingURL=agentTasks.js.map