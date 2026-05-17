"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertRfcPrLink = upsertRfcPrLink;
exports.getRfcPrLinksByRfcId = getRfcPrLinksByRfcId;
exports.getOpenRfcPrLinks = getOpenRfcPrLinks;
exports.updateCheckRunId = updateCheckRunId;
exports.updatePrState = updatePrState;
const client_1 = require("../client");
async function upsertRfcPrLink(rfcId, repoId, prNumber, checkRunId) {
    const rows = await (0, client_1.query)(`INSERT INTO rfc_pr_links (rfc_id, repo_id, pr_number, check_run_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (repo_id, pr_number, rfc_id)
     DO UPDATE SET check_run_id = EXCLUDED.check_run_id
     RETURNING *`, [rfcId, repoId, prNumber, checkRunId ?? null]);
    if (!rows[0]) {
        throw new Error('upsertRfcPrLink returned no rows');
    }
    return rows[0];
}
async function getRfcPrLinksByRfcId(rfcId) {
    return (0, client_1.query)(`SELECT * FROM rfc_pr_links WHERE rfc_id = $1`, [rfcId]);
}
async function getOpenRfcPrLinks(rfcId) {
    return (0, client_1.query)(`SELECT * FROM rfc_pr_links WHERE rfc_id = $1 AND pr_state = 'open'`, [rfcId]);
}
async function updateCheckRunId(repoId, prNumber, rfcId, checkRunId) {
    await (0, client_1.query)(`UPDATE rfc_pr_links SET check_run_id = $1
     WHERE repo_id = $2 AND pr_number = $3 AND rfc_id = $4`, [checkRunId, repoId, prNumber, rfcId]);
}
async function updatePrState(repoId, prNumber, state) {
    await (0, client_1.query)(`UPDATE rfc_pr_links SET pr_state = $1 WHERE repo_id = $2 AND pr_number = $3`, [state, repoId, prNumber]);
}
//# sourceMappingURL=rfcPrLinks.js.map