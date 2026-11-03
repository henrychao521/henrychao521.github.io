#!/usr/bin/env python3
"""2026-11 專案手記（Kindle 電子紙看板）的封面、內文圖與讀者套件。
來源是 kindlehack 專案（/Volumes/Work/kindle-dashboard）的 docs/img（截圖已遮掉家中區網 IP）；
封面 900×300（3:1），內文圖依顯示寬（約 720px）×2 縮到最寬 1440、轉 WebP，單頁圖片總量壓在 600 KB 內。"""
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/blog"
SRC = Path("/Volumes/Work/kindle-dashboard/docs/img")
KIT = Path("/Volumes/Work/kindle-dashboard/dist/kindlehack-kit.zip")

def cover(src, name, top):
    im = Image.open(src).convert("RGB")
    w = im.width; ch = round(w / 3)
    im.crop((0, top, w, top + ch)).resize((900, 300), Image.LANCZOS).save(OUT / f"{name}.jpg", quality=82, optimize=True)

def body(src, name, width=1440, q=80):
    im = Image.open(src).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=q, method=6)

cover(SRC / "kindle_landscape.png", "cover-kindle-dashboard", 589)   # 三天預報＋底部動畫
for src, name, w in [("kindle_landscape.png", "kindle-dashboard-live", 1440), ("jojo_actions.png", "kindle-jojo-actions", 1200),
                     ("sky_tests.png", "kindle-sky-tests", 1440), ("kindle_portrait.png", "kindle-portrait-v1", 720),
                     ("web_settings_mobile.png", "kindle-web-settings", 750)]:
    body(SRC / src, name, w)
shutil.copy2(KIT, ROOT / "assets/downloads/kindlehack-kit.zip")
total = 0
for f in sorted(OUT.glob("*kindle*")):
    total += f.stat().st_size; print(f"{f.name:32s} {f.stat().st_size // 1024:4d} KB  {Image.open(f).size}")
print(f"圖片合計 {total // 1024} KB；套件 {(ROOT / 'assets/downloads/kindlehack-kit.zip').stat().st_size // 1024} KB")
