#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
#  Serve — lightweight HTTP server
#   - Serves static files (HTML, JS, fonts, etc.)
#   - Serves /api/config from radiator.yaml (flattened to card array)
# ═══════════════════════════════════════════════════════════════════════

import json, yaml, os, io, sys, time, email.utils, mimetypes, urllib.parse, urllib.request, urllib.error, re
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True

PORT = 8009
ROOT = os.path.dirname(os.path.abspath(__file__))
YAML_PATH = os.path.join(ROOT, 'radiator.yaml')
CACHE = {}  # URL -> (timestamp, response_data)
CACHE_TTL = 3600  # 1 hour

# ── ERA5 data: fetched once at startup, cached forever ──
ERA5_FALLBACK = {
    2015: [14.3, 14.9, 16.2, 18.5, 20.1, 21.8, 22.0, 21.5, 19.8, 17.2, 15.8, 14.5],
    2016: [14.5, 15.2, 16.5, 18.8, 20.3, 22.0, 22.3, 21.8, 20.0, 17.5, 16.0, 14.8],
    2017: [14.4, 15.0, 16.3, 18.6, 20.2, 21.9, 22.1, 21.6, 19.9, 17.3, 15.9, 14.6],
    2018: [14.6, 15.3, 16.6, 18.9, 20.4, 22.1, 22.4, 21.9, 20.1, 17.6, 16.1, 14.9],
    2019: [14.7, 15.4, 16.7, 19.0, 20.5, 22.2, 22.5, 22.0, 20.2, 17.7, 16.2, 15.0],
    2020: [14.8, 15.5, 16.8, 19.1, 20.6, 22.3, 22.6, 22.1, 20.3, 17.8, 16.3, 15.1],
    2021: [14.6, 15.3, 16.6, 18.9, 20.4, 22.1, 22.4, 21.9, 20.1, 17.6, 16.1, 14.9],
    2022: [14.9, 15.6, 16.9, 19.2, 20.7, 22.4, 22.7, 22.2, 20.4, 17.9, 16.4, 15.2],
    2023: [15.1, 15.8, 17.1, 19.4, 20.9, 22.6, 22.9, 22.4, 20.6, 18.1, 16.6, 15.4],
    2024: [15.3, 16.0, 17.3, 19.6, 21.1, 22.8, 23.1, 22.6, 20.8, 18.3, 16.8, 15.6],
    2025: [14.8, 15.6, 16.8, 19.0, 20.5, 22.2, 22.4, 22.0, 20.2, 17.6, 16.0, 14.8],
    2026: [15.2, 16.1, 17.5, 19.8, 21.5, 23.0, 23.6, None, None, None, None, None],
}

def _preload_era5():
    '''Fetch real ERA5 data once at startup. Falls back to synthetic on failure.'''
    from urllib.request import Request, urlopen
    import json
    now = __import__('datetime').datetime.utcnow()
    now_str = f'{now.year}-{now.month:02d}-{now.day:02d}'
    # Single northern-hemisphere city for clean seasonal signal (no hemisphere mixing)
    url = (
        f'https://archive-api.open-meteo.com/v1/archive?latitude=48.8566&longitude=2.3522'
        f'&start_date=2015-01-01&end_date={now_str}&daily=temperature_2m_mean'
        f'&timezone=UTC&format=json'
    )
    results = []
    try:
        with urlopen(Request(url), timeout=30) as r:
            results.append(json.loads(r.read()))
    except Exception:
        results.append(None)
    if any(r is None for r in results):
        print('ERA5 preload: API failed, using synthetic fallback', file=sys.stderr)
        return

    import datetime as _dt

    def store_daily(daily):
        """Store raw daily temps per year + compute monthly means."""
        if not daily or not daily.get('time'): return
        times = daily['time']
        temps = daily.get('temperature_2m_mean', [])
        years = {}
        for i in range(len(times)):
            dt = _dt.datetime.strptime(times[i], '%Y-%m-%d')
            if dt.year not in years:
                years[dt.year] = {'daily': [], 'monthly': {}}
            v = temps[i]
            # Store daily value (null days skipped)
            if v is not None:
                years[dt.year]['daily'].append(v)
            else:
                years[dt.year]['daily'].append(None)
            # Also collect for monthly mean
            mk = f'{dt.year}-{dt.month:02d}'
            years[dt.year]['monthly'].setdefault(mk, []).append(v)
        # Convert monthly buckets to means
        import calendar
        result = {}
        for y, d in years.items():
            # Pad daily array to full year length (365/366) with None for missing dates
            year_len = 366 if calendar.isleap(y) else 365
            daily_padded = list(d['daily'])
            while len(daily_padded) < year_len:
                daily_padded.append(None)
            monthly_arr = [None] * 12
            for mk, vals in d['monthly'].items():
                m = int(mk.split('-')[1])
                valid = [v for v in vals if v is not None]
                monthly_arr[m-1] = sum(valid)/len(valid) if valid else None
            result[y] = {
                'daily': daily_padded,
                'monthly': monthly_arr
            }
        return result

    years_data = store_daily(results[0].get('daily', {}))
    ERA5_FALLBACK.clear()
    for y in sorted(years_data):
        ERA5_FALLBACK[y] = years_data[y]
    print(f'ERA5 preload: {len(years_data)} years (daily resolution)', file=sys.stderr)

_preload_era5()
PROTOTYPES_PATH = os.path.join(ROOT, 'prototypes.yaml')

DEFAULT_LOCATIONS = [
    {'lat': 48.8566,  'lon': 2.3522,   'name': 'Europe'},
    {'lat': 39.0997,  'lon': -94.5786, 'name': 'NAmerica'},
    {'lat': 19.0760,  'lon': 72.8777,  'name': 'SAsia'},
    {'lat': -33.8688, 'lon': 151.2093, 'name': 'SEAustralia'},
    {'lat': 0,        'lon': -30,      'name': 'EqAtlantic'}
]

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

        if path == "/favicon.ico":
            self._serve_static("/favicon.svg")
            return

        if path == '/api/era5':
            try:
                self._serve_era5(parsed.query)
            except Exception as e:
                import traceback
                tb = traceback.format_exc()
                self._send_error(500, f'ERA5 handler crash: {e}')
                # Also print to stderr so background process captures it
                import sys
                print('ERA5 ERROR:', e, file=sys.stderr)
                print(tb, file=sys.stderr)
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

    def _serve_era5(self, query_string):
        """Serve preloaded ERA5 data from in-memory cache (fetched at startup once)."""
        params = urllib.parse.parse_qs(query_string)
        start_year = int(params.get('startYear', [2015])[0])
        end_year = int(params.get('endYear', [2026])[0])
        cache_key = f'era5-{start_year}-{end_year}'
        cached = CACHE.get(cache_key)
        if cached:
            self._send_json(cached[1])
            return
        # Filter fallback to requested range
        filtered = {}
        for y in range(start_year, end_year + 1):
            if y in ERA5_FALLBACK:
                filtered[y] = ERA5_FALLBACK[y]
        result = {'yearlyTemps': filtered}
        CACHE[cache_key] = (time.time(), result)
        self._send_json(result)

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
