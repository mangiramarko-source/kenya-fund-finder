import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def generate_lifestyle_hero():
    src_photo = "/Users/markomangira/.gemini/antigravity/brain/97b55be1-6068-4d73-8683-e612bdde82be/.user_uploaded/media_1793654669743_267a39d1.png"
    out_png = "/Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/images/intro-lifestyle-hero.png"
    out_jpg = "/Users/markomangira/Desktop/Business/KENYAFUNDFINDER/public/images/intro-lifestyle-hero.jpg"

    base_img = Image.open(src_photo).convert("RGBA")
    w_base, h_base = base_img.size

    # Screen coordinates on base image
    # Left: 444, Right: 569, Top: 202, Bottom: 486
    # Width: 125, Height: 284
    screen_w = 125
    screen_h = 284
    screen_x = 444
    screen_y = 202

    # High-resolution UI canvas (4x scale for maximum clarity)
    scale = 4
    ui_w = screen_w * scale # 500
    ui_h = screen_h * scale # 1136

    ui = Image.new("RGBA", (ui_w, ui_h), (6, 12, 19, 255))
    draw = ImageDraw.Draw(ui)

    # Fonts
    font_bold = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    font_reg = "/System/Library/Fonts/Supplemental/Arial.ttf"
    if not os.path.exists(font_bold):
        font_bold = "/System/Library/Fonts/Helvetica.ttc"
        font_reg = "/System/Library/Fonts/Helvetica.ttc"

    f_title = ImageFont.truetype(font_bold, 36)
    f_huge = ImageFont.truetype(font_bold, 62)
    f_sub = ImageFont.truetype(font_reg, 24)
    f_badge = ImageFont.truetype(font_bold, 20)
    f_card_title = ImageFont.truetype(font_bold, 28)
    f_card_val = ImageFont.truetype(font_bold, 32)
    f_card_sub = ImageFont.truetype(font_reg, 20)
    f_btn = ImageFont.truetype(font_bold, 28)

    # 1. Subtle radial gradient backdrop on UI
    for i in range(160):
        alpha = int(45 * (1 - i / 160))
        draw.ellipse([ui_w//2 - i*2, 200 - i, ui_w//2 + i*2, 200 + i*2], fill=(16, 185, 129, alpha))

    # 2. iPhone Status Bar (Top)
    # Notch cutout area: center x: 170..330, y: 0..40
    # Left: 9:41
    draw.text((36, 18), "9:41", font=f_badge, fill=(240, 240, 245, 230))
    # Right: Icons (5G, Battery)
    draw.text((ui_w - 90, 18), "5G  85%", font=f_badge, fill=(240, 240, 245, 230))

    # 3. App Header
    # Back arrow + App Name
    draw.text((30, 68), "‹", font=f_title, fill=(16, 185, 129, 255))
    draw.text((64, 72), "KenyaFundFinder", font=f_badge, fill=(200, 210, 220, 220))
    # CMA Pill
    draw.rounded_rectangle([ui_w - 180, 68, ui_w - 30, 96], radius=12, fill=(16, 185, 129, 45), outline=(16, 185, 129, 120), width=2)
    draw.text((ui_w - 170, 72), "CMA Regulated", font=ImageFont.truetype(font_bold, 16), fill=(52, 211, 153, 255))

    # 4. Hero Yield Section
    draw.text((30, 114), "Top MMF Yield", font=f_title, fill=(255, 255, 255, 255))
    draw.text((30, 156), "16.45%", font=f_huge, fill=(52, 211, 153, 255))
    draw.text((255, 178), "p.a.", font=f_sub, fill=(156, 163, 175, 220))

    draw.text((30, 228), "+0.25% this month · Etica Wealth", font=f_sub, fill=(52, 211, 153, 240))

    # 5. Rising Sparkline Graph (Polygon + Line)
    pts = [
        (30, 310), (70, 300), (120, 305), (170, 285), (220, 290),
        (280, 265), (340, 270), (400, 245), (460, 220)
    ]
    # Gradient fill under curve
    poly_pts = [(30, 330)] + pts + [(460, 330)]
    draw.polygon(poly_pts, fill=(16, 185, 129, 35))
    # Line
    for j in range(len(pts) - 1):
        draw.line([pts[j], pts[j+1]], fill=(52, 211, 153, 255), width=5)
    # Highlight dot at peak
    draw.ellipse([454, 214, 466, 226], fill=(52, 211, 153, 255), outline=(255, 255, 255, 255), width=2)

    # 6. Fund List Header
    draw.text((30, 345), "Top Ranked Funds Today", font=ImageFont.truetype(font_bold, 24), fill=(226, 232, 240, 240))
    draw.text((ui_w - 130, 348), "40 Funds ›", font=f_badge, fill=(148, 163, 184, 200))

    # 7. Card 1: Etica Wealth MMF
    c1_y = 385
    draw.rounded_rectangle([26, c1_y, ui_w - 26, c1_y + 115], radius=16, fill=(15, 23, 42, 230), outline=(16, 185, 129, 90), width=2)
    # Currency chip
    draw.rounded_rectangle([42, c1_y + 18, 92, c1_y + 42], radius=8, fill=(16, 185, 129, 45))
    draw.text((50, c1_y + 22), "KES", font=ImageFont.truetype(font_bold, 18), fill=(52, 211, 153, 255))
    draw.text((104, c1_y + 18), "Etica Wealth MMF", font=f_card_title, fill=(255, 255, 255, 255))
    draw.text((ui_w - 146, c1_y + 18), "16.45%", font=f_card_val, fill=(52, 211, 153, 255))
    # sub
    draw.text((42, c1_y + 56), "Daily yield: 15.24% · Min: KES 100", font=f_card_sub, fill=(148, 163, 184, 220))
    draw.text((42, c1_y + 82), "✓ Instant M-Pesa · Custody: Stanbic", font=ImageFont.truetype(font_reg, 18), fill=(110, 231, 183, 200))

    # 8. Card 2: Lofty-Corban MMF
    c2_y = 515
    draw.rounded_rectangle([26, c2_y, ui_w - 26, c2_y + 115], radius=16, fill=(15, 23, 42, 200), outline=(51, 65, 85, 180), width=1)
    draw.rounded_rectangle([42, c2_y + 18, 92, c2_y + 42], radius=8, fill=(16, 185, 129, 35))
    draw.text((50, c2_y + 22), "KES", font=ImageFont.truetype(font_bold, 18), fill=(52, 211, 153, 240))
    draw.text((104, c2_y + 18), "Lofty-Corban MMF", font=f_card_title, fill=(255, 255, 255, 255))
    draw.text((ui_w - 146, c2_y + 18), "15.82%", font=f_card_val, fill=(52, 211, 153, 255))
    draw.text((42, c2_y + 56), "Daily yield: 14.68% · Min: KES 1,000", font=f_card_sub, fill=(148, 163, 184, 220))
    draw.text((42, c2_y + 82), "✓ Same-day liquidity · Custody: KCB", font=ImageFont.truetype(font_reg, 18), fill=(110, 231, 183, 200))

    # 9. Card 3: Sanlam Dollar MMF
    c3_y = 645
    draw.rounded_rectangle([26, c3_y, ui_w - 26, c3_y + 115], radius=16, fill=(15, 23, 42, 200), outline=(51, 65, 85, 180), width=1)
    draw.rounded_rectangle([42, c3_y + 18, 92, c3_y + 42], radius=8, fill=(14, 165, 233, 45))
    draw.text((50, c3_y + 22), "USD", font=ImageFont.truetype(font_bold, 18), fill=(56, 189, 248, 255))
    draw.text((104, c3_y + 18), "Sanlam Dollar MMF", font=f_card_title, fill=(255, 255, 255, 255))
    draw.text((ui_w - 130, c3_y + 18), "6.85%", font=f_card_val, fill=(56, 189, 248, 255))
    draw.text((42, c3_y + 56), "USD yield: 6.62% · Min: USD 100", font=f_card_sub, fill=(148, 163, 184, 220))
    draw.text((42, c3_y + 82), "✓ 13 USD Funds · Standard Chartered", font=ImageFont.truetype(font_reg, 18), fill=(125, 211, 252, 200))

    # 10. Floating Bottom Action Button
    btn_y = 980
    draw.rounded_rectangle([30, btn_y, ui_w - 30, btn_y + 88], radius=24, fill=(16, 185, 129, 255))
    draw.text((ui_w//2 - 135, btn_y + 26), "Compare All 40 Funds →", font=f_btn, fill=(6, 12, 19, 255))

    # 11. Home Indicator Bar
    draw.rounded_rectangle([ui_w//2 - 70, ui_h - 18, ui_w//2 + 70, ui_h - 10], radius=4, fill=(255, 255, 255, 120))

    # Downscale UI smoothly to the screen box
    ui_scaled = ui.resize((screen_w, screen_h), Image.Resampling.LANCZOS)

    # Create a rounded screen mask for the iPhone display
    mask = Image.new("L", (screen_w, screen_h), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, screen_w, screen_h], radius=14, fill=255)

    # Cut out the iPhone notch at the top
    # Notch width on screen: x: 38..87, y: 0..8
    mask_draw.rounded_rectangle([38, 0, 87, 8], radius=4, fill=0)

    # Mask out the thumb area on the right edge (x: 120..125, y: 138..172)
    for ty in range(138, 172):
        for tx in range(120, screen_w):
            # Soft fade for thumb edge
            fade = min(255, int(255 * (screen_w - tx) / 5))
            if tx >= 123:
                mask.putpixel((tx, ty), 0)

    # Composite UI onto base photo
    base_img.paste(ui_scaled, (screen_x, screen_y), mask)

    # Add realistic screen glass sheen / ambient warm reflection
    glass = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glass)
    # Diagonal reflection line
    for d in range(screen_h):
        dx = screen_x + int(d * 0.4)
        dy = screen_y + d
        if screen_x <= dx < screen_x + screen_w and screen_y <= dy < screen_y + screen_h:
            g_draw.line([(dx, dy), (dx + 18, dy)], fill=(255, 245, 230, 18), width=1)

    base_img = Image.alpha_composite(base_img, glass)

    # Save outputs
    base_img.save(out_png, "PNG")
    rgb_img = base_img.convert("RGB")
    rgb_img.save(out_jpg, "JPEG", quality=92)
    print("Successfully generated composite:", out_png, "and", out_jpg)

if __name__ == "__main__":
    generate_lifestyle_hero()
