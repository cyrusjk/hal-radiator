# Orbital Mechanics Card : System Guide

## Overview

The orbital card renderer produces animated concentric-orbit maps for the HAL 9000 Metrics Radiator. It supports circular and elliptical (Keplerian) orbits, per-segment line styles, bold trailing arcs, radially-offset data labels, configurable center-body size, and sequential pop-in animation.

**Source:** `src/cards/orbital.js`
**Card type:** `orbital`
**Registration:** `radiator.yaml` : cards with `chartType: orbital`
**Data plugin:** `src/data/sources/inline.js` (type: `inline`)

---

## Cards Implemented

| Title | Label | Center | Series | Notes |
|-------|-------|--------|--------|-------|
| JOV | JUPITER | JUPITER | Io, Europa, Ganymede, Callisto | Original : 4 Galilean moons with data markers |
| LUN | EARTH-MOON | EARTH | Luna (+ eccentricity) | Moon orbit at e=0.054, +5 Lagrange points (L1–L5) |
| SOL | SOLAR SYSTEM | SOL | All 8 planets | sqrt(AU)-scaled, Mercury (e=0.205), Mars (e=0.093) |
| JOV2 | JOVIAN SYSTEM | JUPITER | 8 moons | Galileans + Amalthea + Himalia/Elara/Pasiphae with eccentric orbits |

---

## Data Structure

### Card-level YAML (`radiator.yaml`)

```yaml
- prototype: orbital-default   # inherits animation phases from prototype
  title: "LUN"                # header text
  label: "EARTH-MOON"         # footer text
  color: dark-charcoal        # CSS color (named or hex)
  centerR: 10                 # optional center-dot radius (default: 14, or 10 for >6 series)
  dataSource:
    type: inline
    center: "EARTH"           # label text for central body
    series:
      - label: "LUNA"         # moon/planet name
        r: 110                # semi-major axis (data units, auto-scaled to display)
        bodyAngle: 305        # current position angle (0=top, CW)
        boldArc: 60           # degrees of bold trailing arc behind body
        value: 6              # body size (dot radius = clamp(4, value/10, 10))
        eccentricity: 0.054   # orbital eccentricity (0 = circular)
        omega: 270            # argument of periapsis (angle of closest approach, 0=top, CW)
        markers:
          - { angle: 305, style: "solid", label: "LUNA" }
          - { angle: 125, style: "dashed", label: "APOGEE" }
          # Marker r override for points at different radius than orbit
          - { angle: 305, r: 94, label: "L1" }
```

### Marker fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `angle` | number | yes | Position angle (0=top, CW) |
| `style` | string | *segment-only* | `solid`, `dashed`, or `bold` : defines segment boundaries |
| `label` | string | no | Text label shown offset from marker dot |
| `r` | number | no | Radius override in data units (for points not on orbit path, e.g. Lagrange points) |

Markers **with `style`** define orbit segment boundaries. Markers **without `style`** are data annotations only (dots + labels, no segment).

### Lagrange point markers (LUN card)

| Point | Angle | r (data) | Display r | Position |
|-------|-------|----------|-----------|----------|
| L1 | 305° | 94 | 239px | Between Earth and Moon |
| L2 | 305° | 118 | 300px | Beyond Moon |
| L3 | 120° | 110 | 280px | Opposite Earth from Moon |
| L4 | 5° | 110 | 280px | 60° ahead of Moon |
| L5 | 245° | 110 | 280px | 60° behind Moon |

---

## Rendering Architecture

### Coordinate system

- SVG viewport: 1000×750 (centering at cx=500, cy=400)
- Angles: **0° = top, clockwise** (cardinal convention, not math)
- Max display radius: **280px** (`maxR`)
- All data radii are scaled: `display = (data_r / max_data_r) * maxR`

### Scale (SOL card)

Uses sqrt(AU) for realistic proportional spacing while keeping inner planets visible:

| Planet | AU | sqrt(AU) | Display r |
|--------|----|----------|-----------|
| Mercury | 0.387 | 0.622 | 32px |
| Venus | 0.723 | 0.850 | 43px |
| Earth | 1.0 | 1.000 | 51px |
| Mars | 1.524 | 1.235 | 63px |
| Jupiter | 5.203 | 2.281 | 116px |
| Saturn | 9.537 | 3.088 | 158px |
| Uranus | 19.19 | 4.381 | 224px |
| Neptune | 30.07 | 5.484 | 280px |

