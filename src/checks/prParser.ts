const RFC_REF_PATTERNS = [
  /(?:closes|fixes|resolves)\s+#(\d+)/gi,
  /RFC:\s*#(\d+)/gi,
  /Proof\s+RFC\s+#(\d+)/gi,
  /proofflow-rfc\s+#(\d+)/gi,
];

export function parsePrRfcRefs(body: string): number[] {
  const refs = new Set<number>();
  for (const pattern of RFC_REF_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(body)) !== null) {
      refs.add(parseInt(match[1], 10));
    }
  }
  return Array.from(refs);
}
