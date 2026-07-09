#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
#  Serve — lightweight HTTP server
#   - Serves static files (HTML, JS, fonts, etc.)
#   - Serves /api/config from radiator.yaml (flattened to card array)
# ═══════════════════════════════════════════════════════════════════════

import json, yaml, os, io, email.utils, mimetypes, urllib.parse, urllib.request, re
from datetime import datetime, timezone, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True

PORT = 8009
ROOT = os.path.dirname(os.path.abspath(__file__))
YAML_PATH = os.path.join(ROOT, 'radiator.yaml')
PROTOTYPES_PATH = os.path.join(ROOT, 'prototypes.yaml')

def load_config():
    """Load radiator.yaml and merge prototypes.yaml into it."""
    with open(YAML_PATH, 'r') as f:
        cfg = yaml.safe_load(f) or {}
    try:
        with open(PROTOTYPES_PATH, 'r') as f:
            protos = yaml.safe_load(f) or {}
    except FileNotFoundError:
        protos = {}
    if 'cardPrototypes' not in cfg and 'cardPrototypes' in protos:
        cfg['cardPrototypes'] = protos['cardPrototypes']
    return cfg

def resolve_prototype(chart, prototypes):
    """Resolve a chart entry against card prototypes.

    If chart has 'prototype' key, merge prototype fields first,
    then overlay the chart's specific fields (title, label, color,
    dataSource). If no 'prototype' key, return chart unchanged
    for backward compatibility.
    """
    proto_name = chart.get('prototype')
    if not proto_name:
        return chart

    base = prototypes.get(proto_name)
    if base is None:
        raise ValueError(f"Unknown card prototype: {proto_name}")

    resolved = dict(base)            # start with prototype fields
    for k, v in chart.items():
        if k == 'prototype':
            continue
        if k == 'animation' and isinstance(v, dict):
            # Deep merge animation.phases
            resolved['animation'] = dict(resolved.get('animation', {}))
            resolved['animation']['phases'] = v.get('phases', resolved['animation'].get('phases', []))
        elif k == 'dataSource' and isinstance(v, dict):
            merged = dict(resolved.get('dataSource', {}))
            merged.update(v)
            resolved['dataSource'] = merged
        else:
            resolved[k] = v
    return resolved


def flatten_config(cfg):
    """Convert the YAML groups structure into a flat card array,
    resolving card prototypes along the way."""
    colors = cfg.get("colors", {})
    timing = cfg.get("timing", {})
    visual = cfg.get("visual", {})
    groups = cfg.get("groups", [])
    prototypes = cfg.get("cardPrototypes", {})

    def resolve_color(name):
        return colors.get(name, name) if isinstance(name, str) else name

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

    cards = []
    for group in groups:
        layout = group.get("layout")
        if layout:
            # ── Composite card — one card with multiple zones ──────────
            zones = []
            for zone_def in layout.get("zones", []):
                zone = dict(zone_def)

                # If this zone is a chart, resolve its prototype
                if zone.get("type") == "chart" and "prototype" in zone:
                    zone = resolve_prototype(zone, prototypes)
                    zone["type"] = "chart"
                    zone.pop("prototype", None)

                # Resolve colour for chart zones
                if zone.get("type") == "chart":
                    zone["color"] = resolve_color(
                        zone.get("color", group.get("color", "rgb(0,0,0)")))
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
            # Chart cards
            for chart in group.get("charts", []):
                chart = resolve_prototype(chart, prototypes)
                c = dict(chart)
                c["type"] = chart.get("chartType", "curve-family")
                c["label"] = chart.get("label", "")
                c["color"] = resolve_color(chart.get("color", group.get("color", "rgb(0,0,0)")))
                c.pop("chartType", None)
                apply_timescale(c, chart)
                cards.append(c)

    return {
        "timing": timing,
        "visual": visual,
        "cards": cards,
    }

