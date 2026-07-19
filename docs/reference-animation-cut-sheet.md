# HAL 9000 Reference Video — Animation Cut Sheet

**Source:** https://youtu.be/C1U_OXCZ2NE
**Analyzed:** First 540 seconds (0-9:00) at 6-12 fps, progressive 30-second segments
**Methodology:** Frame extraction at 6fps per segment, scan at 2-second intervals for scene boundaries, full 12fps on transitions

## Title Cards Discovered

| Card | Full Text | Background | Subtitle | Time(s) | Duration |
|------|-----------|------------|----------|---------|----------|
| GDE | G D E | Blue | LIF: 13-AG | 0-8, 136-144, 395-400, 486-490 | ~8s, ~8s, ~5s, ~4s |
| CNT | C N T | Green | PMT: 26-07 | 30-32 | ~2s |
| VEH | V E H | Blue | LIN: 86-QW | 76-78, 302-308 | ~2s, ~6s |
| PUR | P U R | Purple | PMT: 26-07 | 48-50 | ~2s |
| COM | C O M | Purple | PMT: 26-07 | 99-101, 445-450 | ~2s, ~5s |
| NAV | N A V | Purple | RTE: 09-EF | 172-176 | ~4s |
| HIB | H I B | Dark Green | STA: 35-05 | 204-210, 415-420 | ~6s, ~5s |
| FLX | F L X | Blue | ATA: 48-12 | 330-334 | ~4s |
| LIF | L I F | Maroon | ATA: 61-08 | 380-384, 510-518 | ~4s, ~8s |
| ATM | A T M | Maroon | MRN: 80-EJ | 532-540 | ~8s |

## Diagram Types Discovered

| # | Diagram Type | Background | Time Windows | Key Elements |
|---|-------------|------------|-------------|--------------|
| 1 | **Data/Readout Panel** | Dark Blue | 8-30s | Z, NEAR-IR, UV chips; text lines; PMT pairs with % values |
| 2 | **3D Wireframe Trajectory Plot** | Purple | 36-72s, 90-99s | Perspective grid, trajectory arc through 3D space, DEF2 labels, IO/POS readout, spacecraft telemetry line |
| 3 | **Waterfall/Stacked Curve Plot** | Blue | 80-99s | Overlapping waveform curves, data dots, math formulas, MX/CHECK buttons, amplitude envelope |
| 4 | **Numerical Data Tables** | Blue/Black | 113-134s | Tabular telemetry data rows with column headers, dividers, various value formats |
| 5 | **System Block / Flow Diagram** | Red/Orange | 80-84s | Rectangular labeled boxes, connecting arrows, diagnostic labels |
| 6 | **Jovian Orbital Mechanics Map** | Plum/Burgundy | 150-168s | Concentric orbital rings, vector labels (VEC, POS), Jovian moons (GNY/Ganymede, EUR/Europa, IO), distance values |
| 7 | **Orbital Mechanics Calculation** | Dark Navy | 180-202s | Overlapping ellipses with J-55 labels, ∅=4/6(T) formula, ORBIT/ACC.RTE/EQU.DIS/REM.DIS telemetry block |
| 8 | **Biometric Monitoring Display** | Black | 212-270s | 6-channel physiological waveforms: CARDIO VASCULAR, METABOLIC LEVELS, CENTRAL NERV. SYSTEM, PULMONARY FUNCTION, SYSTEMS INTEGRATION, LOCOMOTOR SYSTEM; colored labels |
| 9 | **COMPUTER MALFUNCTION Warning** | Crimson Red | 230-236s | Glowing white "COMPUTER MALFUNCTION" on solid red |
| 10 | **LIFE FUNCTIONS CRITICAL Warning** | Orange | 244-250s | Glowing text on solid orange |
| 11 | **Radar/Targeting Lock-on Display** | Blue | 286-300s+ | Coordinate grid (0°-100°), elliptical targeting curves, RADIAL ARRAY, TARGET LOCK, ATTENUATION, FREQUENCY data |
| 12 | **Green Radar/Tracking Display** | Dark Green | 456-484s | Concentric green circles on dark green bg, "CO-ORDINATE" and "RTE DIST" readouts, LR PROFILE/N/A OPTIMATE/N/A HAL COMLK text |
| 13 | **Blueprint Orbital Mechanics** | Blue | 494-506s | EQUATORIAL ROTATION, INCLINATION, AXIAL TILT, SYNODIC PERIOD, PERIHELION/APHELION, NEUT-FLUX, DS/PAE/MR logo |
| 14 | **Volumetric Wireframe Scan** | Charcoal/Black | 336-355s | Diagonal stacked white wireframe rectangles, pink crosshair reticles, "+" symbols, depth scanning aesthetic |
| 15 | **Exponential Decay/Projection Plot** | Dark Teal | 310-326s | 9 exponential decay curves from top-left, OXY(98.5%)/MX-RTEC(.6)/NUC(DK/OK) labels, solid-to-dashed line transitions |
| 16 | **Mathematical Function Family Plot** | Purple | 522-528s | White Cartesian grid, multiple curve families/cycloids fanning from origin points |

## Animation Pattern Summary

- **All transitions are instant cuts** (≤0.2s). No crossfades, no fade-to-black, no opacity tweening.
- **Title cards** hold 2-8 seconds. Pattern: brief appearance, then instant cut to data scene.
- **Chip behavior**: Z chip appears ≤0.15s (near-instant). NEAR-IR/UV chips appear fully formed at scene activation.
- **Grid/wireframe elements** appear fully formed — no stroke-draw animation.
- **Warning screens** (COMPUTER MALFUNCTION, LIFE FUNCTIONS CRITICAL) hold ~4-6s, same instant appearance/disappearance as all other cards.

## Notes

- The video follows a consistent "Title Card → Data Visualization" cycle across different color themes (blue, green, purple, maroon, black, charcoal, plum, teal)
- Many diagram types blend/interpolate — variations with different parameters/colors produce distinct appearances
- Color palette used by video: blue(rgb(0,100,200)), green(rgb(0,180,80)), purple(rgb(120,0,200)), red/orange(rgb(220,60,30)), plum/burgundy(rgb(100,30,60)), maroon(rgb(120,20,40)), charcoal(rgb(30,30,35)), teal(rgb(0,100,80)), navy(rgb(25,35,80))
- All chart/plot elements rendered in white against colored backgrounds
- Videos covers ~2351 seconds total; first 540s (23%) analyzed as of 2026-07-07
