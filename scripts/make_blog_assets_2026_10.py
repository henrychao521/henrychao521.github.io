#!/usr/bin/env python3
"""2026-10 兩篇專案手記（喵步鬧鐘、ESP32 計步器）的封面與內文圖。
來源是已發在 livingtech.education 的文章包圖片；封面 900×300（3:1，列表頁固定高度），
內文圖依顯示寬（約 720px）×2 縮到最寬 1440、轉 WebP，單頁圖片總量壓在 600 KB 內。"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/blog"
MEOW = Path("/Volumes/Work/原站文章包_2026-10_喵步鬧鐘/images")
PED = Path("/Volumes/Work/原站文章包_2026-10_計步器/images")

def cover(src, name, focus):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    ch = round(w / 3)
    if ch > h:                                   # 太扁：改裁寬度
        cw = h * 3; x = (w - cw) // 2; im = im.crop((x, 0, x + cw, h))
    else:
        y = int((h - ch) * focus); im = im.crop((0, y, w, y + ch))
    im.resize((900, 300), Image.LANCZOS).save(OUT / f"{name}.jpg", quality=82, optimize=True)

def body(src, name, width=1440, q=78):
    im = Image.open(src).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=q, method=6)

cover(MEOW / "01_App畫面總覽.jpg", "cover-nyanpo-alarm", 0.0)
cover(PED / "02_重製版通電測試.jpg", "cover-pedometer-lab", 0.42)
for src, name in [(MEOW / "01_App畫面總覽.jpg", "nyanpo-screens"), (MEOW / "03_上架流程圖.jpg", "nyanpo-publish-flow"),
                  (MEOW / "05_實機效能.png", "nyanpo-device-perf"),
                  (PED / "03_瀏覽器模擬器.jpg", "pedometer-simulator"), (PED / "05_自相關找步伐週期.png", "pedometer-autocorr"),
                  (PED / "06_計步演算法三版比較.png", "pedometer-algo-compare"), (PED / "07_CPU活動比例.png", "pedometer-cpu")]:
    body(src, name)
for f in sorted(OUT.glob("*nyanpo*")) + sorted(OUT.glob("*pedometer*")):
    print(f"{f.name:32s} {f.stat().st_size // 1024:4d} KB  {Image.open(f).size}")
