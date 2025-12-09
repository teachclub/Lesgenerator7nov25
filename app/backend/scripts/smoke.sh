#!/usr/bin/env bash
# backend/scripts/smoke.sh
# Eenvoudige smoketest voor Masterprompt-backend.

set -euo pipefail

API="${API:-http://localhost:8080}"

echo "==> HEALTH"
curl -s "$API/health" | jq .

echo
echo "==> SUGGEST (TV6 / KA26 / 'Luther 1517 reformatie')"
curl -s -X POST "$API/api/suggest" \
  -H 'Content-Type: application/json' \
  -d '{"tv":"TV6","ka":"26","userQuery":"Luther 1517 reformatie"}' | jq .

echo
echo "==> SEARCH (Historiana: 'printing press', limit 5)"
curl -s -X POST "$API/api/search" \
  -H 'Content-Type: application/json' \
  -d '{"provider":"historiana","query":"printing press","limit":5}' | jq .

echo
echo "==> GENERATE (mock) met 3+ bronnen"
curl -s -X POST "$API/api/generate" \
  -H 'Content-Type: application/json' \
  -d '{
    "context": {"tv":"TV5","ka":"23"},
    "selection":[
      {"title":"Pamflet 1517","url":"https://ex/p1"},
      {"title":"Rijksdag te Worms","url":"https://ex/p2"},
      {"title":"Plakkaat van Verlatinghe","url":"https://ex/p3"}
    ]
  }' | jq .

echo
echo "==> Klaar."
