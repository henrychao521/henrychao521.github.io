#!/usr/bin/env python3
"""產 2026-08 這批專案文章的封面 —— 用「真實素材」而不是套版示意圖。

第一版是同一個模板套 9 次（標題＋三格數字＋一句結論），列表頁看起來每張都一樣。
改成每篇都用該專案自己的東西：實機照片、CAD 渲染、平台操作畫面、還原後的網頁。

卡片渲染條件（articles.html）：`h-28 object-contain bg-slate-50`
→ 固定高 112px、整張圖塞進去不裁切。所以**輸出一律裁成 3:1**，才不會上下留白一大塊。
"""
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/blog"
W, H = 900, 300                      # 3:1，貼合卡片的 112px 高度帶

SHOT = Path("/Volumes/Work/本月專案分享片_2026-08/screenshots")
ARM = Path.home() / "site-hc/servo-arm/renders"
GW = Path("/Volumes/Work/gw-esp32-project/img")
PIC = Path("/Volumes/Work/專案圖片_2026-07")
STN = Path("/Volumes/Work/st-node-sites")

# name → (來源, 取景重心 0~1，1.0=底部, 說明)
#   focus 用來決定裁切時保留哪一段：截圖多半上半部才是重點，照片則常在中間。
COVERS = {
    # servo-arm 的渲染圖主體都是直立的手臂，單張裁 3:1 會把手臂攔腰切掉
    # → 改成把三個視角併成一條（見 STRIPS）
    "cover-mesh-rebuild":    (PIC / "mesh-meshtastic/IMG_1554.HEIC",  0.55, "隨身節點實機：Heltec 主板＋GPS＋接線"),
    "cover-gw-esp32":        (GW / "fig_sideA.jpg",                   0.50, "Game & Watch 主板實照（標註版）"),
    "cover-pibook-audio":    (SHOT / "pibook_dashboard_nopeople.png", 0.30, "監控主機儀表板（已裁掉含人物那格）"),
    "cover-pi5-pocket":      (SHOT / "pi5_remote_control.png",        0.40, "遠端控制連線畫面（此專案無實機照）"),
    # 三棟建築在完整截圖的 y≈860–1280，用明確裁切框比 focus 準
    "cover-livingtech-b":    (SHOT / "livingtechb_seismic.png",  (0, 860, 1280, 1287),
                              "抗震三種結構並排模擬（平台實畫面）"),
    "cover-st-node":         (SHOT / "stnode_embed.png",              0.30, "還原後的節點統計應用"),
    "cover-ambient-notes-2": (SHOT / "ambientnotes_player.png",       0.25, "波形檢視：聲音事件時間軸"),
}

# 直立主體的專案：併成三格條帶，每格各自裁到主體
STRIPS = [
    ("cover-servo-arm",
     [ARM / "asm_20260729T052308Z.png", ARM / "asm_front_20260729T052327Z.png",
      ARM / "v1_v2_montage.png"],
     [None, None, None],
     "手臂三個視角：等角、正視、v1/v2 對照"),
]

# 月報總覽是 hub，用三張代表畫面併成一條
MONTAGE = ("cover-2026-08-monthly", [
    ARM / "asm_20260729T052308Z.png",
    PIC / "mesh-meshtastic/IMG_1554.HEIC",
    SHOT / "livingtechb_seismic.png",
], "月報總覽：三條線的代表畫面")


def load(p: Path) -> Image.Image:
    """HEIC 用 sips 轉檔（PIL 讀不了）。"""
    if p.suffix.lower() == ".heic":
        tmp = Path(tempfile.mkdtemp()) / (p.stem + ".jpg")
        subprocess.run(["sips", "-s", "format", "jpeg", str(p), "--out", str(tmp)],
                       capture_output=True, check=True)
        p = tmp
    return Image.open(p).convert("RGB")


def crop_to(im: Image.Image, w: int, h: int, focus: float = 0.5) -> Image.Image:
    """等比放大到蓋滿，再依 focus 取一條橫幅。"""
    s = max(w / im.width, h / im.height)
    im = im.resize((max(w, int(im.width * s)), max(h, int(im.height * s))), Image.LANCZOS)
    top = int((im.height - h) * min(max(focus, 0), 1))
    left = (im.width - w) // 2
    return im.crop((left, top, left + w, top + h))


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (src, focus, desc) in COVERS.items():
        if not src.exists():
            print(f"  ✗ 來源不存在：{src}")
            continue
        im = load(src)
        if isinstance(focus, tuple):          # 明確裁切框（x1,y1,x2,y2）再縮到 3:1
            im = im.crop(focus).resize((W, H), Image.LANCZOS)
        else:
            im = crop_to(im, W, H, focus)
        im.save(OUT / f"{name}.jpg", quality=86, optimize=True)
        print(f"  ✓ {name}.jpg  ← {desc}")

    for name, srcs, boxes, desc in STRIPS:
        gap, cw = 6, (W - 2 * 6) // 3
        canvas = Image.new("RGB", (W, H), (248, 250, 252))
        for i, (s_, b) in enumerate(zip(srcs, boxes)):
            im = load(s_)
            im = im.crop(b) if b else im
            canvas.paste(crop_to(im, cw, H, 0.5), (i * (cw + gap), 0))
        canvas.save(OUT / f"{name}.jpg", quality=86, optimize=True)
        print(f"  ✓ {name}.jpg  ← {desc}")

    name, srcs, desc = MONTAGE
    gap, cw = 6, (W - 2 * 6) // 3
    canvas = Image.new("RGB", (W, H), (241, 245, 249))
    for i, s in enumerate(srcs):
        canvas.paste(crop_to(load(s), cw, H, 0.45), (i * (cw + gap), 0))
    canvas.save(OUT / f"{name}.jpg", quality=86, optimize=True)
    print(f"  ✓ {name}.jpg  ← {desc}")


if __name__ == "__main__":
    build()
