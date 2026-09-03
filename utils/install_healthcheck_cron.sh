#!/usr/bin/env bash
# Install the versioned cron.d fragment so the daily healthcheck is visible and reproducible.
# Copies utils/cron.d/gutomics-health → /etc/cron.d/gutomics-health (needs sudo).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/utils/cron.d/gutomics-health"
DEST="/etc/cron.d/gutomics-health"

if [[ ! -f "$SRC" ]]; then
  echo "missing $SRC" >&2
  exit 1
fi

# cron.d: root-owned, not group/world-writable, no dots in some distros (our name is fine).
sudo install -o root -g root -m 644 "$SRC" "$DEST"

echo "Installed $DEST"
echo "Schedule (America/New_York):"
echo "  daily  02:00  healthcheck.sh           # ntfy only on failure"
echo "  Sunday 02:10  healthcheck.sh --report  # always ntfy"
echo "Logs: /tmp/gutomics_healthcheck.log"
echo ""
echo "Verify:"
echo "  ls -l $DEST"
echo "  cat $DEST"
echo "  bash $ROOT/utils/healthcheck.sh           # silent if OK"
echo "  bash $ROOT/utils/healthcheck.sh --report  # always notify"
