# Neural Linking Policy

## Core Principle
Every skill, agent, recipe, and tool must be connected through an explicit, bi-directional, and navigable knowledge graph.

## Graph Topology
1. **Precursors**: Skills that logically precede and prepare inputs for the current skill.
2. **Continuations**: Skills that logically succeed and consume outputs of the current skill.
3. **Lateral Peers**: Skills that share phase boundaries or provide complementary capabilities.
4. **Recovery Handlers**: Skills that diagnose and remediate failures within the current domain.

## Referring Links Standard
- Skills MUST define `neural_links` in their YAML frontmatter.
- Body text must include a dedicated `## Neural Connections & Referring Links` section.
- The runtime graph validator (`src/core/neural-linking.ts`) validates zero isolated nodes and verified paths.
