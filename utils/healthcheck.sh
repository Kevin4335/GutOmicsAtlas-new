#!/usr/bin/env bash
# Probe GutOmicsAtlas /health endpoints; push ntfy via utils/notify.py.
#
#   healthcheck.sh           # daily: notify only on failure (quiet if all OK)
#   healthcheck.sh --report  # weekly: always notify (OK summary or failures)
#
# Cron: utils/cron.d/gutomics-health

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NOTIFY=(python3 "$ROOT/utils/notify.py")
TIMEOUT=10
REPORT=0

for arg in "$@"; do
  case "$arg" in
    --report|-r) REPORT=1 ;;
    -h|--help)
      echo "Usage: $0 [--report]"
      exit 0
      ;;
    *)
      echo "unknown arg: $arg (try --report)" >&2
      exit 2
      ;;
  esac
done

# name|url
CHECKS=(
  "webserver|http://127.0.0.1:8000/health"
  "scrna-epithelial|http://127.0.0.1:9025/health"
  "atac-all|http://127.0.0.1:9026/health"
  "atac-celltype|http://127.0.0.1:9027/health"
  "scrna-eec|http://127.0.0.1:9028/health"
)

failures=()
ok_names=()

for entry in "${CHECKS[@]}"; do
  name="${entry%%|*}"
  url="${entry#*|}"
  body="$(curl -fsS --max-time "$TIMEOUT" "$url" 2>&1)" && ok=1 || ok=0
  if [[ "$ok" -ne 1 ]]; then
    failures+=("$name: request failed ($body)")
    continue
  fi
  if ! grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' <<<"$body"; then
    failures+=("$name: unexpected body: $body")
    continue
  fi
  ok_names+=("$name")
done

host="$(hostname -s 2>/dev/null || hostname)"

if [[ ${#failures[@]} -gt 0 ]]; then
  msg="$(printf '%s\n' "${failures[@]}")"
  if [[ ${#ok_names[@]} -gt 0 ]]; then
    msg+=$'\n\n'"still ok: $(IFS=', '; echo "${ok_names[*]}")"
  fi
  title="GutOmics health FAIL ($host)"
  if ! "${NOTIFY[@]}" -t "$title" -m "$msg" --priority 4 --tags warning,skull; then
    echo "healthcheck: notify failed" >&2
    echo "$msg" >&2
    exit 2
  fi
  echo "$msg" >&2
  exit 1
fi

# All five OK
if [[ "$REPORT" -eq 1 ]]; then
  msg="All ${#ok_names[@]} checks OK: $(IFS=', '; echo "${ok_names[*]}")"
  title="GutOmics health OK ($host)"
  if ! "${NOTIFY[@]}" -t "$title" -m "$msg" --priority 2 --tags white_check_mark; then
    echo "healthcheck: notify failed" >&2
    echo "$msg" >&2
    exit 2
  fi
fi

exit 0
