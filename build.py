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

timing = cfg.get("timing", {})
groups = cfg.get("groups", [])
colors = cfg.get("colors", {})

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
# Runtime cycles through the flat list sequentially.

cards = []
for group in groups:
    # Title card
    cards.append({
        "type": "title",
        "title": group["title"],
        "label": group.get("subheading", ""),
        "color": resolve_color(group.get("color", "rgb(0,0,0)")),
    })
    # Chart cards for this group
    for chart in group.get("charts", []):
        card = {
            "type": chart["chartType"],
            "title": chart.get("title", ""),
            "label": chart.get("label", ""),
            "color": resolve_color(chart.get("color", group.get("color", "rgb(0,0,0)"))),
            "dataSource": chart.get("dataSource", {"type": "inline"}),
        }
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
