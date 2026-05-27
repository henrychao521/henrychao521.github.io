---
title: "[專案紀錄] 握筆姿勢分析系統的三代演進 — 從 OpenCV 視窗到 WebRTC 全端"
date: 2026-05-27T11:00:00+08:00
author: "Henry Chao"
cover: ""
categories: [vision, ai, teaching]
tags: [MediaPipe, YOLOv8, FastAPI, WebRTC, aiortc, React]
repo: "grip-system"
level: "⭐⭐⭐ 進階"
hours: "完整版需 6–10 hrs;最小可跑版 1 hr"
excerpt: "從 cv2.imshow 桌面視窗到 FastAPI + React + 自寫 aiortc 的三代架構演進紀錄,涵蓋硬幣絕對校正、WebRTC 自主實作與 2026/05 新增的教學文件套件。"
draft: false
---

## 起點:握筆姿勢這件事為什麼難教?

生活科技課堂上經常被問到的問題是:「老師,這個字寫得不漂亮怎麼辦?」

字體不佳的成因有許多,而**握筆姿勢不正確**是其中最常見的一項。
標準握筆方式為「**三指輕扣,筆尖距離指尖約 1.5–2 cm**」。
然而口頭糾正的長期效果通常有限,學生往往難以自覺地維持正確姿勢。

考量到**即時視覺回饋**在運動學習領域已被證實能顯著提升動作矯正效率,
本專案嘗試以電腦視覺技術建立一套課堂可用的即時握筆姿勢回饋系統。

於是 grip-system 專案啟動。

---

## 第一代:桌面 OpenCV 視窗(2026/01)

初版以最小可行原則(MVP)為目標:

```python
import cv2
import mediapipe as mp
from ultralytics import YOLO

cap = cv2.VideoCapture(0)
hands = mp.solutions.hands.Hands()
yolo = YOLO('pen_v2.pt')   # 自行訓練的筆尖偵測模型

while True:
    ret, frame = cap.read()
    # MediaPipe 偵測手部 21 點
    # YOLO 偵測筆尖
    # 計算指尖到筆尖距離
    cv2.imshow('Grip', frame)
```

**首要技術問題:像素距離如何轉換為公分?**

學生距離鏡頭 30 cm 與 50 cm 時,畫面上的筆尖大小差異甚大。
若無絕對長度校正,演算法只能輸出相對距離,無法給出「2 cm」這類具教學意義的判讀。

**解法**:於畫面中放置一枚 **NT$10 硬幣(直徑 26 mm)**,
透過 HoughCircles 偵測硬幣輪廓,即可推算「畫面 1 pixel = ? mm」的縮放比例。

> 本方案的優點在於零客製化成本 ——
> 多數學生隨身都有 10 元硬幣,不需額外採購校正物件。

V1 已可運行,但仍有以下限制:
- 僅能本機執行(每位學生需自行安裝 Python + MediaPipe 環境)
- 缺乏資料記錄機制
- 教師端僅有單一視窗,難以支援多人同時使用

---

## 第二代:Flask 網頁版(2026/02)

將 V1 包裝為 Flask 應用,以 MJPEG 串流輸出畫面:

```python
@app.route('/video')
def video():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
```

學生透過瀏覽器連線至教師電腦 IP 即可觀看畫面。
此版改善了部署門檻,但仍存在以下問題:

- MJPEG 延遲約 500–800 ms,互動性不足
- 多人連線時共享同一畫面源,無法各別顯示個人分析結果
- 缺乏使用者帳號系統

期間亦評估過 Gradio 與 Streamlit-WebRTC 兩種替代方案:
- **Gradio**:開發效率最高,但 webcam 串流體驗不穩定
- **Streamlit-WebRTC**:延遲表現佳,但 Safari 相容性不一,且需自行架設 TURN server

評估後判斷:**若要長期作為教學工具,必須自主實作 WebRTC 管線**。

---

## 第三代:FastAPI + React + aiortc(2026/04 — 現役)

第三代採取重新設計的策略:

```
grip_system/
├── grip_core/              # 視覺核心(Mac/Pi 共用,無框架依賴)
│   ├── stabilizer.py       # EMA 訊號穩定
│   ├── skeleton.py         # MediaPipe Hand 包裝
│   ├── coin_detector.py    # NT$10 硬幣校正
│   ├── pen_detector.py     # YOLOv8 pen_v2.pt
│   └── pipeline.py         # 端對端組合
├── backend/                # FastAPI + aiortc
│   ├── auth.py             # JWT / 訪客 session
│   ├── webrtc.py           # 自寫 aiortc 視訊通道
│   └── routes/
└── frontend/               # React + TS + Vite + Tailwind
    └── src/pages/
        ├── Entry.tsx       # 登入 / 訪客
        ├── Calibration.tsx # 硬幣校正
        └── Analysis.tsx    # 即時分析
```

