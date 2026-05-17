"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertRfcApproval = insertRfcApproval;
exports.getRfcApprovalCount = getRfcApprovalCount;
exports.getRfcApproval = getRfcApproval;
exports.deleteRfcApprovals = deleteRfcApprovals;
const client_1 = require("../client");
async function insertRfcApproval(rfcId, approverLogin, commentId) {
    const rows = await (0, client_1.query)(`INSERT INTO rfc_approvals (rfc_id, approver_login, comment_id)
     VALUES ($1, $2, $3)
     RETURNING *`, [rfcId, approverLogin, commentId]);
    if (!rows[0]) {
        throw new Error('insertRfcApproval returned no rows');
    }
    return rows[0];
}
async function getRfcApprovalCount(rfcId) {
    const rows = await (0, client_1.query)(`SELECT COUNT(*) AS count FROM rfc_approvals WHERE rfc_id = $1`, [rfcId]);
    return parseInt(rows[0]?.count ?? '0', 10);
}
async function getRfcApproval(rfcId, approverLogin) {
    return (0, client_1.queryOne)(`SELECT * FROM rfc_approvals WHERE rfc_id = $1 AND approver_login = $2`, [rfcId, approverLogin]);
}
async function deleteRfcApprovals(rfcId) {
    await (0, client_1.query)(`DELETE FROM rfc_approvals WHERE rfc_id = $1`, [rfcId]);
}
//# sourceMappingURL=rfcApprovals.js.map