"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertSnapshot = insertSnapshot;
exports.getLatestSnapshot = getLatestSnapshot;
const client_1 = require("../client");
async function insertSnapshot(repoId, counts) {
    const rows = await (0, client_1.query)(`INSERT INTO dashboard_snapshots
       (repo_id, rfc_open, rfc_approved, rfc_abandoned, rfc_closed, theorems_formalized_with_rfc)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`, [
        repoId,
        counts.rfc_open,
        counts.rfc_approved,
        counts.rfc_abandoned,
        counts.rfc_closed,
        counts.theorems_formalized_with_rfc,
    ]);
    if (!rows[0])
        throw new Error('insertSnapshot returned no rows');
    return rows[0];
}
async function getLatestSnapshot(repoId) {
    return (0, client_1.queryOne)(`SELECT * FROM dashboard_snapshots WHERE repo_id = $1 ORDER BY snapshot_at DESC LIMIT 1`, [repoId]);
}
//# sourceMappingURL=dashboardSnapshots.js.map