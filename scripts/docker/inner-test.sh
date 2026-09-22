#!/usr/bin/env bash
# Runs inside a distro container as root. Installs the fixtures through the
# CLI both natively and via conversion, checks the binary works, and removes it.
set -euo pipefail
CLI=/target/release/zlynstall-cli
FAMILY="$1"

log() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

case "$FAMILY" in
  debian)
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    ;;
  fedora)
    dnf install -y -q rpm-build >/dev/null
    ;;
  suse)
    zypper --non-interactive --quiet install rpm-build >/dev/null
    ;;
esac

log "system"
"$CLI" system

check_hello() {
  if ! command -v hello >/dev/null; then echo "FAIL: hello not on PATH" >&2; exit 1; fi
  out="$(hello)"
  [ "$out" = "Hello, world!" ] || { echo "FAIL: unexpected output '$out'" >&2; exit 1; }
  echo "hello runs: $out"
}
check_gone() {
  if command -v hello >/dev/null; then echo "FAIL: hello still on PATH after uninstall" >&2; exit 1; fi
  echo "hello removed"
}

for fixture in /fixtures/hello_2.10-3_amd64.deb /fixtures/hello-2.10-9.fc38.x86_64.rpm; do
  log "plan $(basename "$fixture")"
  "$CLI" plan "$fixture"
  log "install $(basename "$fixture")"
  "$CLI" install "$fixture" --keep -v
  check_hello
  log "list"
  "$CLI" list
  log "uninstall"
  "$CLI" uninstall hello -v
  check_gone
  n="$("$CLI" list --json | grep -c '"id"' || true)"
  echo "registry entries after uninstall: $n"
  [ "$n" = "0" ] || { echo "FAIL: registry still has $n entries" >&2; exit 1; }
done

log "ALL GOOD on $FAMILY"
