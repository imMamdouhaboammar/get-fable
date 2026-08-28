# SVG Chart Template

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" role="img" aria-label="Performance Benchmark Chart">
  <style>
    .title { font-family: system-ui, sans-serif; font-size: 18px; font-weight: 600; fill: #1F2937; }
    .axis { stroke: #9CA3AF; stroke-width: 1.5; }
    .grid { stroke: #E5E7EB; stroke-width: 1; stroke-dasharray: 4,4; }
    .label { font-family: system-ui, sans-serif; font-size: 12px; fill: #4B5563; }
    .bar-a { fill: #10B981; }
    .bar-b { fill: #3B82F6; }
    @media (prefers-color-scheme: dark) {
      .title { fill: #F9FAFB; }
      .axis { stroke: #4B5563; }
      .grid { stroke: #374151; }
      .label { fill: #9CA3AF; }
    }
  </style>
  <title>Benchmark Results</title>
  <desc>Comparison of throughput across optimization iterations</desc>
  <text x="40" y="35" class="title">Throughput Benchmark (ops/sec)</text>
  <line x1="60" y1="340" x2="740" y2="340" class="axis" />
  <line x1="60" y1="60" x2="60" y2="340" class="axis" />
  <line x1="60" y1="200" x2="740" y2="200" class="grid" />
  <rect x="140" y="120" width="80" height="220" rx="4" class="bar-a" />
  <text x="180" y="360" text-anchor="middle" class="label">Baseline</text>
  <rect x="360" y="80" width="80" height="260" rx="4" class="bar-b" />
  <text x="400" y="360" text-anchor="middle" class="label">Optimized</text>
</svg>
```