### 為什麼分離 `grip_core/` 模組?

本專案最重要的架構決策是將視覺邏輯抽離為「無框架依賴」的 core 套件,
原因有二:

- 同一份 core 可同時支援 **Mac 開發環境**(webcam)與 **Pi 部署環境**(樹莓派 cam)
- 同一份 core 可被 **FastAPI、Flask、桌面 app、Telegram bot** 等任一介面整合

此設計也是後續規劃中「[抽出 henry-vision-core SDK](/projects.html?theme=education)」的原型基礎。

### 為何選擇自寫 WebRTC?

`streamlit-webrtc` 等高階包裝雖然開發效率高,但內部行為較難掌握 ——
當特定瀏覽器或網路環境出現問題時,debug 路徑不夠透明。
**自寫 aiortc** 雖然開發成本較高,但能完全掌握每一段資料流向:

```python
@app.post("/webrtc/offer")
async def offer(payload: Offer):
    pc = RTCPeerConnection()
    pc.addTransceiver("video", direction="recvonly")

    @pc.on("track")
    async def on_track(track):
        # 接收學生瀏覽器送出的 webcam 串流
        # 經 grip_core.pipeline 處理
        # 處理後 frame 回傳給瀏覽器
        ...
```

**延遲降至 80–150 ms**(MJPEG 為 500–800 ms),互動體驗有質的提升。

---

## 三步驟流程(使用者視角)

1. **入口** — 建立個人檔案 / 登入 / 訪客模式
2. **硬幣校正** — 持 10 元硬幣以慣用手握住入鏡,系統自動採樣 ≥ 5 次後寫入個人尺寸
3. **即時分析** — WebRTC 串流即時顯示握筆狀態,任一手指距筆尖 < 2.0 cm 即觸發錯誤判定

---

## 教學成效(一學期使用)

學期初與學期末的正確握筆比例對照:

| 班級 | 學期初 | 學期末 |
|------|--------|--------|
| 二A | 38% | 71% |
| 二B | 44% | 76% |
| 二C | 31% | 65% |

成效明顯優於單純口頭糾正。
學生對「與系統即時互動」的接受度高,主動驗證自身握筆姿勢的頻率亦顯著上升。

---

## 教學文件套件(2026/05 新增)

為了讓系統能更廣泛地被其他教師採用,2026/05 期間新增了一套完整的教學文件:

- **`docs/MINI_GUIDE.md`** — 給學生閱讀的系統說明,以淺顯文字介紹原理與操作流程
- **`docs/MINI_GUIDE_PRO.md`** — 教師導覽版(約 10,000 字 + 30 頁 PDF),涵蓋技術原理、教學設計建議與課堂操作範例
- **中英雙語 PDF Handouts** + **reveal.js HTML 投影片** — 適合研習場合的對外教材
- **PPTX 範本(25 張投影片)** — 可直接拿來介紹專案的教學簡報

另外新增 **`docs/mini_codepen.html`** —
由 `frontend/src/pages/Mini.tsx` v1.9.0 改寫的 vanilla JS + Tailwind Play CDN 單檔離線版。
特色如下:

- 完全離線執行,無後端依賴(已移除 React/Vite/API)
- `gripClassifyJS` 與 `LandmarksSmoother` 邏輯直接 inline
- 雙擊檔案即可在瀏覽器執行(需授予攝影機權限)
- 可貼至 CodePen 直接展示

本檔案的設計考量是降低教師 demo 與學生體驗的環境門檻 ——
不需架設 React 開發環境,亦可在任何瀏覽器中體驗握筆練習功能。

---

## 後續延伸方向

1. 將視覺邏輯抽出為 [henry-vision-core](/projects.html?theme=education) 套件
2. 整合 [學生學習歷程平台](https://github.com/henrychao521/student-portfolio-v3) 以提供長期練習紀錄
3. 投稿教學研討會(CHI / IEEE TLT / ICCE)

---

## 開源與相關連結

- 完整程式碼:[github.com/henrychao521/grip-system](https://github.com/henrychao521/grip-system)
- 早期原型:[grip-system-prototype](https://github.com/henrychao521/grip-system-prototype)
- 第一代桌面版:[handpose-legacy](https://github.com/henrychao521/handpose-legacy)

本架構設計適用於各類「身體姿態回饋」教學情境(運動動作矯正、樂器演奏練習、外科縫合訓練等),歡迎其他學科教師借鏡或提出 PR / Issue 進行協作。

---

> 本專案歷時 4 個月開發,目前是個人最完整的全端教育工具實作。
> 開源釋出的目的是讓更多教學現場能受惠於此類即時回饋系統。
