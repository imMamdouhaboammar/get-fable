# Mutation Containment Guidelines

## Rules
1. **Scope Discipline**: Edit only the files explicitly defined by the active card.
2. **Preserve Invariants**: Do not delete comments, format unrelated sections, or introduce unrequested refactors.
3. **Immediate Validation**: Run the card acceptance command immediately following the edit.
4. **Failure Threshold**: If an edit fails twice, stop and route to `fable-recover`. Do not blindly loop.
