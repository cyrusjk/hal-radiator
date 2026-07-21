# Polar Card — SVG A Arc Drawing Fix
## 2026-07-21

### Problem
Arc paths used iterated line segments with `endAngle + 0.01` rad pad in the loop condition, causing a 0.57° overshoot past the outermost tick. A subsequent 3° pad made this worse (3.57° overshoot).

### Fix
Replaced iterative `L`-segment arc drawing with SVG `A` (elliptical arc) commands:
- Single `A` for normal arcs (start < end)
- Two `A` segments for wrapped arcs crossing 0° (start > end)
- Arc starts/stops at exact cluster boundary angles — no pad, no overshoot

### Files Changed

**`src/cards/polar.js`** — arc drawing (lines 834–876)
```js
// Before: iterative L with overshoot
for (var a = startAngle; a <= endAngle + 0.01; a += 0.02) { ... }

// After: SVG A for exact endpoints
function arcPath(s, e) {
  return 'M' + p.x + ',' + p.y +
    ' A' + arcR + ',' + arcR + ' 0 ' + large + ',1 ' + q.x + ',' + q.y;
}
```

**`docs/polar-card-guide.md`** — new: full polar card system documentation.

**`DATA_CONTRACT.md`** — added ERA5 source extension (`yearlyTemps` field).

---

# HAL Title Card Generator — RB-3D Composite Card Fix
## 2026-07-10

### Problem
The RB-3D card (index 26) was `type: title` with `layout.zones` containing a `curve-family-3d` chart zone. Two issues:
- `serve.py` ignored `layout.zones` — emitted card as plain `type: title`, discarding chart zone data
- `composite.js` not loaded by `index.html`, had no `badge` zone handler

### Files Changed

**`index.html`** — added composite.js script tag
```
+ <script src="src/cards/composite.js"></script>
```

**`src/cards/composite.js`** — added badge zone handler
```js
} else if (zone.type === 'badge') {
    var chips = zone.chips || [];
    for (var bi = 0; bi < chips.length; bi++) {
        var chip = Object.assign({}, chips[bi]);
        chip.x = (chip.x || 0) + (zone.x || 0);
        chip.y = (chip.y || 0) + (zone.y || 0);
        renderChip(zG, chip);
    }
    zoneDone();
}
```

**`serve.py`** — layout zones → composite card
```python
layout = group.get("layout")
if layout and layout.get("zones"):
    zones = []
    for zone in layout.get("zones", []):
        z = dict(zone)
        if zt == "chart":
            chart = resolve_prototype(zone, prototypes)
            z["chartType"] = chart.get("chartType", "curve-family")
            ...
    cards.append({"type": "composite", "zones": zones, ...})
    continue
```

### Architecture
```
serve.py → /api/config → {type: "composite", zones: [{chart, chartType: "curve-family-3d"}, ...]}
                                ↓
app.js showCard → window.HAL.cards['composite'].render(data, onDone)
                                ↓
composite.js → per-zone dispatch:
  label → renderText
  chart → window.HAL.cards[zone.chartType].render(childData, zoneDone)
           (calls curve-family-3d.js renderer)
  badge → renderChip for each chip
```

### Verification
- /api/config returns 27 cards, card 26 is `type: composite` with 3 zones
- composite.js registered in window.HAL.cards
- Card 6 (curve-family-3d chart) renders 115KB SVG with isometric paths

## 2026-07-10 (fix 2)

### Navigation fix — `src/app.js`
- **cardDone()**: when `manualNav` is true, DON'T auto-advance. User stays on manually-navigated card instead of immediately cycling to next card.

### Composite chips fix — `src/cards/composite.js`
- **label zone**: now renders nested `chips[]` array (AVG/MIN/MAX badges inside the RB-3D label zone)

## 2026-07-10 (fix 3 — verified)

### Navigation advance timer — `src/app.js:88`
- **Bug**: `cardDone()` set `autoTimer = setTimeout(scheduleNext, cfg.timing.valueHold * 1000)`
  - `valueHold: 5000` is in **milliseconds** (same unit as `initialPause`)
  - `* 1000` produced 5,000,000ms = **83 minutes** — timer never fired
- **Fix**: `autoTimer = setTimeout(scheduleNext, cfg.timing.valueHold)` — 5000ms = 5s

## 2026-07-10 (fix 4 — final)

### Rewrite of `src/app.js`
**Removed the hacky 5s timer.** Replaced with clean architecture:

- **`transitionTo(nextIdx)`** — when `manualNav` is true, passes `Function.prototype` (noop) as the showCard callback instead of `cardDone`. Card renders and stays — no auto-advance, no extra timer.
- **`cardDone()`** — restored to original: `locked ? showCard(idx, cardDone) : scheduleNext()`. Only fires during auto-advance (when `onDone = cardDone`).
- **Space handler** — toggles `locked`, resets `manualNav = false`, and if unlocking calls `scheduleNext()` which advances with `cardDone` — resuming auto-advance cleanly.
- **No infinite loop** — Space no longer calls `showCard(idx, cardDone)` when locking, so composite cards with empty data don't create a render→cardDone→render cycle.

### Behavior
| Action | What happens |
|--------|-------------|
| ArrowLeft/Right | Navigate to card and STAY (manual mode) |
| Space (unlocked) | Lock card, stay on it |
| Space (locked) | Unlock, auto-advance resumes |
| ArrowRight while locked | Manual navigate (overrides lock) |

No timers, no idle frames, no hacks.

## 2026-07-10 (fix 5 — final verified)

### Final rewrite — `src/app.js`

**`transitionTo`** always passes `cardDone` (normal auto-advance path).

**`cardDone`** handles manual navigation with a display timer:
- **Title cards**: advance immediately — the showCard timer already gave the card its 8s display duration.
- **Non-title cards** (chart/composite): set `setTimeout(scheduleNext, valueHold)` — `valueHold: 5000` is **milliseconds** (no `* 1000` multiplier). Card shows for 5s, then advances.

**No hacks, no noop, no idle frames.** Manual navigation shows the card for its configured duration, then auto-advances naturally.
