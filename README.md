# GutOmicsAtlas — Web Application & Services

## Overview

**GutOmicsAtlas** is an interactive website for exploring human gut biology across three data types:

| Modality | What users see |
|----------|----------------|
| **scRNA-seq** | Gene expression in epithelial and enteroendocrine cells (fetal and adult) |
| **snATAC-seq** | Chromatin accessibility across gut cell types (fetal) |
| **Spatial transcriptomics** | Where 422 selected genes are expressed in fetal gut tissue sections |

Visitors browse pre-made overview figures, search for specific genes, and compare regions (for example, small intestine vs large intestine). The site also includes a **Chat with AI** page where users can ask questions in plain language.

---

## What runs behind the website

Think of the system as four cooperating parts:

1. **The website (React frontend)** — Pages, navigation, gene search boxes, and static overview plots. Built from `frontend/` and served to the browser.

2. **The web server (`server.py`)** — Delivers the website, serves image files, and forwards requests to the plot engines and the AI assistant.

3. **The plot engines (R backends)** — When someone asks for a **new** scRNA or snATAC gene plot, dedicated R programs generate that figure on demand. Spatial transcriptomics gene images are pre-made PNG files on disk (422 genes), not rendered live.

4. **The AI assistant (`ai.py`)** — Powers **Chat with AI**. It does not replace the manual browsers; it helps users ask questions, pull figures, and get literature-informed answers in one conversation.

The assistant is built around a **frontier language model** (large AI model). In the current deployment this is **Claude** (Anthropic), chosen for strong reasoning and tool use. The same three-step pipeline works with other models too — for example another **Claude** snapshot or **ChatGPT** (OpenAI) — by changing model configuration in `config.py` / `ANTHROPIC_MODEL`. The plotting tools and GLKB integration stay the same; only the “brain” that plans and writes answers is swapped.

Supporting files:

- **`utils.py`** — Master lists of valid gene names and small shared helpers used by both the web server and the AI.
- **`utils/`** — Restart scripts and R package installers for operators.

---

## How the AI assistant works (`ai.py`)

When a user sends a message on **Chat with AI**, the backend runs a **three-step workflow**. The user sees one reply; the system coordinates several steps internally.

### Step 1 — Plan

The AI first decides **what needs to happen** to answer the question. For example:

- “Show CLCA1 in fetal epithelial scRNA” → plan includes a scRNA plot tool call.
- “What do papers say about enteroendocrine cells?” → plan may include a literature search (GLKB).
- “Hello” → plan may be empty; the AI answers with text only.

Users can turn optional helpers on or off in the chat UI (the **+** menu):

- **GLKB (Genomic Literature Knowledge Base)** — A dedicated literature service, separate from the main chat model. GLKB searches biomedical knowledge drawn from **PubMed** and curated repositories. It is ideal for questions like “What does the literature say about enteroendocrine cells?” or “How many papers on fetal gut multi-omics were published in 2025?” The planner often **rephrases** a casual user question into a tighter literature query before sending it to GLKB. Each GLKB lookup is **standalone** (no chat history is sent). Results are folded into the final answer in Step 3.

If GLKB is turned off, the assistant will not call that service for that message. More optional capabilities will appear in the chat **+** menu over time — GLKB is the first; additional integrations are planned but not yet exposed in the UI.

### Step 2 — Execute (in parallel)

Each planned action runs **at the same time**, for speed. Examples:

| Action | What it does |
|--------|----------------|
| **scRNA / snATAC plot** | Asks the R plot engine to draw the requested gene and returns the image |
| **Spatial transcriptomics plot** | Loads the pre-built PNG for that gene from the spatial figure library |
| **Overview image** | Returns a standard UMAP or reference figure from the site’s image folder |
| **GLKB (literature)** | Queries the GLKB service with a focused biomedical question; returns text evidence from the literature |
| **Other** | *Coming soon* — additional optional assistants and integrations |

Gene names are checked against allowlists in `utils.py` so the AI only requests genes the atlas actually contains.

**Spatial metabolomics** is no longer offered; the AI will not plan metabolite plots.

### Step 3 — Synthesize

The language model reads everything gathered in Step 2 — GLKB excerpts, generated plot images, and any errors — and writes a **single clear answer** for the user. It explains what the figures show in gut-relevant terms rather than dumping raw tool output. When GLKB was used, the reply should reflect the user’s original question while citing what the literature search returned.

### Why this design?

- **Separation of planning and answering** keeps plot requests reliable (structured tool calls) while keeping replies natural (free-form text).
- **Parallel execution** means a question that needs both a plot and a literature summary does not wait for one to finish before starting the other.
- **Same data as the manual pages** — the AI uses the same R engines and the same spatial PNG library as the rest of the site, so results stay consistent.

