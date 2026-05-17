"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBelowThreshold = isBelowThreshold;
function isBelowThreshold(changedFiles, config) {
    if (changedFiles.length === 0)
        return false;
    const allLean = changedFiles.every((f) => f.endsWith('.lean'));
    if (!allLean)
        return false;
    if (config.rfcRequiredThreshold.newFiles)
        return false;
    if (config.rfcRequiredThreshold.newDefinitions)
        return false;
    return false;
}
//# sourceMappingURL=thresholdCheck.js.map