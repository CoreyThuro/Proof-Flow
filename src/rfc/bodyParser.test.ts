import { parseRfcBody } from './bodyParser';

const FULL_BODY = `
## Proof strategy

We proceed by induction on the length of the list, using the standard
Mathlib list induction principle.

## Prior work

See Mathlib.Data.List.Basic for related lemmas. Prior discussion on Zulip:
https://leanprover.zulipchat.com/...

## Proposed decomposition

1. Prove the base case (empty list).
2. Prove the inductive step using List.cons_append.
3. Combine via List.induction.

## Known obstacles

The automation gap at step 2 may require manual case analysis.

## Alternatives considered

Initially considered using List.rec directly, but induction tactic is cleaner.
Rejected omega because it doesn't handle structural recursion.
`;

describe('parseRfcBody', () => {
  it('returns valid: true with no missing fields when all 5 sections are present', () => {
    const result = parseRfcBody(FULL_BODY);
    expect(result.valid).toBe(true);
    expect(result.missingFields).toEqual([]);
    expect(result.presentFields).toHaveLength(5);
  });

  it('returns valid: false with correct missingFields when 2 sections are absent', () => {
    const partial = `
## Proof strategy

We proceed by induction.

## Prior work

See Mathlib.

## Proposed decomposition

Three steps as outlined above.
`;
    const result = parseRfcBody(partial);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('Known obstacles');
    expect(result.missingFields).toContain('Alternatives considered');
    expect(result.missingFields).toHaveLength(2);
    expect(result.presentFields).toHaveLength(3);
  });

  it('treats a section with only "N/A" as missing', () => {
    const body = `
## Proof strategy

We proceed by induction.

## Prior work

N/A

## Proposed decomposition

Three steps.

## Known obstacles

TBD

## Alternatives considered

TODO
`;
    const result = parseRfcBody(body);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('Prior work');
    expect(result.missingFields).toContain('Known obstacles');
    expect(result.missingFields).toContain('Alternatives considered');
  });

  it('treats a section with only dashes as missing', () => {
    const body = `
## Proof strategy

Real content here.

## Prior work

---

## Proposed decomposition

More real content.

## Known obstacles

Real obstacle described here.

## Alternatives considered

We considered option A and B.
`;
    const result = parseRfcBody(body);
    expect(result.missingFields).toContain('Prior work');
    expect(result.presentFields).not.toContain('Prior work');
  });

  it('returns all 5 as missing for an empty body', () => {
    const result = parseRfcBody('');
    expect(result.valid).toBe(false);
    expect(result.missingFields).toHaveLength(5);
    expect(result.presentFields).toHaveLength(0);
  });

  it('is case-insensitive for heading matching', () => {
    const body = `
## proof strategy

We proceed by induction.

## PRIOR WORK

See Mathlib.

## Proposed Decomposition

Three steps.

## known obstacles

None at this time.

## Alternatives Considered

Considered A and B.
`;
    const result = parseRfcBody(body);
    expect(result.valid).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  it('ignores content outside of required headings', () => {
    const body = `
# Overall description

This RFC proposes a new theorem about lists.

## Proof strategy

By induction.

## Prior work

Mathlib list lemmas.

## Proposed decomposition

Step 1, step 2, step 3.

## Known obstacles

Gap in automation.

## Alternatives considered

Tried direct recursion, rejected.

## Additional notes

Something extra here.
`;
    const result = parseRfcBody(body);
    expect(result.valid).toBe(true);
  });
});