---

## Technical reference

The sections below are for developers and system operators: file layout, installation, ports, and restart procedures.

---

## Repository layout

| Path | Role |
|------|------|
| `server.py` | HTTP server: SPA, `/imgs/`, `/data/st/…`, `/r/…` R proxy, legacy hex `/api/…`, `POST /chat` |
| `ai.py` | AI chat (`process_ai_chat`) — tool planning and execution |
| `utils.py` | Gene allowlists, `format_gene()`, PDF→PNG, legacy metabolomics name list |
| `config.py` | Language-model settings: Anthropic API key and `ANTHROPIC_MODEL` (Claude model id) |
| `R_http.py` | Legacy hex-encoded calls into R (`9000 + function_id`) |
| `resources/` | **Production** R httpuv entry scripts (started by `utils/restart_r_servers.sh`) |
| `frontend/public/imgs/` | Default static overview figures (copied to `dist/` on build) |
| `utils/restart_r_servers.sh` | Restart four R backends in `screen` |
| `utils/restart_webserver.sh` | `npm run build` + restart `server.py` in `screen` |
| `utils/install_packages.R` | R/Bioconductor dependencies for plot backends |

Spatial transcriptomics gene PNGs are pre-built static files (not rendered per request):

`../data/Xenium/Xenium figures/{GENE}.png`

(relative to `webserver/` when `server.py` runs). Older figure sets can be archived in a dated folder alongside this directory.

---

## System requirements

- Python 3 and pip
- Node.js 18+ and npm
- R (plot backends)
- GNU **screen** and **lsof** (restart scripts)

```bash
sudo apt-get update
sudo apt-get install -y screen lsof
```

---

## Installation (Python)

```bash
cd /home/ubuntu/website/webserver
python3 -m pip install -r requirements.txt
```

Optional `.env` in `webserver/` (loaded by `ai.py` when `python-dotenv` is installed):

The main chat **planner** and **synthesizer** currently call the **Anthropic Messages API** (`anthropic.Anthropic`). Swapping to **ChatGPT** or another provider would mean pointing those two calls at a different client while keeping the same tool list and three-step flow; GLKB remains a separate HTTP service regardless of which model is used.

---

## `utils.py`

Imported by `ai.py` and `server.py`.

| Symbol | Description |
|--------|-------------|
| `format_gene(name)` | Normalize user input (uppercase; strip `.`, `-`, `/`, spaces) for lookup |
| `rna_atac_genes` / `rna_atac_genes_formatted_to_origin` | Allowlist for scRNA and snATAC |
| `st_genes` / `st_genes_formatted_to_origin` | Spatial transcriptomics allowlist (**422 genes**) |
| `pdf_to_png_bytes(path)` | First page of a PDF → PNG (PyMuPDF) for legacy API responses |
| `binary_to_str(data)` | Decode R error bytes |
| `spatial_meta` | Legacy metabolite name list (295 entries); **not used by the current AI planner** |

Keep `utils.py` in sync with `frontend/src/data/scrnaGenes.ts` and `frontend/src/data/stGenes.ts`.

---

## `ai.py` — `POST /chat`

Entry point: **`process_ai_chat`**. The frontend sends conversation history to **`POST /chat`** on the web server.

```json
{
  "history": [{"role": "user", "content": "..."}],
  "options": { "glkb": true }
}
```

(or a bare JSON array of messages). **`options.glkb`** mirrors the chat UI toggle.

### Language model (Claude / others)

Two calls per user message use the configured **Claude** model (`ANTHROPIC_MODEL`):

1. **Planner** — decides which tools to run (`create_plan`).
2. **Synthesizer** — writes the final natural-language reply from tool results.

Vision: plot PNGs from tools are resized if needed and passed into the synthesizer so the model can **see** generated figures. Other frontier models (e.g. **ChatGPT**) can fill the same planner/synthesizer role after wiring the client in `ai.py`; tool execution and GLKB HTTP calls are model-agnostic.

Rate limit: **100** chat requests per hour per server process (`within_rate_limit`).

### Pipeline

1. **Planner** — forced `create_plan` tool call listing parallel steps.
2. **Executor** — `execute_tool()` runs steps concurrently (`ThreadPoolExecutor`).
3. **Synthesizer** — the language model reads tool results (including images) and replies.

If the user disables GLKB, that tool is removed from the planner enum and blocked in prompts for that turn.

### Tools

