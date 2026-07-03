#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
#  Serve — lightweight HTTP server
#   - Serves static files (HTML, JS, fonts, etc.)
#   - Serves /api/config from radiator.yaml (as JSON)
# ═══════════════════════════════════════════════════════════════════════

import json, yaml, os, io, email.utils, mimetypes, urllib.parse, traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

PORT = 8009
ROOT = os.path.dirname(os.path.abspath(__file__))
YAML_PATH = os.path.join(ROOT, 'radiator.yaml')

class Handler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/config':
            self._serve_config()
            return

        # Serve static file
        self._serve_static(path)

    # ── API: radiator.yaml as JSON ────────────────────────────────────
    def _serve_config(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            with open(YAML_PATH) as f:
                cfg = yaml.safe_load(f)
            self.wfile.write(json.dumps(cfg).encode())
        except Exception as e:
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    # ── Static file server ────────────────────────────────────────────
    def _serve_static(self, path):
        # Default document
        if path == '/' or path == '':
            path = '/index.html'

        # Build absolute path, preventing directory traversal
        clean = path.lstrip('/').replace('\\', '/')
        abspath = os.path.normpath(os.path.join(ROOT, clean))
        if not abspath.startswith(ROOT):
            self._send_error(403, 'Forbidden')
            return

        if not os.path.isfile(abspath):
            self._send_error(404, 'Not Found')
            return

        # Determine content type
        ct, _ = mimetypes.guess_type(abspath)
        if ct is None:
            ct = 'application/octet-stream'

        st = os.stat(abspath)
        size = st.st_size
        mtime = st.st_mtime

        self.send_response(200)
        self.send_header('Content-Type', ct)
        self.send_header('Content-Length', str(size))
        self.send_header('Last-Modified', email.utils.formatdate(mtime, usegmt=True))
        self.end_headers()

        with open(abspath, 'rb') as f:
            remaining = size
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
        pass  # silent

if __name__ == '__main__':
    os.chdir(ROOT)
    server = HTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Serving at http://localhost:{PORT}/')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
