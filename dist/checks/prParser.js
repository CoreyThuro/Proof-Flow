"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePrRfcRefs = parsePrRfcRefs;
const RFC_REF_PATTERNS = [
    /(?:closes|fixes|resolves)\s+#(\d+)/gi,
    /RFC:\s*#(\d+)/gi,
    /Proof\s+RFC\s+#(\d+)/gi,
    /proofflow-rfc\s+#(\d+)/gi,
];
function parsePrRfcRefs(body) {
    const refs = new Set();
    for (const pattern of RFC_REF_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(body)) !== null) {
            refs.add(parseInt(match[1], 10));
        }
    }
    return Array.from(refs);
}
//# sourceMappingURL=prParser.js.map