#!/usr/bin/env bash
set -euo pipefail

# Altijd in de backend-map draaien
cd "$(dirname "$0")"

echo "=== CLEAN START ==="

echo "0. Unset eventuele oude GOOGLE/GEMINI keys in deze shell"
unset GEMINI_API_KEY || true
unset GOOGLE_API_KEY || true

echo "1. Port 8081 check"
if lsof -ti tcp:8081 >/dev/null 2>&1; then
  echo "Poort 8081 was bezet, proces wordt gekilled..."
  kill -9 "$(lsof -ti tcp:8081)" 2>/dev/null || true
else
  echo "8081 was vrij"
fi

echo "2. Check node server.cjs"
pgrep -fl "node server.cjs" || echo "Geen andere server.cjs processen"

echo "3. .env check"
if [ -f .env ]; then
  echo ".env OK"
else
  echo "⚠️  Geen .env gevonden"
fi

echo "4. node_modules check"
if [ -d node_modules ]; then
  echo "node_modules OK"
else
  echo "⚠️  Geen node_modules map"
fi

echo "5. Start backend (dotenv laadt keys uit .env)"
node -r dotenv/config server.cjs

