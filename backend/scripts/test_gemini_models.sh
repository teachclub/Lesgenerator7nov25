#!/usr/bin/env bash
# scripts/test_gemini_models.sh
set -euo pipefail

KEY="${KEY:?KEY env mist (export KEY='...')}"
TERM="${TERM:-Luther}"
BASE="https://generativelanguage.googleapis.com/v1beta"
HDR="Content-Type: application/json"

# Modellen ophalen en normaliseren (strip 'models/')
readarray -t MODELS < <(curl -s "${BASE}/models?key=${KEY}" \
  | jq -r '.models[].name' | sed 's#^models/##' \
  | grep -E '^gemini' \
  | grep -E 'flash|pro' \
  | sort -u)

printf "model\ttry\titems\tchars\tstatus\n"

for M in "${MODELS[@]}"; do
  URL="${BASE}/models/${M}:generateContent?key=${KEY}"

  # Try 1: met response_mime_type=application/json
  BODY1=$(cat <<JSON
{
  "contents":[{"parts":[{"text":"Geef voor zoekterm \"${TERM}\" max 5 zeer relevante suggesties ALS STRENG JSON:\n{\"items\":[{\"label\":\"Karel V\",\"kind\":\"person\"},{\"label\":\"Rijksdag van Worms (1521)\",\"kind\":\"event\"}]}\nAlleen JSON."}]}],
  "generationConfig":{"temperature":0.2,"maxOutputTokens":256,"response_mime_type":"application/json"}
}
JSON
)
  RESP1=$(curl -s --max-time 12 -H "$HDR" -X POST "$URL" -d "$BODY1")
  TEXT1=$(printf '%s' "$RESP1" | jq -r 'try .candidates[0].content.parts[0].text catch ""')
  ITEMS1=$(printf '%s' "$TEXT1" | jq -r 'try (fromjson.items|length) catch 0' 2>/dev/null || echo 0)
  CHARS1=${#TEXT1}
  STATUS1=$(printf '%s' "$RESP1" | jq -r 'try .error.message catch "OK"')

  printf "%s\ttry1\t%s\t%s\t%s\n" "$M" "$ITEMS1" "$CHARS1" "$STATUS1"

  # Try 2: zonder response_mime_type
  BODY2=$(cat <<JSON
{
  "contents":[{"parts":[{"text":"Geef voor zoekterm \"${TERM}\" max 5 zeer relevante suggesties ALS STRENG JSON:\n{\"items\":[{\"label\":\"Karel V\",\"kind\":\"person\"},{\"label\":\"Rijksdag van Worms (1521)\",\"kind\":\"event\"}]}\nAlleen JSON."}]}],
  "generationConfig":{"temperature":0.2,"maxOutputTokens":256}
}
JSON
)
  RESP2=$(curl -s --max-time 12 -H "$HDR" -X POST "$URL" -d "$BODY2")
  TEXT2=$(printf '%s' "$RESP2" | jq -r 'try .candidates[0].content.parts[0].text catch ""')
  if [ -z "$TEXT2" ] || [ "$TEXT2" = "null" ]; then
    TEXT2=$(printf '%s' "$RESP2" | sed -n '/```json/,/```/p' | sed '1d;$d')
  fi
  ITEMS2=$(printf '%s' "$TEXT2" | jq -r 'try (fromjson.items|length) catch 0' 2>/dev/null || echo 0)
  CHARS2=${#TEXT2}
  STATUS2=$(printf '%s' "$RESP2" | jq -r 'try .error.message catch "OK"')

  printf "%s\ttry2\t%s\t%s\t%s\n" "$M" "$ITEMS2" "$CHARS2" "$STATUS2"

  sleep 0.3
done
