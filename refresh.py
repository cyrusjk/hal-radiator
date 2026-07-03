# ═══════════════════════════════════════════════════════════════════════
#  Refresh — query VictoriaMetrics and bake live data into radiator.yaml
#  Run before build to get fresh metrics:
#    python refresh.py
#    python build.py
#
#  For each chart card in radiator.yaml with dataSource.type='victoria',
#  queries VictoriaMetrics and replaces the dataSource with an inline
#  groups payload containing the fetched data.
# ═══════════════════════════════════════════════════════════════════════

import json, sys, time, yaml
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlencode

ROOT = Path(__file__).parent
YAML_PATH = ROOT / "radiator.yaml"
VM_TIMEOUT = 10

# ── VM query ──────────────────────────────────────────────────────────

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
    """VM range response → list of { name, series: [ { label, values } ] }"""
    out = {}
    for r in (raw.get('data') or {}).get('result') or []:
        m = r['metric']
        grp = m.get(group_label, 'unknown')
        ser = m.get(series_label, 'value') if series_label else 'value'
        vals = [float(v[1]) for v in r['values']]
        if vals:
            out.setdefault(grp, {})[ser] = vals
    return [{'name': g, 'series': [{'label': s, 'values': v} for s, v in sv.items()]}
            for g, sv in out.items()]

# ── Main ──────────────────────────────────────────────────────────────

def main():
    if not YAML_PATH.exists():
        print(f"✗ {YAML_PATH} not found")
        return 1

    with open(YAML_PATH) as f:
        cfg = yaml.safe_load(f)

    groups = cfg.get('groups', [])
    total = 0
    success = 0
    fail = 0

    for group in groups:
        for chart in group.get('charts', []):
            ds = chart.get('dataSource', {})
            if ds.get('type') != 'victoria':
                continue
            total += 1
            url = ds.get('url')
            promql = ds.get('promql')
            mapping = ds.get('map', {})
            if not url or not promql:
                continue

            print(f"  Query: {promql[:60]}...")
            try:
                raw = vm_query(url, promql)
                groups_data = transform(raw,
                    mapping.get('group', 'job'),
                    mapping.get('series'))
                # Replace dataSource with inline data
                chart['dataSource'] = {
                    'type': 'inline',
                    'groups': groups_data,
                }
                print(f"    ✓ {len(groups_data)} group(s) baked")
                success += 1
            except Exception as e:
                print(f"    ✗ {e}")
                fail += 1

    if total:
        with open(YAML_PATH, 'w') as f:
            yaml.dump(cfg, f, default_flow_style=None, sort_keys=False, allow_unicode=True)
        print(f"\n✓ Updated {YAML_PATH}")

    print(f"Done: {success} refreshed, {fail} failed, {total} total")
    return 0 if fail == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
