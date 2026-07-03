#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════════
#  Serve — lightweight HTTP server
#   - Serves static files (HTML, JS, fonts, etc.)
#   - Serves /api/config from radiator.yaml (as JSON)
#   - Run: python serve.py
#   - Then open: http://localhost:8009/
# ═══════════════════════════════════════════════════════════════════════

import json, yaml, os
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8009
ROOT = os.path.dirname(os.path.abspath(__file__))
YAML_PATH = os.path.join(ROOT, 'radiator.yaml')

class Handler(SimpleHTTPRequestHandler):

    def do_GET(self):
        if self.path == '/api/config':
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
            return
        # Everything else: serve static files
        super().do_GET()

    # Silence request logs
    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    os.chdir(ROOT)
    server = HTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Serving at http://localhost:{PORT}/')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
