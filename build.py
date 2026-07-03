# ═══════════════════════════════════════════════════════════════════════
#  Build — inline all JS modules into a single HTML file
#  Run: python build.py
#  Output: dist/index.html (works from file:// with no server)
# ═══════════════════════════════════════════════════════════════════════

import shutil
from pathlib import Path

ROOT = Path(__file__).parent
SRC  = ROOT / "src"
DIST = ROOT / "dist"

# Read the main index.html
html = (ROOT / "index.html").read_text(encoding="utf-8")

# Read each JS file
scripts = [
    "src/config.js",
    "src/svg-utils.js",
    "src/transitions.js",
    "src/cards/title.js",
    "src/cards/curve-family.js",
    "src/data/sources/inline.js",
    "src/data/sources/victoria.js",
    "src/data/fetcher.js",
    "src/app.js",
]

# Build the inline script blocks
inline_blocks = []
for path in scripts:
    code = (ROOT / path).read_text(encoding="utf-8")
    inline_blocks.append(f"<script>{code}</script>")

# Replace the script src tags with inline content
old_tag = '<!-- ── Application modules (loaded in dependency order) ─────────────── -->'
# Find the start and end
start = html.index(old_tag)
# Find where the last </script> closes
# The section ends at the </body> tag
end = html.index("</body>", start)

new_section = old_tag + "\n" + "\n".join(inline_blocks) + "\n"

output = html[:start] + new_section + html[end:]

# Write
DIST.mkdir(exist_ok=True)
dist_html = DIST / "index.html"

# Copy assets
assets_dst = DIST / "assets"
if assets_dst.exists():
    shutil.rmtree(assets_dst)
shutil.copytree(ROOT / "assets", assets_dst)

dist_html.write_text(output, encoding="utf-8")
print(f"✓ Built: {dist_html} ({dist_html.stat().st_size} bytes)")
