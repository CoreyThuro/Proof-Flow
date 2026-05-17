"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDashboardSnapshot = buildDashboardSnapshot;
const client_1 = require("../db/client");
const dashboardSnapshots_1 = require("../db/queries/dashboardSnapshots");
async function buildDashboardSnapshot(repoId) {
    const stateCounts = await (0, client_1.query)(`SELECT state, COUNT(*) AS count FROM rfcs WHERE repo_id = $1 GROUP BY state`, [repoId]);
    const counts = { rfc_open: 0, rfc_approved: 0, rfc_abandoned: 0, rfc_closed: 0 };
    for (const row of stateCounts) {
        if (row.state === 'open')
            counts.rfc_open = parseInt(row.count, 10);
        else if (row.state === 'approved')
            counts.rfc_approved = parseInt(row.count, 10);
        else if (row.state === 'abandoned')
            counts.rfc_abandoned = parseInt(row.count, 10);
        else if (row.state === 'closed')
            counts.rfc_closed = parseInt(row.count, 10);
    }
    const attributionRows = await (0, client_1.query)(`SELECT COUNT(DISTINCT rfc_id) AS count FROM rfc_attributions
     WHERE rfc_id IN (SELECT id FROM rfcs WHERE repo_id = $1)`, [repoId]);
    const theorems = parseInt(attributionRows[0]?.count ?? '0', 10);
    await (0, dashboardSnapshots_1.insertSnapshot)(repoId, { ...counts, theorems_formalized_with_rfc: theorems });
}
//# sourceMappingURL=snapshot.js.map