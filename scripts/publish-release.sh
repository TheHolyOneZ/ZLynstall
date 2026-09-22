#!/usr/bin/env bash
# Copy the freshly built bundles into the website's releases/ folder and
# regenerate releases.json (version, file names, sizes, sha256, date).
# Usage: scripts/publish-release.sh   (after `pnpm bundle`)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/zlynstall/releases"
VERSION="$(python3 -c "import json;print(json.load(open('$ROOT/package.json'))['version'])")"
mkdir -p "$OUT"

deb=$(ls "$ROOT"/target/release/bundle/deb/zlynstall_"$VERSION"_*.deb | head -1)
rpm=$(ls "$ROOT"/target/release/bundle/rpm/zlynstall-"$VERSION"-*.rpm | head -1)
app=$(ls "$ROOT"/target/release/bundle/appimage/zlynstall_"$VERSION"_*.AppImage | head -1)
for f in "$deb" "$rpm" "$app"; do cp -f "$f" "$OUT/"; done

entry() { # kind path
  local f="$2" name size sha
  name="$(basename "$f")"; size="$(stat -c %s "$f")"; sha="$(sha256sum "$f" | cut -d' ' -f1)"
  printf '    {"kind": "%s", "file": "%s", "size": %s, "sha256": "%s"}' "$1" "$name" "$size" "$sha"
}
{
  echo "{"
  echo "  \"version\": \"$VERSION\","
  echo "  \"date\": \"$(date -u +%Y-%m-%d)\","
  echo "  \"files\": ["
  entry deb "$OUT/$(basename "$deb")"; echo ","
  entry rpm "$OUT/$(basename "$rpm")"; echo ","
  entry appimage "$OUT/$(basename "$app")"; echo
  echo "  ]"
  echo "}"
} > "$OUT/releases.json"
sha256sum "$OUT"/*.deb "$OUT"/*.rpm "$OUT"/*.AppImage | sed "s|$OUT/||" > "$OUT/SHA256SUMS"
echo "published $VERSION:"; cat "$OUT/releases.json"

# Keep the page's inline fallback (used when releases.json can't be fetched) in sync.
python3 - "$ROOT/zlynstall/index.html" "$OUT/releases.json" <<'PY'
import json, re, sys
html_path, manifest_path = sys.argv[1], sys.argv[2]
manifest = json.dumps(json.load(open(manifest_path)), separators=(",", ":"))
html = open(html_path).read()
html, n = re.subn(r'(<script id="releases-fallback" type="application/json">)\n.*?\n(</script>)', lambda m: m.group(1) + "\n" + manifest + "\n" + m.group(2), html, flags=re.S)
open(html_path, "w").write(html)
print("index.html fallback manifest:", "updated" if n else "NOT FOUND")
PY