| Tool | Backend | Notes |
|------|---------|--------|
| `scRNA` | R httpuv | epithelial → **9025**, enteroendocrine → **9028**; `sample_type` fetal \| adult |
| `snATAC` | R httpuv | all → **9026**, epithelial → **9027** |
| `spatial_transcriptomics` | Static PNG | `{GUT_PUBLIC_DATA_BASE}/data/st/{gene}.png` after `st_genes` check |
| `static_images` | Local PNG | Keys under `imgs/ai/` (e.g. `scRNA_Epithelial`, `st_umap_dot`, `st_duodenum_colon`) |
| `glkb_ai_assistant` | GLKB HTTP (SSE) | Sends `{ "question": "...", "messages": [] }` to `GLKB_LLM_AGENT_URL`; planner reformulates vague questions |
| *(planned)* | — | More chat **+** menu tools and external integrations |

**Spatial metabolomics** is disabled (removed from the planner; direct calls return an unavailable message).

**Paper RAG** (`paper_search`) is stubbed (always `[]`) for GutOmicsAtlas — literature goes through **GLKB**, not a local paper index.

Logs append to `openai_logs.txt` (historical filename; content is JSON chat logs).

For scRNA/snATAC plots, `ai.py` fetches `{PLOT_BACKEND_BASE}:{port}/genes/{gene}` directly from the local R servers.

---

## R plot backends (production)

**Use `utils/restart_r_servers.sh`.** It runs scripts from `webserver/resources/` in four `screen` sessions:

| Session | Port | Script | Bind address |
|---------|------|--------|--------------|
| `gut_scrna_epi` | **9025** | `scRNAfunction.R` | `127.0.0.1` |
| `gut_scrna_eec` | **9028** | `EECplot.R` | `127.0.0.1` |
| `gut_atac_all` | **9026** | `atacallcells.R` | `127.0.0.1` |
| `gut_atac_epi` | **9027** | `atacepithelial.R` | `127.0.0.1` |

These ports match `ai.py` and the `startServer(...)` calls in `resources/*.R`.

```bash
cd /home/ubuntu/website/webserver
bash utils/restart_r_servers.sh
```

Verify:

```bash
screen -ls
# expect: gut_scrna_epi, gut_scrna_eec, gut_atac_all, gut_atac_epi, webserver

for p in 9025 9026 9027 9028; do
  sudo lsof -nP -iTCP:$p -sTCP:LISTEN
done
```

Detach from a session: `Ctrl+A`, then `D`.

Each R app supports:

- **`/genes/{name}`** — returns a PNG directly (used by `ai.py` and browser plot URLs).
- **Legacy hex paths** — PDF written to disk; used by older `R_http.R_call` / hex `/api/` flows.

`server.py` exposes **`/r/{port}/{path}`** — same-origin proxy to `http://127.0.0.1:{port}/{path}` for browser `<img>` tags.

> **Note:** A separate script at the repo root (`/home/ubuntu/website/restart_r_servers.sh`) starts copies under `../data/` with different working directories and an EEC port of **9024**. That layout is **not** what `webserver/resources/` and `ai.py` expect. Use `webserver/utils/restart_r_servers.sh` for this deployment.

Install R packages if backends fail:

```bash
cd /home/ubuntu/website/webserver
Rscript utils/install_packages.R
```

Optional ggplot2 pin: `Rscript utils/downgrade_ggplot2.R`

---

## Static assets

| URL | Source |
|-----|--------|
| `/imgs/…` | `frontend/dist/imgs/` (from `public/imgs/` after build); fallback `webserver/imgs/` |
| `/data/st/{gene}.png` | `data/Xenium/Xenium figures/{gene}.png` |
| `/st/{gene}.png` | Rewritten to `/data/st/…` in `server.py` |

Rebuild the frontend after changing overview PNGs in `frontend/public/imgs/`. Update per-gene spatial figures by replacing PNGs in `data/Xenium/Xenium figures/`.

---

## Restart web application

```bash
cd /home/ubuntu/website/webserver
bash utils/restart_webserver.sh
```

This stops prior `webserver` sessions, frees port **80**, runs `npm install` + `npm run build`, starts `python3 server.py` in `screen` session **`webserver`**, and logs to `/tmp/webserver_screen.log`.

```bash
screen -r webserver
```

Restart **`webserver`** after editing `ai.py` or `server.py`. Rebuild the frontend after UI or static image changes.

---

## Frontend notes

- Production UI: `frontend/dist/`
- Spatial Metabolomics removed from navigation; `/spatial-metabolomics` redirects to `/spatial-transcriptomics`
- Dev proxy: `frontend/vite.config.ts`
- Help tutorial video embed: `frontend/src/pages/Help.tsx`

---

## Deployment notes

- Port **80** usually requires root or a reverse proxy.
- If `npm run build` fails, SPA routes may 404 until `frontend/dist/` exists.
- R backends must be running before scRNA/snATAC gene queries or AI plot tools will fail.
