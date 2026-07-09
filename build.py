# ═══════════════════════════════════════════════════════════════════════
#  Build — read radiator.yaml, generate config.js, inline into dist/
#  Run: python build.py
#  Output: dist/index.html (open in browser via HTTP server)
# ═══════════════════════════════════════════════════════════════════════

import json, shutil, yaml
from pathlib import Path

ROOT = Path(__file__).parent
SRC  = ROOT / "src"
DIST = ROOT / "dist"

# ── 1. Read YAML ──────────────────────────────────────────────────────

yaml_path = ROOT / "radiator.yaml"
if not yaml_path.exists():
    print("✗ radiator.yaml not found")
    exit(1)

with open(yaml_path) as f:
    cfg = yaml.safe_load(f)

# Load prototypes from separate file if not in main config
protos_path = ROOT / "prototypes.yaml"
prototypes = cfg.get("cardPrototypes", {})
if not prototypes and protos_path.exists():
    with open(protos_path) as f:
        protos_data = yaml.safe_load(f) or {}
    prototypes = protos_data.get("cardPrototypes", {})

timing = cfg.get("timing", {})
groups = cfg.get("groups", [])
colors = cfg.get("colors", {})

# ── Timescale parser ───────────────────────────────────────────────────
# Users can write '1h', '30m', '6h', '24h', '7d' or raw seconds.
def parse_timescale(ts):
    if not ts:
        return None
    if isinstance(ts, (int, float)):
        return int(ts)
    s = str(ts).strip().lower()
    if s.endswith('d'):
        return int(s[:-1]) * 86400
    if s.endswith('h'):
        return int(s[:-1]) * 3600
    if s.endswith('m'):
        return int(s[:-1]) * 60
    if s.endswith('s'):
        return int(s[:-1])
    try:
        return int(s)
    except ValueError:
        return None

def apply_timescale(card_config, chart_entry):
    """If chart_entry has timescale, set dataSource.range from it."""
    ts = chart_entry.get('timescale')
    if not ts:
        return
    ds = card_config.get('dataSource')
    if ds is None:
        ds = {}
        card_config['dataSource'] = ds
    if ds.get('range') is None:
        r = parse_timescale(ts)
        if r is not None:
            ds['range'] = r

# ── Resolve card prototypes ───────────────────────────────────────────
# Chart entries with 'prototype' key inherit chartType and animation
# from the named prototype, then overlay title/label/color/dataSource.
def resolve_prototype(chart, prototypes):
    proto_name = chart.get('prototype')
    if not proto_name:
        return chart
    base = prototypes.get(proto_name)
    if base is None:
        raise ValueError(f"Unknown card prototype: {proto_name}")
    resolved = dict(base)
    for k, v in chart.items():
        if k == 'prototype':
            continue
        if k == 'animation' and isinstance(v, dict):
            resolved['animation'] = dict(resolved.get('animation', {}))
            resolved['animation']['phases'] = v.get('phases', resolved['animation'].get('phases', []))
        elif k == 'dataSource' and isinstance(v, dict):
            merged = dict(resolved.get('dataSource', {}))
            merged.update(v)
            resolved['dataSource'] = merged
        else:
            resolved[k] = v
    return resolved

# ── Resolve colour references ─────────────────────────────────────────
# If a group or chart specifies a colour that matches a key in the
# `colors:` section, substitute the RGB value. Raw rgb(...) strings
# pass through unchanged.
def resolve_color(name):
    if name in colors:
        return colors[name]
    return name

# ── 2. Flatten groups into a linear card sequence ─────────────────────
# Each group: title card (×1) → chart cards (×N)
# Groups with a `layout` key produce a single composite card instead.
# Runtime cycles through the flat list sequentially.

