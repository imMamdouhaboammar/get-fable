# Independent Oracle Derivation & Simulation Boundaries

## Purpose
Guide for constructing independent verification oracles, reference models, and simulation harnesses to verify complex algorithmic logic, state machines, and data pipelines.

## Principles of Independent Oracles

### 1. Independence from Implementation
An oracle must NOT share code or assumptions with the implementation under test. If the implementation uses an optimized BitSet, the oracle should use a simple, mathematically obvious `Set<number>` reference model.

### 2. Differential Testing Architecture
Generate randomized inputs across edge cases and feed them simultaneously to both the production implementation and the reference oracle, asserting strict output equality.

```typescript
test('differential verification between production and reference oracle', () => {
  for (let i = 0; i < 1000; i++) {
    const input = generateRandomTestCase(i);
    const prodResult = productionAlgorithm(input);
    const oracleResult = referenceOracle(input);
    expect(prodResult).toEqual(oracleResult);
  }
});
```

### 3. Headless Browser Simulation
For UI and web workflows, use headless browser drivers to simulate real user interactions (clicking buttons, filling forms, observing DOM state changes) rather than shallow virtual DOM unit tests.
