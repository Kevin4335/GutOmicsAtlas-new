"""
GutOmicsAtlas FastAPI server.

Serves the React SPA (frontend/dist), /imgs and /data/st|/sm figures,
same-origin proxies to local R plot backends (/api/… and /r/…),
GET /health, and POST /chat for the AI assistant.
"""

from __future__ import annotations

import asyncio
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles

from ai import process_ai_chat

# Same-origin /api/{name}/… local R httpuv ports (resources/*.R).
R_API_PREFIX_TO_PORT: Dict[str, int] = {
    "scrna-epithelial": 9025,
    "scrna-eec": 9028,
    "atac-all": 9026,
    "atac-celltype": 9027,
}

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
DATA_DIR = BASE_DIR.parent / "data"

app = FastAPI(title="GutOmicsAtlas", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
@app.get("/health/")
async def health():
    return {"status": "ok", "service": "webserver"}


# ---------------------------------------------------------------------------
# AI Chat
# ---------------------------------------------------------------------------

@app.post("/chat")
async def chat(request: Request):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 256_000:
        raise HTTPException(status_code=413, detail="Request too large")

    try:
        payload: Any = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # LLM work is blocking run in threadpool so other routes stay responsive.
    status_code, body = await asyncio.to_thread(process_ai_chat, payload)

    if status_code == 200:
        return JSONResponse(content=body, status_code=status_code)
    if status_code == 429:
        return Response(content=b"", status_code=429)
    if isinstance(body, (dict, list)):
        return JSONResponse(content=body, status_code=status_code)
    detail = body if isinstance(body, str) else (body or "")
    return PlainTextResponse(content=detail, status_code=status_code)


# ---------------------------------------------------------------------------
# R plot proxies
# ---------------------------------------------------------------------------

def _proxy_r(port: int, upstream_path: str, query: str = "") -> Response:
    if port < 1024 or port > 65535:
        raise HTTPException(status_code=404, detail="Not found")
    # Preserve path segments; genes may include encoded characters already decoded by FastAPI.
    safe_path = quote(upstream_path.lstrip("/"), safe="/:@-._~!$&'()*+,;=")
    url = f"http://127.0.0.1:{port}/{safe_path}"
    if query:
        url = f"{url}?{query}"
    try:
        with urllib.request.urlopen(url, timeout=3600) as resp:
            body = resp.read()
            status = resp.getcode() or 200
            content_type = resp.headers.get("Content-Type", "application/octet-stream")
    except urllib.error.HTTPError as e:
        body = e.read()
        status = e.code
        content_type = (
            e.headers.get("Content-Type", "text/plain; charset=utf-8")
            if e.headers
            else "text/plain; charset=utf-8"
        )
    except Exception:
        return PlainTextResponse(
            content="R proxy: upstream unreachable",
            status_code=502,
        )
    return Response(
        content=body,
        status_code=status,
        media_type=content_type,
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.get("/r/{port}/{path:path}")
def r_proxy(port: int, path: str, request: Request):
    """Sync route: blocking urllib runs in FastAPI's threadpool."""
    if not path:
        raise HTTPException(status_code=404, detail="Not found")
    return _proxy_r(port, path, request.url.query)


@app.get("/api/{name}/{path:path}")
def api_r_proxy(name: str, path: str, request: Request):
    if ".." in name or ".." in path:
        raise HTTPException(status_code=404, detail="Not found")
    port = R_API_PREFIX_TO_PORT.get(name)
    if port is None:
        raise HTTPException(status_code=404, detail="Not found")
    return _proxy_r(port, path, request.url.query)


@app.get("/api/{name}")
def api_r_proxy_root(name: str, request: Request):
    port = R_API_PREFIX_TO_PORT.get(name)
    if port is None:
        raise HTTPException(status_code=404, detail="Not found")
    return _proxy_r(port, "", request.url.query)


# ---------------------------------------------------------------------------
# Data endpoints (external image files)
# ---------------------------------------------------------------------------

def _safe_data_file(base: Path, path: str) -> Path:
    if ".." in path:
        raise HTTPException(status_code=400, detail="Invalid path")
    file_path = base / path
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return file_path


@app.get("/data/st/{path:path}")
@app.get("/st/{path:path}")
async def data_st(path: str):
    file_path = _safe_data_file(DATA_DIR / "Xenium" / "Xenium figures", path)
    return FileResponse(
        file_path,
        media_type="image/png",
        headers={"Cache-Control": "max-age=300"},
    )


@app.get("/data/sm/{path:path}")
@app.get("/sm/{path:path}")
async def data_sm(path: str):
    file_path = _safe_data_file(DATA_DIR / "Spatial Metabolomics" / "Metaboliteimages", path)
    return FileResponse(
        file_path,
        media_type="image/png",
        headers={"Cache-Control": "max-age=300"},
    )


# ---------------------------------------------------------------------------
# SEO
# ---------------------------------------------------------------------------

@app.get("/robots.txt")
async def robots():
    return PlainTextResponse("User-agent: *\nDisallow:\n")


@app.get("/sitemap.xml")
async def sitemap():
    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        media_type="application/xml",
    )


# ---------------------------------------------------------------------------
# Static files (React build)
# ---------------------------------------------------------------------------

if (FRONTEND_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

if (FRONTEND_DIST / "imgs").is_dir():
    app.mount("/imgs", StaticFiles(directory=FRONTEND_DIST / "imgs"), name="imgs")


@app.get("/favicon.ico")
async def favicon_ico():
    return RedirectResponse(url="/favicon.svg", status_code=302)


@app.get("/vite.svg")
@app.get("/favicon.svg")
@app.get("/icons.svg")
@app.get("/heart_logo_1.png")
async def static_root_files(request: Request):
    filename = request.url.path.lstrip("/")
    file_path = FRONTEND_DIST / filename
    if file_path.is_file():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")


# ---------------------------------------------------------------------------
# SPA fallback, must be last
# ---------------------------------------------------------------------------

@app.get("/{path:path}")
async def spa_fallback(path: str):
    if path:
        file_path = FRONTEND_DIST / path
        if file_path.is_file() and ".." not in path:
            return FileResponse(file_path)

    index_path = FRONTEND_DIST / "index.html"
    if index_path.is_file():
        return FileResponse(
            index_path,
            headers={"Cache-Control": "no-cache"},
        )

    raise HTTPException(
        status_code=404,
        detail="Frontend not built. Run: cd frontend && npm run build",
    )


# ---------------------------------------------------------------------------
# Development / production runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
