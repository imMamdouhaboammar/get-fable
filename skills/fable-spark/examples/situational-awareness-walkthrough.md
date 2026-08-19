# Example: Spark Situational Awareness Walkthrough

## Scenario
1. Phase `executing`, code edited in `src/calc.ts` -> Spark outputs: "run the affected tests" (`source: mutation-delta`, confidence 0.92).
2. Test fails twice -> Spark switches to: "diagnose the repeated failure" (`source: failure-loop`, confidence 0.95).
3. Root cause fixed, tests passing, state marked complete -> Spark remains silent (`silent: true`).
