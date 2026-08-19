# Task Routing & Selection Engine

## Algorithm
1. **Keyword Scoring**: Evaluates prompt tokens and intent signals across all 25 canonical skills.
2. **Score Ranking**: Sorts candidate skills in descending order of calculated score.
3. **State Overrides**:
   - `failureStreak >= 2` forces `fable-recover` override.
   - `phase === 'verifying'` grants positive bias to `fable-verify`.
4. **Confidence Computation**: Relative margin between top-ranked and second-ranked skill scores.
