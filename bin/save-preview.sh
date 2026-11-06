#!/bin/sh
# Save a rig page as one self-contained HTML file (plan § 3): bin/save-preview.sh <night> <out.html>. For the clean copy (§ 4) run it as LANE_MARKER= bin/save-preview.sh …
set -eu
night=$1; out=$2; port=${PORT:-8787}
pnpm exec tsx --env-file-if-exists=.env src/server.ts >/dev/null 2>&1 &
pid=$!; trap 'kill $pid 2>/dev/null' EXIT
for _ in 1 2 3 4 5 6 7 8 9 10; do curl -sf "http://localhost:$port/health" >/dev/null && break; sleep 0.5; done
curl -sf "http://localhost:$port/digest/$night" -o "$out"
