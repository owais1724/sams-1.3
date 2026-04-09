#!/usr/bin/env bash
# exit on error
set -o errexit

# Render provides PORT at runtime. Bind explicitly to all interfaces.
HOST="0.0.0.0"
PORT_VALUE="${PORT:-10000}"

npx next start -H "$HOST" -p "$PORT_VALUE"
