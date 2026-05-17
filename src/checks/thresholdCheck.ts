import type { ProofFlowConfig } from '../config/parser';

export function isBelowThreshold(changedFiles: string[], config: ProofFlowConfig): boolean {
  if (changedFiles.length === 0) return false;

  const allLean = changedFiles.every((f) => f.endsWith('.lean'));
  if (!allLean) return false;

  if (config.rfcRequiredThreshold.newFiles) return false;
  if (config.rfcRequiredThreshold.newDefinitions) return false;

  return false;
}
