from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from _thread import start_new_thread
from time import sleep, time
import json
import re
import urllib.error
import urllib.request
from myBasics import binToBase64
from mySecrets import hexToStr
import os
from queue import Queue
from R_http import R_call
from utils import *
from hashlib import sha256
from random import randint
from _thread import start_new_thread
from datetime import datetime, timezone
from ai import process_ai_chat
from mySecrets import hexToStr
from secrets import token_hex
from my_email import send_email

IS_SERVER = False
IS_SERVER = True

_SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
DOCKER_DATA_DIR = os.path.normpath(os.path.join(_SERVER_DIR, '..', 'docker_data'))

# POST /api/email-plot-link: optional "email me this plot URL" for allowlisted UI flows.
_EMAIL_PLOT_LINK_CONTEXTS: dict[str, str] = {
    'scrna_epithelial': 'Result for scRNA-Seq Epithelial cells analysis',
    'scrna_eec': 'Result for scRNA-Seq Enteroendocrine (EEC) cells analysis',
}
_EMAIL_PLOT_PNG_MAX_BYTES = 25 * 1024 * 1024
_EMAIL_PLOT_FETCH_TIMEOUT_SEC = 180


def _fetch_png_bytes(plot_url: str) -> bytes:
    """GET plot URL (R httpuv) and return body if it looks like a PNG."""
    req = urllib.request.Request(
        plot_url,
        method='GET',
        headers={'User-Agent': 'GutOmicsAtlas-email/1.0'},
    )
    with urllib.request.urlopen(req, timeout=_EMAIL_PLOT_FETCH_TIMEOUT_SEC) as resp:
        chunks: list[bytes] = []
        total = 0
        while True:
            chunk = resp.read(65536)
            if not chunk:
                break
            total += len(chunk)
            if total > _EMAIL_PLOT_PNG_MAX_BYTES:
                raise ValueError('plot response too large')
            chunks.append(chunk)
    data = b''.join(chunks)
    if len(data) < 8 or not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('response is not a PNG')
    return data

NO_CACHE = 100000001
CACHE_ALL = 100000002

CACHE_MODE = NO_CACHE
if (IS_SERVER):
    CACHE_MODE = CACHE_ALL
BROWSER_CACHE = False
if (IS_SERVER):
    BROWSER_CACHE = True

USE_BUILT = False

# React frontend build (Vite). Server serves from here for /, /index.html, /assets/*, and SPA fallback.
FRONTEND_DIST = "frontend/dist"

# Legacy assets (css, js, imgs) only needed for /html/*. Omit when dirs missing; React is primary.
registered = []
if os.path.isdir('./css'):
    for f in os.listdir('./css'):
        if f.endswith('.css'):
            registered.append(f'/css/{f}')
_js_dir = './js-build' if USE_BUILT else './js'
if os.path.isdir(_js_dir):
    for f in os.listdir(_js_dir):
        if f.endswith('.js'):
            registered.append(f'/js/{f}')
if os.path.isdir('./imgs'):
    for f in os.listdir('./imgs'):
        if 'no_embed' in f.lower():
            continue
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            registered.append(f'/imgs/{f}')

cached_files = {}



