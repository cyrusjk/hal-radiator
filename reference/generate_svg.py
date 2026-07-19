#!/usr/bin/env python3
"""
HAL 9000 Title Card Generator — SVG edition
============================================
Uses SVG's native letter-spacing for clean text positioning.
Subheading compression via vector scale(1, scale_y).

Open .svg files in a browser to see correct rendering.
"""

import argparse
import xml.etree.ElementTree as ET
from pathlib import Path

from generate import PANELS, DEFAULT_PANEL, TEXT_WHITE

HERE = Path(__file__).parent
OUT = HERE / "output_svg"
OUT.mkdir(exist_ok=True)

# ── Canvas — increased for wide-spaced letters ────────────────────────────
CARD_W = 1000
CARD_H = 750
PANEL_PAD = 50     # panel padding from edge
LABEL_PT     = 68      # halved from 136
SUB_PT       = 15      # halved from 30
LABEL_KERN   = 40      # halved proportionally (was 80 for 136pt)
SUB_KERN     = -1      # halved (was -2)
SUB_SCALE_Y  = 0.40    # unchanged
SUB_SCALE_X  = 1.0     # unchanged
LABEL_SCALE_X = 0.90   # unchanged
LABEL_SCALE_Y = 1.0    # unchanged

# Pixel-based character widths for centering (halved for 68pt font)
SVG_CHAR_W = {k: int(v/2) for k,v in {'A':147,'B':141,'C':130,'D':147,'E':120,'F':119,'G':141,'H':140,
              'I':79,'J':127,'K':136,'L':130,'M':164,'N':147,'O':147,'P':130,
              'Q':147,'R':136,'S':133,'T':141,'U':147,'V':159,'W':186,'X':141,
              'Y':141,'Z':133}.items()}

# Measured font metrics (positioning values — NOT scaled with font size)
LABEL_VIS_H  = 96
LABEL_BOT_OFF = 130
SUB_VIS_H_NAT = 22     # Rajdhani Light at 30pt

# Panel colours — updated from video reference frame at 6:40
# Blue panel in video: RGB(45, 78, 161)
PANELS_UPDATED = dict(PANELS)
PANELS_UPDATED["blue"] = {"bg": (45, 78, 161)}


