# ═══════════════════════════════════════════════════════════════════════
#  Build — read radiator.yaml, generate config.js, inline into dist/
#  Run: python build.py [optional-yaml-path]
#  Output: dist/index.html (open in browser via HTTP server)
# ═══════════════════════════════════════════════════════════════════════

import sys, json, shutil, yaml
from pathlib import Path

from config_pipeline import load_config_from_paths, flatten_config

ROOT = Path(__file__).parent
SRC  = ROOT / "src"
DIST = ROOT / "dist"

# ── 1. Read YAML ──────────────────────────────────────────────────────

yaml_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "radiator.yaml"
if not yaml_path.exists():
    yaml_path = ROOT / "radiator-demo.yaml"

cfg = load_config_from_paths(yaml_path, ROOT / "prototypes.yaml")

timing = cfg.get("timing", {})
groups = cfg.get("groups", [])
colors = cfg.get("colors", {})
prototypes = cfg.get("cardPrototypes", {})

# ── 2. Flatten groups into a linear card sequence ─────────────────────
# Runtime cycles through the flat list sequentially. Uses the SAME
# flatten_config as serve.py so dist/ and the dev server never diverge.

flat = flatten_config(cfg)
cards = flat["cards"]

# ── 3. Generate dist/config.js (fallback for development mode) ─────────

DIST.mkdir(exist_ok=True)
config_path = DIST / "config.js"
with open(config_path, "w", encoding="utf-8") as f:
    f.write("// ═══════════════════════════════════════════════════\n")
    f.write("//  Auto-generated from radiator.yaml\n")
    f.write("//  Do not edit directly — edit radiator.yaml and\n")
    f.write("//  run 'python build.py' to regenerate.\n")
    f.write("// ═══════════════════════════════════════════════════\n\n")
    f.write("window.HAL_CONFIG = ")
    json.dump({"timing": timing, "visual": cfg.get("visual", {}),
               "dataFault": cfg.get("dataFault", {"mode": "skip"}),
               "cards": cards,
               "prototypes": prototypes, "groups": groups, "colors": colors},
              f, indent=2)
    f.write(";\n")
print(f"[OK] Generated dist/config.js ({config_path.stat().st_size} bytes, {len(cards)} cards)")

# ── 4. Build dist/index.html (inline all JS modules) ──────────────────

html_src = ROOT / "index.html"
if not html_src.exists():
    print("[ERR] index.html not found")
    exit(1)

html = html_src.read_text(encoding="utf-8")

# Core bootstrap files (fixed order — must be first)
scripts = [
    "dist/config.js",
    "src/svg-utils.js",
    "src/animation-engine.js",
    "src/data/fetcher.js",
    "src/app.js",
]

# Auto-discover card renderers from src/cards/ (exclude _template)
cards_dir = SRC / "cards"
if cards_dir.is_dir():
    for f in sorted(cards_dir.iterdir()):
        if f.suffix == ".js" and f.stem != "_template":
            scripts.insert(-3, f"src/cards/{f.name}")

# Auto-discover data sources from src/data/sources/
sources_dir = SRC / "data" / "sources"
if sources_dir.is_dir():
    for f in sorted(sources_dir.iterdir()):
        if f.suffix == ".js":
            scripts.insert(-2, f"src/data/sources/{f.name}")

inline_blocks = []
for path in scripts:
    p = ROOT / path
    if not p.exists():
        print(f"[ERR] {path} not found")
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

data_dst = DIST / "data"
if data_dst.exists():
    shutil.rmtree(data_dst)
if (ROOT / "data").exists():
    shutil.copytree(ROOT / "data", data_dst)

dist_html = DIST / "index.html"
dist_html.write_text(output, encoding="utf-8")

print(f"[OK] Built: {dist_html} ({dist_html.stat().st_size} bytes)")
