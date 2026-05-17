"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertRfc = insertRfc;
exports.getRfcByIssueNumber = getRfcByIssueNumber;
exports.getRfcById = getRfcById;
exports.updateRfcState = updateRfcState;
const client_1 = require("../client");
async function insertRfc(repoId, issueNumber, authorLogin, state, abandonAfter) {
    const now = new Date();
    const rows = await (0, client_1.query)(`INSERT INTO rfcs
       (repo_id, github_issue_number, state, author_login, opened_at, state_updated_at, abandon_after)
     VALUES ($1, $2, $3, $4, $5, $5, $6)
     RETURNING *`, [repoId, issueNumber, state, authorLogin, now, abandonAfter]);
    if (!rows[0]) {
        throw new Error('insertRfc returned no rows');
    }
    return rows[0];
}
async function getRfcByIssueNumber(repoId, issueNumber) {
    return (0, client_1.queryOne)(`SELECT * FROM rfcs WHERE repo_id = $1 AND github_issue_number = $2`, [repoId, issueNumber]);
}
async function getRfcById(rfcId) {
    return (0, client_1.queryOne)(`SELECT * FROM rfcs WHERE id = $1`, [rfcId]);
}
async function updateRfcState(rfcId, state, stateUpdatedAt, abandonAfter) {
    if (abandonAfter !== undefined) {
        await (0, client_1.query)(`UPDATE rfcs SET state = $1, state_updated_at = $2, abandon_after = $3 WHERE id = $4`, [state, stateUpdatedAt, abandonAfter, rfcId]);
    }
    else {
        await (0, client_1.query)(`UPDATE rfcs SET state = $1, state_updated_at = $2 WHERE id = $3`, [
            state,
            stateUpdatedAt,
            rfcId,
        ]);
    }
}
//# sourceMappingURL=rfcs.js.map