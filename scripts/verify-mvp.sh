#!/usr/bin/env bash
set -euo pipefail

HUNTER_URL="${1:-http://localhost:3002}"
GOAL="${2:-Write a concise Monad analysis focused on throughput and UX.}"

curl -i \
  -X POST "${HUNTER_URL}/run" \
  -H "Content-Type: application/json" \
  -d "{
    \"goal\": \"${GOAL}\"
  }"
