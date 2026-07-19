#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
#  Serve — lightweight HTTP server
#   - Serves static files (HTML, JS, fonts, etc.)
#   - Serves /api/config from radiator.yaml (flattened to card array)
# ═══════════════════════════════════════════════════════════════════════

import json, yaml, os, io, email.utils, mimetypes, urllib.parse, urllib.request, re
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


def resolve_color(name, colors):
    return colors.get(name, name) if isinstance(name, str) else name


def flatten_config(cfg):
    """Convert the YAML groups structure into a flat card array,
    resolving card prototypes along the way."""
    colors = cfg.get("colors", {})
    timing = cfg.get("timing", {})
    visual = cfg.get("visual", {})
    groups = cfg.get("groups", [])
    prototypes = cfg.get("cardPrototypes", {})

    cards = []
    for group in groups:
        # Check if this is a layout/composite card (has layout.zones)
        layout = group.get("layout")
        if layout and layout.get("zones"):
            # Emit as a composite card
            zones = []
            for zone in layout.get("zones", []):
                z = dict(zone)
                zt = zone.get("type", "")
                if zt == "chart":
                    # Resolve prototype for chart zones
                    try:
                        chart = resolve_prototype(zone, prototypes)
                        z["chartType"] = chart.get("chartType", "curve-family")
                        z["dataSource"] = chart.get("dataSource", zone.get("dataSource", {}))
                        z.pop("prototype", None)
                    except ValueError:
                        pass  # unknown prototype, skip chartType resolution
                # Resolve named color references in zone
                if "color" in z:
                    z["color"] = resolve_color(z["color"], colors)
                if "bg" in z:
                    z["bg"] = resolve_color(z["bg"], colors)
                zones.append(z)
            cards.append({
                "type": "composite",
                "title": group.get("title", ""),
                "label": group.get("subheading", ""),
                "color": resolve_color(group.get("color", "rgb(0,0,0)"), colors),
                "zones": zones,
            })
            continue

        # Title card
        cards.append({
            "type": "title",
            "title": group["title"],
            "label": group.get("subheading", ""),
            "color": resolve_color(group.get("color", "rgb(0,0,0)"), colors),
        })
        # Chart cards
        for chart in group.get("charts", []):
            try:
                chart = resolve_prototype(chart, prototypes)
            except ValueError:
                continue
            c = dict(chart)
            c["type"] = chart.get("chartType", "curve-family")
            c["label"] = chart.get("label", "")
            c["color"] = resolve_color(chart.get("color", group.get("color", "rgb(0,0,0)")), colors)
            c.pop("chartType", None)
            cards.append(c)

    return {
        "timing": timing,
        "visual": visual,
        "dataFault": cfg.get("dataFault", {"mode": "skip"}),
        "cards": cards,
    }

class Handler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/config':
            self._serve_config()
            return

        if path == '/api/ephemeris':
            self._serve_ephemeris(parsed.query)
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

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(body)

    def _parse_jpl_response(self, raw):
        """Parse JPL Horizons batch output, return {x, y, z} or None."""
        for line in raw.split('\n'):
            line = line.strip()
            if not line:
                continue
            # Try "X = <val> Y = <val> Z = <val>"
            m = re.search(
                r'X\s*=\s*([\d\.Ee+\-]+)\s+Y\s*=\s*([\d\.Ee+\-]+)\s+Z\s*=\s*([\d\.Ee+\-]+)',
                line
            )
            if m:
                return {'x': float(m.group(1)), 'y': float(m.group(2)), 'z': float(m.group(3))}
            # Try CSV: JDTDB, ... X, Y, Z, ...
            parts = line.split(',')
            if len(parts) >= 5:
                try:
                    x = float(parts[2].strip())
                    y = float(parts[3].strip())
                    z = float(parts[4].strip())
                    return {'x': x, 'y': y, 'z': z}
                except (ValueError, IndexError):
                    pass
        return None

    def _serve_ephemeris(self, query_string):
        params = urllib.parse.parse_qs(query_string)
        body = (params.get('body') or [''])[0]
        center = (params.get('center') or ['500@0'])[0]
        time = (params.get('time') or [''])[0]
        if not body:
            self._send_json({'error': 'missing body param'}, 400)
            return
        # Build JPL Horizons batch URL
        # JPL needs start < stop; use 1-day window
        start_time = time or '2026-07-09'
        import datetime
        try:
            dt = datetime.datetime.strptime(start_time, '%Y-%m-%d')
            stop_time = (dt + datetime.timedelta(days=1)).strftime('%Y-%m-%d')
        except ValueError:
            stop_time = start_time  # fallback, may error
        jpl_url = (
            'https://ssd.jpl.nasa.gov/api/horizons.api'
            '?format=text'
            '&MAKE_EPHEM=YES'
            '&TABLE_TYPE=VECTORS'
            '&CSV_FORMAT=YES'
            f'&COMMAND={body}'
            f'&CENTER={center}'
            f'&START_TIME={start_time}'
            f'&STOP_TIME={stop_time}'
            '&OUT_UNITS=KM-D'
        )
        try:
            req = urllib.request.urlopen(jpl_url, timeout=15)
            raw = req.read().decode()
            result = self._parse_jpl_response(raw)
            if result:
                self._send_json(result)
            else:
                self._send_json({'error': 'no position data parsed'}, 502)
        except Exception as e:
            self._send_json({'error': str(e)}, 502)

    def _inject_card_scripts(self, html):
        """Inject ALL card .js files (except _template) — no filename coupling"""
        placeholder = '<!-- Card renderers auto-generated by serve.py from radiator.yaml -->'
        if placeholder not in html:
            return html
        try:
            cards_dir = os.path.join(ROOT, 'src', 'cards')
            NL = chr(10)
            tags = '<!-- Card renderers (auto-generated from config) -->' + NL
            if os.path.isdir(cards_dir):
                files = sorted(f for f in os.listdir(cards_dir)
                    if f.endswith('.js') and f != '_template.js')
                for f in files:
                    tags += '<script src="src/cards/' + f + '"></script>' + NL
            return html.replace(placeholder, tags, 1)
        except Exception:
            return html
    def _inject_data_source_scripts(self, html):
        """Inject ALL data source .js files — no registration needed"""
        placeholder = '<!-- Data source scripts auto-generated by serve.py -->'
        if placeholder not in html:
            return html
        try:
            sources_dir = os.path.join(ROOT, 'src', 'data', 'sources')
            NL = chr(10)
            tags = '<!-- Data source scripts (auto-generated) -->' + NL
            if os.path.isdir(sources_dir):
                files = sorted(f for f in os.listdir(sources_dir)
                    if f.endswith('.js'))
                for f in files:
                    tags += '<script src="src/data/sources/' + f + '"></script>' + NL
            return html.replace(placeholder, tags, 1)
        except Exception:
            return html

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
        if clean == 'index.html':
            with open(abspath, 'r', encoding='utf-8') as f:
                body = self._inject_card_scripts(f.read())
                body = self._inject_data_source_scripts(body)
            body = body.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            self.wfile.write(body)
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
