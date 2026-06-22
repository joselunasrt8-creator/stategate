#!/usr/bin/env bash
set -euo pipefail

body="${INPUT_BODY:-}"

if [[ -z "$body" && -n "${GITHUB_EVENT_PATH:-}" && -f "$GITHUB_EVENT_PATH" ]]; then
  body="$(python3 - <<'PY'
import json
import os
from pathlib import Path

path = Path(os.environ["GITHUB_EVENT_PATH"])
event = json.loads(path.read_text())
print((event.get("pull_request") or {}).get("body") or "")
PY
)"
fi

proof=""
verdict="NULL"

if grep -Eq '(^|[^[:alnum:]_])VALID([^[:alnum:]_]|$)' <<<"$body" \
  && grep -Eq '(^|[^[:alnum:]_])PROOF([^[:alnum:]_]|$)' <<<"$body"; then
  verdict="VALID"
  proof="PROOF"
fi

{
  echo "verdict=$verdict"
  echo "proof=$proof"
} >> "$GITHUB_OUTPUT"

if [[ "$verdict" != "VALID" ]]; then
  echo "NULL → Blocked"
  exit 1
fi

echo "VALID → Merge Eligible"
echo "PROOF → Verifiable Evidence"
