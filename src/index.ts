import type { ApplicationFunctionOptions } from 'probot';
import { Probot } from 'probot';
import { handleInstallation } from './handlers/installation';
import { handleRfcLabeled } from './handlers/rfcLabeled';
import { handleRfcEdited } from './handlers/rfcEdited';
import { handleIssueCommentCreated } from './handlers/issueCommentCreated';
import { handleIssueReopened } from './handlers/issueReopened';
import { handlePullRequestOpened } from './handlers/pullRequestOpened';
import { handlePullRequestSynchronize } from './handlers/pullRequestSynchronize';
import { handlePullRequestClosed } from './handlers/pullRequestClosed';
import { startAbandonmentScheduler, startAgentWatchdog } from './rfc/scheduler';
import { dashboardApiHandler, dashboardUiHandler } from './dashboard/api';
import { handleCheckRunCompletedEvent } from './handlers/checkRunCompleted';

export default function app(robot: Probot, { getRouter }: ApplicationFunctionOptions = {}): void {
  if (getRouter) {
    const router = getRouter('/');
    router.get('/health', (_req, res) => res.json({ ok: true }));
    router.get('/api/repos/:owner/:name/dashboard', (req, res) => {
      dashboardApiHandler(req, res).catch((err) => {
        robot.log.error({ err }, 'dashboard API error');
        res.status(500).json({ error: 'Internal server error' });
      });
    });
    router.get('/dashboard/:owner/:name', dashboardUiHandler);
  }

  robot.on('installation.created', handleInstallation);
  robot.on('installation_repositories.added', handleInstallation);
  robot.on('issues.labeled', handleRfcLabeled);
  robot.on('issues.edited', handleRfcEdited);
  robot.on('issue_comment.created', handleIssueCommentCreated);
  robot.on('issues.reopened', handleIssueReopened);
  robot.on('pull_request.opened', handlePullRequestOpened);
  robot.on('pull_request.synchronize', handlePullRequestSynchronize);
  robot.on('pull_request.closed', handlePullRequestClosed);
  robot.on('check_run.completed', handleCheckRunCompletedEvent);

  startAbandonmentScheduler(robot);
  startAgentWatchdog(robot);
}
