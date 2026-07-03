# ═══════════════════════════════════════════════════════════════════════
#  Refresh — query VictoriaMetrics and bake live data into index.html
#  Run this before opening the radiator for fresh metrics:
#    python refresh.py
#
#  The script reads dist/index.html, finds every card with
#  dataSource.type='victoria', queries VM for each, replaces the
#  dataSource config with the fetched groups[] payload baked inline,
#  then opens the page (no server, no network calls needed).
# ═══════════════════════════════════════════════════════════════════════

import json, re, subprocess, sys, time
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode

ROOT = Path(__file__).parent
INDEX = ROOT / "dist" / "index.html"
VM_TIMEOUT = 10

# ── VM query helpers ──────────────────────────────────────────────────

def vm_query(url, promql, step=37.5):
    now = time.time()
    params = urlencode({
        'query': promql,
        'start': int(now - 300),
        'end': int(now),
        'step': step,
    })
    full = url.rstrip('/') + '/api/v1/query_range?' + params
    return json.loads(urlopen(full, timeout=VM_TIMEOUT).read())

def transform(raw, group_label='job', series_label=None):
    """VM range response → { groups: [ { name, series: [...] } ] }"""
    out = {}
    for r in (raw.get('data') or {}).get('result') or []:
        m = r['metric']
        grp = m.get(group_label, 'unknown')
        ser = m.get(series_label, 'value') if series_label else 'value'
        vals = [float(v[1]) for v in r['values']]
        if vals:
            out.setdefault(grp, {})[ser] = vals
    groups = [{'name': g, 'series': [{'label': s, 'values': v} for s, v in sv.items()]}
              for g, sv in out.items()]
    return {'groups': groups}

# ── Parse & replace dataSource blocks ─────────────────────────────────

def parse_card_configs(html):
    """Yield (start, end, type_str, raw_block) for every dataSource block."""
    idx = 0
    while True:
        start = html.find('dataSource:', idx)
        if start == -1:
            return
        # Find the opening brace
        brace = html.find('{', start)
        if brace == -1:
            idx = start + 1
            continue
        # Walk balanced braces
        depth = 0
        end = brace
        for i in range(brace, len(html)):
            c = html[i]
            if c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        if depth != 0:
            idx = start + 1
            continue
        block = html[start:end]
        type_match = re.search(r"type:\s*'(\w+)'", block)
        ds_type = type_match.group(1) if type_match else 'inline'
        yield (start, end, ds_type, block)
        idx = end

def extract_field(block, name):
    """Extract a quoted field value from a JS object snippet."""
    m = re.search(r"\b" + name + r":\s*'([^']*)'", block)
    return m.group(1) if m else None

def extract_map(block):
    """Extract group/series labels from a map: { ... } inside the dataSource."""
    m = re.search(r"map:\s*\{([^}]+)\}", block)
    if not m:
        return 'job', None
    inner = m.group(1)
    g = re.search(r"group:\s*'(\w+)'", inner)
    s = re.search(r"series:\s*'([^']*)'", inner)
    return (g.group(1) if g else 'job',
            s.group(1) if s and s.group(1) else None)

# ── Main ──────────────────────────────────────────────────────────────

def main():
    if not INDEX.exists():
        print(f"✗ {INDEX} not found. Run 'python build.py' first.")
        return 1

    html = INDEX.read_text('utf-8')

    # Collect all dataSource blocks first (we'll replace in reverse)
    cards = list(parse_card_configs(html))
    victoria_cards = [(s, e, b) for s, e, t, b in cards if t == 'victoria']

    if not victoria_cards:
        print("! No VictoriaMetrics cards found. Page is already self-contained.")
        return 0

    print(f"→ {len(victoria_cards)} live card(s) to refresh from VictoriaMetrics\n")

    successes = 0
    failures = 0

    for start, end, block in reversed(victoria_cards):
        url = extract_field(block, 'url')
        promql = extract_field(block, 'promql')
        group_label, series_label = extract_map(block)
        if not url or not promql:
            continue

        print(f"  Query: {promql[:70]}...")
        try:
            raw = vm_query(url, promql)
            groups = transform(raw, group_label, series_label)['groups']
            groups_js = json.dumps(groups)
            replacement = f"dataSource: {{ type: 'inline', groups: {groups_js} }}"
            html = html[:start] + replacement + html[end:]
            print(f"    ✓ {len(groups)} group(s) baked")
            successes += 1
        except Exception as e:
            print(f"    ✗ {e}")
            failures += 1

    INDEX.write_text(html, 'utf-8')
    print(f"\nDone: {successes} refreshed, {failures} failed")
    print(f"Size: {INDEX.stat().st_size} bytes")
    return 0 if failures == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