cards = []
for group in groups:
    layout = group.get("layout")
    if layout:
        # ── Composite card — one card with multiple zones ────────────
        zones = []
        for zone_def in layout.get("zones", []):
            zone = dict(zone_def)

            # If this zone is a chart, resolve its prototype
            if zone.get("type") == "chart" and "prototype" in zone:
                zone = resolve_prototype(zone, prototypes)
                zone["type"] = "chart"
                zone.pop("prototype", None)

            # Resolve colour for chart zones (in case it's a named colour)
            if zone.get("type") == "chart":
                zone["color"] = resolve_color(zone.get("color", group.get("color", "rgb(0,0,0)")))
                apply_timescale(zone, zone)

            zones.append(zone)

        cards.append({
            "type": "composite",
            "title": group["title"],
            "label": group.get("subheading", ""),
            "color": resolve_color(group.get("color", "rgb(0,0,0)")),
            "zones": zones,
        })
    else:
        # Title card
        cards.append({
            "type": "title",
            "title": group["title"],
            "label": group.get("subheading", ""),
            "color": resolve_color(group.get("color", "rgb(0,0,0)")),
        })
        # Chart cards for this group
        for chart in group.get("charts", []):
            chart = resolve_prototype(chart, prototypes)
            card = {
                "type": chart["chartType"],
                "title": chart.get("title", ""),
                "label": chart.get("label", ""),
                "color": resolve_color(chart.get("color", group.get("color", "rgb(0,0,0)"))),
                "animation": chart.get("animation"),
                "dataSource": chart.get("dataSource", {"type": "inline"}),
            }
            apply_timescale(card, chart)
            cards.append(card)

# ── 3. Generate src/config.js ─────────────────────────────────────────

config_js_path = SRC / "config.js"
with open(config_js_path, "w", encoding="utf-8") as f:
    f.write("// ═══════════════════════════════════════════════════\n")
    f.write("//  Auto-generated from radiator.yaml\n")
    f.write("//  Do not edit directly — edit radiator.yaml and\n")
    f.write("//  run 'python build.py' to regenerate.\n")
    f.write("// ═══════════════════════════════════════════════════\n\n")

    f.write("window.HAL_CONFIG = window.HAL_CONFIG || {\n")
    f.write(f"  timing: {json.dumps(cfg.get('timing', {}), indent=2)},\n")
    f.write(f"  visual: {json.dumps(cfg.get('visual', {}), indent=2)},\n")
    f.write(f"  cards: {json.dumps(cards, indent=2)},\n")
    f.write("};\n")

print(f"✓ Generated src/config.js ({config_js_path.stat().st_size} bytes, {len(cards)} cards)")

# ── 4. Build dist/index.html (inline all JS modules) ──────────────────

html_src = ROOT / "index.html"
if not html_src.exists():
    print("✗ index.html not found")
    exit(1)

html = html_src.read_text(encoding="utf-8")

scripts = [
    "src/config.js",
    "src/svg-utils.js",
    "src/animation-engine.js",
    "src/cards/title.js",
    "src/cards/curve-family.js",
    "src/cards/curve-family-stacked.js",
    "src/cards/curve-family-3d.js",
    "src/cards/tabular.js",
    "src/cards/telemetry-grid.js",
    "src/cards/wireframe.js",
    "src/cards/polar.js",
    "src/cards/orbital.js",
    "src/cards/sunburst.js",
    "src/cards/streamgraph.js",
    "src/cards/edge-bundling.js",
    "src/cards/composite.js",
    "src/data/sources/inline.js",
    "src/data/sources/victoria.js",
    "src/data/fetcher.js",
    "src/app.js",
]

inline_blocks = []
for path in scripts:
    p = ROOT / path
    if not p.exists():
        print(f"✗ {path} not found")
        exit(1)
    code = p.read_text(encoding="utf-8")
    inline_blocks.append(f"<script>{code}</script>")

old_tag = '<!-- ── Application modules (loaded in dependency order) ─────────────── -->'
start = html.index(old_tag)
end = html.index("</body>", start)
new_section = old_tag + "\n" + "\n".join(inline_blocks) + "\n"
output = html[:start] + new_section + html[end:]

DIST.mkdir(exist_ok=True)

assets_dst = DIST / "assets"
if assets_dst.exists():
    shutil.rmtree(assets_dst)
shutil.copytree(ROOT / "assets", assets_dst)

dist_html = DIST / "index.html"
dist_html.write_text(output, encoding="utf-8")

print(f"✓ Built: {dist_html} ({dist_html.stat().st_size} bytes)")
