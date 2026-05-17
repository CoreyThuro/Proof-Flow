const ATTRIBUTION_MARKER = '/-!';

export function hasAttributionDocstring(patch: string): boolean {
  return patch
    .split('\n')
    .filter((line) => line.startsWith('+'))
    .some((line) => line.includes(ATTRIBUTION_MARKER));
}

export function getAttributionTemplate(rfcAuthorLogin: string, issueNumber: number): string {
  return (
    `/-! ### Attribution\n` +
    `Proof strategy: @${rfcAuthorLogin}, Proof RFC #${issueNumber}.\n` +
    `-/`
  );
}
