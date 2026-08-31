#!/usr/bin/env bash

set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$repo_dir/images"
output_dir="$source_dir/optimized"
temp_dir="$(mktemp -d)"

cleanup() {
  rm -rf "$temp_dir"
}
trap cleanup EXIT

for command_name in sips cwebp avifenc; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required image tool: %s\n' "$command_name" >&2
    exit 1
  fi
done

icons=(
  alma-icon
  bouncyfruits-icon
  cyphre-icon
  dashpal-icon
  doseplan-icon
  eyecolorcam-icon
  mynurseshiftplanner-icon
  myworkshiftplanner-icon
  neurarush-icon
  poppopaliens-icon
  poppopfruits-icon
  poppoppiggies-icon
  proscan-icon
  viento-icon
  waterfasting-icon
  wealthboostappicon
  worldfootballcup-icon
)

mkdir -p "$output_dir"

for icon in "${icons[@]}"; do
  source_file="$source_dir/$icon.png"

  for size in 64 128 256; do
    resized_png="$temp_dir/$icon-$size.png"
    output_base="$output_dir/$icon-$size"

    sips --resampleHeightWidth "$size" "$size" "$source_file" --out "$resized_png" >/dev/null
    cwebp -quiet -preset icon -q 90 -alpha_q 100 -m 6 -metadata none "$resized_png" -o "$output_base.webp"
    avifenc -q 80 --qalpha 100 --speed 6 --ignore-exif --ignore-xmp --ignore-icc "$resized_png" "$output_base.avif" >/dev/null

    cp "$resized_png" "$output_base.png"
  done
done

printf 'Generated responsive AVIF, WebP, and PNG icon assets in %s\n' "$output_dir"
