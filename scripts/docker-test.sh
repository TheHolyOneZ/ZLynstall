#!/usr/bin/env bash
# Verify the CLI end-to-end inside Docker. Usage: scripts/docker-test.sh [debian|ubuntu|fedora|opensuse|all]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-all}"

image_for() {
  case "$1" in
    debian)   echo "debian:bookworm" ;;
    ubuntu)   echo "ubuntu:24.04" ;;
    fedora)   echo "fedora:41" ;;
    opensuse) echo "opensuse/tumbleweed" ;;
    *) echo "unknown target $1" >&2; exit 2 ;;
  esac
}
family_for() {
  case "$1" in
    debian|ubuntu) echo debian ;;
    fedora) echo fedora ;;
    opensuse) echo suse ;;
  esac
}

"$ROOT/scripts/fetch-fixtures.sh" >/dev/null

echo "== building zlynstall-cli in rust:1-bookworm (cached in docker volumes)"
docker run --rm \
  -v "$ROOT":/src:ro \
  -v zlynstall-cargo-registry:/usr/local/cargo/registry \
  -v zlynstall-docker-target:/target \
  -w /src rust:1-bookworm \
  cargo build --release -p zlynstall-cli --target-dir /target -q

run_one() {
  local t="$1" image family
  image="$(image_for "$t")"; family="$(family_for "$t")"
  echo "== testing on $image ($family family)"
  docker run --rm \
    -v zlynstall-docker-target:/target:ro \
    -v "$ROOT/tests/fixtures":/fixtures:ro \
    -v "$ROOT/scripts/docker/inner-test.sh":/inner-test.sh:ro \
    "$image" bash /inner-test.sh "$family"
}

if [ "$TARGET" = all ]; then
  for t in debian ubuntu fedora opensuse; do run_one "$t"; done
else
  run_one "$TARGET"
fi
