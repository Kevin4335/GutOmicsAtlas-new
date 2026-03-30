# GutOmicsAtlas — webserver ops (Python + React + R)

This repo runs as:

- **Python webserver**: `server.py` (serves the React build + API endpoints like `POST /chat`)
- **R plot backends**: multiple `Rscript` processes (httpuv) started in `screen`
- **React frontend**: built into `frontend/dist/` and served by `server.py`

The *operational* way to restart things on the server is via:

- `utils/restart_r_servers.sh`
- `utils/restart_webserver.sh`

---

## Prerequisites (server machine)

- **Python 3** + pip packages from `requirements.txt`
- **Node.js 18+** + npm (needed because `restart_webserver.sh` does `npm install` + `npm run build`)
- **GNU screen** and **lsof** (both scripts rely on them)
- **R** + whatever R packages your scripts expect

Ubuntu/Debian helpers:

```bash
sudo apt-get update
sudo apt-get install -y screen lsof
```

---

## Python dependencies

```bash
cd /home/ubuntu/website/webserver
python3 -m pip install -r requirements.txt
```

> `myBasics`, `mySecrets`, `myHttp` are internal-but-installable packages here; they are included in `requirements.txt`.

---

## Restart the R backends

`utils/restart_r_servers.sh` kills existing `screen` sessions and any processes bound to the known ports, then restarts the R servers in detached `screen` sessions.

```bash
cd /home/ubuntu/website/webserver
bash utils/restart_r_servers.sh
```

### What it starts

- **`gut_scrna_epi`**: port **9025** (`resources/scRNAfunction.R`)
- **`gut_atac_all`**: port **9026** (`resources/atacallcells.R`)
- **`gut_atac_epi`**: port **9027** (`resources/atacepithelial.R`)
- **`gut_scrna_eec`**: port **9028** (`resources/EECplot.R`)

### Inspect / attach to a session

```bash
screen -ls
screen -r gut_scrna_epi
```

Detach: `Ctrl+A`, then `D`.

---

## Restart the Python webserver (+ build frontend)

`utils/restart_webserver.sh` does the following:

- stops existing `screen` sessions that look like prior webservers
- kills anything on **port 80** (backup)
- runs `npm install` + `npm run build` in `frontend/` (produces `frontend/dist/`)
- starts `python3 server.py` inside a detached `screen` session named **`webserver`**
- writes a log to **`/tmp/webserver_screen.log`**

```bash
cd /home/ubuntu/website/webserver
bash utils/restart_webserver.sh
```

### Inspect / attach to the webserver

```bash
screen -ls
screen -r webserver
```

If the screen session exits immediately, check:

- `/tmp/webserver_screen.log`

---

## Common gotchas

### Frontend build fails

`restart_webserver.sh` will warn if `npm run build` fails. In that case, the Python server may still start, but `/` may not serve the React UI correctly until `frontend/dist/` exists.

### Port 80 requires privileges

The script expects the server to bind **port 80**. If you run as a non-root user and binding fails, either:

- run the restart script as root, or
- change the server to bind a high port and put a reverse proxy in front (nginx), or
- change the script to kill/check a different port.
