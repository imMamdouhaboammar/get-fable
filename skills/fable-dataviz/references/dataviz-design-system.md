# Data Visualization Design System & SVG Standards

## Purpose
Provides a complete token catalog, layout rules, color palette, and accessibility standards for rendering clean, responsive, theme-adaptive SVG charts, metric cards, and dashboard components.

## Color Palette & Semantic Tokens
Visualizations must adapt seamlessly to light and dark interfaces using clean CSS variables and semantic color tokens:

| Token Name | Hex Light | Hex Dark | Semantic Purpose |
|---|---|---|---|
| `--fable-chart-primary` | `#059669` (Emerald 600) | `#10B981` (Emerald 500) | Primary series, verified states, hero metrics |
| `--fable-chart-secondary` | `#2563EB` (Blue 600) | `#3B82F6` (Blue 500) | Secondary series, comparison baselines |
| `--fable-chart-accent` | `#7C3AED` (Violet 600) | `#8B5CF6` (Violet 500) | Highlighting outliers, forecast bands |
| `--fable-chart-warning` | `#D97706` (Amber 600) | `#F59E0B` (Amber 500) | Degraded performance, near-threshold states |
| `--fable-chart-danger` | `#DC2626` (Red 600) | `#EF4444` (Red 500) | Regression failures, critical security gates |
| `--fable-chart-grid` | `#E5E7EB` (Gray 200) | `#374151` (Gray 700) | Axis lines, grid subdividers |
| `--fable-chart-text` | `#1F2937` (Gray 800) | `#F3F4F6` (Gray 100) | Labels, legends, values |

## SVG Geometry & ViewBox Rules
- **Standard ViewBox**: Always define explicit `viewBox="0 0 width height"` (e.g. `viewBox="0 0 800 400"`) with `preserveAspectRatio="xMidYMid meet"`.
- **Responsive Sizing**: Set `width="100%"` and omit fixed pixel `width` and `height` attributes on the root `<svg>` element to permit fluid scaling.
- **Padding & Insets**: Reserve a minimum of 40px left padding for Y-axis labels and 30px bottom padding for X-axis timestamps.

## Typography & Legibility
- **Font Stack**: Use clean system sans-serif: `font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"`.
- **Title Size**: 16px font-weight 600.
- **Axis Label Size**: 12px font-weight 400.
- **Data Value Size**: 14px font-weight 500.

## Accessibility Standards
- Include a descriptive `<title>` and `<desc>` element inside the `<svg>`.
- Set `role="img"` and `aria-label="[Concise chart summary]"`.
- Never encode information solely through color hue; use dashed lines, shape markers, or direct data point labels.
