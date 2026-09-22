#!/usr/bin/env bash
# Capture the ZLynstall window (found by WM_CLASS) into $1 using ImageMagick's `import`.
# Works under a compositor even when the window is not on top. X11 only.
out="${1:?usage: x11-shot.sh out.png}"
for id in $(xprop -root _NET_CLIENT_LIST | grep -o '0x[0-9a-f]*'); do
  cls=$(xprop -id "$id" WM_CLASS 2>/dev/null | cut -d'"' -f2)
  if [ "$cls" = "zlynstall" ]; then import -window "$id" "$out"; echo "captured $id -> $out"; exit 0; fi
done
echo "no zlynstall window" >&2; exit 1
