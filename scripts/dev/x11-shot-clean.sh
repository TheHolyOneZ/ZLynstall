#!/usr/bin/env bash
# x11-shot-clean.sh out.png — capture the ZLynstall window, drop the 14px transparent
# margin and round the corners (12px) to transparency, ready for docs.
out="${1:?usage: x11-shot-clean.sh out.png}"
S="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp --suffix=.png)"
"$S/x11-shot.sh" "$tmp" >/dev/null || exit 1
magick "$tmp" -shave 14x14 +repage \
  \( +clone -alpha extract -draw 'fill black polygon 0,0 0,12 12,0 fill white circle 12,12 12,0' \
     \( +clone -flip \) -compose Multiply -composite \( +clone -flop \) -compose Multiply -composite \) \
  -alpha off -compose CopyOpacity -composite "$out"
rm -f "$tmp"
echo "wrote $out"
