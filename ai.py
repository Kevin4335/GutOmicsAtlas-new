# GutOmicsAtlas AI chat backend: plans tool calls, runs plots/literature helpers, and synthesizes replies for POST /chat.
from R_http import *
from utils import *
from mySecrets import hexToStr
from openai import OpenAI
import time
from queue import Queue
import json
from random import randint
from typing import Union, Literal, Tuple, List, Dict, Any
from myBasics import binToBase64
from hashlib import sha256
from _thread import start_new_thread
from copy import deepcopy
import anthropic
import traceback
import secrets
import openai
import requests
from config import API_KEY, anthropic_model
import os
from pathlib import Path
import re
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

def paper_search(*_args, **_kwargs):
    return []


def init_paper_search():
    pass

try:
    import dotenv
    _root = Path(__file__).resolve().parent
    dotenv.load_dotenv(_root / ".env")
except ImportError:
    pass

__all__ = ['process_ai_chat']

# R httpuv plot hosts (scheme + host, no port) — same role as frontend VITE_R_BASE_HOST.
PLOT_BACKEND_BASE = os.environ.get("PLOT_BACKEND_BASE", "http://localhost")
# Python/nginx public origin for /data/st and /data/sm static figures (not R ports).
GUT_PUBLIC_DATA_BASE = os.environ.get("GUT_PUBLIC_DATA_BASE", "http://localhost")
GLKB_LLM_AGENT_URL = os.environ.get("GLKB_LLM_AGENT_URL", "https://glkb.dcmb.med.umich.edu/api/frontend/llm_agent")
C2S_AGENT_BASE = os.environ.get("C2S_AGENT_BASE", "https://jieliulab3.dcmb.med.umich.edu/c2s-agent")

# ---------------------------------------------------------------------------
# Tool definitions for Claude native tool use
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "scRNA",
        "description": (
            "Show gene expression (coverage plot) in gut single-cell RNA-seq. "
            "gene: symbol from the site list, case insensitive. "
            "cell_type: epithelial (9025) or enteroendocrine / EEC (9028). "
            "sample_type: fetal or adult."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "gene": {"type": "string", "description": "Gene symbol, case insensitive."},
                "cell_type": {
                    "type": "string",
                    "enum": ["epithelial", "enteroendocrine"],
                    "description": "Epithelial vs enteroendocrine (EEC).",
                },
                "sample_type": {
                    "type": "string",
                    "enum": ["fetal", "adult"],
                    "description": "Fetal vs adult.",
                },
            },
            "required": ["gene", "cell_type", "sample_type"],
        },
    },
    {
        "name": "snATAC",
        "description": (
            "Show snATAC-seq chromatin accessibility (IGV-style plot) for gut. "
            "gene: symbol or supported locus, case insensitive. "
            "cell_type: all (9026) or epithelial (9027)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "gene": {"type": "string", "description": "Gene or locus, case insensitive."},
                "cell_type": {
                    "type": "string",
                    "enum": ["all", "epithelial"],
                    "description": "All cell types vs epithelial.",
                },
            },
            "required": ["gene", "cell_type"],
        },
    },
    {
        "name": "spatial_transcriptomics",
        "description": (
            "Spatial transcriptomics gene figure (Duodenum vs Colon). Gene must be in the site ST gene list."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "gene": {"type": "string", "description": "Gene symbol, case insensitive."},
            },
            "required": ["gene"],
        },
    },
    {
        "name": "static_images",
        "description": (
            "Default overview PNGs under imgs/ai/ on the server. name is case sensitive."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "enum": [
                        "scRNA_Epithelial",
                        "scRNA_Enteroendocrine",
                        "snATAC_all",
                        "snATAC_Epithelial",
                        "st_umap_dot",
                        "st_duodenum_colon",
                    ],
                    "description": "Overview asset keys matching ai.py static_images.",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "cell2sentence_ai_assistant",
        "description": (
            "Cell2Sentence (C2S) cell-centric assistant. Stateless one-shot call to C2S backend. "
            "Pass a single standalone question string in `message`."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "Standalone cell-biology question for Cell2Sentence.",
                },
            },
            "required": ["message"],
        },
    },
    {
        "name": "glkb_ai_assistant",
        "description": (
            "GLKB (literature KB) Q&A. Pass a single self-contained question string. "
            "GLKB often returns nothing if the question is too vague or conversational — "
            "use a concrete, literature-retrieval-style query (see planner instructions), "
            "not necessarily the user's raw wording."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": (
                        "Standalone biomedical / literature question for GLKB to search. "
                        "Must be specific enough for retrieval (entities, tissue, mechanism). "
                        "Reformulate broad or personal user prompts into neutral research questions."
                    ),
                },
            },
            "required": ["question"],
        },
    },
]

# ---------------------------------------------------------------------------
# Planner tool — used exclusively in Phase 1 to force a structured plan output
# ---------------------------------------------------------------------------

PLANNER_TOOL = [
    {
        "name": "create_plan",
        "description": (
            "Output a structured execution plan for the user's request. "
            "List every tool call that needs to be made. All listed tool calls will be "
            "executed in parallel, so do not list calls that depend on each other's output. "
            "If no tools are needed (pure text/question), output an empty steps list."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "intro_text": {
                    "type": "string",
                    "description": (
                        "A brief natural-language message to show the user while the tools run, "
                        "e.g. 'I'll generate the scRNA and spatial plots for INS now.'. "
                        "Leave empty string if no tools are needed."
                    ),
                },
                "steps": {
                    "type": "array",
                    "description": "List of tool calls to execute (all run in parallel).",
                    "items": {
                        "type": "object",
                        "properties": {
                            "tool": {
                                "type": "string",
                                "enum": [
                                    "scRNA",
                                    "snATAC",
                                    "spatial_transcriptomics",
                                    "static_images",
                                    "cell2sentence_ai_assistant",
                                    "glkb_ai_assistant",
                                ],
                                "description": "Name of the tool to call.",
                            },
                            "input": {
                                "type": "object",
                                "description": "Input arguments for the tool, matching that tool's schema.",
                            },
                        },
                        "required": ["tool", "input"],
                    },
                },
            },
            "required": ["steps"],
        },
    }
]


