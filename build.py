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
        chart = resolve_prototype(chart, prototypes)
        card = {
            "type": chart["chartType"],
            "title": chart.get("title", ""),
            "label": chart.get("label", ""),
            "color": resolve_color(chart.get("color", group.get("color", "rgb(0,0,0)"))),
            "animation": chart.get("animation"),
            "dataSource": chart.get("dataSource", {"type": "inline"}),
        }
        # Pass through extra card-specific fields (labels, cx, cy, maxR, w, h, etc.)
        skip = {"chartType", "type", "title", "label", "color", "animation", "dataSource", "prototype"}
        for k, v in chart.items():
            if k not in skip and v is not None:
                card[k] = v
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
    "src/cards/sunburst.js",
    "src/cards/streamgraph.js",
    "src/cards/edge-bundling.js",
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
    # Stub require() for SimpleRequire pattern (curve-family-3d)
    _ev = """[5000.0,5249.9,5499.17,5747.19,5993.35,6237.02,6477.6,6714.49,6947.09,7174.83,7397.13,7613.44,7823.21,8025.93,8221.09,8408.19,8586.78,8756.4,8916.63,9067.08,9207.35,9337.12,9456.04,9563.82,9660.2,9744.92,9817.79,9878.62,9927.25,9963.56,9987.47,9998.92,9997.87,9984.33,9958.32,9919.93,9869.24,9806.38,9731.5,9644.8,9546.49,9436.81,9316.05,9184.49,9042.48,8890.37,8728.53,8557.37,8377.32,8188.82,7992.36,7788.42,7577.51,7360.15,7136.9,6908.3,6674.94,6437.39,6196.25,5952.11,5705.6,5457.32,5207.9,4957.96,4708.13,4459.02,4211.27,3965.49,3722.29,3482.29,3246.08,3014.26,2787.4,2566.07,2350.82,2142.19,1940.71,1746.87,1561.17,1384.06,1215.99,1057.37,908.61,770.08,642.12,525.05,419.17,324.74,241.99,171.13,112.35,65.78,31.54,9.73,0.38,3.54,19.18,47.27,87.74,140.48,205.38,282.26,370.93,471.17,582.73,705.33,838.66,982.4,1136.18,1299.61,1472.3,1653.8,1843.67,2041.42,2246.57,2458.6,2676.99,2901.18,3130.62,3364.73,3602.92,3844.61,4089.19,4336.04,4584.55,4834.1,5084.07,5333.82,5582.75,5830.21,6075.6,6318.3,6557.71,6793.22,7024.25,7250.22,7470.57,7684.74,7892.2,8092.43,8284.93,8469.22,8644.85,8811.36,8968.34,9115.4,9252.18,9378.33,9493.54,9597.52]"""
    _ey = """[3500.0,3519.78,3539.1,3557.98,3576.4,3594.39,3611.92,3629.02,3645.67,3661.89,3677.67,3693.02,3707.95,3722.45,3736.54,3750.22,3763.5,3776.37,3788.85,3800.95,3812.67,3824.01,3835.0,3845.62,3855.9,3865.84,3875.46,3884.75,3893.73,3902.41,3910.8,3918.92,3926.76,3934.34,3941.68,3948.79,3955.66,3962.33,3968.8,3975.08,3981.18,3987.12,3992.91,3998.56,4004.09,4009.5,4014.82,4020.05,4025.21,4030.31,4035.37,4040.39,4045.4,4050.4,4055.41,4060.44,4065.51,4070.62,4075.8,4081.06,4086.4,4091.84,4097.41,4103.09,4108.93,4114.91,4121.06,4127.39,4133.91,4140.64,4147.58,4154.74,4162.15,4169.81,4177.72,4185.91,4194.39,4203.15,4212.22,4221.6,4231.3,4241.34,4251.71,4262.44,4273.52,4284.97,4296.8,4309.0,4321.59,4334.58,4347.96,4361.76,4375.96,4390.59,4405.63,4421.11,4437.01,4453.35,4470.13,4487.34,4505.0,4523.11,4541.66,4560.67,4580.12,4600.02,4620.37,4641.17,4662.42,4684.12,4706.26,4728.85,4751.88,4775.35,4799.25,4823.59,4848.36,4873.55,4899.16,4925.19,4951.62,4978.46,5005.7,5033.32,5061.33,5089.72,5118.48,5147.6,5177.07,5206.88,5237.03,5267.51,5298.31,5329.41,5360.81,5392.5,5424.46,5456.69,5489.18,5521.91,5554.87,5588.05,5621.44,5655.03,5688.8,5722.75,5756.85,5791.1,5825.48,5859.99]"""
    _ez = """[0.0,37.5,74.97,112.39,149.75,187.01,224.16,261.16,298.0,334.66,371.11,407.32,443.28,478.96,514.35,549.41,584.13,618.48,652.45,686.01,719.14,751.82,784.03,815.75,846.96,877.65,907.78,937.35,966.33,994.7,1022.46,1049.57,1076.03,1101.82,1126.92,1151.32,1174.99,1197.93,1220.12,1241.55,1262.21,1282.07,1301.13,1319.39,1336.81,1353.4,1369.15,1384.03,1398.06,1411.21,1423.48,1434.86,1445.34,1454.92,1463.59,1471.34,1478.17,1484.09,1489.07,1493.12,1496.24,1498.43,1499.68,1499.99,1499.36,1497.8,1495.3,1491.86,1487.5,1482.2,1475.98,1468.83,1460.77,1451.8,1441.91,1431.13,1419.45,1406.88,1393.44,1379.12,1363.95,1347.92,1331.04,1313.34,1294.81,1275.48,1255.35,1234.43,1212.74,1190.3,1167.11,1143.19,1118.56,1093.23,1067.21,1040.53,1013.19,985.23,956.65,927.47,897.71,867.39,836.53,805.14,773.25,740.88,708.05,674.77,641.07,606.97,572.49,537.65,502.48,467.0,431.22,395.17,358.87,322.35,285.63,248.73,211.68,174.49,137.2,99.82,62.37,24.89,-12.61,-50.1,-87.56,-124.97,-162.29,-199.52,-236.62,-273.57,-310.35,-346.94,-383.31,-419.44,-455.31,-490.9,-526.17,-561.12,-595.72,-629.95,-663.78,-697.2,-730.18,-762.71,-794.75,-826.31]"""
    mock_require = """<script>
(function() {
    var _modules = {};
    window.require = function(name) {
        if (!_modules[name]) {
            if (name === "env") _modules[name] = { env: function() { return {x:""" + _ev + """,y:""" + _ey + """,z:""" + _ez + """}; } };
            else if (name === "rbp3") _modules[name] = { rbp3: function() { return []; }, fetch: function() { return [{},{}]; } };
            else _modules[name] = {};
        }
        return _modules[name];
    };
})();
</script>"""
    inline_blocks.insert(0, mock_require)

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
