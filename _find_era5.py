import yaml, json
with open('radiator.yaml') as f:
    cfg = yaml.safe_load(f)
groups = cfg.get('groups', [])
for i, g in enumerate(groups):
    charts = g.get('charts', [])
    for j, ch in enumerate(charts):
        ds = ch.get('dataSource', {})
        if ds.get('type') == 'era5' or 'era5' in str(ch):
            print(f'Group {i} chart {j}: {json.dumps(ch, indent=2)[:500]}')
