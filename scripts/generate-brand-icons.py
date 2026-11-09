#!/usr/bin/env python3
"""
Generate Kenya Fund Finder brand icons from the high-resolution eagle mascot artwork.
Creates pixel-perfect brand icons matching the "Favicon UI" (deep emerald squircle with
centered eagle emblem and luminous emerald outline):

- public/apple-touch-icon.png (180x180, full-bleed emerald #064e3b, centered eagle)
- public/apple-touch-icon-precomposed.png (180x180)
- public/apple-touch-icon-180x180.png (180x180)
- public/apple-touch-icon-152x152.png (152x152)
- public/apple-touch-icon-120x120.png (120x120)
- public/icon-192.png (192x192 squircle)
- public/icon-512.png (512x512 squircle)
- public/icon-512-maskable.png (512x512 full-bleed emerald safe-zone icon)
- public/favicon.ico (multi-resolution: 16x16, 32x32, 48x48)
- public/favicon.svg (SVG vector/squircle wrapper)
"""

import os
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFilter

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_IMAGE = os.path.join(REPO_ROOT, "src", "assets", "brand-master.jpg")
PUBLIC_DIR = os.path.join(REPO_ROOT, "public")

def extract_clean_eagle(master_img):
    """
    Symmetrically crops the eagle emblem from the master image and replaces
    the light-mint/white exterior background with transparent alpha, preserving
    all interior eagle details.
    """
    # Symmetrical crop around the true eagle center (515, 596)
    crop_box = (88, 169, 942, 1023)
    cropped = master_img.crop(crop_box)
    w, h = cropped.size

    # Floodfill the exterior mint/white background from outer boundary points
    bin_img = Image.new("L", (w, h), 0)
    for y in range(h):
        for x in range(w):
            r, g, b = cropped.getpixel((x, y))
            if g > 190 and r > 140 and b > 160:
                bin_img.putpixel((x, y), 255)

    for start_pt in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0)]:
        if bin_img.getpixel(start_pt) == 255:
            ImageDraw.floodfill(bin_img, start_pt, 128)

    # Invert to build eagle alpha (128 = background => 0; rest => 255)
    alpha = Image.new("L", (w, h), 255)
    for y in range(h):
        for x in range(w):
            if bin_img.getpixel((x, y)) == 128:
                alpha.putpixel((x, y), 0)

    # Feather alpha slightly for crisp antialiased composite
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.2))

    # Composite cleanly onto the brand emerald background (#064e3b)
    bg = Image.new("RGBA", (w, h), (6, 78, 59, 255))
    eagle_rgba = cropped.convert("RGBA")
    eagle_rgba.putalpha(alpha)
    clean_composite = Image.alpha_composite(bg, eagle_rgba)

    return clean_composite

def make_squircle_icon(base_composite, size, outline_alpha=90):
    """
    Builds a standard PWA squircle icon (transparent corners outside squircle).
    """
    corner_r = int(size * (16 / 64))
    border_w = max(1, int(size * (2 / 64)))
    border_color = (16, 185, 129, outline_alpha)

    # 1. Resize base clean eagle composite
    resized = base_composite.resize((size, size), Image.Resampling.LANCZOS)

    # 2. Build squircle mask
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=corner_r, fill=255)

    # 3. Apply mask to transparent canvas
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(resized, (0, 0), mask)

    # 4. Draw crisp outer emerald stroke
    border_draw = ImageDraw.Draw(out)
    half_w = border_w // 2
    border_draw.rounded_rectangle(
        [half_w, half_w, size - 1 - half_w, size - 1 - half_w],
        radius=corner_r,
        outline=border_color,
        width=border_w
    )
    return out

def make_apple_touch_icon(base_composite, size=180):
    """
    Builds an Apple Touch Icon.
    iOS automatically rounds the icon on home screen; transparent corners turn solid black.
    Therefore, the background MUST be solid #064e3b, with an inner rounded emerald border.
    """
    corner_r = int(size * (16 / 64))
    border_w = max(1, int(size * (2 / 64)))
    border_color = (16, 185, 129, 90)

    # Full-bleed solid emerald canvas
    out = Image.new("RGBA", (size, size), (6, 78, 59, 255))
    resized = base_composite.resize((size, size), Image.Resampling.LANCZOS)
    out.paste(resized, (0, 0))

    # Inner squircle border matching the favicon UI
    draw = ImageDraw.Draw(out)
    half_w = border_w // 2
    draw.rounded_rectangle(
        [half_w + 1, half_w + 1, size - 2 - half_w, size - 2 - half_w],
        radius=corner_r,
        outline=border_color,
        width=border_w
    )
    return out

