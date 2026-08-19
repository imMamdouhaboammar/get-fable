---
name: fable-dataviz
description: Use whenever creating or modifying charts, plots, graphs, stat tiles, KPI rows, dashboards, or data visualizations in any output medium (HTML, React, SVG, Matplotlib, D3, Recharts).
---

# fable-dataviz

Specialist skill for unified, accessible, and high-clarity data visualizations across all rendering mediums.

## When to Use
- Creating charts, graphs, plots, heatmaps, scatterplots, bar/line charts, stat tiles, or dashboards.
- Choosing color palettes (categorical, sequential, diverging) with strict light/dark theme contrast.
- Building interactive tooltips, legible legends, responsive SVGs, and clear axis labels.

## Core Rules & Invariants
1. **Form Follows Data**:
   - Compare amounts -> Bar chart / Column chart.
   - Show trends over time -> Line / Area chart.
   - Show relationships/distributions -> Scatter / Histogram / Heatmap.
   - Display key metrics -> Metric tile with change indicator and sparkline.
2. **Palette & Theme Parity**:
   - Light and dark modes must maintain accessible WCAG AA contrast (minimum 4.5:1 for text, 3:1 for graphical elements).
   - Use semantic color meanings (green for positive growth, red/amber for decline/warning).
3. **SVG & Layout Discipline**:
   - Always define explicit `viewBox` coordinates; never rely on unconstrained pixel dimensions.
   - Prevent text clipping with sensible padding and dynamic label rotation or truncation.
4. **Data Verification**:
   - Verify all numerical aggregates, axis scales, and calculations against raw data before rendering.
