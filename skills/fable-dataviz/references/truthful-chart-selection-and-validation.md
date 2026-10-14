# Truthful Chart Selection and Validation

A chart is successful when it lets a reader make the intended comparison accurately and quickly.

## Choose by analytical task

### Precise category comparison
Prefer bars/dots. Sort by value unless category order is meaningful. Use a zero baseline for bar length.

### Time trend
Use line/area with true chronological spacing. Mark missing intervals; do not connect absent observations as if measured.

### Distribution
Use histogram, box/violin, strip/dot, or quantile summaries. An average bar can hide multimodality, skew, and outliers.

### Relationship
Use scatter/hexbin. Encode size only when area is scaled correctly. State correlation/association; do not imply causation without design evidence.

### Composition
Use stacked/100% stacked bars when parts form a meaningful whole. Pie/donut is best limited to a small number of clearly different slices and rough comparison.

## Transformation audit
For every derived chart table record:
- source row count;
- filters and why;
- group keys;
- aggregation function;
- denominator for rates/percentages;
- timezone/date bucketing;
- missing/null handling;
- outlier rules;
- final totals/ranges.

Compare pre/post totals where additive metrics should conserve mass.

## Scale audit
Ask what visual property encodes value. If bar length encodes value, a truncated baseline changes perceived ratios. If a line chart focuses on variation around a large baseline, a non-zero axis may be valid but domain and units must be obvious.

Log scales are useful for orders-of-magnitude differences but must be labeled and cannot represent zero/negative values directly.

## Uncertainty
Show confidence/credible intervals, range bands, sample counts, or data-quality notes when the conclusion depends on them. Avoid decorative error bars with no definition.

## Accessibility
- do not rely on hue alone;
- use sufficient text/mark contrast;
- direct-label key series where practical;
- provide SVG `<title>`/`<desc>` or equivalent accessible description;
- ensure keyboard/tooltip alternatives for interactive-only values;
- preserve meaning in monochrome where feasible.

## Validation against source
Pick several marks—including extrema and transformed values—and recompute their coordinates/labels from source data. This catches bugs where a beautiful chart is plotting the wrong column, denominator, sort order, or scale.

## Deception checklist
Reject or revise when:
- axis truncation exaggerates category magnitude;
- 3D perspective changes perceived area;
- dual axes make unrelated trends look aligned;
- percentages use different denominators without disclosure;
- missing values disappear;
- title/annotation claims causality or significance not established;
- rounding creates totals over/under 100% without explanation.

Design polish should improve comprehension, never rescue a misleading analytical choice.