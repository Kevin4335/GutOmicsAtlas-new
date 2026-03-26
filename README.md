# GutOmicsAtlas — Python server + React frontend

## What runs where

| Piece | Role |
|--------|------|
| **`server.py`** | HTTP server: Vite **production** build (`frontend/dist/`), legacy **`/html/*`** (if the `html/` dir exists), **`/api/*`**, **`POST /chat`**, **`/data/*`**, **`/generated/*`**, **`/imgs/*`** (server-side `imgs/` with `no_embed` in the name), and **`/st/*` / `/sm/*`** (same files as under `/data/st/` and `/data/sm/`). Unknown paths fall back to the React SPA `index.html`. |
| **`frontend/`** | React + TypeScript source. **Dev:** Vite on port **5173** with a proxy to Python. **Prod:** `npm run build` writes **`frontend/dist/`**, which `server.py` serves. |

Local development uses **two processes** (Python API + Vite). Production can be **one process** (`python server.py` after a build).

---

## Prerequisites

- **Python 3** with your existing modules (`myBasics`, `mySecrets`, `R_http`, `ai`, etc.).
- **Node.js 18+** and **npm** (20 LTS recommended). If the build dies with **`SyntaxError: Unexpected token '?'`** inside `node_modules/typescript/.../_tsc.js`, the runtime is too old — see **Upgrade Node (Ubuntu server, no nvm)** below.
- **tmux** (optional but handy for two panes): `sudo apt install -y tmux` on Debian/Ubuntu.

---

## Environment variables

| Variable | Effect |
|----------|--------|
| **`ATLAS_IS_SERVER`** | `false` / `0`: dev mode — listen on **9037**, lighter caching. Unset or `true`: production — listen on **80** by default (needs root or `CAP_NET_BIND_SERVICE`). |
| **`ATLAS_PORT`** | When `ATLAS_IS_SERVER` is true, overrides the port (e.g. **`8000`** if you cannot bind 80). |
| **`VITE_DEV_API_PROXY`** | Only for **Vite dev** (`npm run dev`). Base URL for the Python API; default **`http://127.0.0.1:9037`**. |
| **`VITE_API_BASE`** | Set at **build time** for the React app if the browser must talk to another origin (see `frontend/src/pages/AIChat.tsx`). Usually empty when the UI and API share the same host. |

---

## Upgrade Node (Ubuntu server, no nvm)

Stock Ubuntu often ships **Node 12**; this frontend needs **18+**. You do **not** need `nvm` on the server. Use [NodeSource](https://github.com/nodesource/distributions) to install Node **20.x**:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs
node -v   # should show v20.x
```

Then reinstall frontend deps if needed: `cd frontend && rm -rf node_modules && npm install`.

If you prefer **nvm**, install it once from [nvm-sh/nvm](https://github.com/nvm-sh/nvm#installing-and-updating) (it is a shell function, not an apt package), then run `nvm install 20`.

---

## First-time setup

```bash
cd frontend
npm install
```

---

## Local development (Vite + Python)

1. Start Python on **9037**:

```bash
cd /path/to/webserver
export ATLAS_IS_SERVER=false
python server.py
```

2. In another terminal (or a second tmux pane), start Vite:

```bash
cd /path/to/webserver/frontend
npm run dev
```

3. Open **http://127.0.0.1:5173** — that is the UI you should use in dev (hot reload).

Vite proxies these paths to Python (`frontend/vite.config.ts`): **`/api`**, **`/chat`**, **`/data`**, **`/generated`**, **`/imgs`**, **`/st`** (rewritten to `/data/st/...`), **`/sm`** (rewritten to `/data/sm/...`).

**http://127.0.0.1:9037** is the Python server alone. It serves the built React app from `frontend/dist/` if you have run **`npm run build`**; without a build, **`/`** returns **404**.

### tmux example (two panes)

```bash
cd /path/to/webserver
tmux new -s atlas
# pane 1:
export ATLAS_IS_SERVER=false && python server.py
# Ctrl-b "  or  Ctrl-b %  to split, then in pane 2:
cd frontend && npm run dev
```

Detach **Ctrl-b d**, reattach **`tmux attach -t atlas`**, kill **`tmux kill-session -t atlas`**.

If you still use GNU **screen**, list with `screen -ls`, stop one with `screen -X -S <name> quit`.

---

## Production (single `python server.py`)

From the **`webserver`** directory (parent of `frontend/`):

```bash
cd frontend && npm run build && cd ..
python server.py
```

Or use **`./build-and-serve.sh`** (same steps). To run inside **tmux** so the process survives SSH disconnect:

```bash
./build-and-serve.sh --tmux              # attach to this terminal; Ctrl-b d to detach
./build-and-serve.sh --tmux --detach    # start session in background; tmux attach -t atlas
```

Session name defaults to **`atlas`**; override with **`TMUX_SESSION=myname`**. Raw one-liner from `webserver/`:  
`tmux new-session -s atlas -c "$PWD" ./build-and-serve.sh --_inner`

Ensure **`ATLAS_IS_SERVER`** is unset or `true`. Default listen address is **0.0.0.0:80**, which **requires root** on Linux. Run **`sudo python server.py`**, or set **`ATLAS_PORT=8000`** (or any port ≥ 1024). **`./build-and-serve.sh`** sets **`ATLAS_PORT=8000` automatically** when not root so the build + start flow works as a normal user; put **nginx** (or similar) on **:80** and **proxy_pass** to **8000** if you need a public 80/443 front door.

You may still put **nginx** (or similar) in front for TLS; it is not required for a single-host setup.

---

## Frontend maintenance commands

| Task | Command |
|------|---------|
| Dev server | `cd frontend && npm run dev` |
| Production build | `cd frontend && npm run build` |
| Preview build locally | `cd frontend && npm run preview` |
| Lint | `cd frontend && npm run lint` |
| Regenerate ST gene list | `cd frontend && npm run extract:st-genes` |
| Regenerate scRNA gene list | `cd frontend && npm run extract:scrna-genes` |

### Build: `Cannot find native binding` (Rolldown)

**Vite 8** ships with **Rolldown** and optional **native** packages; on some servers `npm install` skips or mismatches them and `vite build` fails with that error. This repo pins **Vite 6** (Rollup + esbuild, no Rolldown) to avoid that. If you upgrade to Vite 8 later, try a clean install: `rm -rf node_modules package-lock.json && npm install`, and ensure Node matches your OS/arch (e.g. `linux-x64`).

---

## Static assets and images

- **Dev:** Files under **`frontend/public/`** are served by Vite. Requests to **`/imgs/...`** that are not satisfied there are **proxied** to Python (which reads **`webserver/imgs/`** for `no_embed` assets).
- **Prod:** Vite copies `public/` into **`frontend/dist/`**; `server.py` serves any matching file under `dist/` before SPA fallback. Server-side **`./imgs/`** is still used for legacy **`no_embed`** plot downloads.

If something 404s, add the file under **`frontend/public/`** (or merge into **`webserver/imgs/`** for backend-served `no_embed` images), then rebuild for production.
