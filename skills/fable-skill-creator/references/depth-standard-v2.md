# Skill Depth Standard V2

Use this guide when deciding whether a Skill contains enough operational knowledge to change agent behavior rather than merely describe a discipline.

## The depth test
A strong Skill lets an agent answer five questions under pressure:

1. **What situation am I actually in?**
2. **Which of several plausible actions is justified by the evidence?**
3. **What must I prove before I move on?**
4. **What failure class am I seeing if the happy path breaks?**
5. **What exactly does the next specialist need from me?**

If the Skill cannot answer those questions without improvising from general model knowledge, it is still shallow.

## Minimum behavioral ingredients

### Situation classification
A classification must change behavior. "simple/complex" is useful only if the Skill defines what observable signals move a task between those states and what different protocol follows.

### Decision branches
Write branches around real ambiguity: conflicting evidence, unavailable harnesses, legacy code, destructive operations, partial failures, concurrency, stale artifacts, missing source authority, or shared ownership.

### Evidence gates
A gate should name proof that could falsify the claim. "Reviewed" is weak. "Full diff read against base with each blocking finding tied to a concrete failure mode" is stronger.

### Failure taxonomy
Classify failures by cause, not just by symptom. Prefer distinctions such as harness/environment/execution-path/product/invariant or source/version/interpretation/compatibility rather than generic "command failed".

### Anti-patterns
Capture shortcuts an otherwise capable agent will be tempted to take: changing the test to match the implementation, trusting stale output, delegating shared invariants, broad refactoring during a bounded repair, or publishing before registry confirmation.

### Handoff packet
A handoff should prevent the next Skill from rediscovering context. Include evidence, touched surfaces, unresolved risk, current hypothesis, exact commands/results, and freshness markers where relevant.

## Progressive disclosure test
A reference earns its place when it adds something the main Skill should not carry inline:

- decision matrices;
- domain-specific diagnostics;
- difficult edge cases;
- worked trade-offs;
- examples where the first obvious move is wrong;
- reusable evidence templates.

A 300-word file that simply restates `SKILL.md` is not progressive disclosure.

## Eval breadth test
Count semantic families, not prompts.

These are one family, not three:
- "Fix pagination off by one"
- "Repair pagination index bug"
- "Correct pagination count error"

These are different families:
- ordinary deterministic bug with valid unit-test seam;
- failing test that errors before reaching the assertion;
- nondeterministic race requiring concurrency control;
- legacy module with no safe unit seam;
- user pressure to patch production before reproducing;
- test passes only because stale build output is executed.

For non-trivial Skills, aim for at least six semantic families before treating behavioral coverage as mature.

## Review questions
Before accepting a Skill, ask:

- Can a generic model pass the eval by repeating words from the description?
- Does the Skill say what to do when the default procedure is impossible?
- Are stop conditions explicit?
- Are neighboring Skill boundaries tested?
- Does each reference add new operational knowledge?
- Would a weaker model be measurably less likely to take a bad shortcut after loading this Skill?

If the last answer is unclear, deepen the Skill before adding more packaging.