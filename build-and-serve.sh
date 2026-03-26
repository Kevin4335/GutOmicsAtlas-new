#!/usr/bin/env bash
# Build the Vite frontend, then start server.py.
#
# Foreground:
#   ./build-and-serve.sh
#
# Same thing inside tmux (survives SSH disconnect; reattach with tmux attach -t atlas):
#   ./build-and-serve.sh --tmux
#
# Detached tmux (returns immediately; attach later):
#   ./build-and-serve.sh --tmux --detach
#
# One-liner equivalent (from webserver dir):
#   tmux new-session -s atlas -c "$PWD" ./build-and-serve.sh --_inner
#
# nginx is optional (TLS / reverse proxy in front of this process).
#
# Non-root users cannot bind :80. This script sets ATLAS_PORT=8000 when needed unless you
# already set ATLAS_PORT or run as root. Point nginx at that port if you terminate TLS there.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SELF="$ROOT/build-and-serve.sh"
cd "$ROOT"

# Re-entry from tmux (do not use --_inner manually).
if [[ "${1:-}" == "--_inner" ]]; then
  shift
else
  detach=()
  session="${TMUX_SESSION:-atlas}"
  if [[ "${1:-}" == "--tmux" ]]; then
    shift
    while [[ "${1:-}" == "--detach" || "${1:-}" == "-d" ]]; do
      detach=(-d)
      shift
    done
    if ! command -v tmux >/dev/null 2>&1; then
      echo "tmux is not installed (e.g. sudo apt install tmux)" >&2
      exit 1
    fi
    if tmux has-session -t "$session" 2>/dev/null; then
      echo "tmux session '$session' already exists. Attach: tmux attach -t $session" >&2
      exit 1
    fi
    exec tmux new-session "${detach[@]}" -s "$session" -c "$ROOT" "$SELF" --_inner "$@"
  fi
fi

# TypeScript 5.9 / Vite 8 need modern JS (e.g. ??); Node 12/14 fails with SyntaxError in _tsc.js
need_node=18
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Need ${need_node}+. On Ubuntu/Debian (no nvm):" >&2
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs" >&2
  exit 1
fi
node_major="$(node -p "parseInt(process.versions.node, 10)" 2>/dev/null || echo 0)"
if [[ "${node_major:-0}" -lt "$need_node" ]]; then
  echo "Node.js ${need_node}+ required to build the frontend; you have $(node -v 2>/dev/null)." >&2
  echo "Upgrade (Ubuntu/Debian, replaces apt Node):" >&2
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs" >&2
  echo "Or install nvm first: https://github.com/nvm-sh/nvm#installing-and-updating  then: nvm install 20" >&2
  exit 1
fi

echo "==> Building frontend (frontend/dist)..."
( cd frontend && npm run build )

# Production mode defaults to :80, which requires root. Use :8000 for a normal user unless set.
if [[ "$(id -u)" -ne 0 ]] && [[ -z "${ATLAS_PORT:-}" ]]; then
  _ais="${ATLAS_IS_SERVER:-true}"
  _ais_lc="${_ais,,}"
  if [[ "${_ais_lc}" != "false" && "${_ais_lc}" != "0" ]]; then
    export ATLAS_PORT=8000
    echo "==> Not root: ATLAS_PORT=8000 (override with ATLAS_PORT=… or sudo for :80)" >&2
  fi
fi

echo "==> Starting server.py (Ctrl+C to stop)..."
exec "${PYTHON:-python3}" server.py
