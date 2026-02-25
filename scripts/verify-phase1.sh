#!/usr/bin/env bash
set -euo pipefail

WRITER_URL="${1:-http://localhost:3001}"

curl -i \
  -X POST "${WRITER_URL}/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "content-generation",
    "taskInput": "Write a short Monad analysis."
  }'
