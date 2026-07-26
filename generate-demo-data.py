#!/usr/bin/env python3
"""
Generate radiator-demo.yaml from radiator.yaml, replacing all external
(VictoriaMetrics, ERA5) data sources with self-contained inline demo data.
Run:  python generate-demo-data.py
Then: python build.py radiator-demo.yaml
"""
import yaml, json, math, random, copy
from pathlib import Path
from datetime import datetime, timedelta

ROOT = Path(__file__).parent
SRC_YAML = ROOT / 'radiator.yaml'
DST_YAML = ROOT / 'radiator-demo.yaml'

random.seed(42)

def sine_wave(points, freq=0.05, amp=50, offset=50, noise=5):
    """Return a list of `points` values oscillating around `offset`."""
    base = [offset + amp * math.sin(i * freq * 2 * math.pi) for i in range(points)]
    return [round(v + random.uniform(-noise, noise), 1) for v in base]

def noise_walk(points, start=50, step=3, clamp=(0, 100)):
    """Random walk constrained to [clamp]."""
    v = start; out = []
    for _ in range(points):
        v += random.uniform(-step, step)
        v = max(clamp[0], min(clamp[1], v))
        out.append(round(v, 1))
    return out

# ── Demo data generators ──────────────────────────────────────────────

def gen_avg():
    """CPU load average — 3 series, 60 points."""
    return {
        'type': 'inline',
        'groups': [{
            'name': 'main',
            'series': [
                {'label': '1 MIN',  'values': sine_wave(60, 0.03, 15, 30, 3)},
                {'label': '5 MIN',  'values': sine_wave(60, 0.02, 12, 25, 2)},
                {'label': '15 MIN', 'values': sine_wave(60, 0.01, 10, 22, 2)},
            ]
        }]
    }

def gen_thr():
    """Network throughput — TX and RX, 20 points."""
    return {
        'type': 'inline',
        'groups': [{
            'name': 'eth0',
            'series': [
                {'label': 'TX', 'values': sine_wave(20, 0.1, 60, 70, 8)},
                {'label': 'RX', 'values': sine_wave(20, 0.08, 70, 80, 10)},
            ]
        }]
    }

def gen_cpu():
    """CPU load — 3 core groups, each with load1/load5/load15."""
    groups = []
    for core in ['core0', 'core1', 'core2']:
        groups.append({
            'name': core,
            'series': [
                {'label': '1 MIN',  'values': sine_wave(60, 0.04 + 0.01*int(core[4]), 20, 40, 5)},
                {'label': '5 MIN',  'values': sine_wave(60, 0.03, 15, 35, 4)},
                {'label': '15 MIN', 'values': sine_wave(60, 0.02, 12, 30, 3)},
            ]
        })
    return {'type': 'inline', 'groups': groups}

def gen_cpu_stacked():
    """CPU stacked — 3 processes, 60 points each."""
    return {
        'type': 'inline',
        'groups': [{
            'name': 'system',
            'series': [
                {'label': 'user',   'values': sine_wave(60, 0.04, 20, 35, 4)},
                {'label': 'system', 'values': sine_wave(60, 0.05, 15, 25, 3)},
                {'label': 'iowait', 'values': sine_wave(60, 0.03, 10, 15, 5)},
            ]
        }]
    }

def gen_load():
    """Load 1/5/15 — 3D curve data, 3 groups of 1 series each."""
    groups = []
    for label, freq, amp, off in [('1 MIN', 0.04, 20, 40), ('5 MIN', 0.03, 15, 35), ('15 MIN', 0.02, 12, 30)]:
        groups.append({
            'name': label,
            'series': [{'label': 'load', 'values': sine_wave(60, freq, amp, off, 4)}]
        })
    return {'type': 'inline', 'groups': groups}

def gen_tabular_vec():
    """VEC tabular — stable numbers."""
    return {
        'type': 'inline',
        'columns': ['MODE', 'STATUS', 'VALUE'],
        'rows': [
            ['AUTO', 'OK', 87.3],
            ['MANUAL', 'STANDBY', 12.1],
            ['SAFE', 'NOMINAL', 99.8],
            ['DIAG', 'WARN', 45.6],
        ]
    }

def gen_tlm():
    """Telemetry grid — 16 cells of telemetry values."""
    labels = ['PWR', 'TMP', 'PRS', 'VOL', 'AMP', 'FRQ', 'PHZ', 'RPM',
              'FLW', 'LVL', 'DMP', 'STL', 'GYR', 'ACC', 'MAG', 'THR']
    return {
        'type': 'inline',
        'labels': labels,
        'values': [round(random.uniform(0, 100), 1) for _ in labels],
        'units': ['kW', '°C', 'kPa', 'V', 'A', 'Hz', '°', 'rpm',
                  'L/s', 'm', '%', 'N·m', '°/s', 'm/s²', 'µT', '%']
    }

