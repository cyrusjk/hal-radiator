#!/usr/bin/env python3
"""
HAL 9000 Title Card Generator
==============================
Generates title cards matching the HAL 9000 computer display screens
from 2001: A Space Odyssey.

Based on frame-accurate research (The Age of Plastic, 9000-series repo):
  - Three-letter labels (HAL, DAV, COM, NAV, etc.):
      Microgramma Extended Bold / Eurostile Bold Extended (free OTF)

  - Sub-heading / telemetry text above the label:
      Rajdhani Light (Univers-like squared sans, Google Font)

Usage:
    uv run generate.py HAL 9000 COMPUTER                 # subheading above label
    uv run generate.py DAV "DAVID BOWMAN"                # custom subheading
    uv run generate.py POO "EVA POD" -p blue -o pod.png  # blue panel, custom path
    uv run generate.py --demo                            # sample set
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ── Paths ──────────────────────────────────────────────────────────────────
HERE = Path(__file__).parent
FONTS = HERE / "fonts"

MANIFOLD_PATH  = FONTS / "IBM Selectric Manifold.ttf"
BOLD_PATH      = FONTS / "Eurostile-Bold-Extended.otf"
SUBHEAD_PATH   = FONTS / "Rajdhani-Light.ttf"


# ── Canvas / Layout constants ──────────────────────────────────────────────
CARD_W = 800
CARD_H = 600
PAD    = 40        # gap from canvas edge to panel edge

# Kerning: extra pixels between characters
LABEL_KERN = 18    # wide spacing for the three-letter labels
SUB_KERN   = 6     # moderate tracking for the subheading

# Font-size ratios (relative to CARD_W)
LABEL_PT_RATIO = 0.17    # label ≈ 17% of canvas width
SUB_PT_RATIO   = 0.0425  # subheading ≈ 25% of label height (verified from ref images)


# ── Screen-accurate colour presets ───────────────────────────────────────────
# Sourced from reference images in ref_images/ — three-letter title
# cards from The HAL Project screensaver (the user's source video).
#
# Each labelled by the card it was sampled from:
#   blue_veh:  ( 51,  82, 163) — VEH panel
#   blue_flx:  ( 43,  71, 159) — FLX panel
#   blue_gde:  ( 54,  84, 164) — GDE panel
#   plum_com:  (123,  63,  99) — COM panel
#   plum_nav:  ( 91,  53, 103) — NAV panel
#   pink_lif:  (164,  33,  75) — LIF panel
#   red_atm:   (163,   0,  44) — ATM / DMG panel
#   teal_hib:  ( 10,  74,  66) — HIB panel
#   green_cnt: ( 71, 113,  78) — CNT panel
#   dkbl_mem:  ( 26,  61,  91) — MEM panel
#   navy_nuc:  ( 13,  22,  49) — NUC panel
#
# Text is always pure white — no tinting.
PANELS = {
    "blue":     {"bg": ( 51,  82, 163)},
    "plum":     {"bg": (123,  63,  99)},
    "purple":   {"bg": ( 91,  53, 103)},
    "pink":     {"bg": (164,  33,  75)},
    "red":      {"bg": (163,   0,  44)},
    "teal":     {"bg": ( 10,  74,  66)},
    "green":    {"bg": ( 71, 113,  78)},
    "dkblue":   {"bg": ( 26,  61,  91)},
    "navy":     {"bg": ( 13,  22,  49)},
    "amber":    {"bg": (227, 149,  30)},  # approximate — no amber card in refs yet
    "yellow":   {"bg": (240, 200,  40)},
    "orange":   {"bg": (216, 112,  24)},
    "cyan":     {"bg": ( 28,  80, 100)},
    "dark":     {"bg": ( 18,  18,  24)},
}

DEFAULT_PANEL = "amber"
TEXT_WHITE     = (255, 255, 255)


def load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    if not path.exists():
        raise FileNotFoundError(f"Font not found: {path}")
    return ImageFont.truetype(str(path), size)


def render_kerned_text(
    draw: ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    xy: tuple,
    kern: int = 0,
    fill: tuple = (255, 255, 255),
):
    """
    Draw text with per-character kerning.
    This gives us the wide-spaced look of Microgramma Extended Bold.
    """
    x, y = xy
    for ch in text:
        # Get bounding box of this single character
        bbox = font.getbbox(ch)
        ch_w = bbox[2] - bbox[0]
        draw.text((x, y), ch, font=font, fill=fill)
        x += ch_w + kern


def generate_card(
    three_letters: str,
    subheading: str = "",
    panel_style: str = DEFAULT_PANEL,
    *,
    output_path: str | None = None,
    show: bool = False,
) -> Image.Image:
    """
    Render a HAL 9000 display card.

    Layout (from film frames):
        ┌──────────────────────────────┐
        │                              │
        │        sub-heading           │   ← small, Manifold font
        │                              │
        │    H    A    L               │   ← large, widely kerned
        │                              │
        └──────────────────────────────┘
    """

    colours = PANELS.get(panel_style, PANELS[DEFAULT_PANEL])

    # ── Font sizes ─────────────────────────────────────────────────────
    label_pt = max(80, int(CARD_W * LABEL_PT_RATIO))
    sub_pt   = max(20, int(CARD_W * SUB_PT_RATIO))

    label_font = load_font(BOLD_PATH, label_pt)
    sub_font   = load_font(SUBHEAD_PATH, sub_pt)

    # ── Create canvas ──────────────────────────────────────────────────
    img = Image.new("RGB", (CARD_W, CARD_H), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── Panel bounds (sharp corners, no border) ─────────────────────────
    panel = (PAD, PAD, CARD_W - PAD, CARD_H - PAD)
    draw.rectangle(panel, fill=colours["bg"])

    px0, py0, px1, py1 = panel
    panel_cx = (px0 + px1) // 2
    panel_cy = (py0 + py1) // 2

    # ── Three-letter label (widely kerned) ─────────────────────────────
    label_text = three_letters.upper().strip()[:3]

    # Measure the full kerned width
    total_w = 0
    for ch in label_text:
        bbox = label_font.getbbox(ch)
        total_w += (bbox[2] - bbox[0]) + LABEL_KERN
    total_w -= LABEL_KERN  # remove trailing kern
    label_x = panel_cx - total_w // 2

    # ── Vertical centering ──────────────────────────────────────────────
    # Centre the combined block (subheading + gap + label) as a unit.
    # Pillow's draw.text((x, y), ...) places the font baseline at y.
    # getbbox returns offsets from that baseline: (left, top, right, bottom)
    # where top is how far above the baseline the glyph extends
    # and bottom is how far below.
    ch_bbox = label_font.getbbox("H")
    label_top  = ch_bbox[1]
    label_bot  = ch_bbox[3]
    label_vis_h = label_bot - label_top  # visual pixel height of glyph

    if subheading:
        sub_text = subheading.upper().strip()
        sub_bbox = sub_font.getbbox(sub_text)
        sub_top = sub_bbox[1]
        sub_bot = sub_bbox[3]
        sub_vis_h = sub_bot - sub_top  # natural visual height
        gap = max(6, int(label_vis_h * 0.30))
        block_h = sub_vis_h + gap + label_vis_h
    else:
        block_h = label_vis_h

    # Centre the visual block vertically within the panel
    block_visual_top = panel_cy - block_h // 2

    if subheading:
        # Subheading baseline so its visual top aligns with block_visual_top
        sub_baseline = block_visual_top - sub_top
        # Label baseline so its visual top aligns below the subheading + gap
        label_baseline = block_visual_top + sub_vis_h + gap - label_top
        sub_x = label_x  # left-aligned with first letter
    else:
        label_baseline = block_visual_top - label_top

    render_kerned_text(
        draw, label_text, label_font,
        xy=(label_x, label_baseline),
        kern=LABEL_KERN,
        fill=TEXT_WHITE,
    )

    # ── Sub-heading (above the label, left-aligned) ─────────────────────
    if subheading:
        render_kerned_text(
            draw, sub_text, sub_font,
            xy=(sub_x, sub_baseline),
            kern=SUB_KERN,
            fill=TEXT_WHITE,
        )

    # ── Save ───────────────────────────────────────────────────────────
    if output_path:
        img.save(output_path, "PNG")
        print(f"  ✓  Saved → {output_path}")

    if show:
        img.show()

    return img


def demo():
    """Generate a set of sample cards to demonstrate the tool."""
    out = HERE / "output"
    out.mkdir(exist_ok=True)

    examples = [
        ("VEH",  "LIN: 86-QW",         "blue"),
        ("COM",  "PMT: 26-07",         "plum"),
        ("NAV",  "RTE: 09-EF",         "purple"),
        ("LIF",  "ATA: 81-08",         "pink"),
        ("ATM",  "MRN: 80-EJ",         "red"),
        ("HIB",  "STA: 35-05",         "teal"),
        ("CNT",  "VER: 60-KJ",         "green"),
        ("MEM",  "PMT: 49-XB",         "dkblue"),
        ("NUC",  "AQS: 64-VN",         "navy"),
        ("FLX",  "ATA: 48-12",         "blue"),
        ("GDE",  "LIF: 13-AQ",         "blue"),
        ("DMG",  "GPM: 72-KC",         "red"),
        ("HAL",  "9000 COMPUTER",      "amber"),
        ("DAV",  "DAVID BOWMAN",       "amber"),
        ("FRA",  "FRANK POOLE",        "amber"),
        ("POO",  "EVA POD",            "blue"),
        ("ERR",  "SYSTEM MALFUNCTION", "red"),
    ]
    for letters, sub, panel in examples:
        stem = f"{letters.lower()}_{panel}"
        path = out / f"{stem}.png"
        print(f"  → {letters:3s}  {sub:20s}  [{panel}]")
        generate_card(letters, sub, panel, output_path=str(path))

    print(f"\n  ✦  {len(examples)} cards written to {out}/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="HAL 9000 Title Card Generator",
    )
    parser.add_argument("letters", nargs="?",
                        help="Three-letter label (e.g. HAL)")
    parser.add_argument("subheading", nargs="?", default="",
                        help="Text displayed above the three-letter label")
    parser.add_argument("-o", "--out", default=None,
                        help="Output PNG path")
    parser.add_argument("-p", "--panel", default=DEFAULT_PANEL,
                        choices=list(PANELS),
                        help=f"Panel colour (default: {DEFAULT_PANEL})")
    parser.add_argument("--demo", action="store_true",
                        help="Generate example cards and exit")
    parser.add_argument("--show", action="store_true",
                        help="Display the image on screen after generation")

    args = parser.parse_args()

    if args.demo:
        demo()
    elif not args.letters:
        parser.print_help()
    else:
        name = args.out or f"{args.letters.lower()}_{args.panel}.png"
        generate_card(args.letters, args.subheading, args.panel,
                      output_path=name, show=args.show)
