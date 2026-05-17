"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLgtmComment = isLgtmComment;
function isLgtmComment(body, commenterLogin, config) {
    if (!/^LGTM\b/i.test(body))
        return false;
    return config.seniorContributors.includes(commenterLogin);
}
//# sourceMappingURL=lgtmDetector.js.map