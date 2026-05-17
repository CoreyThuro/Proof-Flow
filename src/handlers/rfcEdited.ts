import type { Context } from 'probot';
import { getRepoByGithubId } from '../db/queries/repos';
import { getRfcByIssueNumber } from '../db/queries/rfcs';
import { parseRfcBody } from '../rfc/bodyParser';
import { bootstrapRfc } from '../rfc/bootstrap';
import { postIncompleteComment, updateWelcomeComment } from '../rfc/comments';
import { DEFAULT_CONFIG } from '../config/parser';
import type { ProofFlowConfig } from '../config/parser';

export async function handleRfcEdited(context: Context<'issues.edited'>): Promise<void> {
  const labels: { name: string }[] = context.payload.issue.labels ?? [];
  const hasRfcLabel = labels.some((l) => l.name === 'proofflow-rfc');
  if (!hasRfcLabel) {
    return;
  }

  const repo = await getRepoByGithubId(context.payload.repository.id);
  if (!repo) {
    return;
  }

  const config: ProofFlowConfig = { ...DEFAULT_CONFIG, ...(repo.config_json as unknown as Partial<ProofFlowConfig> ?? {}) };
  const issue = context.payload.issue;
  const parseResult = parseRfcBody(issue.body ?? '');
  const existing = await getRfcByIssueNumber(repo.id, issue.number);

  if (!existing) {
    if (parseResult.valid) {
      // RFC not yet registered but body is now complete — bootstrap it.
      // Cast is safe: both events share the same issue/repository/octokit shape.
      await bootstrapRfc(
        context as unknown as Context<'issues.labeled'>,
        repo,
        parseResult,
        config,
      );
    } else {
      await postIncompleteComment(
        context as unknown as Context<'issues.labeled'>,
        parseResult.missingFields,
      );
    }
    return;
  }

  // RFC exists — only re-validate while it's still open.
  if (existing.state !== 'open') {
    return;
  }

  await updateWelcomeComment(
    context as unknown as Context<'issues.labeled'>,
    existing,
    parseResult,
  );
}