### Eccentric Keplerian orbits

Elliptical orbits use the polar equation with the central body at one focus:

```
r(θ) = a · (1 - e²) / (1 + e · cos(θ - ω))

  a     = semi-major axis (data r)
  e     = eccentricity (0 = circle)
  θ     = angle in card coords
  ω     = argument of periapsis (angle of closest approach)
```

**Implementation** (`polar()` function in `orbital.js`):
- Converts card-angle to math-space: `rad = (a - 90) * π/180`
- Computes true anomaly: `nu = (a - omega) * π/180`
- Factor modifies radius per eccentricity, then offset is added AFTER the eccentricity factor (for label offset : CRITICAL: applying factor to offset would displace it incorrectly for elliptical orbits)

### Animation groups

Per-orbit groups: `line_N`, `bold_N`, `moon_N` (N = series index)
Global groups: `markers`, `labels`
Static groups: `header`, `footer`, `centerBody`, `centerLabel`, `axis`

**Animation sequence** (from `prototype: orbital-default`):
1. Header + footer appear
2. Center body + label appear
3. Axis appears
4. Each orbit's line → bold → moon group appears in sequence (innermost first, 100ms gap)
5. Markers appear (sequential, 80ms gap)
6. Labels appear (sequential, 80ms gap)

**Animation type:** Opacity `flickerIn` (no stroke-dashoffset drawing). Per-orbit groups use `appear` (opacity pop).

### Center body

- Default radius: 14px (or 10px for cards with >6 series)
- Overridable with `centerR` in card YAML
- Color: `fg('frame', 0.7)`

---

## Key Rendering Decisions

1. **Opacity animation, not stroke-draw** : Initial implementation used stroke-dashoffset drawing; switched to opacity flicker for cleaner sequential pop-in without visible "drawing" artifacts.

2. **Per-orbit groups** : Each orbit has separate `line_N`, `bold_N`, `moon_N` groups so animation can sequence them independently.

3. **Segmented orbits** : Only markers with `style` property define segment boundaries. Style-less markers (e.g. Lagrange points) are annotations only.

4. **Label offset** : 16px outward from marker position, added AFTER eccentricity adjustment. Outer labels (r > 100) rotate perpendicular to tangent (`θ - 90°`). Inner labels remain horizontal.

5. **Body position dedup** : Markers at the same angle as `bodyAngle` with no `r` override are skipped (moon body already renders the name via the `series.label`).

6. **Marker r override** : Lagrange points (L1–L5) use explicit `r` to position at different radii than the orbit path.

7. **Maximum animation phases** : Prototype defines phases for up to 8 orbits (line_N through line_7). Adding more series requires extending phases or the partial-rendering bug reoccurs.

---

## Pitfalls & Lessons Learned

### YAML formatting
- YAML does **not** accept compact inline mappings with multiple key/value pairs for block entries : each property on its own line under a `- ` item.
- YAML comments (`#`) inside block sequences are fine at the same indentation level.

### Renderer bugs
- **isBodyPos filter**: Must check both angle AND r-override : markers at the body angle but different radius (L1, L2) should NOT be treated as the body.
- **Label eccentricity**: Label offset must be added AFTER the eccentricity radius factor, otherwise the offset gets multiplied by the factor (moving labels inward/outward incorrectly).
- **Marker r scaling**: Marker `r` values are in **data units** (same scale as series r) and auto-scaled to display pixels, just like orbit radii.
- **Segment degenerate arcs**: Markers at the same angle create zero-length arc segments. `arcRange` handles this.

### Build pipeline
- The page caches config.js aggressively. Use different `?v=N` param or hard-refresh to see rebuilt config.
- `python build.py` regenerates `src/config.js` and `dist/index.html`. Dev server (`serve.py` on port 8009) serves files directly from `src/`.
- Source order matters: `orbital.js` must load AFTER `hal.js` but BEFORE the config triggers card rendering.

### Animation phases
- The prototype `orbital-default` defines phases for only the number of orbits it lists. Cards with 8 series need phases for `line_0` through `line_7`, `bold_0`–`bold_7`, `moon_0`–`moon_7`. Missing phases cause partial rendering : elements never appear.

---

## Resource Links

- Live dev server: `http://localhost:8009`
- Card engine: `src/cards/orbital.js`
- Card data: `radiator.yaml` (search for `chartType: orbital`)
- Build: `python build.py`
- Server: `python serve.py`
