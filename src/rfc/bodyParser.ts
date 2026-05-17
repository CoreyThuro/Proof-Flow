export interface RfcBodyParseResult {
  valid: boolean;
  missingFields: string[];
  presentFields: string[];
}

const REQUIRED_FIELDS = [
  'Proof strategy',
  'Prior work',
  'Proposed decomposition',
  'Known obstacles',
  'Alternatives considered',
] as const;

const PLACEHOLDER_PATTERN = /^\s*(n\/a|tbd|todo|-+)\s*$/i;

const HEADING_PATTERN = /^#{1,6}\s+(.+)$/;

function normalise(s: string): string {
  return s.trim().toLowerCase();
}

function fieldMatches(heading: string, field: string): boolean {
  return normalise(heading) === normalise(field);
}

export function parseRfcBody(body: string): RfcBodyParseResult {
  const lines = body.split('\n');

  // Map from field name → content lines collected under that heading
  const sections = new Map<string, string[]>(REQUIRED_FIELDS.map((f) => [f, []]));
  let currentField: string | null = null;

  for (const line of lines) {
    const headingMatch = HEADING_PATTERN.exec(line);
    if (headingMatch) {
      const headingText = headingMatch[1].trim();
      const matched = REQUIRED_FIELDS.find((f) => fieldMatches(headingText, f));
      currentField = matched ?? null;
      continue;
    }

    if (currentField !== null) {
      sections.get(currentField)?.push(line);
    }
  }

  const presentFields: string[] = [];
  const missingFields: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const contentLines = sections.get(field) ?? [];
    const hasRealContent = contentLines.some(
      (l) => l.trim().length > 0 && !PLACEHOLDER_PATTERN.test(l),
    );

    if (hasRealContent) {
      presentFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
    presentFields,
  };
}
