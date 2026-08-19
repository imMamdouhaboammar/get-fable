---
name: fable-dataviz
description: Create accessible, cohesive charts, plots, graphs, stat tiles, and data visualizations across all rendering mediums. Use when generating data dashboards, SVG graphics, or metrics visuals.
version: 1.2.0
pack: system
inputs:
  - data_source
requires:
  - metric_specs
produces:
  - visualization_artifact
  - svg_chart
gates:
  - theme_contrast_valid
  - viewbox_defined
fallback: fable-execute
mutatesWorkspace: true
parallelSafe: true
neural_links:
  precursors:
    - fable-discover
  continuations:
    - fable-artifact
    - fable-run
    - fable-verify
  lateral_peers:
    - fable-artifact
  recovery: fable-recover
---

# fable-dataviz

Accessible data visualization, charting, and metric graphics specialist.

## Purpose
Produce high-clarity, accessible SVG charts, data plots, and metric tiles with adaptive themes and precise viewBox scaling.

## When to Use
- Generating SVG bar, line, pie, scatter, or sparkline charts.
- Building data dashboard metrics and KPI summary tiles.
- Visualizing statistical analysis or benchmark results.

## When NOT to Use
- Building textual markdown tables without graphic requirements (use `fable-artifact`).
- General CSS or UI layout styling (use `fable-execute`).

## Inputs
- **`data_source`**: Raw numbers, timeseries, or tabular data to visualize.

## Expected Outputs
- **`visualization_artifact`**: Self-contained SVG or chart component.
- **`svg_chart`**: Clean vector graphic code with accessible contrast.

## Procedure
1. Determine appropriate visualization archetype (bar, line, donut, heatmap).
2. Compute coordinate scales and label positioning.
3. Apply theme-aware palette with WCAG AA contrast (>=4.5:1).
4. Output responsive SVG with explicit `viewBox` attributes.

## Decision Rules
- Always use `viewBox` without fixed width/height attributes for full responsiveness.
- Include accessible `<title>` and `<desc>` tags inside SVGs for screen readers.

## Tool Policy
- Generate clean, valid SVG markup and preview with file viewing tools.

## Evidence Requirements
- Valid SVG syntax with verified viewBox and contrast compliance.

## Failure Handling
- If data points overlap or crowd the chart, downsample or switch to sparklines.

## Completion Criteria
- Chart renders cleanly with complete data labels and responsive scaling.

## Progressive Resources
- Design System: `references/dataviz-design-system.md`
- Example: `examples/render-bar-chart.md`
