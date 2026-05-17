import type { ProofFlowConfig } from '../config/parser';

export function isLgtmComment(
  body: string,
  commenterLogin: string,
  config: ProofFlowConfig,
): boolean {
  if (!/^LGTM\b/i.test(body)) return false;
  return config.seniorContributors.includes(commenterLogin);
}