def _planner_tool_for_session(glkb_enabled: bool, c2s_enabled: bool) -> list:
    """Planner create_plan schema: drop disabled assistant tools from enum."""
    tools = deepcopy(PLANNER_TOOL)
    enum_key = tools[0]["input_schema"]["properties"]["steps"]["items"]["properties"]["tool"]
    if not glkb_enabled:
        enum_key["enum"] = [x for x in enum_key["enum"] if x != "glkb_ai_assistant"]
    if not c2s_enabled:
        enum_key["enum"] = [x for x in enum_key["enum"] if x != "cell2sentence_ai_assistant"]
    return tools


PLANNER_SYSTEM_PROMPT = """You are the planner for GutOmicsAtlas AI assistant.

Your ONLY job is to call the `create_plan` tool with a list of tool calls needed to answer the user's request.

## Available tools and their exact parameters

### scRNA
Gut single-cell RNA-seq gene expression plot (epithelial vs enteroendocrine; fetal vs adult).
Parameters:
  - gene: string — gene symbol from the site list, e.g. "LGR5", "MUC2", "CHGA"
  - cell_type: EXACTLY "epithelial" OR "enteroendocrine"
  - sample_type: EXACTLY "fetal" OR "adult"

### snATAC
Gut single-nucleus ATAC-seq accessibility plot.
Parameters:
  - gene: string — gene symbol or supported locus
  - cell_type: EXACTLY "all" OR "epithelial"

### spatial_transcriptomics
Spatial transcriptomics figure for genes in the ST gene list.
Parameters:
  - gene: string — e.g. "EPCAM", "REG4"

### static_images
Bundled overview PNGs. Use for "show overview", "what does the data look like", or dataset intro without a gene.
Parameters:
  - name: EXACTLY one of (case-sensitive):
      "scRNA_Epithelial", "scRNA_Enteroendocrine", "snATAC_all", "snATAC_Epithelial",
      "st_umap_dot", "st_duodenum_colon"

### cell2sentence_ai_assistant
Cell2Sentence (C2S) cell-focused assistant. **C2S receives `message` only — no chat history.**
Parameters:
  - message: string — standalone cell-biology question.

### glkb_ai_assistant
GLKB answers from biomedical literature. **GLKB only receives `question` — no chat history.**

Parameters:
  - question: string — **must be a literature-ready sub-query you craft**, not always the user's exact words.

**Critical — reformulate vague or non-retrieval prompts:**  
GLKB frequently refuses or fails on questions that are too general, chatty, or personal. When you call this tool, **invent a focused sub-question** that:
- Names concrete biological entities (genes, cell types, tissues, pathways, diseases) when relevant.
- Asks what **published literature / reviews** report, summarize, or compare — e.g. roles, mechanisms, associations, definitions in a research context.
- Stays **neutral** (no "should I …" personal advice in the string sent to GLKB); translate lifestyle-style asks into "what does the literature describe about … and human gut / intestinal …?".
- Is **not** so narrow that it assumes unstated facts; ground it in the user's topic.

**Examples of user message → `question` you pass to GLKB (illustrative):**
- User: "What is the gut?" → `question`: "What do recent biomedical reviews describe regarding the structure, major cell lineages, and physiological functions of the human gut?"
- User: "Tell me about stem cells in the intestine" → `question`: "What does the literature report about intestinal stem cell markers, niche signaling, and turnover in the adult human gut?"
- User: "Should I eat more fermented foods?" → `question`: "What does peer-reviewed literature summarize about fermented foods, their microbial content, and associations with human gut microbiome composition or intestinal health?" (neutral; no endorsement.)
- User: "What's BRCA1?" (gut-unrelated but user asked) → still use a tight literature question: "What is the established role of BRCA1 in DNA repair and cancer predisposition according to biomedical literature?"

**Bad `question` values (too vague for GLKB):** "What is the gut?", "Help me", "Should I drink X?" as the **literal** string — always **rewrite** as above.

## Rules

**General:**
- All steps run in parallel — only list independent tool calls.
- Use EXACT enum strings for cell_type, sample_type, static name, etc.

**Visualization tools:**
- Call when the user asks to visualize, plot, show expression, accessibility, or spatial gene expression maps.

**glkb_ai_assistant:**
- Call for broad biology, pathways, disease mechanisms, or literature context not answered by a plot alone.
- **Always** pass a reformulated `question` when the user's wording is too broad or non-scientific for a search backend.
- Do NOT call for pure UI help ("what tabs exist?") unless they need literature.

**cell2sentence_ai_assistant:**
- Call for cell-type/state interpretation requests where Cell2Sentence should provide an additional cell-centric narrative.
- Pass a standalone `message`; reformulate terse prompts into a clear question when needed.

**Combining tools:**
- Often combine glkb_ai_assistant and/or cell2sentence_ai_assistant with scRNA/snATAC/spatial tools when the user wants both explanation and a figure.

**steps: [] (no tools):**
- Greetings, thanks, pure navigation help, or when no figure/GLKB call is appropriate.

**Note:** This deployment does not inject project-specific paper RAG excerpts; rely on GLKB, tools, and general reasoning.

## Examples

User: "Show LGR5 in epithelial scRNA, adult"
Plan: scRNA(gene="LGR5", cell_type="epithelial", sample_type="adult")

User: "ATAC for MUC2 in all cells"
Plan: snATAC(gene="MUC2", cell_type="all")

User: "Spatial TX for REG4"
Plan: spatial_transcriptomics(gene="REG4")

User: "Overview of snATAC epithelial defaults"
Plan: static_images(name="snATAC_Epithelial")

User: "What does GLP1R do in the gut and show enteroendocrine fetal expression"
Plan: glkb_ai_assistant(question="What does the literature describe about GLP1R expression and function in enteroendocrine cells and the human gut?") + scRNA(gene="GLP1R", cell_type="enteroendocrine", sample_type="fetal")

User: "What is the gut?"
Plan: glkb_ai_assistant(question="What do biomedical reviews summarize about human gut anatomy, epithelial and immune cell types, and digestive/absorptive functions?")

User: "Hi"
Plan: steps: []

Do NOT include any explanation in your response — only call create_plan.
"""

