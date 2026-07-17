#!/usr/bin/env python3

"""Resize flavor PNG files and encode transparent WebP deployment assets."""

from argparse import ArgumentParser
from pathlib import Path

from PIL import Image


def parse_args():
    parser = ArgumentParser()
    parser.add_argument("source", type=Path, help="Directory containing source PNG files")
    parser.add_argument("destination", type=Path, help="Directory for optimized WebP files")
    parser.add_argument("--height", type=int, default=232)
    parser.add_argument("--quality", type=int, default=78)
    return parser.parse_args()


def main():
    args = parse_args()
    args.destination.mkdir(parents=True, exist_ok=True)

    for source in sorted(args.source.glob("*.png")):
        with Image.open(source) as original:
            image = original.convert("RGBA")
            width = round(image.width * args.height / image.height)
            resized = image.resize((width, args.height), Image.Resampling.LANCZOS)
            destination = args.destination / f"{source.stem}.webp"
            resized.save(destination, "WEBP", quality=args.quality, method=6)
            print(f"{source.name} -> {destination.name} ({width}x{args.height})")


if __name__ == "__main__":
    main()