class Handler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/config':
            self._serve_config()
            return

        if path.startswith('/api/ephemeris'):
            self._serve_ephemeris()
            return

        self._serve_static(path)

    def _serve_config(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Connection', 'close')
        self.end_headers()
        try:
            flat = flatten_config(load_config())
            self.wfile.write(json.dumps(flat).encode())
        except Exception as e:
            import traceback
            self.wfile.write(json.dumps({'error': str(e), 'trace': traceback.format_exc()}).encode())

    JPL_BATCH = 'https://ssd.jpl.nasa.gov/horizons_batch.cgi'

    def _serve_ephemeris(self):
        """Proxy to JPL Horizons batch CGI. Returns JSON with X,Y,Z vectors."""
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)

        body_id = qs.get('body', [''])[0]
        center  = qs.get('center', ['500@0'])[0]
        time    = qs.get('time', [''])[0]
        if not time:
            time = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        # Compute stop = start + 1 day (Horizons needs start<stop)
        try:
            dt = datetime.strptime(time, '%Y-%m-%d')
            stop = (dt + timedelta(days=1)).strftime('%Y-%m-%d')
        except ValueError:
            stop = time

        params = {
            'batch': '1',
            'COMMAND': f"'{body_id}'",
            'CENTER': f"'{center}'",
            'MAKE_EPHEM': 'YES',
            'EPHEM_TYPE': 'VECTORS',
            'START_TIME': f"'{time}'",
            'STOP_TIME': f"'{stop}'",
            'STEP_SIZE': "'1 d'",
            'QUANTITIES': "'1'",
            'CSV_FORMAT': "'YES'",
        }
        url = self.JPL_BATCH + '?' + urllib.parse.urlencode(params)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'HAL-Radiator/1.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode()

            # Parse the vector text: look for "X = <val> Y = <val> Z = <val>"
            # Both piped and CSV_FORMAT variants
            vals = {}
            # Match first occurrence of X/Y/Z values
            for line in raw.split('\n'):
                line = line.strip()
                if not line:
                    continue
                # Try "X = <val> Y = <val> Z = <val>" format
                m = re.search(r'X\s*=\s*([\d\.Ee+\-]+)\s+Y\s*=\s*([\d\.Ee+\-]+)\s+Z\s*=\s*([\d\.Ee+\-]+)', line)
                if m:
                    vals['x'] = float(m.group(1))
                    vals['y'] = float(m.group(2))
                    vals['z'] = float(m.group(3))
                    break
                # Try CSV format: JDTDB, ... X, Y, Z, ...
                parts = line.split(',')
                if len(parts) >= 5:
                    try:
                        x = float(parts[2].strip())
                        y = float(parts[3].strip())
                        z = float(parts[4].strip())
                        vals = {'x': x, 'y': y, 'z': z}
                        break
                    except:
                        pass

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'max-age=300')
            self.end_headers()
            if vals:
                self.wfile.write(json.dumps(vals).encode())
            else:
                self.wfile.write(json.dumps({'error': 'no vectors found', 'raw': raw[:500]}).encode())

        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def _serve_static(self, path):
        if path == '/' or path == '':
            path = '/index.html'
        clean = path.lstrip('/').replace('\\', '/')
        abspath = os.path.normpath(os.path.join(ROOT, clean))
        if not abspath.startswith(ROOT):
            self._send_error(403, 'Forbidden')
            return
        if not os.path.isfile(abspath):
            self._send_error(404, 'Not Found')
            return
        ct, _ = mimetypes.guess_type(abspath)
        if ct is None:
            ct = 'application/octet-stream'
        st = os.stat(abspath)
        self.send_response(200)
        self.send_header('Content-Type', ct)
        self.send_header('Content-Length', str(st.st_size))
        self.send_header('Last-Modified', email.utils.formatdate(st.st_mtime, usegmt=True))
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        with open(abspath, 'rb') as f:
            remaining = st.st_size
            while remaining:
                chunk = 65536 if remaining >= 65536 else remaining
                data = f.read(chunk)
                if not data:
                    break
                self.wfile.write(data)
                remaining -= len(data)

    def _send_error(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(f'{code} {msg}\n'.encode())

    def log_message(self, fmt, *args):
        pass

if __name__ == '__main__':
    os.chdir(ROOT)
    server = ThreadedHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Serving at http://localhost:{PORT}/')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
