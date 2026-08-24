# GutOmicsAtlas HTTP server: serves the React SPA (frontend/dist), static /imgs and
# /data/st figures, same-origin proxies to local R plot backends (/api/… and /r/…),
# and POST /chat for the AI assistant. Listens on port 8000.
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from _thread import start_new_thread
from time import sleep
import urllib.error
import urllib.request
import os
from ai import process_ai_chat

# Same-origin /api/{name}/… → local R httpuv ports (resources/*.R).
R_API_PREFIX_TO_PORT: dict[str, int] = {
    'scrna-epithelial': 9025,
    'scrna-eec': 9028,
    'atac-all': 9026,
    'atac-celltype': 9027,
}

BROWSER_CACHE = True

# React frontend build (Vite). Server serves from here for /, /index.html, /assets/*, and SPA fallback.
FRONTEND_DIST = "frontend/dist"

class Request(BaseHTTPRequestHandler):
    def do_HEAD(self):
        try:
            # simplest: behave like GET but do not write a body
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
        except Exception:
            # avoid noisy stack traces on random scanners
            self.send_error(500)

    def process_robots_txt(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"User-agent: *\nDisallow:\n")

    def process_sitemap_xml(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/xml")
        self.end_headers()
        self.wfile.write(b'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')

    def do_GET(self) -> None:
        path = self.path.split('?')[0]
        # Browsers still request /favicon.ico; we only ship public/favicon.svg from the Vite build.
        if path == '/favicon.ico':
            self.send_response(302)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Location', '/favicon.svg')
            self.send_header('Content-Length', 0)
            self.end_headers()
            self.wfile.flush()
            return
        # React SPA: / and /index.html
        if path == '/' or path == '/index.html':
            return self.serve_react_index()
        if (path.startswith('/imgs/')):
            return self.serve_react_static(path)
        if (path.startswith('/api/')):
            return self.process_api()
        # Same-origin proxy to local R httpuv services (browser <img> / fetch cannot hit 127.0.0.1 R ports).
        if path.startswith('/r/'):
            return self.process_r_proxy()
        # Spatial static datasets live outside frontend/dist; serve via process_data()
        # Frontend uses /sm/... and /st/... paths.
        if (path.startswith('/sm/')) or (path.startswith('/st/')):
            self.path = '/data' + path
            return self.process_data()
        if(path.startswith('/data/')):
            return self.process_data()
        if (path == '/robots.txt'):
            return self.process_robots_txt()
        if (path == '/sitemap.xml'):
            return self.process_sitemap_xml()
        # React static: /assets/* and root-level public files copied into dist (favicon.svg, icons.svg, etc.)
        if path.startswith('/assets/') or path in ('/vite.svg', '/favicon.svg', '/icons.svg', '/heart_logo_1.png'):
            return self.serve_react_static(path)
        # SPA fallback for client-side routes: /chat, /spatial, /multiomics, /scrna, etc.
        return self.serve_react_index()

    def do_POST(self) -> None:
        path = self.path.split('?', 1)[0]
        if (path == '/chat'):
            return process_ai_chat(self, path)
        self.send_response(404)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Content-Length', 13)
        self.end_headers()
        self.wfile.write(b'404 Not Found')
        self.wfile.flush()
        return

    def log_message(self, format, *args):
        pass
    
    def process_r_proxy(self) -> None:
        path, _, query = self.path.partition('?')
        if not path.startswith('/r/') or path.count('/') < 3:
            return self.process_404()
        rest = path[3:]
        slash = rest.find('/')
        if slash <= 0:
            return self.process_404()
        port_s, upstream_path = rest[:slash], rest[slash + 1 :]
        if not port_s.isdigit() or not upstream_path:
            return self.process_404()
        port = int(port_s)
        if port < 1024 or port > 65535:
            return self.process_404()
        url = f'http://127.0.0.1:{port}/{upstream_path}'
        if query:
            url = f'{url}?{query}'
        try:
            with urllib.request.urlopen(url, timeout=3600) as resp:
                body = resp.read()
                status = resp.getcode()
                content_type = resp.headers.get('Content-Type', 'application/octet-stream')
        except urllib.error.HTTPError as e:
            body = e.read()
            status = e.code
            content_type = e.headers.get('Content-Type', 'text/plain; charset=utf-8') if e.headers else 'text/plain; charset=utf-8'
        except Exception:
            msg = b'R proxy: upstream unreachable'
            self.send_response(502)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Content-Length', len(msg))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(msg)
            self.wfile.flush()
            return
        self.send_response(status)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)
        self.wfile.flush()
        return

    def process_api(self):
        """Proxy GET /api/{scrna-epithelial|scrna-eec|atac-all|atac-celltype}/… to the matching R port."""
        path, _, query = self.path.partition('?')
        rest = path[5:]
        if not rest or '..' in rest:
            return self.process_404()
        slash = rest.find('/')
        prefix = rest if slash < 0 else rest[:slash]
        port = R_API_PREFIX_TO_PORT.get(prefix)
        if port is None:
            return self.process_404()
        upstream = rest[slash:] if slash >= 0 else '/'
        if not upstream.startswith('/'):
            upstream = '/' + upstream
        self.path = f'/r/{port}{upstream}'
        if query:
            self.path = f'{self.path}?{query}'
        return self.process_r_proxy()
    
    def process_data(self):
        path = self.path
        path = path[6:]
        assert('..' not in path)
        data = b''
        if (path.startswith('st/')):
            path = path[3:]
            with open(f'../data/Xenium/Xenium figures/{path}', 'rb') as f:
                data = f.read()
        if (path.startswith('sm/')):
            path = path[3:]
            with open(f'../data/Spatial Metabolomics/Metaboliteimages/{path}', 'rb') as f:
                data = f.read()
        self.send_response(200)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Content-Type', 'image/png')
        self.send_header('Content-Length', len(data))
        if (BROWSER_CACHE):
            self.send_header('Cache-Control', 'max-age=300')
        self.end_headers()
        self.wfile.write(data)
        self.wfile.flush()
        return

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', 0)
        self.end_headers()
        self.wfile.write(b'')
        self.wfile.flush()
        return

    def serve_react_index(self) -> None:
        """Serve the React SPA index.html from frontend/dist. 404 if the build is missing."""
        idx = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(idx):
            with open(idx, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Connection", "keep-alive")
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", len(data))
            if BROWSER_CACHE:
                self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)
            self.wfile.flush()
        else:
            return self.process_404()

    def serve_react_static(self, path: str) -> None:
        """Serve a static file from frontend/dist. 404 if not found."""
        rel = path.lstrip("/")
        if ".." in rel or rel == "":
            return self.process_404()
        fp = os.path.join(FRONTEND_DIST, rel)
        if not os.path.isfile(fp):
            return self.process_404()
        ext = os.path.splitext(fp)[1].lower()
        ct = {
            ".js": "application/javascript",
            ".css": "text/css",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
            ".woff": "font/woff",
            ".woff2": "font/woff2",
        }.get(ext, "application/octet-stream")
        with open(fp, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Connection", "keep-alive")
        self.send_header("Content-Type", ct)
        self.send_header("Content-Length", len(data))
        if BROWSER_CACHE:
            self.send_header("Cache-Control", "max-age=300")
        self.end_headers()
        self.wfile.write(data)
        self.wfile.flush()

    def process_404(self) -> None:
        self.send_response(404)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Content-Length', 13)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'404 Not Found')
        self.wfile.flush()
        return


server = ThreadingHTTPServer(('0.0.0.0', 8000), Request)
start_new_thread(server.serve_forever, ())
while True:
    sleep(10)