# ---------------------------------------------------------------------------
# System prompt (simplified — tool schemas handled by Claude native tool use)
# ---------------------------------------------------------------------------

PROMPT = """## 1. Introduction and Task

You are the AI assistant of GutOmicsAtlas. The site presents human gut data: scRNA-seq (epithelial and enteroendocrine cells), snATAC-seq (all cells or epithelial), and spatial transcriptomics. You chat with users, answer questions, and interpret figures produced by the tools.

GutOmicsAtlas integrates scRNA-seq, snATAC-seq, and spatial transcriptomics for analyzing molecular patterns in gut tissue across development (fetal vs adult where applicable).

You can also use the GLKB AI assistant. The Genomic Literature Knowledge Base (GLKB) integrates biomedical terms and relationships from PubMed and curated repositories; use it when users need literature-grounded biology beyond what the plots alone show.

## 2. Tool Usage

When the user asks to visualize or show data, the planner has already run the tools; you receive tool results (including images). Do NOT output raw JSON tool calls in your reply — synthesize natural language.

- scRNA: gut scRNA coverage plots — requires cell_type (epithelial vs enteroendocrine) and sample_type (fetal vs adult).
- snATAC: chromatin accessibility — cell_type all vs epithelial.
- spatial_transcriptomics: ST figures for genes in the site list.
- static_images: pre-made overview PNGs for each major page.
- cell2sentence_ai_assistant: Cell2Sentence answers (you will see returned text in tool results). Use this for cell-focused narrative context.
- glkb_ai_assistant: GLKB answers (you will see the returned text in tool results). The planner may have asked GLKB a **reformulated** literature question; answer the **user's** original question clearly, using GLKB text as evidence.

After image tool results, briefly interpret what the figure shows (expression pattern, accessibility, spatial layout) in gut-relevant terms.

## 3. How to Answer Biology Questions

1. Combine GLKB, Cell2Sentence, or general knowledge with what GutOmicsAtlas visualizations show when both exist.
2. Use phrasing like "In this atlas...", "On the scRNA/snATAC/spatial views...", tying claims to the tools the user asked for.
3. If fetal vs adult or epithelial vs EEC was not specified and the question requires it, ask the user to choose.

## 4. Behavioral Guidelines

- Remember prior turns; speak directly to the user ("you" / "I").
- Natural language only in the final reply (no JSON arrays).
- If a question is ambiguous (e.g. which cell type or stage), ask a short clarifying question.
- You may answer unrelated general questions briefly, but prioritize GutOmicsAtlas context when relevant."""

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(BASE_DIR, "openai_logs.txt")

client = anthropic.Anthropic(api_key=API_KEY)
init_paper_search()

rate_limit_records = []


def within_rate_limit():
    t = time.time()
    for i in range(len(rate_limit_records)-1, -1, -1):
        if (t - rate_limit_records[i] > 3600):
            rate_limit_records.pop(i)
    if(len(rate_limit_records) >= 100):
        return False
    rate_limit_records.append(t)
    return True


# ---------------------------------------------------------------------------
# History normalisation  (flat frontend format <-> Anthropic format)
# ---------------------------------------------------------------------------

def _flat_to_anthropic(flat_history: list) -> list:
    """Convert the frontend's [{role, content: str}] into Anthropic-compatible messages.

    Strips any non-user/assistant roles and ensures content is always a string.
    """
    msgs: list = []
    for m in flat_history:
        role = m.get("role")
        content = m.get("content", "")
        if role not in ("user", "assistant"):
            continue
        if not isinstance(content, str):
            content = str(content)
        if not content.strip():
            continue
        msgs.append({"role": role, "content": content})

    # Anthropic requires messages to alternate user/assistant.
    # Merge consecutive same-role messages.
    merged: list = []
    for m in msgs:
        if merged and merged[-1]["role"] == m["role"]:
            merged[-1]["content"] += "\n" + m["content"]
        else:
            merged.append(dict(m))

    # Must start with a user message
    while merged and merged[0]["role"] != "user":
        merged.pop(0)

    return merged


def _flatten_assistant_text(content_blocks) -> str:
    """Extract plain text from an Anthropic assistant response content list."""
    parts = []
    for block in content_blocks:
        if hasattr(block, "text"):
            parts.append(block.text)
        elif isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# RAG helpers (optional; paper_search is stubbed for GutOmicsAtlas)
# ---------------------------------------------------------------------------

def _latest_user_text(history: list) -> str:
    for msg in reversed(history):
        if isinstance(msg, dict) and msg.get("role") == "user":
            c = msg.get("content", "")
            if isinstance(c, str) and c.strip():
                return c.strip()
            if isinstance(c, list):
                for block in c:
                    if isinstance(block, dict) and block.get("type") == "text":
                        t = block.get("text", "").strip()
                        if t:
                            return t
    return ""

def _excerpt_around_term(text: str, term: str, window: int = 350) -> str:
    if not term:
        return text[:900] + ("..." if len(text) > 900 else "")

    m = re.search(re.escape(term), text, flags=re.IGNORECASE)
    if not m:
        return text[:900] + ("..." if len(text) > 900 else "")

    start = max(0, m.start() - window)
    end = min(len(text), m.end() + window)
    excerpt = text[start:end].strip()

    prefix = "... " if start > 0 else ""
    suffix = " ..." if end < len(text) else ""
    return prefix + excerpt + suffix


def _format_paper_evidence(hits: list, query: str) -> str:
    if not hits:
        return "No relevant paper excerpts found."

    term = ""
    q = (query or "").strip()
    if 1 <= len(q) <= 40 and " " not in q:
        term = q
    else:
        m = re.search(r"\bis\s+([A-Za-z0-9_-]{2,40})\s+mentioned\b", q, flags=re.IGNORECASE)
        if m:
            term = m.group(1)

    lines = []
    for i, h in enumerate(hits, 1):
        sec = h.get("section_path", "UNKNOWN")
        cid = h.get("chunk_id", "UNKNOWN")
        txt = (h.get("text", "") or "").strip()
        txt = _excerpt_around_term(txt, term, window=350)
        lines.append(f"[{i}] section={sec} chunk_id={cid}\n{txt}")
    return "\n\n".join(lines)


