"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCheckMessage = buildCheckMessage;
function buildCheckMessage(reason, ctx) {
    switch (reason) {
        case 'no_rfc_linked':
            return {
                title: 'No Proof RFC linked',
                summary: 'This PR modifies .lean files but has no linked ProofFlow RFC.',
                details: "Add 'RFC: #N' to the PR body to link an approved RFC.",
            };
        case 'rfc_not_approved': {
            const nums = ctx?.rfcNumbers?.map((n) => `#${n}`).join(', ') ?? '';
            return {
                title: 'RFC not yet approved',
                summary: `Linked RFC(s) ${nums} are not yet approved.`,
                details: 'The RFC must receive required LGTMs before this PR can merge.',
            };
        }
        case 'attribution_missing': {
            const files = ctx?.missingAttributionFiles?.join(', ') ?? '';
            const template = ctx?.template ?? '';
            return {
                title: 'Attribution docstring missing',
                summary: `Modified .lean file(s) are missing the attribution docstring: ${files}`,
                details: `Add the following attribution block to each affected file:\n\n\`\`\`lean\n${template}\n\`\`\``,
            };
        }
        case 'below_threshold_warning':
            return {
                title: 'RFC check passed (below threshold)',
                summary: 'Changes are below the RFC requirement threshold.',
                details: 'No RFC required for this PR.',
            };
    }
}
//# sourceMappingURL=messages.js.map