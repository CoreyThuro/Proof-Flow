 ProofFlow — Possible Next Steps

## Purpose
This note sketches plausible next-step directions for **ProofFlow** as a formalization workflow engine, especially in settings where theorem generation, theorem extension, and proof governance matter.

---

## 1. Theorem Extension from a Seed Paper
Given a seed paper:

- extract the core theorem statements
- identify hypotheses that look stronger than necessary
- propose weakened-hypothesis variants
- propose strengthened-conclusion variants
- suggest corollaries that are “nearby” in the dependency graph
- queue them as RFC candidates rather than immediate proof attempts

### Example workflow
1. ingest paper / theorem statements
2. normalize theorem into a structured statement template
3. generate nearby variants:
   - weaken assumption A
   - replace condition B by B'
   - generalize from finite case to broader class
4. rank variants by plausibility and mathematical value
5. send top candidates into RFC review

---

## 2. Suggest New Theorems, Not Only Formalize Existing Ones
ProofFlow could evolve from:
- “formalize what humans already state”

toward:
- “propose candidate new statements worth investigation”

This should remain **human-gated**.

### Candidate sources
- proof dependency graph gaps
- repeated proof patterns in the repo
- known lemmas that almost imply a stronger result
- analogies across domains
- parameterized families where only small cases are formalized

### Output
Not a claimed theorem, but:
- candidate statement
- motivation
- related lemmas
- expected obstacles
- confidence / novelty estimate

---

## 3. Paper-to-Formalization Bridge
A very useful next step is a workflow from an informal seed paper into a formalization backlog.

### Pipeline
1. parse paper into:
   - definitions
   - lemmas
   - main theorems
   - dependencies
2. generate RFCs for each formal target
3. identify missing intermediate lemmas
4. propose decomposition into formalization tasks
5. route tasks into proof attempts

This would make ProofFlow useful not only for isolated theorem proving, but for **systematic paper formalization**.

---

## 4. Conjecture Queue
Introduce a formal notion of a **conjecture queue**.

These are not yet approved RFCs. They are ideas that need triage.

### A conjecture item could include
- proposed statement
- source (paper / human note / AI suggestion)
- why it might matter
- dependencies
- rough difficulty
- whether it is likely already known in the repo/library

This would help separate:
- proof work
from
- theorem ideation

---

## 5. Theorem Neighborhood Exploration
For any approved theorem or already-proved theorem, ProofFlow could explore its “neighborhood.”

### Questions to ask
- what happens if one hypothesis is dropped?
- can the result be generalized to a wider structure?
- are there obvious dual statements?
- what finite/infinite variants exist?
- are there converse statements worth checking?
- is there a computational / algorithmic corollary?

This is a strong way to generate mathematically meaningful follow-up tasks.

---

## 6. Failure as Knowledge
Right now a failed proof attempt is usually just a failed attempt.

ProofFlow could store:
- where the proof got stuck
- missing lemmas likely needed
- tactic failures
- suspected false conjecture indicators
- whether the statement should be weakened/refined

That would turn failure into reusable mathematical intelligence.

---

## 7. RFC Enrichment for Research Use
The current RFC process could be enriched for research-driven theorem generation.

Additional useful fields:
- novelty estimate
- relationship to known theorem X
- generalization / specialization type
- expected formalization difficulty
- likely missing prerequisite lemmas
- possible counterexample zone

This would make RFCs more than issue templates; they become **research objects**.

---

## 8. Seed-Paper Expansion Mode
A particularly interesting mode:

### Input
One paper or draft.

### Output
A structured expansion pack:
- formalizable theorem list
- missing formal definitions
- candidate lemma ladder
- extension theorem candidates
- conjectures worth exploring
- proof-risk notes
- suggested ordering for formalization

This could be a high-value mode for turning informal mathematics into a governed formal research program.

---

## 9. Counterexample / Refutation Support
For candidate theorem generation, ProofFlow should not only try to prove.

It should also support:
- search for small counterexamples
- identify likely false variants
- mark over-ambitious generalizations early
- redirect effort toward corrected statements

This would make theorem suggestion much less naive.

---

## 10. Future Hyri / Proof Pod Angle
If later connected to Hyri, ProofFlow could become the engine for a **proof workflow pod**:

- theorem proposal
- critique
- decomposition
- proof attempt
- CI/checker result
- retry / revision
- acceptance

In that setting, Hyri would be the cockpit and ProofFlow the theorem-governance engine.

---

## Minimal Practical Next Step
The most concrete near-term next step is probably:

### “Seed paper expansion”
Given a seed paper:
1. extract theorem statements
2. propose nearby theorem extensions
3. identify missing lemmas
4. rank candidates
5. create RFC-ready theorem proposals

This is ambitious enough to be interesting, but grounded enough to be testable.

---

## One-line summary
ProofFlow should evolve not only into a theorem formalization engine, but into a **governed theorem exploration system**: extending, suggesting, triaging, decomposing, and validating candidate mathematical results from seed papers and formal corpora.
