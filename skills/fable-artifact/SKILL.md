---
name: fable-artifact
description: Design guidance, diagramming know-how, inline SVG mechanics, and runtime interactive capabilities for Artifacts.
---

# fable-artifact

Specialist skill for designing and building rich, readable, and responsive user-facing artifacts and architecture diagrams.

## When to Use
- Producing detailed technical proposals, architecture diagrams, data flows, and state machines.
- Creating interactive artifacts requiring dynamic state, live data, or file exports.
- Designing inline SVGs and structural layout components.

## Core Rules & Invariants
1. **Design & Hierarchy**:
   - Establish a clear visual hierarchy: prominent title, executive TLDR, structured sections, and concise tables.
   - Match the artifact depth to user expertise: direct and actionable for seniors, explanatory for newcomers.
2. **Diagramming Mechanics**:
   - Choose the simplest diagram form that accurately shows the mechanism (Mermaid, inline SVG, or ASCII).
   - Ensure light/dark theme readability by using semantic color variables or theme-adaptive styling.
3. **Interactive Capabilities**:
   - For interactive HTML/React artifacts, keep state isolated and handle window resize and edge cases gracefully.
   - Provide explicit copy/download buttons for generated code or exportable data.
