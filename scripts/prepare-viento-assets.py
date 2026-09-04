"""Prepare web-sized copies of Viento's approved marketing assets."""

import argparse
from pathlib import Path
from shutil import copyfile

from PIL import Image, ImageOps


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--screenshots", required=True, type=Path)
parser.add_argument("--frame", required=True, type=Path)
parser.add_argument("--icon", required=True, type=Path)
parser.add_argument("--badge", required=True, type=Path)
args = parser.parse_args()
output = Path(__file__).resolve().parents[1] / "images" / "viento"
output.mkdir(parents=True, exist_ok=True)

screens = {
    "current": "IMG_0429.PNG",
    "daily": "IMG_0430.PNG",
    "places": "IMG_0431.PNG",
    "light": "IMG_0432.PNG",
    "air": "IMG_0433.PNG",
    "wind": "IMG_0434.PNG",
    "pressure": "IMG_0435.PNG",
    "conditions": "IMG_0436.PNG",
    "next-12": "IMG_0437.PNG",
}
widgets = {
    "widget-current": "IMG_0438.PNG",
    "widget-light": "IMG_0439.PNG",
    "widget-conditions": "IMG_0440.PNG",
    "widget-forecast": "IMG_0441.PNG",
}


def export(source, name, widths, lossless=False):
    with Image.open(source) as opened:
        original = ImageOps.exif_transpose(opened)
        for width in widths:
            width = min(width, original.width)
            height = round(original.height * width / original.width)
            image = original.resize((width, height), Image.Resampling.LANCZOS)
            if name in screens:
                image = image.convert("RGB")
            target = output / f"{name}-{width}.webp"
            image.save(target, "WEBP", quality=92, method=6, lossless=lossless)
            print(f"{target.name}: {width} x {height}, {target.stat().st_size:,} bytes")


for name, filename in screens.items():
    export(args.screenshots / filename, name, (480, 800))
for name, filename in widgets.items():
    export(args.screenshots / filename, name, (632,) if name in ("widget-current", "widget-light") else (1000,))
export(args.frame, "iphone-silver", (800,), lossless=True)
export(args.icon, "icon", (96, 256))
copyfile(args.badge, output / "app-store.svg")