# ---------------------------------------------------------------------------
# Tool execution
# ---------------------------------------------------------------------------

# Timeout for fetching plot images from the R backend (seconds).
# R plot generation can be slow on first call; 120s gives it room to breathe.
_PLOT_FETCH_TIMEOUT = 120
# Anthropic vision API rejects images if width or height > 8000px. Keep max side well below.
_ANTHROPIC_IMAGE_MAX_SIDE = int(os.environ.get("ANTHROPIC_IMAGE_MAX_SIDE", "4096"))


def _png_bytes_for_anthropic_vision(png_bytes: bytes) -> bytes:
    """Downscale PNG so longest side <= _ANTHROPIC_IMAGE_MAX_SIDE (Claude API hard limit 8000px).

    Only used for base64 sent to Anthropic. Frontend still uses full-resolution URLs / data URIs.
    Requires Pillow: ``pip install Pillow``.
    """
    if not png_bytes or len(png_bytes) < 24:
        return png_bytes
    try:
        from io import BytesIO

        from PIL import Image
    except ImportError:
        print(
            "ai.py: Pillow not installed; cannot downscale images for Claude. "
            "Install with: pip install Pillow"
        )
        return png_bytes
    try:
        im = Image.open(BytesIO(png_bytes))
        im.load()
    except Exception as e:
        print(f"_png_bytes_for_anthropic_vision: invalid PNG ({e})")
        return png_bytes
    w, h = im.size
    limit = min(_ANTHROPIC_IMAGE_MAX_SIDE, 7999)
    if max(w, h) <= limit:
        return png_bytes
    scale = limit / float(max(w, h))
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    try:
        resample = Image.Resampling.LANCZOS
    except AttributeError:
        resample = Image.LANCZOS  # type: ignore[attr-defined]
    try:
        resized = im.resize((new_w, new_h), resample)
        out = BytesIO()
        if resized.mode in ("RGBA", "LA"):
            resized.save(out, format="PNG", optimize=True)
        elif resized.mode == "P":
            if "transparency" in resized.info:
                resized.save(out, format="PNG", optimize=True)
            else:
                resized.convert("RGB").save(out, format="PNG", optimize=True)
        elif resized.mode == "L":
            resized.save(out, format="PNG", optimize=True)
        else:
            resized.convert("RGB").save(out, format="PNG", optimize=True)
        return out.getvalue()
    except Exception as e:
        print(f"_png_bytes_for_anthropic_vision: resize/save failed ({e})")
        return png_bytes


def _fetch_png_bytes(url: str) -> Union[bytes, None]:
    """Fetch PNG bytes from the R plot server.

    Returns bytes on success, None on any error (timeout, HTTP error, etc.).
    """
    try:
        resp = requests.get(url, timeout=_PLOT_FETCH_TIMEOUT, verify=False)
        if resp.status_code == 200 and resp.content:
            return resp.content
        print(f"_fetch_png_bytes: HTTP {resp.status_code} from {url}")
        return None
    except Exception as e:
        print(f"_fetch_png_bytes: error fetching {url}: {e}")
        return None


def _image_tool_result(description: str, png_bytes: Union[bytes, None], url: str) -> Tuple[list, dict]:
    """Build a multimodal tool_result content list and a frontend display_msg.

    Claude receives the actual image as a base64 block (so it can interpret the figure).
    The frontend always gets the original URL as the image src — this keeps the JSON
    response small and avoids the React imgStatus key-collision bug that occurs when
    multi-megabyte base64 strings are used as state object keys.

    Returns:
        (tool_result_content, display_msg)
        - tool_result_content: list of content blocks for the Anthropic tool_result
        - display_msg: dict for the frontend {"type": "image", "content": url}
    """
    if png_bytes:
        for_claude = _png_bytes_for_anthropic_vision(png_bytes)
        b64 = binToBase64(for_claude)
        tool_result_content = [
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": b64,
                },
            },
            {
                "type": "text",
                "text": description,
            },
        ]
    else:
        tool_result_content = [{"type": "text", "text": f"{description} (image could not be fetched)"}]

    # Always use the original URL for the frontend — keeps JSON small and imgStatus keys short
    display_msg = {"type": "image", "content": url}

    return tool_result_content, display_msg


