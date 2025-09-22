from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from _thread import start_new_thread
from time import sleep, time
import json
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


NO_CACHE = 100000001
CACHE_ALL = 100000002

CACHE_MODE = NO_CACHE
if (IS_SERVER):
    CACHE_MODE = CACHE_ALL
BROWSER_CACHE = False
if (IS_SERVER):
    BROWSER_CACHE = True

USE_BUILT = False

registered = []

csses = os.listdir('./css')
jses = os.listdir('./js')
if USE_BUILT:
    jses = os.listdir('./js-build')
imgs = os.listdir('./imgs')


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

for css in csses:
    if (not css.endswith('.css')):
        continue
    registered.append(f'/css/{css}')

for js in jses:
    if (not js.endswith('.js')):
        continue
    registered.append(f'/js/{js}')

for img in imgs:
    tmp = img.lower()
    if ('no_embed' in tmp):
        continue
    if (not tmp.endswith('.png') and not tmp.endswith('.jpg') and not tmp.endswith('.jpeg')  and not tmp.endswith('.gif')):
        continue
    registered.append(f'/imgs/{img}')


class Request(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        path = self.path
        if (path == '/'):
            path = '/html/home.html'
        if (path == '/index.html'):
            path = '/html/home.html'
        if (path.startswith('/html/')):
            return self.process_html(path)
        if (path.startswith('/imgs/')):
            return self.process_img(path)
        if (path.startswith('/api/')):
            return self.process_api()
        if(path.startswith('/data/')):
            return self.process_data()
        if(path.startswith('/generated/')):
            return self.process_generated()
        if (path == '/robots.txt'):
            return self.process_robots_txt()
        if (path == '/sitemap.xml'):
            return self.process_sitemap_xml()
        return self.process_404(self)

    def do_POST(self) -> None:
        path = self.path
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
    
    def process_generated(self):
        file_name = self.path[len('/generated/'):]
        assert('..' not in file_name)
        file_path = '../docker_data/' + file_name
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
        
    
    def process_api(self):
        path = self.path
        path = path[5:]
        data = hexToStr(path)
        data = json.loads(data)
        file_name = token_hex(64) + '.pdf'
        R_file_name = '/root/docker_data/' + file_name
        py_file_name = '../docker_data/' + file_name
        success, error = (False, b'')
        if (data['function'] == 'scrna' and data['type'] == 'ep'):
            # email here
            id = 25
            gene = data['gene']
            email = data['email']
            def email_thread():
                success, error = R_call(id, {'p1': gene, 'p2': R_file_name})
                png_bytes = pdf_to_png_bytes(py_file_name)
                py_png_file_name = py_file_name.replace('.pdf', '.png')
                with open(py_png_file_name, 'wb') as f:
                    f.write(png_bytes)
                url = 'http://' + self.headers['Host'] + '/generated/' + file_name.replace('.pdf', '.png')
                title = 'Result for scRNA-Seq Epithelial cells analysis'
                content = f'{gene}\n\n{url}'
                send_email(email, title, content)
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
        print('http OPTIONS')
        self.send_response(200)
        self.send_header('Connection', 'keep-alive')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Content-Length', 0)
        self.end_headers()
        self.wfile.write(b'')
        self.wfile.flush()
        return
    
    def process_html(self, path: str) -> None:
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
    pp = 80
server = ThreadingHTTPServer(('0.0.0.0', pp), Request)
start_new_thread(server.serve_forever, ())
while True:
    sleep(10)