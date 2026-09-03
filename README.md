# GutOmicsAtlas web application

Interactive site for human gut scRNA-seq, snATAC-seq, and spatial transcriptomics, plus Chat with AI.

| Modality | What users see |
|----------|----------------|
| scRNA-seq | Gene expression in epithelial and enteroendocrine cells (fetal and adult) |
| snATAC-seq | Chromatin accessibility across gut cell types (fetal) |
| Spatial transcriptomics | Pre-built PNGs for 422 genes in fetal gut tissue |

## Architecture

1. **React frontend** (`frontend/`): pages, gene search, overview figures. Production build is `frontend/dist/`.
2. **`server.py`**: HTTP on port **8000**. Serves the SPA, `/imgs/`, `/data/st/…`, proxies R plots, handles `POST /chat`.
3. **R plot servers** (`resources/`): on-demand scRNA and snATAC PNGs. Spatial gene images are static files, not rendered live.
4. **`ai.py`**: Chat with AI. Plans tool calls, runs them in parallel, then writes one reply. Planner and synthesizer use Claude (`config.py` / `ANTHROPIC_MODEL`). Swap that client to use another model; plot tools and GLKB stay the same. Details: **[AI_README.md](AI_README.md)**.

Gene allowlists: `gene_lists.py` loads `gene_data/*.json`. Operator scripts: `utils/`. Phone alerts: `utils/notify.py` via [ntfy.sh](https://ntfy.sh) (`utils/ntfy.env`; see `utils/ntfy.env.example`).

### AI assistant provenance

An earlier version of the chat code was adapted from a prior CosMx-based assistant (COVID-Lung CosMx). The current `ai.py` has been rewritten for GutOmicsAtlas and uses a different architecture (see [AI_README.md](AI_README.md)).

## Chat with AI (`POST /chat`)

Entry: `process_ai_chat`. Body is `{ "history": [...], "options": { "glkb": true } }` or a bare message array. Rate limit: 100 requests/hour/process. Full architecture, tools, and examples: **[AI_README.md](AI_README.md)**.

1. **Plan**: Claude picks tools (`create_plan`).
2. **Execute**: tools run concurrently.
3. **Synthesize**: Claude sees tool text and plot PNGs (resized) and replies.

| Tool | Backend | Notes |
|------|---------|--------|
| `scRNA` | R httpuv | epithelial **9025**, enteroendocrine **9028**; `sample_type` fetal or adult |
| `snATAC` | R httpuv | all **9026**, epithelial **9027** |
| `spatial_transcriptomics` | Static PNG | `{GUT_PUBLIC_DATA_BASE}/data/st/{gene}.png` after `st_genes` check |
| `static_images` | Local PNG | `imgs/ai/` (e.g. `scRNA_Epithelial`) |
| `glkb_ai_assistant` | GLKB HTTP (SSE) | `POST {GLKB_API_BASE}/stream`; off if the UI toggle is off |

Spatial metabolomics is disabled. `paper_search` is stubbed (`[]`); literature goes through GLKB. Logs: `openai_logs.txt`. scRNA/snATAC fetches `{PLOT_BACKEND_BASE}:{port}/genes/{gene}`.

Optional `.env` in `webserver/` is loaded by `ai.py` if `python-dotenv` is installed.

## Repository layout

| Path | Role |
|------|------|
| `server.py` | HTTP on **8000**: SPA from `frontend/dist`, `/imgs/`, `/data/st/…`, `/r/…` and named `/api/{scrna,atac}/…` R proxies, `POST /chat` |
| `ai.py` | Chat planner, tool execution, synthesizer (see [AI_README.md](AI_README.md)) |
| `AI_README.md` | AI architecture: plan → execute → synthesize, tools, HTTP contract, provenance |
| `gene_lists.py` | `format_gene()` and allowlist maps (from `gene_data/*.json`) |
| `gene_data/` | scRNA/snATAC genes, spatial transcriptomics genes, unused metabolite names |
| `config.py` | Anthropic API key and `ANTHROPIC_MODEL` |
| `resources/` | R httpuv scripts (started by `utils/restart_r_servers.sh`) |
| `frontend/public/imgs/` | Overview figures (copied to `dist/` on build) |
| `utils/restart_r_servers.sh` | Restart the four R backends in `screen` |
| `utils/restart_webserver.sh` | `npm run build` + restart `server.py` in `screen` |
| `utils/install_packages.R` | R/Bioconductor deps for plot backends |

Spatial PNGs: `../data/Xenium/Xenium figures/{GENE}.png` (relative to `webserver/` when `server.py` runs).

## `gene_lists.py`

Imported by `ai.py`.

| Symbol | Description |
|--------|-------------|
| `format_gene(name)` | Uppercase; strip `.`, `-`, `/`, spaces |
| `rna_atac_genes` / `rna_atac_genes_formatted_to_origin` | scRNA and snATAC allowlist |
| `st_genes` / `st_genes_formatted_to_origin` | Spatial transcriptomics (422 genes) |
| `spatial_meta` | 295 metabolite names; unused by the planner |

Keep `gene_data/rna_atac_genes.json` and `gene_data/st_genes.json` in sync with `frontend/src/data/scrnaGenes.ts` and `frontend/src/data/stGenes.ts`.

## Requirements and install

Python 3, pip, Node.js 18+, npm, R, GNU **screen**, **lsof**.

```bash
sudo apt-get update
sudo apt-get install -y screen lsof
cd /home/ubuntu/website/webserver
python3 -m pip install -r requirements.txt
```

## R plot backends

`utils/restart_r_servers.sh` starts `resources/*.R` in `screen` on `127.0.0.1`:

| Session | Port | Script |
|---------|------|--------|
| `gut_scrna_epi` | **9025** | `scRNAfunction.R` |
| `gut_scrna_eec` | **9028** | `EECplot.R` |
| `gut_atac_all` | **9026** | `atacallcells.R` |
| `gut_atac_epi` | **9027** | `atacepithelial.R` |

```bash
cd /home/ubuntu/website/webserver
bash utils/restart_r_servers.sh
screen -ls
for p in 9025 9026 9027 9028; do sudo lsof -nP -iTCP:$p -sTCP:LISTEN; done
```

Detach: `Ctrl+A`, then `D`. Each app serves `/genes/{name}` as a PNG. `server.py` proxies that as `/r/{port}/{path}` and `/api/{scrna-epithelial,scrna-eec,atac-all,atac-celltype}/…`.

Do not use `/home/ubuntu/website/restart_r_servers.sh` (wrong working dir, EEC on **9024**). Use `webserver/utils/restart_r_servers.sh`.

```bash
Rscript utils/install_packages.R
Rscript utils/downgrade_ggplot2.R   # optional ggplot2 pin
```

## Static assets

| URL | Source |
|-----|--------|
| `/imgs/…` | `frontend/dist/imgs/` (from `public/imgs/` after build) |
| `/data/st/{gene}.png` | `data/Xenium/Xenium figures/{gene}.png` |
| `/st/{gene}.png` | Rewritten to `/data/st/…` in `server.py` |

Rebuild the frontend after changing `frontend/public/imgs/`. Replace spatial gene PNGs in `data/Xenium/Xenium figures/`.

## Restart web application

```bash
cd /home/ubuntu/website/webserver
bash utils/restart_webserver.sh
screen -r webserver
```

Stops old `webserver` sessions, frees port **80**, runs `npm install` + `npm run build`, starts `python3 server.py` in screen session `webserver`, logs to `/tmp/webserver_screen.log`. Restart after editing `ai.py` or `server.py`. Rebuild the frontend after UI or static image changes.

Frontend: production UI is `frontend/dist/`. Dev proxy is `frontend/vite.config.ts`. `/spatial-metabolomics` redirects to `/spatial-transcriptomics`.

Port **80** usually needs root or a reverse proxy. SPA routes 404 until `frontend/dist/` exists. R backends must be up for scRNA/snATAC queries and AI plot tools.