def execute_tool(
    name: str,
    tool_input: dict,
    agent_options: Union[Dict[str, Any], None] = None,
) -> Tuple[Union[str, list], Union[dict, None]]:
    """Execute a single tool call.

    Returns:
        (tool_result_content, display_msg_or_None)
        - tool_result_content: str or list of content blocks fed back to Claude as tool_result.
          For image-producing tools this is a multimodal list [image_block, text_block] so
          Claude can see and reason about the generated figure.
        - display_msg: optional dict for the frontend ({"type": "image"/"text", "content": ...})
    """
    opts = agent_options if isinstance(agent_options, dict) else {}
    glkb_on = opts.get("glkb", True) is not False

    base = PLOT_BACKEND_BASE.rstrip("/")

    if name == "scRNA":
        raw_gene = tool_input["gene"]
        cell_type = tool_input["cell_type"]
        sample_type = tool_input["sample_type"]
        fg = format_gene(raw_gene)
        if fg not in rna_atac_genes_formatted_to_origin:
            msg = f"Gene '{raw_gene}' is not in the scRNA/snATAC gene list for this site."
            return (msg, {"type": "text", "content": msg})
        gene = rna_atac_genes_formatted_to_origin[fg]
        gq = urllib.parse.quote(gene, safe="")
        stq = urllib.parse.quote(sample_type, safe="")
        port = 9025 if cell_type == "epithelial" else 9028
        desc = f"scRNA plot gene={gene}, cell_type={cell_type}, sample_type={sample_type}"
        fetch_url = f"{base}:{port}/genes/{gq}?sample_type={stq}"
        path_prefix = "scrna-epithelial" if cell_type == "epithelial" else "scrna-eec"
        display_url = f"/api/{path_prefix}/genes/{gq}?sample_type={stq}"
        png_bytes = _fetch_png_bytes(fetch_url)
        tool_result_content, display_msg = _image_tool_result(desc, png_bytes, display_url)
        return tool_result_content, display_msg

    if name == "snATAC":
        raw_gene = tool_input["gene"]
        cell_type = tool_input["cell_type"]
        fg = format_gene(raw_gene)
        if fg not in rna_atac_genes_formatted_to_origin:
            msg = f"Gene/locus '{raw_gene}' is not in the site gene list for snATAC."
            return (msg, {"type": "text", "content": msg})
        gene = rna_atac_genes_formatted_to_origin[fg]
        gq = urllib.parse.quote(gene, safe="")
        port = 9026 if cell_type == "all" else 9027
        desc = f"snATAC plot gene={gene}, cell_type={cell_type}"
        fetch_url = f"{base}:{port}/genes/{gq}"
        path_prefix = "atac-all" if cell_type == "all" else "atac-celltype"
        display_url = f"/api/{path_prefix}/genes/{gq}"
        png_bytes = _fetch_png_bytes(fetch_url)
        tool_result_content, display_msg = _image_tool_result(desc, png_bytes, display_url)
        return tool_result_content, display_msg

    if name == "spatial_transcriptomics":
        raw_gene = tool_input["gene"]
        fg = format_gene(raw_gene)
        if fg not in st_genes_formatted_to_origin:
            msg = f"Gene '{raw_gene}' is not in the spatial transcriptomics gene list."
            return (msg, {"type": "text", "content": msg})
        gene = st_genes_formatted_to_origin[fg]
        gq = urllib.parse.quote(gene, safe="")
        display_url = f"/data/st/{gq}.png"
        desc = f"Spatial transcriptomics plot gene={gene}"
        static_path = os.path.normpath(
            os.path.join(BASE_DIR, "..", "data", "Xenium", "Xenium figures", f"{gene}.png")
        )
        try:
            with open(static_path, "rb") as f:
                png_bytes = f.read()
        except OSError:
            png_bytes = None
        tool_result_content, display_msg = _image_tool_result(desc, png_bytes, display_url)
        return tool_result_content, display_msg

    if name == "spatial_metabolomics":
        msg = "Spatial metabolomics is not available on this site."
        return (msg, {"type": "text", "content": msg})

    if name == "static_images":
        image_name = tool_input["name"]
        rel = f"{image_name}.png"
        static_path = os.path.join(BASE_DIR, "imgs", "ai", rel)
        try:
            with open(static_path, "rb") as f:
                png_bytes = f.read()
            for_claude = _png_bytes_for_anthropic_vision(png_bytes)
            b64_claude = binToBase64(for_claude)
            b64_display = binToBase64(png_bytes)
            tool_result_content = [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": b64_claude,
                    },
                },
                {
                    "type": "text",
                    "text": f"Default overview image '{image_name}' loaded from imgs/ai/.",
                },
            ]
            display_msg = {"type": "image", "content": "data:image/png;base64," + b64_display}
            return tool_result_content, display_msg
        except OSError:
            return (
                f"Static image '{image_name}' not found at imgs/ai/{rel}.",
                {"type": "text", "content": f"Static image {image_name} not found on server."},
            )

    if name == "cell2sentence_ai_assistant":
        c2s_on = opts.get("c2s", True) is not False
        if not c2s_on:
            msg = "Cell2Sentence is turned off in chat options. Enable it under the + menu to use the cell assistant."
            return (msg, {"type": "text", "content": msg})
        message = (tool_input.get("message") or "").strip()
        if not message:
            msg = "Cell2Sentence tool was called with an empty message."
            return (msg, {"type": "text", "content": msg})
        success, answer = c2s_chat(message)
        if not success:
            return (
                f"Cell2Sentence call failed. Error: {answer}",
                {"type": "text", "content": f"Cell2Sentence call failed.\n\nError:\n{answer}"},
            )
        return (
            f"Cell2Sentence answer: {answer}",
            {"type": "text", "content": f"Ask Cell2Sentence: {message}\n\nAnswer:\n\n{answer}"},
        )

    if name == "glkb_ai_assistant":
        if not glkb_on:
            msg = "GLKB is turned off in chat options. Enable it under the + menu to use the literature assistant."
            return (msg, {"type": "text", "content": msg})
        question = tool_input["question"]
        success, answer = glkb_chat(question)
        if not success:
            return (
                f"GLKB call failed. Error: {answer}",
                {"type": "text", "content": f"GLKB call failed.\n\nError:\n{answer}"},
            )
        return (
            f"GLKB answer: {answer}",
            {"type": "text", "content": f"Ask GLKB AI assistant: {question}\n\nAnswer:\n\n{answer}"},
        )

    return (f"Unknown tool '{name}'.", None)


# ---------------------------------------------------------------------------
# Parallel executor — runs all planned tool calls concurrently
# ---------------------------------------------------------------------------

