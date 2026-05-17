"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logTransition = logTransition;
const stateLog_1 = require("../db/queries/stateLog");
async function logTransition(rfcId, fromState, toState, actorLogin, reason) {
    await (0, stateLog_1.insertStateLog)(rfcId, fromState, toState, actorLogin, reason);
}
//# sourceMappingURL=stateLog.js.map