def gen_polar():
    """Polar chart — circular data, 36 angular sectors."""
    angles = [i * 10 for i in range(36)]
    values = [round(30 + 20 * math.sin(i * 0.3) + random.uniform(-5, 5), 1) for i in range(36)]
    return {
        'type': 'inline',
        'series': [{'label': 'radial', 'values': values}],
        'angles': angles,
        'unit': 'µSv/h',
    }

def gen_temp():
    """Temperature polar — 12 monthly readings."""
    values = [round(15 + 10 * math.sin((i - 1) * math.pi / 6) + random.uniform(-2, 2), 1) for i in range(12)]
    return {
        'type': 'inline',
        'series': [{'label': 'GLOBAL TEMPERATURE', 'values': values}],
        'angles': [i * 30 for i in range(12)],
        'unit': '°C',
    }

# ── Map: card title → data generator ─────────────────────────────────
DATA_GEN = {
    'AVG':      gen_avg,
    'THR':      gen_thr,
    'CPU':      gen_cpu,       # first CPU card (load avg)
    'CPU_stk':  gen_cpu_stacked,
    'LOAD':     gen_load,
    'VEC':      gen_tabular_vec,
    'TLM':      gen_tlm,
    'RAD':      gen_polar,
    'TEMP':     gen_temp,
    'GLOBAL TEMPERATURE': gen_temp,
}

def is_victoria(ds):
    return isinstance(ds, dict) and ds.get('type') == 'victoria'

def is_era5(ds):
    return isinstance(ds, dict) and ds.get('type') == 'era5'

def needs_replacement(ds):
    return is_victoria(ds) or is_era5(ds)

def sanitize_value(v):
    """Replace local IP / hostname references with generic placeholders."""
    if isinstance(v, str):
        v = v.replace('http://192.168.50.9:8428', 'http://metrics:8428')
        v = v.replace('192.168.50.9', 'metrics.local')
        v = v.replace('PAPPY', 'HOST')
    return v

def sanitize_dict(d):
    """Recursively sanitize all strings in a dict/list."""
    if isinstance(d, dict):
        return {k: sanitize_dict(sanitize_value(v)) for k, v in d.items()}
    elif isinstance(d, list):
        return [sanitize_dict(sanitize_value(item)) for item in d]
    else:
        return sanitize_value(d)

def replace_data_source(chart):
    """Replace victoria/era5 dataSource with inline demo data."""
    ds = chart.get('dataSource', {})
    if not needs_replacement(ds):
        # Check nested dataConfig too (composite zone charts)
        dcfg = chart.get('dataConfig', {})
        if isinstance(dcfg, dict):
            inner_ds = dcfg.get('dataSource', {})
            if needs_replacement(inner_ds):
                dcfg['dataSource'] = find_generator(chart)()
                return True
        return False

    chart['dataSource'] = find_generator(chart)()
    return True

def find_generator(chart):
    """Find matching data generator for a chart."""
    title = chart.get('title', '')
    label = chart.get('label', '')
    proto = chart.get('prototype', '')

    for key in [title, label]:
        if key in DATA_GEN:
            return DATA_GEN[key]

    if 'curve-family-3d' in proto:
        return DATA_GEN['LOAD']
    elif 'curve-family-stacked' in proto:
        return DATA_GEN['CPU_stk']

    # Fallback: empty inline
    return lambda: {'type': 'inline', 'groups': []}

def main():
    with open(SRC_YAML) as f:
        cfg = yaml.safe_load(f)

    # Walk every group section and its chart entries
    for group in cfg.get('groups', []):
        charts = group.get('charts', [])
        for chart in charts:
            replace_data_source(chart)

    # Sanitize all strings in the entire config
    cfg = sanitize_dict(cfg)

    # Remove era5_cache key if present
    cfg.pop('era5_cache', None)
    cfg.pop('vars', None)  # remove URL vars pointing at local network

    with open(DST_YAML, 'w') as f:
        yaml.dump(cfg, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    print(f"\nWritten: {DST_YAML}")

    # Now build it
    import subprocess, sys
    result = subprocess.run([sys.executable, str(ROOT / 'build.py'), str(DST_YAML)],
                           capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)

if __name__ == '__main__':
    main()
