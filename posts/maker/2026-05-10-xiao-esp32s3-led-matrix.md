---
title: "[實作筆記] 用 XIAO ESP32S3 做 16×16 LED 中文跑馬燈，從 V1 到 V5 演進"
date: 2026-05-10T10:00:00+08:00
author: "Henry Chao"
cover: ""
categories: [esp32, electronics]
tags: [WS2812B, Arduino, 中文字型, ST7735, 雙核心]
repo: "xiao-esp32s3-led-matrix"
level: "⭐ 入門"
hours: "2–4 hrs"
excerpt: "256 顆 RGB LED、4 塊 8×8 面板拼成 16×16，從中文跑馬燈到貪吃蛇遊戲。這篇記錄完整 6 個版本的演進與踩過的坑。"
draft: false
---

## 為什麼想做這個？

過年前同事在科教館看到 LED 字幕機，問我：「這個能不能我們學生自己組？」我心想：「應該可以吧（？）」。

回家試了一下才發現——**LED 矩陣這種東西「自己組」跟「買成品」差超多**。買成品 200 元就有了，自己組要：

- 找 RGB LED（WS2812B 還是 SK6812？）
- 找驅動板（XIAO 還是 ESP32-CAM？）
- 找電源（5V 怎麼選？電流會跳超大）
- 寫驅動（FastLED 還是 NeoPixel？）
- 解決中文字型（ST7735 螢幕？字模？）

看起來很簡單的東西，做下去發現要懂的東西很多。**這正好是教學用的好題目**——學生可以從「買來組」開始，慢慢延伸到自己寫程式控制。

---

## 硬體選擇

### 為什麼選 XIAO ESP32S3 Sense？

- **小**（21×17.5 mm，比 50 元硬幣還小）
- **強**（ESP32-S3 雙核 240 MHz、8 MB Flash + 8 MB PSRAM）
- **內建相機**（V2 版本會用到）
- 約 NT$ 350，**便宜到學生組得起**

### 為什麼選 4 塊 8×8 面板拼 16×16？

直接買 16×16 整片要 NT$ 1000+，4 塊 8×8 拼起來 NT$ 600 左右。
更重要的是 — **學生會自己學到怎麼處理「面板拓撲」**（每塊面板的索引怎麼接續）。

### 接線（記錄一下，之後會忘）

```
XIAO ESP32S3      WS2812B 矩陣
─────────────     ─────────────
GPIO 1 (D0)  ───► DIN
GND          ───► GND

外部 5V 電源（這個重要！）
5V           ───► LED 5V
GND          ───► LED GND + XIAO GND（共地，也很重要）
```

⚠️ **不要用 XIAO 的 USB 5V 餵 LED**。256 顆全亮約 15 W，USB 給不了那麼多電流，會看到怪閃爍或直接 reset。

---

## 第一階段（V1 基礎版）：跑馬燈會跑就好

最簡單版本：WiFi AP + 一條跑馬燈 + 預設「新年快樂」字串。

```cpp
#include <FastLED.h>

#define LED_PIN     1
#define NUM_LEDS    256
CRGB leds[NUM_LEDS];

void setup() {
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(50);   // 不要全亮，會耀眼
}

void loop() {
  // ... 跑馬燈邏輯
}
```

第一版很快就跑起來，但**問題很多**：

1. **中文字怎麼來？** 用 u8g2 內建字型 (`u8g2_font_unifont_t_chinese1`)
2. **面板順序錯了**：最右邊那塊面板的字會反過來 → 寫了個 `getIndex(x, y)` 處理拓撲
3. **顏色看起來不對**：原來 WS2812B 有 GRB 不是 RGB（被坑過一次）

---

## 第二階段（V1-SD 版）：字型放 SD 卡

V1 把所有字型 baked 進 firmware，編譯一次燒一次。學生想換字型超麻煩。

**改進**：把字型放 SD 卡的 `HZK16` 檔，要換字型只要換 SD 卡裡的檔。

```cpp
File fontFile = SD.open("/HZK16");
fontFile.seek(offset);                // 算好的字模位置
fontFile.read(buffer, 32);             // 一個字 32 byte
```

這版我學到一件事：**SD 卡的 SPI 跟相機共用 PIN**（XIAO Sense 板載 SD），要小心不要打架。

---

## 第三階段（V2 完整版）：六種模式同時跑

V2 加了**相機**進來。既然 XIAO Sense 有相機，為什麼不利用？

最後做出 6 種模式：

| 模式 | 內容 | 控制方式 |
|------|------|---------|
| 跑馬燈 | 中文捲動 | 網頁輸入文字 |
| 相機 | 即時把相機畫面降解析度顯示在 LED | 自動 |
| 手勢辨識 | MediaPipe 手勢觸發特效 | 手勢 |
| 動態 Emoji | 一系列預存的 emoji 動畫 | 網頁選擇 |
| 互動畫布 | 用滑鼠在網頁上畫，即時顯示在 LED | 網頁 canvas |
| 貪吃蛇遊戲 | 經典貪食蛇 | 網頁方向鍵 |

雙核心架構是關鍵：
- **Core 0** 跑 WiFi + Web Server（處理使用者輸入）
- **Core 1** 專職 LED 更新（60 FPS）

如果單核做這兩件事，LED 會卡頓得很明顯。

---

## 第五階段（V5 Turbo 版）：Dual SPI 雙倍快

到 V4 時 LED 更新已經很順，但**相機 → LED 的 frame rate 還是不夠**（單 SPI 約 15 FPS）。

V5 用 Dual SPI 直接把 LED 更新 throughput 拉到接近 60 FPS。
這個 Turbo 模式是穩定版（之前 V4 有時候會 reset）。

> 講真的，學生用到 V5 的不多，**V2 已經夠好玩**。
> Turbo 是給有 maker 魂的同學自己玩的。

---

## 踩過的坑（給後來的人）

1. **PSRAM 一定要開**（Arduino IDE → Tools → PSRAM: OPI PSRAM）。不開會 OOM
2. **共地**：USB 5V 跟外部 5V GND 一定要接在一起
3. **電源線粗細**：256 顆 LED 全亮 15W = 3A @ 5V，杜邦線太細會壓降很大
4. **WS2812B 第一顆很常壞**：保險起見從第二顆開始用
5. **Arduino IDE 板子要選對**：Seeed XIAO ESP32S3，不是普通 ESP32-S3

---

## 後續可以延伸的方向

- 加上**麥克風頻譜分析**（XIAO Sense 內建 PDM mic）
- 教室天氣告示板（接 [taipei-dashboard](https://github.com/henrychao521/taipei-dashboard) API）
- 多顆組成更大牆面（同步用 ESP-NOW）

---

## 開源 + 文件

- 完整程式碼：[github.com/henrychao521/xiao-esp32s3-led-matrix](https://github.com/henrychao521/xiao-esp32s3-led-matrix)
- 6 個版本資料夾都在 repo 裡，可以對比著看演進
- 接線圖、字型轉檔工具也都附上

如果你想做出來，硬體大約 **NT$ 600**，**一個下午**就能跑起 V1。
試試看吧 🦦

---

> 這篇是「先寫出來再說」的實作筆記，有問題或踩到別的坑歡迎在 GitHub Issues 留言。
