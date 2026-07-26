# Polar / Cyclic Chart Card — System Guide

## Overview

The polar card renderer produces animated cyclic charts for the HAL 9000 Metrics Radiator. It supports concentric rings, radial spokes, colored year traces with temperature-gradient coloring, stat-tracking arcs with per-year tick marks and connector lines, and a multi-column legend.

**Source:** `src/cards/polar.js`
**Card type:** `polar`
**Registration:** `radiator.yaml` — cards with `chartType: polar` or inline `type: polar`
**Data plugin:** `src/data/sources/era5.js` (type: `era5`), `src/data/sources/inline.js` (type: `inline`)

---

## Cards Implemented

| Title | Label | Data Source | Span | Notes |
|-------|-------|-------------|------|-------|
| RAD | RADAR SWEEP | inline | N/A | Demo card — static radar sweep pattern |
| TEMP | SURFACE TEMPERATURE | era5 | 2015–2026 | Paris ERA5-Land weekly temps, 4 arcs (min/avg/mean/max) |

---

## Data Structure

### Card-level YAML (`radiator.yaml`)

```yaml
- charts:
  - prototype: polar-default       # inherits animation phases + defaults
    title: "GLOBAL TEMPERATURE"    # header text
    subtitle: "PARIS ERA5-LAND · WEEKLY · 2015-2026"
    w: 800                         # SVG viewBox width
    h: 720                         # SVG viewBox height
    cx: 500                        # chart center X
    cy: 380                        # chart center Y
    maxR: 340                      # outer ring radius
    minR: 40                       # inner ring radius
    rings: 6                       # number of concentric guide rings
    ringColor: "rgba(255,255,255,0.15)"
    ringWidth: 0.5
    spokeColor: "rgba(255,255,255,0.12)"
    spokeWidth: 0.3
    labels: [JAN, FEB, ... , DEC]  # spoke labels (nSpokes determines spoke count)
    labelOffset: 32                # label distance from maxR
    labelFontSize: 9
    labelColor: "rgba(255,255,255,0.7)"
    coolColor: { r: 100, g: 180, b: 255 }    # year-trace cool end (winter)
    warmColor: { r: 255, g: 180, b: 80 }     # year-trace warm end (summer)
    lineWidth: 1.0
    baseAlpha: 0.30                # minimum year-trace opacity
    alphaMax: 0.85                 # maximum year-trace opacity
    dataSource:
      type: era5
      startYear: 2015
      endYear: 2026
    arcs:
      - stat: min                  # stat to track: min | avg | mean | max
        rOff: -14                  # radial offset from maxR (negative = inward)
        width: 3
        color: "#ffffff"
        alpha: 1.0
        label: MIN
        tickLen: 5                 # perpendicular tick length
        tickColor: "#ffffff"
        tickWidth: 1.5
        tickAlpha: 0.6
        lineColor: "#ffffff"       # connector line color (false to hide)
        lineAlpha: 0.2
        connectors: true
      - stat: avg
        rOff: 0
        ...
      - stat: mean
        rOff: 0
        color: "rgba(255,255,255,0.50)"   # dimmer for mean
        alpha: 0.75
        ...
      - stat: max
        rOff: 14                   # outward
        ...
```

### Arc Config Properties

Arcs are drawn to show the span of the min, max, avg and/or mean values for every cycle on the chart. Min is inside the outermost ring, max outside, and avg and mean over that that ring. Mean is semi-paque by default to distiguish it from the average, even though they overlap. faded segments are drawn from the relevant points on the graph to the arcs. Currently, those lines terminate at the locations of the actual relevant values regardless of the smoothing factor.


Each entry in the `arcs` array controls one statistical-arc ring:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `stat` | string | `avg` | Stat to compute: `min`, `max`, `avg`, `mean` |
| `rOff` | number | `0` | Radial offset from `maxR` (negative=inward, positive=outward) |
| `width` | number | `2` | Arc stroke width |
| `color` | string | `#ffffff` | Arc stroke color |
| `alpha` | number | `0.6` | Arc stroke opacity |
| `label` | string | `—` | Legend label |
| `tickLen` | number | `5` | Tick mark length (perpendicular to arc) |
| `tickColor` | string | `arcColor` | Tick stroke color |
| `tickWidth` | number | `1.0` | Tick stroke width |
| `tickAlpha` | number | `arcAlpha` | Tick opacity |
| `lineColor` | string | `false` | Connector line color. `false` disables connectors |
| `lineAlpha` | number | `0.15` | Connector line opacity |
| `connectors` | bool | `true` | Show per-year connector lines from data trace to arc |
| `ticks` | bool | `true` | Show per-year tick marks on the arc |

### Stat Computation (internal logic)

- **min:** Center of the coldest 4-week rolling window. A 4-week window slides across the 52-point interpolated annual series; the window with the lowest average defines `minA` (center index of window) and `minV` (value at start index).
- **max:** Same algorithm on the warmest 4-week rolling window.
- **avg:** Angle of the first crossing where the weekly-value curve crosses the annual average (mean of all 52 values).
- **mean:** Angle of the first crossing where the weekly-value curve crosses the annual median.

### Cluster Algorithm

For each stat, per-year angles are collected into an array. The cluster boundary is found via widest-gap detection:

1. Sort angles.
2. Find the largest gap between consecutive sorted angles (handling wrap-around at 360°).
3. The arc spans from the first angle after the gap (cluster start) to the last angle before the gap (cluster end).

This correctly handles wrapped clusters that cross 0° (e.g., January min temps around 350°–10°).

### Arc Rendering

Arcs are drawn using SVG `A` (elliptical arc) commands rather than iterated line segments, ensuring the arc path starts and ends at **exactly** the cluster boundary angles with zero overshoot.

- **Normal case** (start < end): single `A` command from `startAngle` to `endAngle`.
- **Wrap case** (start > end): two `A` commands — from `startAngle` → 2π and from 0 → `endAngle`.

## Animation Phases

```
- action: blank
- action: wait, duration: 1000
- action: draw, duration: 2, gap: 5, groups: [rings], order: sequential
- action: appear, groups: [header, footer, rings, spokes]
- action: appear, duration: 1.5, groups: [dataPolygons], order: sequential
- action: appear, duration: 1.0, groups: [arcs], order: sequential
```

### Animation Groups

| Group | Elements | Behavior |
|-------|----------|----------|
| `header` | Title, subtitle | Fade in |
| `footer` | Legend, scale labels | Fade in |
| `rings` | Concentric guide rings | Stroke-dashoffset draw |
| `spokes` | Radial spoke lines | Fade in |
| `dataPolygons` | Colored year traces | Appear sequentially by year |
| `arcs` | Stat arcs, ticks, connectors | Appear sequentially |

## Changelog

| Date | Change | Commit |
|------|--------|--------|
| 2026-07-21 | 4-week rolling window for min/max angle, per-year connector colors | `f9dd8a5` |
| 2026-07-21 | White connectors, colored year traces only | `fea614a` |
| 2026-07-21 | SVG `A` elliptical arc for precise arc endpoints (no overshoot) | `6bd2133` |