def make_maskable_icon(base_composite, size=512):
    """
    Builds an Android maskable icon.
    Full-bleed emerald (#064e3b) background with artwork contained in the 80% safe zone.
    """
    out = Image.new("RGBA", (size, size), (6, 78, 59, 255))

    # Scale eagle to fit safely inside the 80% diameter safe zone
    safe_size = int(size * 0.74)
    offset = (size - safe_size) // 2
    resized = base_composite.resize((safe_size, safe_size), Image.Resampling.LANCZOS)

    # Squircle mask for the inner emblem
    inner_r = int(safe_size * (16 / 64))
    mask = Image.new("L", (safe_size, safe_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, safe_size - 1, safe_size - 1], radius=inner_r, fill=255)

    out.paste(resized, (offset, offset), mask)

    # Draw safe-zone emerald stroke
    border_w = max(2, int(safe_size * (2 / 64)))
    border_draw = ImageDraw.Draw(out)
    half_w = border_w // 2
    border_draw.rounded_rectangle(
        [offset + half_w, offset + half_w, offset + safe_size - 1 - half_w, offset + safe_size - 1 - half_w],
        radius=inner_r,
        outline=(16, 185, 129, 90),
        width=border_w
    )
    return out

def main():
    if not os.path.exists(SOURCE_IMAGE):
        raise FileNotFoundError(f"Source master image not found at {SOURCE_IMAGE}")

    print(f"Loading master source artwork: {SOURCE_IMAGE}")
    master_img = Image.open(SOURCE_IMAGE).convert("RGB")
    print(f"Master image size: {master_img.size}")

    print("Extracting clean eagle composite on #064e3b background...")
    clean_composite = extract_clean_eagle(master_img)

    # 1. Generate Apple Touch Icons (solid #064e3b with inner squircle stroke)
    apple_touch_180 = make_apple_touch_icon(clean_composite, 180)
    touch_targets = [
        "apple-touch-icon.png",
        "apple-touch-icon-precomposed.png",
        "apple-touch-icon-180x180.png",
        "apple-touch-icon-152x152.png",
        "apple-touch-icon-120x120.png",
    ]
    for target in touch_targets:
        size = 180 if "180" in target or target in ["apple-touch-icon.png", "apple-touch-icon-precomposed.png"] else (152 if "152" in target else 120)
        icon = make_apple_touch_icon(clean_composite, size)
        out_path = os.path.join(PUBLIC_DIR, target)
        icon.save(out_path, format="PNG", optimize=True)
        print(f"Generated {target} ({size}x{size}) -> {out_path}")

    # 2. Generate PWA standard squircle icons
    icon_192 = make_squircle_icon(clean_composite, 192)
    path_192 = os.path.join(PUBLIC_DIR, "icon-192.png")
    icon_192.save(path_192, format="PNG", optimize=True)
    print(f"Generated icon-192.png (192x192) -> {path_192}")

    icon_512 = make_squircle_icon(clean_composite, 512)
    path_512 = os.path.join(PUBLIC_DIR, "icon-512.png")
    icon_512.save(path_512, format="PNG", optimize=True)
    print(f"Generated icon-512.png (512x512) -> {path_512}")

    # 3. Generate Android Adaptive Maskable Icon
    icon_maskable = make_maskable_icon(clean_composite, 512)
    path_maskable = os.path.join(PUBLIC_DIR, "icon-512-maskable.png")
    icon_maskable.save(path_maskable, format="PNG", optimize=True)
    print(f"Generated icon-512-maskable.png (512x512) -> {path_maskable}")

    # 4. Generate multi-resolution ICO (16, 32, 48)
    ico_img = make_squircle_icon(clean_composite, 128)
    ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    ico_img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"Generated multi-resolution favicon.ico -> {ico_path}")

    # 5. Generate SVG favicon with embedded high-definition base64 squircle
    preview_img = clean_composite.resize((128, 128), Image.Resampling.LANCZOS)
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

    print("All PWA and touch brand assets generated successfully!")

if __name__ == "__main__":
    main()
