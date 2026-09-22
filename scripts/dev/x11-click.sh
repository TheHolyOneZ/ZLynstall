#!/usr/bin/env bash
# x11-click.sh <x> <y> [button]  — click at window-relative coordinates inside the ZLynstall window (xte from xautomation).
S="$(cd "$(dirname "$0")" && pwd)"
WID=$(for id in $(xprop -root _NET_CLIENT_LIST | grep -o '0x[0-9a-f]*'); do [ "$(xprop -id "$id" WM_CLASS 2>/dev/null | cut -d'"' -f2)" = "zlynstall" ] && echo "$id"; done | head -1)
[ -n "$WID" ] || { echo "no zlynstall window" >&2; exit 1; }
read -r wx wy ww wh < <(python3 "$S/wingeom.py" "$WID")
xte "mousemove $((wx + $1)) $((wy + $2))" 'usleep 120000' "mouseclick ${3:-1}"
