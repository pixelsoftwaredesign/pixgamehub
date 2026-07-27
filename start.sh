#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  PixGameHub Launcher — Pixel Software Design
#  Starts HTTP + WebSocket + SQLite server
# ═══════════════════════════════════════════════════════════════
cd "$(dirname "$0")"
echo ""
echo "  ◆ PIXEL SOFTWARE DESIGN — PixGameHub Server ◆"
echo "  Starting..."
echo ""

# Kill any existing server on our ports
lsof -ti:8080 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:8081 2>/dev/null | xargs kill -9 2>/dev/null

sleep 0.5

python3 server/index.py
