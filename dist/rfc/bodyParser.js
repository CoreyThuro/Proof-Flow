"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRfcBody = parseRfcBody;
const REQUIRED_FIELDS = [
    'Proof strategy',
    'Prior work',
    'Proposed decomposition',
    'Known obstacles',
    'Alternatives considered',
];
const PLACEHOLDER_PATTERN = /^\s*(n\/a|tbd|todo|-+)\s*$/i;
const HEADING_PATTERN = /^#{1,6}\s+(.+)$/;
function normalise(s) {
    return s.trim().toLowerCase();
}
function fieldMatches(heading, field) {
    return normalise(heading) === normalise(field);
}
function parseRfcBody(body) {
    const lines = body.split('\n');
    // Map from field name → content lines collected under that heading
    const sections = new Map(REQUIRED_FIELDS.map((f) => [f, []]));
    let currentField = null;
    for (const line of lines) {
        const headingMatch = HEADING_PATTERN.exec(line);
        if (headingMatch) {
            const headingText = headingMatch[1].trim();
            const matched = REQUIRED_FIELDS.find((f) => fieldMatches(headingText, f));
            currentField = matched ?? null;
            continue;
        }
        if (currentField !== null) {
            sections.get(currentField)?.push(line);
        }
    }
    const presentFields = [];
    const missingFields = [];
    for (const field of REQUIRED_FIELDS) {
        const contentLines = sections.get(field) ?? [];
        const hasRealContent = contentLines.some((l) => l.trim().length > 0 && !PLACEHOLDER_PATTERN.test(l));
        if (hasRealContent) {
            presentFields.push(field);
        }
        else {
            missingFields.push(field);
        }
    }
    return {
        valid: missingFields.length === 0,
        missingFields,
        presentFields,
    };
}
//# sourceMappingURL=bodyParser.js.map