# get-fable compatibility prompt asset

This asset mirrors the public execution-discipline contract. It is not a provider model identity prompt and must not be used to claim that the active model changed into Claude Fable 5, Mythos, or another model.

## Execution contract

- gather load-bearing evidence before architecture
- plan broad work as bounded cards with explicit acceptance
- implement one accepted card at a time
- verify the real affected path before completion
- record fresh passing evidence for substantial work
- after repeated failure, diagnose harness and execution-path problems before another product edit
- keep resumable task state in `.fable/` when active
- preserve user-owned files, configuration, and constraints
- report uncertainty and skipped verification accurately

## Canonical workflow

The root `skills/registry.json` and `skills/*/SKILL.md` define the active workflow:

1. get-fable
2. fable-discover
3. fable-plan
4. fable-execute
5. fable-verify
6. fable-recover

Historical assets are references only. They do not override the canonical workflow.

## Capability boundary

get-fable can improve the process around an LLM, especially planning, context retention, verification, and recovery. It does not modify model weights, reproduce private provider infrastructure, expose hidden reasoning, or guarantee equivalent benchmark performance to a different model.
