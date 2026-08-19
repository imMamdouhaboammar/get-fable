---
name: <skill-name>
description: <When to use, specific triggers, and capability overview>. Use whenever <explicit trigger scenarios>.
version: 1.0.0
pack: <core|intelligence|build|proof|delivery|evolution|system|creator>
inputs:
  - <input_1>
requires:
  - <requirement_1>
produces:
  - <output_1>
gates:
  - <gate_1>
fallback: <fallback-skill-id>
mutatesWorkspace: <true|false>
parallelSafe: <true|false>
neural_links:
  precursors:
    - <precursor-skill>
  continuations:
    - <continuation-skill>
  lateral_peers:
    - <peer-skill>
  recovery: <recovery-skill>
---

# <Skill Title>

<One-sentence core purpose of the skill>.

## Purpose
<Why this skill exists and what high-level capability it delivers>.

## When to Use
- <Specific trigger 1>
- <Specific trigger 2>

## When NOT to Use
- <Boundary condition 1>
- <Boundary condition 2>

## Inputs
- **`<input_1>`**: <Description of input 1>

## Expected Outputs
- **`<output_1>`**: <Description of output 1>

## Procedure
1. **<Step 1>**: <Actionable description>
2. **<Step 2>**: <Actionable description>

## Decision Rules
- <Rule 1>
- <Rule 2>

## Tool Policy
- <Allowed / prohibited tool actions>

## Evidence Requirements
- <Machine-checked proof or observation requirement>

## Failure Handling
- <Diagnostic and recovery procedure>

## Completion Criteria
- <Concrete observable done state>

## Neural Connections & Referring Links
- Precursors: `<skill-a>`
- Continuations: `<skill-b>`
- Lateral Peers: `<skill-c>`
- Recovery: `<skill-d>`

## Examples

### Example 1: <Scenario Title>
```markdown
<Concrete input -> output walkthrough>
```
