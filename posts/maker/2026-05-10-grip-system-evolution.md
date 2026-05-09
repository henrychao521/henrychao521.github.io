---
title: "[專案紀錄] 握筆姿勢分析系統的三代演進 — 從 OpenCV 視窗到 WebRTC 全端"
date: 2026-05-10T11:00:00+08:00
author: "Henry Chao"
cover: ""
categories: [vision, ai, teaching]
tags: [MediaPipe, YOLOv8, FastAPI, WebRTC, aiortc, React]
repo: "grip-system"
level: "⭐⭐⭐ 進階"
hours: "完整版需 6–10 hrs；最小可跑版 1 hr"
excerpt: "從一開始 cv2.imshow 視窗到後來 FastAPI + React + 自寫 aiortc，三代演進完整記錄。也是「為什麼老師需要寫程式」的好例子。"
draft: false
---

## 起點：握筆姿勢這件事為什麼難教？

我教生活科技時最常被問到的是：「老師，這個字寫得好醜怎麼辦？」

字醜的原因有很多，但**最常見的是握筆姿勢不對**。
標準握筆是「**三指輕扣，筆尖距離指尖 1.5–2 cm**」。
但學生就是不信我講的，每次糾正都當耳邊風。

我想：**如果有個東西能即時告訴他「你握得太緊了」**，是不是更有效？

於是有了 grip-system。

---

## 第一代：桌面 OpenCV 視窗（2026/01）

最快能跑起來的版本：

```python
import cv2
import mediapipe as mp
from ultralytics import YOLO

cap = cv2.VideoCapture(0)
hands = mp.solutions.hands.Hands()
yolo = YOLO('pen_v2.pt')   # 自己訓練的筆尖偵測

while True:
    ret, frame = cap.read()
    # MediaPipe 偵測手部 21 點
    # YOLO 偵測筆尖
    # 算指尖到筆尖距離
    cv2.imshow('Grip', frame)
```

**第一個問題：怎麼把像素距離轉成公分？**

學生離鏡頭 30 cm 跟 50 cm，畫面上的筆看起來大小差很多。沒有絕對校正，演算法就只能講「相對距離」沒辦法講「2 cm」。

**解法**：放一枚 **NT$10 硬幣（直徑 26 mm）** 在畫面裡，用 HoughCircles 偵測，
就能算出「畫面上 1 個 pixel = ? mm」。

> 這個校正方式我很滿意，幾乎不需要客製化，**任何人手上都會有 10 元硬幣**。

V1 跑得起來，但問題是：
- 只能本機跑（學生要每個人裝 Python + MediaPipe）
- 沒有資料記錄
- 老師只看到一個視窗，沒辦法多人同時用

---

## 第二代：Flask 網頁版（2026/02）

把 V1 包進 Flask，輸出 MJPEG 串流：

```python
@app.route('/video')
def video():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')
```

學生用瀏覽器連到老師電腦的 IP 就能看到自己畫面。
**好一點了，但問題還在**：

- MJPEG 延遲約 500–800 ms（指尖動了，畫面才跟上）
- 多人同時看 = 同一個畫面（不是各看各的）
- 沒有使用者帳號

中間試過 Gradio 跟 Streamlit-WebRTC，都有自己的問題：
- **Gradio**：寫起來最快，但 webcam 體驗很糟，一卡一卡
- **Streamlit-WebRTC**：低延遲，但 Safari 上有時不能用，又要設 TURN server

這時候我發現：**這事情要做好，必須認真寫一套 WebRTC**。

---

## 第三代：FastAPI + React + aiortc（2026/04 — 現役）

砍掉重練，這次認真做：

```
grip_system/
├── grip_core/              # 視覺核心（Mac/Pi 共用，無框架依賴）
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

### 為什麼分成 `grip_core/`？

這是這版**最重要**的決定。把 vision 邏輯抽成「無框架依賴」的 core：

- 同一份 core，**Mac 開發**用 webcam 跑、**Pi 部署**用樹莓派 cam 跑
- 同一份 core，可以餵給 **FastAPI / Flask / 桌面 app / Telegram bot** 任一介面

這也是我下一步想做的「[抽出 henry-vision-core SDK](/projects.html?theme=education)」的雛形。

### WebRTC 為什麼要自寫？

`streamlit-webrtc` 之類的套件是「黑盒子」— 你不知道為什麼這台 Safari 不通，
另一台又突然能跑。**自寫 aiortc** 雖然累，但每個環節都看得到：

```python
@app.post("/webrtc/offer")
async def offer(payload: Offer):
    pc = RTCPeerConnection()
    pc.addTransceiver("video", direction="recvonly")

    @pc.on("track")
    async def on_track(track):
        # 收到的是學生瀏覽器送來的 webcam stream
        # 經過 grip_core.pipeline 處理
        # 送出處理過的 frame 回去
        ...
```

**延遲降到 80–150 ms**（vs MJPEG 500–800 ms），互動體驗完全不同。

---

## 三步驟流程（給使用者）

1. **入口** — 建立個人檔案 / 登入 / 訪客模式
2. **硬幣校正** — 拿 10 元硬幣以慣用手握住入鏡，自動採樣 ≥ 5 次
3. **即時分析** — WebRTC 串流即時顯示握筆狀態。任一手指 < 2.0 cm 距筆尖即判錯誤

---

## 結果（一學期使用）

學期初 vs 學期末，正確握筆比例：

| 班級 | 學期初 | 學期末 |
|------|--------|--------|
| 二A | 38% | 71% |
| 二B | 44% | 76% |
| 二C | 31% | 65% |

**比我自己用嘴糾正有效太多了**。

而且學生覺得「跟電腦比賽」很好玩，會主動拿著筆來問：「老師我這樣對嗎？」

---

## 下一步想做的

1. 把 vision 邏輯抽成 [henry-vision-core](/projects.html?theme=education) 套件
2. 整合 [學生學習歷程平台](https://github.com/henrychao521/student-portfolio-v3) 做歷史記錄
3. 投教學研討會（CHI / IEEE TLT / ICCE）

---

## 開源 + 文件

- 完整程式碼：[github.com/henrychao521/grip-system](https://github.com/henrychao521/grip-system)
- 早期 prototype：[grip-system-prototype](https://github.com/henrychao521/grip-system-prototype)
- 第一代桌面版：[handpose-legacy](https://github.com/henrychao521/handpose-legacy)

歡迎其他學科老師借鏡這個架構，**vision core 抽出來後**就能套到任何「身體姿態回饋」題目（運動、樂器演奏、外科縫合練習等）。

---

> 這個專案做了 4 個月，是我目前最完整的全端產品。
> 開源出來讓更多老師用得到，也歡迎 PR / Issue 🦦
