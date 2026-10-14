# Independent Oracle Verification Contract

## 1. Production Component Under Test
- **Module**: `src/algorithms/tree-balancer.ts`
- **Function**: `balanceRedBlackTree(root: Node): Node`

## 2. Independent Reference Oracle
- **Model**: Mathematical immutable balanced reference model (`test/oracles/reference-tree.ts`)
- **Properties Checked**:
  1. Every node is either red or black.
  2. Root is always black.
  3. No two adjacent red nodes.
  4. Every path from root to leaf contains equal black nodes.

## 3. Differential Test Execution
- Command: `bun test test/simulator/tree-oracle.test.ts`
- Iterations: 1,000 randomized tree mutations.
- Verdict: PASSED (Zero divergence observed between production and oracle).
