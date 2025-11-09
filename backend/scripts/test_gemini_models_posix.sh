#!/bin/sh
set -eu
: "${KEY:?export KEY='...'}"
Q="${Q:-Luther}"
BASE="https://generativelanguage.googleapis.com/v1beta"
HDR="Content-Type: application/json"
MODELS=$(
  curl -s "${BASE}/models?key=${KEY}" |
  jq -r '.models[].name' |
  sed 's#^models/##' |
  grep -E '^gemini' |
  grep -E 'flash|pro' |
  sort -u
)
printf "model\ttry\titems\tchars\tstatus\n"
test_try() {
  MODEL="$1"; TRY="$2"; BODY="$3"
  URL="${BASE}/models/${MODEL}:generateContent?key=${KEY}"
  RESP="$(curl -s --max-time 15 -H "$HDR" -X POST "$URL" -d "$BODY" || echo '{}')"
  TEXT="$(printf '%s' "$RESP" | jq -r 'try .candidates[0].content.parts[0].text catch ""')"
  if [ -z "$TEXT" ] || [ "$TEXT" = "null" ]; then
    TEXT="$(printf '%s' "$RESP" | sed -n '/```json/,/```/p' | sed '1d;$d' || true)"
  fi
  ITEMS="$(printf '%s' "$TEXT" | jq -r 'try (fromjson.items|length) catch 0' 2>/dev/null || echo 0)"
  CHARS=$(printf '%s' "$TEXT" | wc -c | tr -d ' ')
  STATUS="$(printf '%s' "$RESP" | jq -r 'try .error.message catch "OK"')"
  printf "%s\t%s\t%s\t%s\t%s\n" "$MODEL" "$TRY" "$ITEMS" "$CHARS" "$STATUS"
}
for M in $MODELS; do
  BODY1=$(cat <<JSON
{
  "contents":[{"parts":[{"text":"Geef voor zoekterm \"${Q}\" max 5 zeer relevante suggesties ALS STRENG JSON:\n{\\"items\\":[{\\"label\\":\\"Karel V\\",\\"kind\\":\\"person\\"},{\\"label\\":\\"Rijksdag van Worms (1521)\\",\\"kind\\":\\"event\\"}]}\nAlleen JSON."}]}],
  "generationConfig":{"temperature":0.2,"maxOutputTokens":256,"response_mime_type":"application/json"}
}
JSON
)
  test_try "$M" "try1" "$BODY1"
  BODY2=$(cat <<JSON
{
  "contents":[{"parts":[{"text":"Geef voor zoekterm \"${Q}\" max 5 zeer relevante suggesties ALS STRENG JSON:\n{\\"items\\":[{\\"label\\":\\"Karel V\\",\\"kind\\":\\"person\\"},{\\"label\\":\\"Rijksdag van Worms (1521)\\",\\"kind\\":\\"event\\"}]}\nAlleen JSON."}]}],
  "generationConfig":{"temperature":0.2,"maxOutputTokens":256}
}
JSON
)
  test_try "$M" "try2" "$BODY2"
  sleep 0.3
done

