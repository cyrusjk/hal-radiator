#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
#  Serve — lightweight HTTP server
#   - Serves static files (HTML, JS, fonts, etc.)
#   - Serves /api/config from radiator.yaml (flattened to card array)
# ═══════════════════════════════════════════════════════════════════════

import json, os, sys, time, email.utils, mimetypes, urllib.parse, urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from config_pipeline import (
    load_config_from_paths,
    resolve_prototype,
    resolve_color,
    flatten_config,
)

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    allow_reuse_address = True

PORT = 8009
ROOT = os.path.dirname(os.path.abspath(__file__))
YAML_PATH = os.path.join(ROOT, 'radiator.yaml')
if not os.path.exists(YAML_PATH):
    YAML_PATH = os.path.join(ROOT, 'radiator-demo.yaml')
CACHE = {}  # URL -> (timestamp, response_data)
CACHE_TTL = 3600  # 1 hour

# ── ERA5 data: fetched once into memory in a background thread, so the
# server starts immediately even if the API is slow or down.
ERA5_DATA = None  # populated by _load_era5_at_startup() (background thread)


def _load_era5_at_startup():
    """Fetch ERA5 data once. Called in a background thread before listen."""
    from urllib.request import Request, urlopen
    import json, datetime as _dt, calendar

    now = _dt.datetime.now(_dt.timezone.utc).replace(tzinfo=None)
    today_str = f'{now.year}-{now.month:02d}-{now.day:02d}'

    url = (
        f'https://archive-api.open-meteo.com/v1/archive'
        f'?latitude=48.8566&longitude=2.3522'
        f'&start_date=2015-01-01&end_date={today_str}'
        f'&daily=temperature_2m_mean&timezone=UTC&format=json'
    )

    try:
        with urlopen(Request(url), timeout=60) as r:
            raw = json.loads(r.read())
    except Exception as exc:
        print(f'ERA5 startup fetch failed: {exc}', file=sys.stderr)
        return  # ERA5_DATA stays None → endpoint reports not-ready, retried later

    daily = raw.get('daily', {})
    times = daily.get('time', [])
    temps = daily.get('temperature_2m_mean', [])
    if not times:
        print('ERA5 startup: API returned no time series', file=sys.stderr)
        return

    years = {}
    for i in range(len(times)):
        dt = _dt.datetime.strptime(times[i], '%Y-%m-%d')
        yr = dt.year
        if yr not in years:
            years[yr] = {'daily': [], 'monthly': {}}
        v = temps[i] if i < len(temps) else None
        years[yr]['daily'].append(v)
        mk = f'{yr}-{dt.month:02d}'
        years[yr]['monthly'].setdefault(mk, []).append(v)

    result = {}
    for yr, d in sorted(years.items()):
        year_len = 366 if calendar.isleap(yr) else 365
        daily_padded = list(d['daily'])
        while len(daily_padded) < year_len:
            daily_padded.append(None)
        monthly_arr = [None] * 12
        for mk, vals in d['monthly'].items():
            m = int(mk.split('-')[1]) - 1
            valid = [v for v in vals if v is not None]
            monthly_arr[m] = sum(valid)/len(valid) if valid else None
        result[yr] = {'daily': daily_padded, 'monthly': monthly_arr}

    global ERA5_DATA
    ERA5_DATA = result
    print(f'ERA5 preloaded: {len(result)} years (daily resolution)', file=sys.stderr)

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
    return load_config_from_paths(YAML_PATH, PROTOTYPES_PATH)

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
        """Serve ERA5 data from in-memory cache (fetched in background thread)."""
        global ERA5_DATA
        if ERA5_DATA is None:
            self._send_json({'error': 'ERA5 data not ready yet', 'groups': []})
            return
        params = urllib.parse.parse_qs(query_string)
        start_year = int(params.get('startYear', [2015])[0])
        end_year = int(params.get('endYear', [2026])[0])
        cache_key = f'era5-{start_year}-{end_year}'
        cached = CACHE.get(cache_key)
        if cached and (time.time() - cached[0]) < CACHE_TTL:
            self._send_json(cached[1])
            return
        # Filter cached data to requested range
        filtered = {}
        for y in range(start_year, end_year + 1):
            if y in ERA5_DATA:
                filtered[y] = ERA5_DATA[y]
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
        # Deny dot-directories (.git, .venv, .github) and config/source files
        # that should never be served: radiator.yaml, prototypes.yaml, .env,
        # Python modules, and the memory helper.
        lower = clean.lower()
        denied_segments = ['.git', '.venv', '.github', '.vscode', '.pytest_cache',
                           '__pycache__', '.hermes', '.claude', '.cursor',
                           '.codebuddy', '.gemini', '.kiro', '.qoder']
        denied_exts = ('.yaml', '.yml', '.py', '.env')
        if any(seg in lower.split('/') for seg in denied_segments) or \
           lower.endswith(denied_exts) or lower == '.env' or lower == 'config.yaml':
            self._send_error(403, 'Forbidden')
            return
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
    # Start serving immediately; fetch ERA5 in a background thread so a slow
    # or down API never blocks startup (endpoint reports not-ready until done).
    import threading
    threading.Thread(target=_load_era5_at_startup, daemon=True).start()
    server = ThreadedHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Serving at http://localhost:{PORT}/')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
