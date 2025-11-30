#!/bin/bash

cd "$(dirname "$0")"

echo "=== CLEAN START ==="

echo "1. Port 8081 check"
PID=$(lsof -ti tcp:8081 2>/dev/null)
if [ -n "$PID" ]; then
  echo "Proces op 8081: $PID (wordt gekilled)"
  kill -9 $PID 2>/dev/null
  sleep 1
else
  echo "8081 was vrij"
fi

echo "2. Check node server.cjs"
ps aux | grep "node server.cjs" | grep -v grep || echo "Geen andere server.cjs processen"

echo "3. .env check"
if [ -f .env ]; then
  echo ".env OK"
else
  echo ".env ontbreekt"
fi

echo "4. node_modules check"
if [ -d node_modules ]; then
  echo "node_modules OK"
else
  echo "node_modules ontbreekt"
fi

echo "5. Start backend"
export PORT=8081
node server.cjs

