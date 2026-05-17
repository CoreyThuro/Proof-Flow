"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = app;
const installation_1 = require("./handlers/installation");
const rfcLabeled_1 = require("./handlers/rfcLabeled");
const rfcEdited_1 = require("./handlers/rfcEdited");
const issueCommentCreated_1 = require("./handlers/issueCommentCreated");
const issueReopened_1 = require("./handlers/issueReopened");
const pullRequestOpened_1 = require("./handlers/pullRequestOpened");
const pullRequestSynchronize_1 = require("./handlers/pullRequestSynchronize");
const pullRequestClosed_1 = require("./handlers/pullRequestClosed");
const scheduler_1 = require("./rfc/scheduler");
const api_1 = require("./dashboard/api");
const checkRunCompleted_1 = require("./handlers/checkRunCompleted");
function app(robot, { getRouter } = {}) {
    if (getRouter) {
        const router = getRouter('/');
        router.get('/health', (_req, res) => res.json({ ok: true }));
        router.get('/api/repos/:owner/:name/dashboard', (req, res) => {
            (0, api_1.dashboardApiHandler)(req, res).catch((err) => {
                robot.log.error({ err }, 'dashboard API error');
                res.status(500).json({ error: 'Internal server error' });
            });
        });
        router.get('/dashboard/:owner/:name', api_1.dashboardUiHandler);
    }
    robot.on('installation.created', installation_1.handleInstallation);
    robot.on('installation_repositories.added', installation_1.handleInstallation);
    robot.on('issues.labeled', rfcLabeled_1.handleRfcLabeled);
    robot.on('issues.edited', rfcEdited_1.handleRfcEdited);
    robot.on('issue_comment.created', issueCommentCreated_1.handleIssueCommentCreated);
    robot.on('issues.reopened', issueReopened_1.handleIssueReopened);
    robot.on('pull_request.opened', pullRequestOpened_1.handlePullRequestOpened);
    robot.on('pull_request.synchronize', pullRequestSynchronize_1.handlePullRequestSynchronize);
    robot.on('pull_request.closed', pullRequestClosed_1.handlePullRequestClosed);
    robot.on('check_run.completed', checkRunCompleted_1.handleCheckRunCompletedEvent);
    (0, scheduler_1.startAbandonmentScheduler)(robot);
    (0, scheduler_1.startAgentWatchdog)(robot);
}
//# sourceMappingURL=index.js.map