#!/usr/bin/env bash

echo "=== CLEAN START ==="

echo "1. Port 8081 check"
if lsof -ti tcp:8081 >/dev/null; then
  echo "Poort 8081 was bezet, proces wordt gekilled..."
  kill -9 $(lsof -ti tcp:8081) 2>/dev/null || true
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

echo "5. Start backend"
node server.cjs

