#!/usr/bin/env python3
"""
Push a short operational alert via ntfy.sh (phone notifications).

Config: utils/ntfy.env or webserver/.env (not committed).

  NTFY_TOPIC   required — hard-to-guess topic name (subscribe on phone)
  NTFY_SERVER  default https://ntfy.sh
  NTFY_TOKEN   optional — if the topic requires auth
  NTFY_PRIORITY  optional 1-5 (default 3; use 4-5 for failures)
  NTFY_TAGS    optional comma-separated (e.g. warning,skull)

Usage:
  python3 utils/notify.py -t "R plot down" -m "port 9025 not responding"
  python3 utils/notify.py -t "all clear" -m "health check ok" --priority 2
"""

from __future__ import annotations

import argparse
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILES = (ROOT / "utils" / "ntfy.env", ROOT / ".env")


def _load_env_files() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        load_dotenv = None
    for path in ENV_FILES:
        if not path.is_file():
            continue
        if load_dotenv:
            load_dotenv(path, override=False)
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            os.environ.setdefault(key, val)


def notify(
    title: str,
    message: str,
    *,
    topic: str | None = None,
    priority: int | None = None,
    tags: str | None = None,
) -> None:
    _load_env_files()
    topic_name = (topic or os.environ.get("NTFY_TOPIC") or "").strip()
    if not topic_name:
        raise SystemExit("set NTFY_TOPIC (or pass --topic)")

    server = (os.environ.get("NTFY_SERVER") or "https://ntfy.sh").rstrip("/")
    url = f"{server}/{topic_name}"

    headers = {
        "Title": title,
        "Priority": str(priority if priority is not None else os.environ.get("NTFY_PRIORITY", "3")),
    }
    tag_val = tags if tags is not None else os.environ.get("NTFY_TAGS", "")
    if tag_val.strip():
        headers["Tags"] = tag_val.strip()
    token = os.environ.get("NTFY_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        url,
        data=message.encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"ntfy HTTP {e.code}: {body}") from e
    except urllib.error.URLError as e:
        raise SystemExit(f"ntfy request failed: {e}") from e


def main() -> None:
    p = argparse.ArgumentParser(description="Send one ntfy.sh push notification")
    p.add_argument("-t", "--title", required=True)
    p.add_argument("-m", "--message", required=True)
    p.add_argument("--topic", default=None, help="override NTFY_TOPIC")
    p.add_argument("--priority", type=int, default=None, help="1-5 (5 = urgent)")
    p.add_argument("--tags", default=None, help="comma-separated ntfy tags")
    args = p.parse_args()
    notify(
        args.title,
        args.message,
        topic=args.topic,
        priority=args.priority,
        tags=args.tags,
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
