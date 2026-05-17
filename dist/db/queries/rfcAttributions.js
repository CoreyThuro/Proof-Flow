"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertRfcAttribution = insertRfcAttribution;
const client_1 = require("../client");
async function insertRfcAttribution(rfcId, prNumber, leanFilePath) {
    await (0, client_1.query)(`INSERT INTO rfc_attributions (rfc_id, pr_number, lean_file_path)
     VALUES ($1, $2, $3)
     ON CONFLICT (rfc_id, lean_file_path) DO NOTHING`, [rfcId, prNumber, leanFilePath]);
}
//# sourceMappingURL=rfcAttributions.js.map