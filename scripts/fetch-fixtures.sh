#!/usr/bin/env bash
# Downloads tiny real packages used by tests and the Docker verification scripts.
set -euo pipefail
cd "$(dirname "$0")/../tests/fixtures"

fetch() { # url dest
  if [ -s "$2" ]; then echo "have $2"; return; fi
  echo "fetching $2"; curl -fsSL --retry 3 -o "$2.part" "$1" && mv "$2.part" "$2"
}

fetch "https://deb.debian.org/debian/pool/main/h/hello/hello_2.10-3_amd64.deb" hello_2.10-3_amd64.deb
fetch "https://kojipkgs.fedoraproject.org/packages/hello/2.10/9.fc38/x86_64/hello-2.10-9.fc38.x86_64.rpm" hello-2.10-9.fc38.x86_64.rpm
fetch "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage" appimagetool-x86_64.AppImage
ls -la