def access_file(path: str, bin: bool):
    if (CACHE_MODE == CACHE_ALL and path in cached_files):
        data = cached_files[path]
    else:
        with open(path.replace('/js/', '/js-build/') if USE_BUILT else path, 'rb') as f:
            data = f.read()
        if (CACHE_MODE == CACHE_ALL):
            cached_files[path] = data
    if (bin):
        return data
    return data.decode('utf-8')

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
        if (path.startswith('/html/')):
            return self.process_html(path)
        if (path.startswith('/imgs/')):
            # Prefer Vite build assets under frontend/dist/imgs/*
            rel = path.lstrip("/")
            if rel and ".." not in rel:
                fp = os.path.join(FRONTEND_DIST, rel)
                if os.path.isfile(fp):
                    return self.serve_react_static(path)
            return self.process_img(path)
        if (path.startswith('/api/')):
            return self.process_api()
        # Same-origin proxy to local R httpuv services (hex path). Browser uses fetch(); <img> cannot use R URLs (they return text).
        if path.startswith('/r/'):
            return self.process_r_proxy()
        # Spatial static datasets live outside frontend/dist; serve via process_data()
        # Frontend uses /sm/... and /st/... paths.
        if (path.startswith('/sm/')) or (path.startswith('/st/')):
            self.path = '/data' + path
            return self.process_data()
        if(path.startswith('/data/')):
            return self.process_data()
        if(path.startswith('/generated/')):
            return self.process_generated()
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
        if path == '/api/email-plot-link':
            return self.process_email_plot_link()
        if path == '/api/scrna-epi-notify':
            return self.process_email_plot_link(default_context='scrna_epithelial')
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

    def process_generated(self):
        # strip querystring (e.g. cache-buster ?t=...)
        file_name = self.path.split('?', 1)[0][len('/generated/'):]
        assert('..' not in file_name)
        file_path = os.path.join(DOCKER_DATA_DIR, file_name)
        with open(file_path, 'rb') as f:
            data = f.read()
        self.send_response(200)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Content-Type', 'image/png')
        self.send_header('Content-Length', len(data))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data)
        self.wfile.flush()
        return
        
    
    def process_email_plot_link(self, default_context: str | None = None) -> None:
        """Email user the plot as a PNG attachment (fetched from plot_url server-side)."""
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if length <= 0 or length > 8192:
            self.send_response(400)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Length', 0)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return
        try:
            data = json.loads(self.rfile.read(length).decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_response(400)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Length', 0)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return
        context = (data.get('context') or '').strip()
        if not context and default_context:
            context = default_context
        title = _EMAIL_PLOT_LINK_CONTEXTS.get(context)
        if title is None:
            self.send_response(400)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Length', 0)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return
        email = (data.get('email') or '').strip()
        gene = (data.get('gene') or '').strip()
        sample_type = (data.get('sample_type') or '').strip()
        plot_url = (data.get('plot_url') or '').strip()
        if not email or not gene or not plot_url:
            self.send_response(400)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Length', 0)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return
        if sample_type not in ('fetal', 'adult'):
            self.send_response(400)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Length', 0)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return
        if not re.match(r'^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]+$', email):
            self.send_response(400)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Length', 0)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return
        if not re.match(r'^https?://[^/?#]+/genes/', plot_url) or len(plot_url) > 2048:
            self.send_response(400)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Length', 0)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return
        if not re.match(r'^[A-Za-z0-9_.-]{1,64}$', gene):
            self.send_response(400)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Length', 0)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return

        def mail_thread():
            try:
                png_bytes = _fetch_png_bytes(plot_url)
                fname = f'{gene}_{sample_type}.png'
                body = f'{gene} ({sample_type})\n\nCoverage plot is attached.'
                send_email(email, title, body, attachments=[(fname, png_bytes)])
            except Exception:
                pass

        start_new_thread(mail_thread, ())
        self.send_response(204)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Content-Length', 0)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.flush()
        return

    def process_api(self):
        path = self.path
        path = path[5:]
        data = hexToStr(path)
        data = json.loads(data)
        file_name = token_hex(64) + '.pdf'
        R_file_name = '/root/docker_data/' + file_name
        py_file_name = os.path.join(DOCKER_DATA_DIR, file_name)
        success, error = (False, b'')
        if (data['function'] == 'scrna' and data['type'] == 'ep'):
            # email here
            id = 25
            gene = data['gene']
            email = data['email']
            def email_thread():
                success, error = R_call(id, {'p1': gene, 'p2': R_file_name})
                png_bytes = pdf_to_png_bytes(py_file_name)
                st = (data.get('sample_type') or 'unknown').strip()
                title = 'Result for scRNA-Seq Epithelial cells analysis'
                content = f'{gene} ({st})\n\nCoverage plot is attached.'
                fname = f'{gene}_{st}.png'
                send_email(email, title, content, attachments=[(fname, png_bytes)])
            start_new_thread(email_thread, ())
            self.send_response(202)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Length', 0)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'')
            self.wfile.flush()
            return
        if (data['function'] == 'scrna' and data['type'] == 'eecs'):
            id = 24
            gene = data['gene']
            success, error = R_call(id, {'p1': gene, 'p2': R_file_name})
        if (data['function'] == 'snatac' and data['type'] == 'all'):
            id = 26
            gene = data['gene']
            success, error = R_call(id, {'p1': gene, 'p2': R_file_name})
        if (data['function'] == 'snatac' and data['type'] == 'ep'):
            id = 27
            gene = data['gene']
            success, error = R_call(id, {'p1': gene, 'p2': R_file_name})
        response = {}
        if (success == False):
            error = binary_to_str(error)
            response = {'error': error}
        else:
            response = {'img': binToBase64(pdf_to_png_bytes(py_file_name))}
        response = json.dumps(response, ensure_ascii=False)
        response = response.encode('utf-8')
        self.send_response(200 if success else 500)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Content-Length', len(response))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(response)
        self.wfile.flush()
        return
    
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
        
            
            
    
    def process_img(self, path: str) -> None:
        if not os.path.isdir('./imgs'):
            return self.process_404()
        path = path[6:]
        assert('..' not in path)
        assert('no_embed' in path)
        with open(f'./imgs/{path}', 'rb') as f:
            data = f.read()
        self.send_response(200)
        self.send_header('Connection', 'keep-alive')
        if (path.endswith('.xls') == False):
            self.send_header('Content-Type', 'image/png')
        else:
            self.send_header('Content-Type', 'application/vnd.ms-excel')
            name = 'excel.xls'
            if ('region' in path):
                name = 'scRNA_region_comparison.xls'
            if ('goblet' in path):
                name = 'scRNA_goblet_cells.xls'
            self.send_header('Content-Disposition', 'attachment; filename="' + name + '"')
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
    
    def process_html(self, path: str) -> None:
        if not os.path.isdir('./html'):
            return self.process_404()
        if (path.find('..') >= 0):
            return self.process_404(attack=True)
        # print(path)
        if ('-' in path):
            path = path[6:]
            assert(path.startswith('sm-') and path.endswith('.html'))
            num = int(path[3:-5])
            html = access_file('./html/sm-i.html', False)
            if (IS_SERVER):
                html = html.replace('<!--$jtc.unique.replacer$', '')
                html = html.replace('$jtc.unique.replacer$-->', '')
            for reg in registered:
                if (html.find(reg) == -1):
                    continue
                file = access_file('.' + reg, True)
                file = binToBase64(file)
                if (reg.endswith('.css')):
                    html = html.replace(reg, f'data:text/css;base64,{file}')
                if (reg.endswith('.js')):
                    html = html.replace(reg, f'data:application/javascript;base64,{file}')
                if (reg.endswith('.png')):
                    html = html.replace(reg, f'data:image/png;base64,{file}')
                if (reg.endswith('.jpg') or reg.endswith('.jpeg')):
                    html = html.replace(reg, f'data:image/jpeg;base64,{file}')
                if (reg.endswith('.gif')):
                    html = html.replace(reg, f'data:image/gif;base64,{file}')
            html = html.replace('$sm-img-replacer$', str(num))
            html = html.encode('utf-8')
            self.send_response(200)
            self.send_header('Connection', 'keep-alive')
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', len(html))
            self.end_headers()
            self.wfile.write(html)
            self.wfile.flush()
            return
        path = '.' + path
        try:
            html = access_file(path, False)
        except:
            return self.process_404()
        if (IS_SERVER):
            html = html.replace('<!--$jtc.unique.replacer$', '')
            html = html.replace('$jtc.unique.replacer$-->', '')
        for reg in registered:
            if (html.find(reg) == -1):
                continue
            file = access_file('.' + reg, True)
            file = binToBase64(file)
            if (reg.endswith('.css')):
                html = html.replace(reg, f'data:text/css;base64,{file}')
            if (reg.endswith('.js')):
                html = html.replace(reg, f'data:application/javascript;base64,{file}')
            if (reg.endswith('.png')):
                html = html.replace(reg, f'data:image/png;base64,{file}')
            if (reg.endswith('.jpg') or reg.endswith('.jpeg')):
                html = html.replace(reg, f'data:image/jpeg;base64,{file}')
            if (reg.endswith('.gif')):
                html = html.replace(reg, f'data:image/gif;base64,{file}')
        html = html.encode('utf-8')
        self.send_response(200)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Content-Type', 'text/html')
        self.send_header('Content-Length', len(html))
        if (BROWSER_CACHE):
            self.send_header('Cache-Control', 'max-age=300')
        self.end_headers()
        self.wfile.write(html)
        self.wfile.flush()
        return
    
    
    def serve_react_index(self) -> None:
        """Serve the React SPA index.html. Fall back to /html/home.html if the build is missing."""
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

    def process_404(self, attack=False) -> None:
        self.send_response(404)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Content-Length', 13)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'404 Not Found')
        self.wfile.flush()
        return


pp = 9037
if(IS_SERVER):
    pp = 8000
server = ThreadingHTTPServer(('0.0.0.0', pp), Request)
start_new_thread(server.serve_forever, ())
while True:
    sleep(10)