def execute_plan_parallel(
    steps: List[dict],
    agent_options: Union[Dict[str, Any], None] = None,
) -> List[Tuple[Union[str, list], Union[dict, None]]]:
    """Execute a list of planned tool calls concurrently.

    Each step is {"tool": name, "input": {...}}.
    Returns results in the same order as the input steps list.
    """
    if not steps:
        return []

    results: List[Union[Tuple, None]] = [None] * len(steps)

    with ThreadPoolExecutor(max_workers=min(8, len(steps))) as pool:
        futures = {
            pool.submit(execute_tool, s["tool"], s["input"], agent_options): i
            for i, s in enumerate(steps)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                tool_name = steps[idx]["tool"]
                print(f"execute_plan_parallel: tool '{tool_name}' raised: {e}")
                results[idx] = (f"Tool '{tool_name}' failed: {e}", None)

    return results  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Core Claude call: Planner → Parallel Executor → Synthesizer
# ---------------------------------------------------------------------------

def get_gpt_resp(
    history: list,
    agent_options: Union[Dict[str, Any], None] = None,
) -> Tuple[bool, str, list]:
    """Three-phase pipeline: Planner → Parallel Executor → Synthesizer.

    Phase 1 (Planner): A dedicated Claude call with tool_choice forced to
        create_plan. Claude outputs a structured list of tool calls.
    Phase 2 (Executor): All planned tool calls run concurrently via
        ThreadPoolExecutor. Images are fetched in parallel from R servers.
    Phase 3 (Synthesizer): Claude receives all tool results (including base64
        images) and generates the final natural-language response.

    Fallback: if the planner outputs steps=[], Phase 2 is skipped and Phase 3
        is a direct text-only call (no tools), e.g. for pure biology questions.

    agent_options: e.g. {"glkb": False, "c2s": False} to forbid assistant tools from frontend + menu.

    Returns: (success, error_msg, frontend_messages)
    """
    try:
        opts: Dict[str, Any] = {"glkb": True, "c2s": True}
        if isinstance(agent_options, dict):
            opts["glkb"] = agent_options.get("glkb", True) is not False
            opts["c2s"] = agent_options.get("c2s", True) is not False
        glkb_on = bool(opts["glkb"])
        c2s_on = bool(opts["c2s"])

        user_q = _latest_user_text(history)
        MAX_QUERY_CHARS = 1200
        user_q = user_q[:MAX_QUERY_CHARS]

        # Paper RAG disabled for GutOmicsAtlas (paper_search is a stub returning []).
        if glkb_on or c2s_on:
            paper_section = (
                "## 4. Context note (no project paper RAG)\n"
                "This deployment does not attach indexed paper excerpts. "
                "Use GLKB and/or Cell2Sentence tool results when present, visualization tool results, and general reasoning.\n"
            )
        else:
            paper_section = (
                "## 4. Context note\n"
                "The user disabled GLKB and Cell2Sentence for this message. "
                "Do not state those assistants were consulted. Rely on visualization tools and general reasoning only.\n"
            )

        anthropic_msgs = _flat_to_anthropic(history)
        collected_messages: List[dict] = []

        # -------------------------------------------------------------------
        # Phase 1 — Planner
        # -------------------------------------------------------------------
        planner_system = PLANNER_SYSTEM_PROMPT + "\n\n" + paper_section
        if glkb_on:
            planner_system += (
                "\n\n## User enabled GLKB (literature mode)\n"
                "Whenever you call glkb_ai_assistant, set `question` to a **crafted literature sub-query** — "
                "concrete, neutral, and searchable — as in the reformulation examples above. "
                "Never send GLKB a bare overly-general or personal user sentence if a tighter biomedical question fits their intent.\n"
            )
        if not glkb_on:
            planner_system += (
                "\n\n## CRITICAL: GLKB disabled by user\n"
                "The user turned OFF the GLKB literature tool for this request. "
                "You MUST NOT include glkb_ai_assistant in create_plan steps. "
                "Use only visualization/static tools, or an empty steps list.\n"
            )
        if not c2s_on:
            planner_system += (
                "\n\n## CRITICAL: Cell2Sentence disabled by user\n"
                "The user turned OFF Cell2Sentence for this request. "
                "You MUST NOT include cell2sentence_ai_assistant in create_plan steps.\n"
            )

        planner_tools = _planner_tool_for_session(glkb_on, c2s_on)

        planner_resp = client.messages.create(
            model=anthropic_model,
            temperature=0,
            messages=anthropic_msgs,
            max_tokens=1024,
            system=planner_system,
            tools=planner_tools,
            tool_choice={"type": "tool", "name": "create_plan"},
        )

        # Extract the create_plan call — it is guaranteed by tool_choice
        plan_input: dict = {}
        for block in planner_resp.content:
            if hasattr(block, "name") and block.name == "create_plan":
                plan_input = block.input
                break

        steps: List[dict] = plan_input.get("steps", [])
        intro_text: str = plan_input.get("intro_text", "").strip()

        if not glkb_on:
            steps = [s for s in steps if isinstance(s, dict) and s.get("tool") != "glkb_ai_assistant"]
        if not c2s_on:
            steps = [s for s in steps if isinstance(s, dict) and s.get("tool") != "cell2sentence_ai_assistant"]

        print(f"======== Planner: {len(steps)} step(s): {[s['tool'] for s in steps]}")
        log_queue.put(json.dumps({"planner": plan_input}, ensure_ascii=False))

        if intro_text:
            collected_messages.append({"type": "text", "content": intro_text})

        # -------------------------------------------------------------------
        # Phase 2 — Parallel Executor (skipped when steps is empty)
        # -------------------------------------------------------------------
        # tool_results_for_claude: list of tool_result blocks to send to synthesizer
        # Fake tool_use_ids are generated since we bypassed the normal tool_use flow.
        tool_results_for_claude: List[dict] = []

        if steps:
            for s in steps:
                print(f"  -> planned: {s['tool']}({s['input']})")

            exec_results = execute_plan_parallel(steps, opts)

            for i, (result_content, display_msg) in enumerate(exec_results):
                if display_msg:
                    collected_messages.append(display_msg)
                # We need a stable fake tool_use_id for each step so we can
                # build a valid tool_result message for the synthesizer.
                fake_id = f"plan_step_{i}"
                tool_results_for_claude.append({
                    "type": "tool_result",
                    "tool_use_id": fake_id,
                    "content": result_content,
                })

        # -------------------------------------------------------------------
        # Phase 3 — Synthesizer
        # -------------------------------------------------------------------
        synthesizer_system = PROMPT + "\n\n" + paper_section
        if not glkb_on:
            synthesizer_system += (
                "\nThe user disabled GLKB for this turn; do not imply a literature lookup was performed.\n"
            )
        if not c2s_on:
            synthesizer_system += (
                "\nThe user disabled Cell2Sentence for this turn; do not imply Cell2Sentence was used.\n"
            )

        # Build the synthesizer message history.
        # We inject a fake assistant turn that "called" the planned tools,
        # followed by a user turn with all the tool results, so Claude
        # understands what was executed and can interpret the results.
        synth_msgs = list(anthropic_msgs)  # copy

        if steps and tool_results_for_claude:
            # Fake assistant turn: one tool_use block per step
            fake_tool_uses = [
                {
                    "type": "tool_use",
                    "id": f"plan_step_{i}",
                    "name": s["tool"],
                    "input": s["input"],
                }
                for i, s in enumerate(steps)
            ]
            synth_msgs.append({"role": "assistant", "content": fake_tool_uses})
            synth_msgs.append({"role": "user", "content": tool_results_for_claude})

        synth_resp = client.messages.create(
            model=anthropic_model,
            temperature=0.2,
            messages=synth_msgs,
            max_tokens=3072,
            system=synthesizer_system,
            # No tools passed — synthesizer only generates text
        )

        print(f"======== Synthesizer stop_reason={synth_resp.stop_reason}, "
              f"blocks=[{', '.join(f'text({len(b.text)} chars)' if hasattr(b, 'text') else 'other' for b in synth_resp.content)}]")

        for block in synth_resp.content:
            if hasattr(block, "text") and block.text.strip():
                collected_messages.append({"type": "text", "content": block.text})

        # Build flat assistant text for the history returned to the frontend
        assistant_text_parts = [m["content"] for m in collected_messages if m["type"] == "text"]
        assistant_text = "\n\n".join(assistant_text_parts)
        if assistant_text.strip():
            history.append({"role": "assistant", "content": assistant_text})

        print(f"======== Claude success. {len(collected_messages)} display messages.")
        return (True, "", collected_messages)

    except Exception:
        err = traceback.format_exc()
        print(err)
        return (False, "Failed to get the response from the AI. Please copy your input, refresh the page and try again.", [])


# ---------------------------------------------------------------------------
# GLKB integration  (unchanged)
# ---------------------------------------------------------------------------

def glkb_chat(question: str) -> Tuple[bool, str]:
    """
    Safe-ish GLKB SSE caller.
    - No history (messages = [])
    - Handles SSE chunking
    - Adds basic retries + backoff
    - Adds caps to avoid runaway memory
    - Better error messages (HTTP body snippet, content-type, etc.)
    """
    URL = GLKB_LLM_AGENT_URL
    PREFIX = "[AGENT OUTPUT] FinalAnswerAgent | Output:"

    CONNECT_TIMEOUT_S = 10
    READ_TIMEOUT_S = 180
    MAX_ATTEMPTS = 3
    BACKOFF_S = 1.5

    MAX_CHUNKS = 1000
    MAX_TOTAL_CHARS = 2_000_000

    payload = {"question": question, "messages": []}

    last_err = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with requests.Session() as session:
                with session.post(
                    URL,
                    json=payload,
                    stream=True,
                    timeout=(CONNECT_TIMEOUT_S, READ_TIMEOUT_S),
                    verify=False,
                    headers={
                        "Accept": "text/event-stream",
                        "Content-Type": "application/json",
                        "User-Agent": "glkb-python-client/1.0",
                    },
                ) as r:
                    if r.status_code < 200 or r.status_code >= 300:
                        body_snip = ""
                        try:
                            body_snip = (r.text or "")[:800]
                        except Exception:
                            body_snip = "<unable to read body>"
                        ct = r.headers.get("content-type", "")
                        return (
                            False,
                            f"HTTP {r.status_code}. Content-Type: {ct}. Body (first 800 chars): {body_snip}",
                        )

                    ct = (r.headers.get("content-type") or "").lower()
                    if "text/event-stream" not in ct:
                        body_snip = ""
                        try:
                            body_snip = (r.text or "")[:800]
                        except Exception:
                            body_snip = "<unable to read body>"
                        return (
                            False,
                            f"Expected SSE (text/event-stream) but got Content-Type: {ct}. Body (first 800 chars): {body_snip}",
                        )

                    chunks: List[str] = []
                    total_chars = 0

                    for raw_line in r.iter_lines(decode_unicode=True):
                        if raw_line is None:
                            continue

                        line = raw_line.strip()
                        if not line:
                            continue
                        if not line.startswith("data:"):
                            continue

                        data_str = line[len("data:"):].strip()
                        if not data_str:
                            continue
                        if data_str == "[DONE]":
                            break

                        try:
                            obj = json.loads(data_str)
                            step = obj.get("step")

                            if step == "Complete":
                                final_resp = obj.get("response")
                                final_text = ""

                                if isinstance(final_resp, str) and final_resp.strip():
                                    final_text = final_resp.strip()

                                refs = obj.get("references")
                                if isinstance(refs, list) and refs:
                                    ref_lines = []
                                    for i, r in enumerate(refs[:10], start=1):
                                        if not isinstance(r, list) or len(r) < 6:
                                            continue

                                        title = r[0] or "Untitled"
                                        url = r[1] or ""
                                        year = r[3] or ""
                                        journal = r[4] or ""
                                        authors = r[5] or []

                                        if isinstance(authors, list):
                                            authors = [a for a in authors if a.strip()]
                                            author_str = ", ".join(authors[:5])
                                            if len(authors) > 5:
                                                author_str += " et al."
                                        else:
                                            author_str = ""

                                        line = f"{i}. {title}\n   {author_str} ({year}) — {journal}\n   {url}"
                                        ref_lines.append(line)

                                    if ref_lines:
                                        final_text += "\n\nReferences:\n" + "\n".join(ref_lines)

                                return True, final_text.strip()

                        except json.JSONDecodeError:
                            continue

                        content = obj.get("content")
                        if not isinstance(content, str) or not content:
                            continue

                        idx = content.find(PREFIX)
                        if idx == -1:
                            continue

                        piece = content[idx + len(PREFIX):].lstrip()
                        if not piece:
                            continue

                        if len(chunks) >= MAX_CHUNKS:
                            break
                        if total_chars + len(piece) > MAX_TOTAL_CHARS:
                            remaining = MAX_TOTAL_CHARS - total_chars
                            if remaining > 0:
                                chunks.append(piece[:remaining])
                                total_chars += remaining
                            break

                        chunks.append(piece)
                        total_chars += len(piece)

                    if not chunks:
                        return (
                            False,
                            "No FinalAnswerAgent output found in SSE stream. "
                            "The agent may have failed, returned only traces, or the prefix format changed.",
                        )

                    result = "\n".join(chunks).strip()
                    return True, result

        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            last_err = f"{type(e).__name__}: {e}"
            if attempt < MAX_ATTEMPTS:
                time.sleep(BACKOFF_S * attempt)
                continue
            return False, f"Network/timeout after {MAX_ATTEMPTS} attempts: {last_err}"

        except requests.exceptions.RequestException as e:
            last_err = f"{type(e).__name__}: {e}"
            return False, f"HTTP/network error: {last_err}"

        except Exception:
            last_err = traceback.format_exc()
            return False, last_err

    return False, last_err or "Unknown error"


def c2s_chat(message: str) -> Tuple[bool, str]:
    """Call Cell2Sentence backend: POST /chat with {"message": "..."}."""
    base = (C2S_AGENT_BASE or "").strip().rstrip("/")
    if not base:
        return False, "C2S is not configured (set C2S_AGENT_BASE)."

    payload = {"message": message}
    url = f"{base}/chat"
    try:
        r = requests.post(
            url,
            json=payload,
            timeout=(10, 240),
            verify=False,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "c2s-python-client/1.0",
            },
        )
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
        return False, f"Network/timeout calling C2S: {e}"
    except requests.exceptions.RequestException as e:
        return False, f"HTTP/network error: {e}"

    try:
        data = r.json()
    except json.JSONDecodeError:
        return False, f"Invalid JSON (HTTP {r.status_code}): {(r.text or '')[:800]}"

    if r.status_code < 200 or r.status_code >= 300:
        err = data.get("error") if isinstance(data, dict) else None
        detail = data.get("detail") if isinstance(data, dict) else None
        body = err or detail or (r.text or "")[:800]
        return False, f"HTTP {r.status_code}. {body}"

    if isinstance(data, dict):
        resp = data.get("response")
        if isinstance(resp, str) and resp.strip():
            return True, resp.strip()
    return False, "C2S returned no response text."


