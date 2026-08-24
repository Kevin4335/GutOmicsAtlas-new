# AI assistant (`ai.py`)

How Chat with AI works on GutOmicsAtlas. HTTP entry: `process_ai_chat` (from `server.py` on `POST /chat`). Orchestration: `get_gpt_resp`.

This is **not** Anthropic's default multi-round tool loop. Claude does not call `scRNA` or GLKB directly. It only emits a plan; Python runs the tools.

```
Browser  --POST /chat-->  process_ai_chat
                              |
                              v
                          get_gpt_resp
                              |
          +-------------------+-------------------+
          |                   |                   |
     Phase 1              Phase 2              Phase 3
     Planner              Executor             Synthesizer
     Claude               Python               Claude
     create_plan          ThreadPoolExecutor   text only
     tool_choice forced   execute_tool()       constructed tool_use ids
```

---



## Provenance

An earlier version of the chat backend was adapted from a prior CosMx-based assistant (COVID-Lung CosMx). The current `ai.py` has been rewritten for GutOmicsAtlas. The earlier design was simpler; the current code uses a planner, parallel tool execution, and a synthesizer, with Claude and this site’s plot backends, gene allowlists, and optional GLKB calls. CosMx-specific prompts, panels, and endpoints are not used.

The model is not fine-tuned on GutOmicsAtlas data. Behavior is set by system prompts, the `create_plan` schema, and Python tool code.

Default model: Claude Sonnet 4.6 (`claude-sonnet-4-6` in `config.py`, overridable with `ANTHROPIC_MODEL`).

---



## Libraries and services


| Piece                                   | Role                                                     |
| --------------------------------------- | -------------------------------------------------------- |
| `anthropic`                             | Planner and synthesizer Messages API calls               |
| `requests`                              | Fetch R plot PNGs; GLKB SSE; optional Cell2Sentence HTTP |
| Pillow (`PIL`)                          | Downscale PNGs before Claude vision                      |
| `concurrent.futures.ThreadPoolExecutor` | Parallel tools (up to 8 workers)                         |
| `gene_lists`                            | `format_gene`, scRNA/snATAC and spatial TX allowlists    |
| `python-dotenv`                         | Optional `.env` load                                     |


Env (optional): `PLOT_BACKEND_BASE`, `GUT_PUBLIC_DATA_BASE`, `GLKB_API_BASE` or `GLKB_LLM_AGENT_URL`, `C2S_AGENT_BASE`, `ANTHROPIC_MODEL`, `ANTHROPIC_IMAGE_MAX_SIDE`.

---



## HTTP contract (`POST /chat`)

**Request** (JSON, max ~256 KB):

```json
{
  "history": [{"role": "user"|"assistant", "content": "..."}],
  "options": { "glkb": true, "c2s": false }
}
```

A bare JSON array of messages is also accepted. Rate limit: 100 requests/hour per process (`within_rate_limit`). History capped (e.g. last 30 turns); long messages truncated.

**Success 200:**

```json
{
  "history": [ ...updated text history... ],
  "messages": [
    {"type": "text", "content": "..."},
    {"type": "image", "content": "/api/scrna-epithelial/genes/LGR5?sample_type=adult"}
  ]
}
```

`messages` is what the UI renders for this turn. Gene plots usually use same-origin `/api/...` URLs (browser loads PNG via `server.py` R proxy). Static overview images may use data URIs.

---



## Phase 1 — Planner (how tools are chosen)

Claude is called with:

- `tools` = `_planner_tool_for_session(...)` (copy of `PLANNER_TOOL` only)
- `tool_choice = {"type": "tool", "name": "create_plan"}`
- `temperature = 0`
- System text = `PLANNER_SYSTEM_PROMPT` plus notes if GLKB/C2S are off

`create_plan` input:

- `intro_text` (optional): short status line for the UI
- `steps`: `[{ "tool": "<name>", "input": { ... } }, ...]`

Allowed `tool` enum values:

`scRNA`, `snATAC`, `spatial_transcriptomics`, `static_images`, `cell2sentence_ai_assistant`, `glkb_ai_assistant`

Disabled options are removed from that enum and filtered again in Python after the plan returns.

`steps: []` skips Phase 2 (greetings, clarification).

The module-level `TOOLS` list documents real tool JSON schemas. The planner API call does **not** receive those schemas; it only receives `create_plan`. Argument quality comes from the planner prompt and from `execute_tool` (allowlists, option gates, HTTP).

There is **no** second planning round after tools finish.

---



## Phase 2 — Executor (how tools run)

`execute_plan_parallel` submits each step to `execute_tool` via `ThreadPoolExecutor`. Results keep plan order.


| Tool name                    | What Python does                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `scRNA`                      | Allowlist gene; GET R **9025** (epithelial) or **9028** (enteroendocrine); `sample_type` fetal/adult |
| `snATAC`                     | Allowlist gene/locus; GET R **9026** (all) or **9027** (epithelial)                                  |
| `spatial_transcriptomics`    | Allowlist gene; read `../data/Xenium/Xenium figures/{gene}.png`                                      |
| `static_images`              | Read `imgs/ai/{name}.png`                                                                            |
| `glkb_ai_assistant`          | If `options.glkb`: `POST {GLKB_API_BASE}/stream` (SSE); `question` only (no chat history)            |
| `cell2sentence_ai_assistant` | If `options.c2s`: POST Cell2Sentence `/chat` with standalone `message`                               |


Each plot tool returns:

1. Content for Claude (optional base64 PNG + caption)
2. A display message for the browser (usually `/api/.../genes/...`)

`spatial_metabolomics` returns a fixed unavailable message. `paper_search` is stubbed (`[]`); literature uses GLKB.

---



## Phase 3 — Synthesizer (how the reply is written)

If there were steps, Python appends:

1. A constructed assistant message with `tool_use` blocks (`id`: `plan_step_0`, …)
2. A user message with matching `tool_result` blocks

Then Claude is called **without** tools (system = `PROMPT`, modest temperature) and may only emit text.

The synthesizer is told not to claim plot failure when pixels were omitted from the tool result (the UI still loads `/api/...`).

UI order for one turn: optional `intro_text`, tool display messages, then synthesizer text.

---



## Worked examples

**User:** "Show adult epithelial LGR5 and what the literature says." (GLKB on)

1. Planner → `scRNA` + `glkb_ai_assistant` (with a rewritten literature `question`)
2. Executor → GET `…:9025/genes/LGR5?sample_type=adult` and GLKB `/stream` in parallel
3. UI → `/api/scrna-epithelial/genes/LGR5?sample_type=adult` + GLKB text; synthesizer writes the reply

**User:** "Hi" → `steps: []` → text-only synthesizer.

**User:** "Spatial TX for REG4" → `spatial_transcriptomics` → static PNG / `/data/st/REG4.png`.

---

