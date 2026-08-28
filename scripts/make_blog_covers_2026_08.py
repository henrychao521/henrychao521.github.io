#!/usr/bin/env python3
"""產 2026-08 這批專案文章的封面示意圖（900×300 SVG，亮色 slate 系）。

沿用站上既有封面的規格：頂部標題、下方三格重點、右下角一句結論。
用一支腳本產出而不是各畫各的，是為了讓同一批文章看起來像同一批。
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets/blog"

# name, 標題, 副標, [(大字, 小字) ×3], 結論句
COVERS = [
    ("diagram-servo-arm", "五種致動器，同一支手臂",
     "servo-arm ｜ 從沒有回授到力矩回授",
     [("5", "種致動器"), ("567", "項驗證"), ("65", "項失敗紀錄")],
     "「它知道自己在哪裡嗎?」"),
    ("diagram-mesh-rebuild", "我改了兩星期程式",
     "最後發現是模組壞了",
     [("3", "次對照實驗"), ("0", "位元組（接反）"), ("1", "個信箱先到先拿")],
     "先懷疑硬體，不要只懷疑程式"),
    ("diagram-gw-esp32", "任天堂掌機的第二人生",
     "Game & Watch × ESP32 硬體逆向",
     [("21", "支空閒腳位"), ("5", "個測試點定案"), ("1.8V", "不可直接接 3.3V")],
     "數腳位不能看封裝凹點"),
    ("diagram-pibook-audio", "讓監控主機學會聽",
     "錄音 → 逐字稿 → 聲音事件 → 影像交叉驗證",
     [("0.26x", "樹莓派即時率"), ("12→2.3", "分工後負載"), ("83%", "判定來自別的房間")],
     "把每件事放在它該待的地方"),
    ("diagram-pi5-pocket", "口袋裡的 AI 工作站",
     "Raspberry Pi 5 ｜ 插電即用",
     [("63", "秒自動回線"), ("3", "版才穩定"), ("0x0", "零欠壓")],
     "軟體查不出的問題，往往在硬體"),
    ("diagram-livingtech-b", "把整本教科書跑一次",
     "生活科技乙版 ｜ 互動學習平台",
     [("24", "節全上線"), ("89", "個互動模組"), ("366", "題題庫")],
     "757 位在線——那個數字是假的"),
    ("diagram-st-node", "藏在原始碼裡的資料庫",
     "兩學年度學習節點交叉分析",
     [("286", "代號相同"), ("169", "被重新編號"), ("39/28", "新增／移除")],
     "改識別碼比改內容危險"),
    ("diagram-ambient-notes-2", "拿模型潤稿，改壞的比較多",
     "語音逐字稿 Part 2 ｜ 拼音約束校正",
     [("22", "句對抗測試"), ("11", "筆誤聽配對"), ("2", "層權限設計")],
     "分不出來時，降級成建議"),
]

TPL = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 300" width="900" height="300"
     role="img" aria-label="{title}｜{sub}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#eef2f7"/>
    </linearGradient>
  </defs>
  <rect width="900" height="300" fill="url(#g)"/>
  <rect x="0" y="0" width="6" height="300" fill="#b45309"/>
  <text x="38" y="62" font-family="'Helvetica Neue',Arial,sans-serif" font-size="27"
        font-weight="700" fill="#0f172a">{title}</text>
  <text x="38" y="90" font-family="'Helvetica Neue',Arial,sans-serif" font-size="14"
        fill="#64748b">{sub}</text>
  <line x1="38" y1="112" x2="862" y2="112" stroke="#cbd5e1" stroke-width="1"/>
{cells}
  <rect x="38" y="228" width="824" height="44" rx="8" fill="#fff7ed" stroke="#fdba74"/>
  <text x="58" y="256" font-family="'Helvetica Neue',Arial,sans-serif" font-size="15"
        fill="#9a3412">{concl}</text>
</svg>
'''

CELL = '''  <rect x="{x}" y="134" width="264" height="76" rx="8" fill="#fff" stroke="#cbd5e1"/>
  <text x="{tx}" y="174" font-family="'Helvetica Neue',Arial,sans-serif" font-size="30"
        font-weight="700" fill="#0f172a" text-anchor="middle">{big}</text>
  <text x="{tx}" y="196" font-family="'Helvetica Neue',Arial,sans-serif" font-size="12.5"
        fill="#64748b" text-anchor="middle">{small}</text>
'''


def esc(t):
    """SVG 是 XML：& < > 一定要轉義，否則整張圖解析失敗（畫面上是破圖，不會報錯）。"""
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, title, sub, cells, concl in COVERS:
        title, sub, concl = esc(title), esc(sub), esc(concl)
        cells = [(esc(b), esc(sm)) for b, sm in cells]
        cs = ""
        for i, (big, small) in enumerate(cells):
            x = 38 + i * 276
            cs += CELL.format(x=x, tx=x + 132, big=big, small=small)
        svg = TPL.format(title=title, sub=sub, cells=cs, concl=concl)
        (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")
        print(f"  ✓ {name}.svg")


if __name__ == "__main__":
    build()