# ---------------------------------------------------------------------------
# HTTP handler  (API contract unchanged)
# ---------------------------------------------------------------------------

def process_ai_chat(request, path: str):
    print('AI chat')
    MAX_BODY_BYTES = 256_000

    cl = int(request.headers.get("Content-Length", "0") or "0")
    if cl <= 0 or cl > MAX_BODY_BYTES:
        request.send_response(413)
        request.send_header("Content-Length", 0)
        request.send_header("Access-Control-Allow-Origin", "*")
        request.end_headers()
        return

    user_input = request.rfile.read(cl).decode("utf-8", errors="replace")
    agent_options: Dict[str, Any] = {"glkb": True, "c2s": True}

    try:
        payload = json.loads(user_input)
    except json.JSONDecodeError:
        bad = b"Invalid JSON body"
        request.send_response(400)
        request.send_header("Connection", "keep-alive")
        request.send_header("Content-Length", len(bad))
        request.send_header("Access-Control-Allow-Origin", "*")
        request.end_headers()
        request.wfile.write(bad)
        request.wfile.flush()
        return

    if isinstance(payload, list):
        history = payload
    elif isinstance(payload, dict) and isinstance(payload.get("history"), list):
        history = payload["history"]
        o = payload.get("options")
        if isinstance(o, dict):
            agent_options["glkb"] = o.get("glkb", True) is not False
            agent_options["c2s"] = o.get("c2s", True) is not False
    else:
        bad = b'Expected a JSON array of messages or {"history":[...],"options":{"glkb":true,"c2s":true}}'
        request.send_response(400)
        request.send_header("Connection", "keep-alive")
        request.send_header("Content-Length", len(bad))
        request.send_header("Access-Control-Allow-Origin", "*")
        request.end_headers()
        request.wfile.write(bad)
        request.wfile.flush()
        return

    if within_rate_limit() == False:
        request.send_response(429)
        request.send_header('Connection', 'keep-alive')
        request.send_header('Content-Length', 0)
        request.send_header('Access-Control-Allow-Origin', '*')
        request.end_headers()
        request.wfile.write(b'')
        request.wfile.flush()
        return

    MAX_TURNS = 30
    if isinstance(history, list) and len(history) > MAX_TURNS:
        history = history[-MAX_TURNS:]

    MAX_MSG_CHARS = 4000

    def _trim_msg_content(m):
        c = m.get("content", "")
        if isinstance(c, str) and len(c) > MAX_MSG_CHARS:
            m = dict(m)
            m["content"] = c[:MAX_MSG_CHARS] + "…[truncated]"
        return m

    history = [_trim_msg_content(m) for m in history if isinstance(m, dict)]

    log_queue.put(
        json.dumps({"history": history, "options": agent_options}, ensure_ascii=False)
    )
    success, error_msg, messages = get_gpt_resp(history, agent_options)

    if error_msg:
        request.send_response(500)
        error_msg = error_msg.encode('utf-8')
        request.send_header('Content-Length', len(error_msg))
        request.send_header('Connection', 'keep-alive')
        request.send_header('Access-Control-Allow-Origin', '*')
        request.end_headers()
        request.wfile.write(error_msg)
        request.wfile.flush()
        return

    request.send_response(200)
    resp_data = json.dumps({'history': history, 'messages': messages}, ensure_ascii=False)
    resp_data = resp_data.encode('utf-8')
    request.send_header('Content-Length', len(resp_data))
    request.send_header('Connection', 'keep-alive')
    request.send_header('Access-Control-Allow-Origin', '*')
    request.end_headers()
    request.wfile.write(resp_data)
    request.wfile.flush()
    return


# ---------------------------------------------------------------------------
# Async log writer
# ---------------------------------------------------------------------------

log_queue = Queue()


def write_logs():
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"{time.time()*1000:.3f}: Server started!\n")
        f.flush()
        while True:
            item = log_queue.get()
            f.write(f"{time.time()*1000:.3f}: {item}\n")
            f.flush()

start_new_thread(write_logs, ())
