"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertStateLog = insertStateLog;
const client_1 = require("../client");
async function insertStateLog(rfcId, fromState, toState, actorLogin, reason) {
    await (0, client_1.query)(`INSERT INTO rfc_state_log (rfc_id, from_state, to_state, actor_login, reason)
     VALUES ($1, $2, $3, $4, $5)`, [rfcId, fromState, toState, actorLogin, reason ?? null]);
}
//# sourceMappingURL=stateLog.js.map