#!/bin/sh
set -eu
: "${1:?Usage: deploy/smoke.sh http://localhost:8080 or https://ly.echoxai.net}"
base=${1%/}
directory=$(mktemp -d)
trap 'rm -rf "$directory"' EXIT HUP INT TERM

curl --fail --silent --show-error --max-time 15 -D "$directory/home.headers" \
  -o "$directory/home.html" "$base/"
curl --fail --silent --show-error --max-time 15 -D "$directory/article.headers" \
  -o "$directory/article.html" "$base/library/how-organizations-work/"
curl --fail --silent --show-error --max-time 15 -D "$directory/api.headers" \
  -o "$directory/api.json" "$base/api/v1/health"

grep -qi '^content-security-policy:.*script-src.*sha256-' "$directory/home.headers"
grep -qi '^x-content-type-options: nosniff' "$directory/home.headers"
grep -qi '^referrer-policy: strict-origin-when-cross-origin' "$directory/home.headers"
grep -qi '^strict-transport-security: max-age=31536000' "$directory/home.headers"
grep -qi '^cache-control: no-cache' "$directory/home.headers"
grep -qi '^cache-control: no-cache' "$directory/article.headers"
grep -q '灵鸢实验室' "$directory/home.html"
grep -q '组织' "$directory/article.html"
grep -q '"status":"ok"' "$directory/api.json"

asset=$(grep -oE '/_astro/[^" ]+\.(css|js)' "$directory/home.html" | head -n 1)
: "${asset:?No Astro asset found in homepage}"
curl --fail --silent --show-error --max-time 15 -D "$directory/asset.headers" \
  -o /dev/null "$base$asset"
grep -qi '^cache-control: public, max-age=31536000, immutable' "$directory/asset.headers"

curl --fail --silent --show-error --max-time 15 -D "$directory/fonts-css.headers" \
  -o "$directory/fonts.css" "$base/fonts.css"
grep -qi '^cache-control: no-cache' "$directory/fonts-css.headers"
font=$(grep -oE '/fonts/[^)]+\.woff2' "$directory/fonts.css" | head -n 1)
: "${font:?No self-hosted font found in fonts.css}"
curl --fail --silent --show-error --max-time 15 -D "$directory/font.headers" \
  -o /dev/null "$base$font"
grep -qi '^cache-control: public, max-age=31536000, immutable' "$directory/font.headers"

printf 'Smoke passed: HTML, API, CSP, assets, fonts and security headers at %s\n' "$base"
