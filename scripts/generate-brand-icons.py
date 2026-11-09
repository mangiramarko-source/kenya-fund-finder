#!/usr/bin/env python3
"""
Generate Kenya Fund Finder brand icons from the high-resolution eagle mascot artwork.
Creates:
- public/favicon.ico (multi-resolution: 16x16, 32x32, 48x48)
- public/apple-touch-icon.png (180x180)
- public/icon-192.png (192x192)
- public/icon-512.png (512x512)
- public/icon-512-maskable.png (512x512)
- public/favicon.svg (SVG vector/squircle wrapper)
"""

import os
import base64
from io import BytesIO
from PIL import Image

SOURCE_IMAGE = "/Users/markomangira/.gemini/antigravity/brain/73e7cd26-1c71-4eca-9545-dfa2f18625bd/.user_uploaded/media_1794238821981_6dae0be5.jpg"
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")

def main():
    if not os.path.exists(SOURCE_IMAGE):
        raise FileNotFoundError(f"Source image not found at {SOURCE_IMAGE}")

    print(f"Loading master source artwork: {SOURCE_IMAGE}")
    img = Image.open(SOURCE_IMAGE).convert("RGB")
    print(f"Master image size: {img.size}")

    # 1. Generate PNG icons
    targets = {
        "apple-touch-icon.png": (180, 180),
        "icon-192.png": (192, 192),
        "icon-512.png": (512, 512),
        "icon-512-maskable.png": (512, 512),
    }

    for filename, size in targets.items():
        out_path = os.path.join(PUBLIC_DIR, filename)
        resized = img.resize(size, Image.Resampling.LANCZOS)
        resized.save(out_path, format="PNG", optimize=True)
        print(f"Generated {filename} ({size[0]}x{size[1]}) -> {out_path}")

    # 2. Generate multi-resolution ICO file
    ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"Generated multi-resolution favicon.ico -> {ico_path}")

    # 3. Generate SVG favicon with embedded high-definition base64 squircle
    # This provides a crisp 64x64 squircle for modern browsers that request /favicon.svg
    preview_img = img.resize((128, 128), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    preview_img.save(buffer, format="PNG", optimize=True)
    b64_data = base64.b64encode(buffer.getvalue()).decode("ascii")

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <clipPath id="squircle">
      <rect width="64" height="64" rx="16" ry="16" />
    </clipPath>
  </defs>
  <rect width="64" height="64" rx="16" fill="#064e3b" />
  <g clip-path="url(#squircle)">
    <image href="data:image/png;base64,{b64_data}" width="64" height="64" />
    <rect x="0" y="0" width="64" height="64" rx="16" fill="none" stroke="#10b981" stroke-width="2" stroke-opacity="0.3" />
  </g>
</svg>
'''
    svg_path = os.path.join(PUBLIC_DIR, "favicon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Generated favicon.svg -> {svg_path}")

    print("All brand assets generated successfully!")

if __name__ == "__main__":
    main()