def make_svg(letters, subheading="", panel_style=DEFAULT_PANEL):
    colour = PANELS_UPDATED.get(panel_style, PANELS_UPDATED[DEFAULT_PANEL])["bg"]
    bg_hex, fg_hex = f"rgb{colour}", f"rgb{TEXT_WHITE}"

    # Embedded @font-face using file URLs
    font_css = """
@font-face { font-family: 'EurostileLocal'; src: url('file:///C:/Users/micro/AppData/Local/Microsoft/Windows/Fonts/Eurostile-Bold-Extended.otf') format('opentype'); }
@font-face { font-family: 'RajdhaniLightLocal'; src: url('file:///C:/Users/micro/AppData/Local/Microsoft/Windows/Fonts/Rajdhani-Light.ttf') format('truetype'); }
"""

    svg = ET.Element("svg", {"xmlns":"http://www.w3.org/2000/svg",
                             "width":str(CARD_W),"height":str(CARD_H),
                             "viewBox":f"0 0 {CARD_W} {CARD_H}"})
    style = ET.SubElement(svg, "style")
    style.text = font_css
    ET.SubElement(svg,"rect",{"x":"0","y":"0","width":str(CARD_W),"height":str(CARD_H),"fill":"black"})
    ET.SubElement(svg,"rect",{"x":str(PANEL_PAD),"y":str(PANEL_PAD),
        "width":str(CARD_W-2*PANEL_PAD),"height":str(CARD_H-2*PANEL_PAD),"fill":bg_hex})

    cx, cy = CARD_W//2, CARD_H//2
    label_text = letters.upper().strip()[:3]

    # ── Width & positioning ────────────────────────────────────────────
    total_w = int((sum(SVG_CHAR_W.get(ch,130) for ch in label_text) + LABEL_KERN*(len(label_text)-1)) / LABEL_SCALE_X)
    label_vis_compressed = int(LABEL_VIS_H * LABEL_SCALE_Y)

    if subheading:
        sub_text = subheading.upper().strip()
        sub_vis_h = int(SUB_VIS_H_NAT * SUB_SCALE_Y)
        gap = max(6, int(LABEL_VIS_H * 0.30))
        block_h = sub_vis_h + gap + label_vis_compressed
    else:
        block_h = label_vis_compressed

    block_top = cy - block_h//2

    if subheading:
        label_baseline = block_top + sub_vis_h + gap + LABEL_BOT_OFF
        sub_baseline   = block_top - sub_vis_h * 2  # moved up more
    else:
        label_baseline = block_top + LABEL_BOT_OFF

    # ── Label (scale X to narrow chars, text-anchor for centering) ─────
    # Viewport width with X-scale applied
    viewport_label_w = int(sum(SVG_CHAR_W.get(ch,130) for ch in label_text) * LABEL_SCALE_X + LABEL_KERN * (len(label_text) - 1))
    sub_x = cx - viewport_label_w // 2 - 135  # shifted left (matched to SPA)

    CENTER_OFFSET = 48  # empirical: shift right for text-anchor + letter-spacing in scaled group
    lg = ET.SubElement(svg,"g",{
        "transform":f"translate({cx + CENTER_OFFSET}, {label_baseline}) scale({LABEL_SCALE_X}, {LABEL_SCALE_Y})"})
    lbl_ls = int(LABEL_KERN / LABEL_SCALE_X)  # compensate letter-spacing for X scale
    lbl = ET.SubElement(lg,"text",{"x":"0","y":"0","text-anchor":"middle",
        "fill":fg_hex,"font-family":"EurostileLocal, Eurostile, Microgramma, 'Arial Black', sans-serif",
        "font-size":str(int(LABEL_PT * 1.333)),"font-weight":"bold",
        "letter-spacing":str(lbl_ls),"text-rendering":"optimizeLegibility"})
    lbl.text = label_text

    # ── Subheading (scaled for compression) ────────────────────────────
    if subheading:
        sg = ET.SubElement(svg,"g",{
            "transform":f"translate({sub_x}, {sub_baseline}) scale({SUB_SCALE_X}, {SUB_SCALE_Y})"})
        sub_fs = int(SUB_PT * 1.333 / SUB_SCALE_Y)
        sub_ls = int(SUB_KERN / SUB_SCALE_Y)
        sel = ET.SubElement(sg,"text",{"x":"0","y":"0",
            "fill":fg_hex,
            "font-family":"RajdhaniLightLocal, Rajdhani, Univers, Arial, sans-serif",
            "font-size":str(sub_fs),
            "letter-spacing":str(sub_ls),
            "text-rendering":"optimizeLegibility"})
        sel.text = sub_text

    return ET.tostring(svg, encoding="unicode")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HAL 9000 Title Card Generator (SVG)")
    parser.add_argument("letters", nargs="?", help="Three-letter label")
    parser.add_argument("subheading", nargs="?", default="")
    parser.add_argument("-o","--out", default=None)
    parser.add_argument("-p","--panel", default=DEFAULT_PANEL, choices=list(PANELS))
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()

    examples = [
        ("VEH","LIN: 86-QW","blue"),("COM","PMT: 26-07","plum"),("NAV","RTE: 09-EF","purple"),
        ("LIF","ATA: 81-08","pink"),("ATM","MRN: 80-EJ","red"),("HIB","STA: 35-05","teal"),
        ("CNT","VER: 60-KJ","green"),("MEM","PMT: 49-XB","dkblue"),("NUC","AQS: 64-VN","navy"),
        ("FLX","ATA: 48-12","blue"),("GDE","LIF: 13-AQ","blue"),("DMG","GPM: 72-KC","red"),
        ("HAL","9000 COMPUTER","amber"),("DAV","DAVID BOWMAN","amber"),("FRA","FRANK POOLE","amber"),
        ("POO","EVA POD","blue"),("ERR","SYSTEM MALFUNCTION","red"),
    ]

    if args.demo:
        for l, s, p in examples:
            stem = f"{l.lower()}_{p}"
            OUT.joinpath(f"{stem}.svg").write_text(
                '<?xml version="1.0" encoding="UTF-8"?>\n' + make_svg(l, s, p))
            print(f"  ✓ {stem}.svg")
    elif args.letters:
        stem = args.out or f"{args.letters.lower()}_{args.panel}"
        OUT.joinpath(f"{stem}.svg").write_text(
            '<?xml version="1.0" encoding="UTF-8"?>\n' + make_svg(args.letters, args.subheading, args.panel))
        print(f"  ✓ {OUT/stem}.svg")
    else:
        parser.print_help()
