# get-fable repository ledger

The repository is armed with get-fable, but no work round is persisted in this tracked file

For substantial work, create bounded cards with explicit acceptance checks

```text
example open:   - [ ] <card> -- acceptance: <command or observable condition>
example done:   - [x] <verified card> -- evidence: <command/result or concrete observation>
example defer:  - [~] <deferred card> -- deferred: <reason>
```

`PAUSED: <reason>` may temporarily suspend lifecycle enforcement for unrelated user work

Strict runtime phase, failure streak, routing decision, and evidence records live in `.fable/state.json`
