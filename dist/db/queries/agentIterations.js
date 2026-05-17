"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertAgentIteration = insertAgentIteration;
exports.updateAgentIteration = updateAgentIteration;
exports.getIterationsByTaskId = getIterationsByTaskId;
exports.getLatestIteration = getLatestIteration;
const client_1 = require("../client");
async function insertAgentIteration(taskId, iterationNumber, leanCode, promptTokens, completionTokens, prover = 'claude') {
    const rows = await (0, client_1.query)(`INSERT INTO agent_iterations
       (task_id, iteration_number, lean_code, prompt_tokens, completion_tokens, prover)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`, [taskId, iterationNumber, leanCode, promptTokens, completionTokens, prover]);
    if (!rows[0])
        throw new Error('insertAgentIteration returned no rows');
    return rows[0];
}
async function updateAgentIteration(id, fields) {
    const sets = [];
    const values = [];
    let i = 1;
    if (fields.ci_output !== undefined) {
        sets.push(`ci_output = $${i++}`);
        values.push(fields.ci_output);
    }
    if (fields.ci_passed !== undefined) {
        sets.push(`ci_passed = $${i++}`);
        values.push(fields.ci_passed);
    }
    if (sets.length === 0)
        return;
    values.push(id);
    await (0, client_1.query)(`UPDATE agent_iterations SET ${sets.join(', ')} WHERE id = $${i}`, values);
}
async function getIterationsByTaskId(taskId) {
    return (0, client_1.query)(`SELECT * FROM agent_iterations WHERE task_id = $1 ORDER BY iteration_number ASC`, [taskId]);
}
async function getLatestIteration(taskId) {
    return (0, client_1.queryOne)(`SELECT * FROM agent_iterations WHERE task_id = $1 ORDER BY iteration_number DESC LIMIT 1`, [taskId]);
}
//# sourceMappingURL=agentIterations.js.map