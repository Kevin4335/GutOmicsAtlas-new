# GutOmicsAtlas — Web Application & Services

GutOmicsAtlas is a biomedical web application comprising:

- **Python webserver** (`server.py`) serving the React single-page application and API endpoints (including `POST /chat`)
- **React frontend** (`frontend/`) built into `frontend/dist/` for production serving
- **R visualization backends** (httpuv) providing plot generation, managed as background `screen` sessions

This repository includes scripted operational workflows for reproducible restarts on a Linux host.

---

## System requirements

- **Python 3** and pip
- **Node.js 18+** and npm (required for `npm install` / `npm run build`)
- **R** (for the plot backends)
- **GNU screen** and **lsof** (used by the restart scripts)

On Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y screen lsof
```

---

## Installation (Python)

From the repository root:

```bash
cd /home/ubuntu/website/webserver
python3 -m pip install -r requirements.txt
```

`requirements.txt` includes internal-but-installable packages (e.g. `myBasics`, `mySecrets`, `myHttp`) in addition to third‑party dependencies.

---

## R dependencies (plot backends)

If the R backends fail due to missing packages, install the required Bioconductor + CRAN dependencies via `@utils/install_packages.R`:

```bash
cd /home/ubuntu/website/webserver
Rscript utils/install_packages.R
```

If you need to pin `ggplot2` to a specific version for compatibility, `@utils/downgrade_ggplot2.R` provides a reproducible downgrade:

```bash
cd /home/ubuntu/website/webserver
Rscript utils/downgrade_ggplot2.R
```

---

## Operational restart procedures

### Restart R plot services

`utils/restart_r_servers.sh` stops existing R `screen` sessions, clears any processes bound to the known ports, and restarts the backends in detached `screen` sessions:

```bash
cd /home/ubuntu/website/webserver
bash utils/restart_r_servers.sh
```

The script starts the following services:

- **`gut_scrna_epi`** on **9025** (`resources/scRNAfunction.R`)
- **`gut_atac_all`** on **9026** (`resources/atacallcells.R`)
- **`gut_atac_epi`** on **9027** (`resources/atacepithelial.R`)
- **`gut_scrna_eec`** on **9028** (`resources/EECplot.R`)

To inspect a service:

```bash
screen -ls
screen -r gut_scrna_epi
```

Detach from a session with `Ctrl+A`, then `D`.

### Restart the web application (build + serve)

`utils/restart_webserver.sh` performs a production frontend build and restarts the Python server in a detached `screen` session:

- stops prior webserver `screen` sessions
- frees **port 80** (backup kill step)
- runs `npm install` and `npm run build` under `frontend/` (producing `frontend/dist/`)
- starts `python3 server.py` inside a `screen` session named **`webserver`**
- writes logs to **`/tmp/webserver_screen.log`**

```bash
cd /home/ubuntu/website/webserver
bash utils/restart_webserver.sh
```

To inspect the running webserver:

```bash
screen -ls
screen -r webserver
```

If the session exits unexpectedly, consult `/tmp/webserver_screen.log`.

---

## Notes on deployment

- **Frontend build availability**: If `npm run build` fails, the Python server may still start, but the React UI may not be served correctly until `frontend/dist/` exists.
- **Port binding**: Binding to **port 80** typically requires elevated privileges or capabilities. If running as a non-root user, deploy behind a reverse proxy (e.g. nginx) on 80/443 and run the Python server on a high port, or adjust the restart script accordingly.
