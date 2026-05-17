"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAttributionDocstring = hasAttributionDocstring;
exports.getAttributionTemplate = getAttributionTemplate;
const ATTRIBUTION_MARKER = '/-!';
function hasAttributionDocstring(patch) {
    return patch
        .split('\n')
        .filter((line) => line.startsWith('+'))
        .some((line) => line.includes(ATTRIBUTION_MARKER));
}
function getAttributionTemplate(rfcAuthorLogin, issueNumber) {
    return (`/-! ### Attribution\n` +
        `Proof strategy: @${rfcAuthorLogin}, Proof RFC #${issueNumber}.\n` +
        `-/`);
}
//# sourceMappingURL=attributionDetector.js.map