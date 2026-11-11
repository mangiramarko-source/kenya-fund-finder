#!/usr/bin/env python3
"""
Generate Kenya Fund Finder brand icons from the high-resolution eagle mascot artwork.
Creates pixel-perfect brand icons matching the user's authentic design:
- White-to-light-mint gradient squircle card
- Centered eagle emblem in suit & tie with complete unclipped lower contour
- Crisp, subtle edge definition for both dark-mode and light-mode interfaces

Outputs:
- public/apple-touch-icon.png (180x180, full-bleed master artwork for iOS)
- public/apple-touch-icon-precomposed.png (180x180)
- public/apple-touch-icon-180x180.png (180x180)
- public/apple-touch-icon-152x152.png (152x152)
- public/apple-touch-icon-120x120.png (120x120)
- public/icon-192.png (192x192 squircle with transparent corners)
- public/icon-512.png (512x512 squircle with transparent corners)
- public/icon-512-maskable.png (512x512 full-bleed adaptive icon)
- public/favicon.ico (multi-resolution: 16x16, 32x32, 48x48)
- public/favicon.svg (SVG vector/squircle wrapper)
"""

import os
import base64
from io import BytesIO
from PIL import Image, ImageDraw

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_IMAGE = os.path.join(REPO_ROOT, "src", "assets", "brand-master.jpg")
PUBLIC_DIR = os.path.join(REPO_ROOT, "public")

def make_squircle_icon(master_img, size, radius_ratio=0.223):
    """
    Builds a standard PWA squircle icon (transparent corners outside squircle).
    """
    resized = master_img.resize((size, size), Image.Resampling.LANCZOS)
    radius = int(size * radius_ratio)

    mask = Image.new("L", (size, size), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)

    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(resized, (0, 0), mask)

    # Subtle 1px anti-aliased border so white top edge stands out on white backgrounds
    border_draw = ImageDraw.Draw(out)
    border_width = max(1, size // 128)
    border_draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=radius,
        outline=(0, 0, 0, 24),
        width=border_width
    )
    return out

def make_apple_touch_icon(master_img, size=180):
    """
    Builds an Apple Touch Icon.
    iOS automatically rounds the icon on home screen; transparent corners turn solid black.
    Therefore, the background is full-bleed solid artwork (white-to-mint gradient).
    """
    resized = master_img.resize((size, size), Image.Resampling.LANCZOS)
    return resized.convert("RGBA")

def make_maskable_icon(master_img, size=512):
    """
    Builds an Android maskable adaptive icon.
    Full-bleed background with artwork scaled to ~94% to guarantee all details
    (including the bottom tie) remain within Android's 80% safe zone.
    """
    scale_factor = 0.94
    scaled_size = int(size * scale_factor)
    offset = (size - scaled_size) // 2

    # Background vertical gradient matching the master artwork
    bg = Image.new("RGBA", (size, size))
    top_c = (255, 255, 255, 255)
    bot_c = (202, 247, 226, 255)
    for y in range(size):
        factor = y / (size - 1)
        r = int(top_c[0] + factor * (bot_c[0] - top_c[0]))
        g = int(top_c[1] + factor * (bot_c[1] - top_c[1]))
        b = int(top_c[2] + factor * (bot_c[2] - top_c[2]))
        for x in range(size):
            bg.putpixel((x, y), (r, g, b, 255))

    scaled = master_img.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS)

    # Paste scaled master with feathered edge to eliminate any seam
    feather_mask = Image.new("L", (scaled_size, scaled_size), 255)
    f_draw = ImageDraw.Draw(feather_mask)
    f_draw.rectangle([0, 0, scaled_size - 1, scaled_size - 1], outline=240, width=1)
    f_draw.rectangle([1, 1, scaled_size - 2, scaled_size - 2], outline=250, width=1)

    bg.paste(scaled, (offset, offset), feather_mask)
    return bg

def main():
    if not os.path.exists(SOURCE_IMAGE):
        raise FileNotFoundError(f"Source master image not found at {SOURCE_IMAGE}")

    print(f"Loading master source artwork: {SOURCE_IMAGE}")
    master_img = Image.open(SOURCE_IMAGE).convert("RGB")
    print(f"Master image size: {master_img.size}")

    # 1. Generate Apple Touch Icons (full-bleed for iOS home screen & navbar)
    touch_targets = [
        ("apple-touch-icon.png", 180),
        ("apple-touch-icon-precomposed.png", 180),
        ("apple-touch-icon-180x180.png", 180),
        ("apple-touch-icon-152x152.png", 152),
        ("apple-touch-icon-120x120.png", 120),
    ]
    for filename, size in touch_targets:
        icon = make_apple_touch_icon(master_img, size)
        out_path = os.path.join(PUBLIC_DIR, filename)
        icon.save(out_path, format="PNG", optimize=True)
        print(f"Generated {filename} ({size}x{size}) -> {out_path}")

    # 2. Generate PWA standard squircle icons
    icon_192 = make_squircle_icon(master_img, 192)
    path_192 = os.path.join(PUBLIC_DIR, "icon-192.png")
    icon_192.save(path_192, format="PNG", optimize=True)
    print(f"Generated icon-192.png (192x192) -> {path_192}")

    icon_512 = make_squircle_icon(master_img, 512)
    path_512 = os.path.join(PUBLIC_DIR, "icon-512.png")
    icon_512.save(path_512, format="PNG", optimize=True)
    print(f"Generated icon-512.png (512x512) -> {path_512}")

    # 3. Generate Android Adaptive Maskable Icon
    icon_maskable = make_maskable_icon(master_img, 512)
    path_maskable = os.path.join(PUBLIC_DIR, "icon-512-maskable.png")
    icon_maskable.save(path_maskable, format="PNG", optimize=True)
    print(f"Generated icon-512-maskable.png (512x512) -> {path_maskable}")

    # 4. Generate multi-resolution ICO (16, 32, 48)
    ico_img = make_squircle_icon(master_img, 128)
    ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    ico_img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"Generated multi-resolution favicon.ico -> {ico_path}")

    # 5. Generate SVG favicon with embedded high-definition base64 squircle
    preview_img = master_img.resize((128, 128), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    preview_img.save(buffer, format="PNG", optimize=True)
    b64_data = base64.b64encode(buffer.getvalue()).decode("ascii")

    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <clipPath id="squircle">
      <rect width="64" height="64" rx="14" ry="14" />
    </clipPath>
  </defs>
  <g clip-path="url(#squircle)">
    <image href="data:image/png;base64,{b64_data}" width="64" height="64" />
    <rect x="0" y="0" width="64" height="64" rx="14" fill="none" stroke="rgba(0, 0, 0, 0.12)" stroke-width="1" />
  </g>
</svg>
'''
    svg_path = os.path.join(PUBLIC_DIR, "favicon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Generated favicon.svg -> {svg_path}")

    print("All PWA, favicon, and touch brand assets generated successfully!")

if __name__ == "__main__":
    main()
