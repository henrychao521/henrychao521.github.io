---
title: "[實作筆記] 用 Mac Studio 當 AI 大腦、ESP32-CAM 當眼睛 — 多攝影機 + VLM 智慧描述"
date: 2026-05-10T13:00:00+08:00
author: "Henry Chao"
cover: ""
categories: [edge-cam, ai, vision]
tags: [Mac Studio, ESP32-CAM, YOLOv8, VLM, Qwen-VL, LM Studio, Telegram, Flask]
repo: "camera-hub-mac"
level: "⭐⭐⭐ 進階"
hours: "8–12 hrs"
excerpt: "把 AI 推論搬到 Mac、Pi 純當 hub。再進一步加入 VLM 智慧描述，讓系統不只說「有人」，還能說「畫面中有一名穿紅色上衣的男性，正在客廳沙發上看書」。"
draft: false
---

## 為什麼要把 AI 從 Pi 搬到 Mac？

之前做的 [pi-camera-hub](https://github.com/henrychao521/pi-camera-hub) 用 Pi4/5 跑 YOLOv8，已經能即時偵測動作 + 推 Telegram。
**但 Pi 的算力是天花板**：

- Pi4 跑 YOLOv8n 約 2–5 FPS，多顆相機就吃緊
- Pi5 上加 Hailo AI HAT+ 是好選項，但**硬體又一個層級的投資**
- 模型只能用很小的（不能跑 VLM）

家裡剛好有 Mac Studio（M2 Max），算力比 Pi 強 50 倍以上。
那就把架構翻過來：**Pi 當「網路接收 hub + 錄影機」，AI 推論全部丟給 Mac**。

> 一句話總結：**Pi 是眼睛，Mac 是大腦**。

---

## 架構演進

```
Generation 1 (camera-system-archive)
  單 Pi + 1 顆相機 + OpenCV 動作偵測

Generation 2 (pi-camera-hub)
  Pi 主機 + 多顆 ESP32-CAM + YOLOv8 (Pi 跑)
  ↓ 演化到：

Generation 3 (camera-hub-mac，現役)
  Pi 收串流 → Mac AI 推論 → Telegram 推播
  └ AI 引擎兩種：YOLO 物件 + VLM 智慧描述
```

---

## 兩種 AI 引擎

V3 最大的設計決定：**AI 引擎可切換**。

### Mode A — YOLO 物件偵測（`ai_engine_mac.py`）

最常用的模式。

```python
from ultralytics import YOLO
model = YOLO('yolov8n.pt')   # 用 Apple Silicon MPS 加速
results = model(frame)

if 'person' in detected_classes and confidence > 0.5:
    telegram.send_photo(frame, caption="偵測到人")
```

- ROI 內偵測 `person` / `car` / `dog`
- SORT tracker 追蹤同一物件不重複告警
- 在 Mac M1/M2 上 YOLOv8n 約 **30–60 FPS @ 640×480**
- 適合 24/7 跑，不會誤報

### Mode B — VLM 智慧描述（`ai_engine_vlm.py`）

這是最有趣的部分。

**問題**：YOLO 只會講「有人」「有車」。但現場真正想知道的是「**現在發生什麼事**」。

**解法**：動作觸發後，把那一幀送給 LM Studio 的 VLM（Qwen-VL 7B），生成自然語言描述。

```python
def on_motion(frame):
    image_b64 = encode_to_base64(frame)
    response = vlm_client.chat([
        {"role": "system", "content": "你是監視器助手，用一句話描述畫面內容。"},
        {"role": "user", "content": [
            {"type": "image_url", "image_url": image_b64},
            {"type": "text", "text": "畫面中發生什麼事？"}
        ]}
    ])
    telegram.send_photo(frame, caption=response)
```

實際輸出：

> 📷 「畫面中有一名穿紅色上衣的男性，正在客廳沙發上看書」
>
> 📷 「廚房裡的金黃色貓咪正在跳上流理台」
>
> 📷 「畫面中沒有人，但桌面上有一杯水被打翻」

延遲約 **2–5 秒/張**（VLM 推論時間），不適合即時告警，但**告警內容的資訊量天差地別**。

---

## 為什麼選 Apple Silicon + LM Studio？

### MPS 加速

YOLOv8 從 PyTorch 2.0 起原生支援 MPS。Mac M2 Max 跑 YOLOv8n：

| 後端 | FPS @ 640×480 |
|------|--------------|
| CPU only | ~5 |
| **MPS** | **~50** |

**10 倍差距**，免費的（你 Mac 本來就有）。

### LM Studio 而非 Ollama

兩者都試過：

- **Ollama**：CLI 友善、Docker 親和、適合 Linux/Pi
- **LM Studio**：GUI 看 GPU 用量、多模型切換方便、Mac 上更穩

VLM 模型載入後吃約 8 GB VRAM。Mac Studio M2 Max 64GB 還很從容。

---

## 安全設計（這個重要）

`dashboard.py` 是對外的 web，特別小心：

```python
# 防 Path Traversal
def validate_path(req_path, base_dir):
    base = Path(base_dir).resolve()
    target = Path(req_path).resolve()
    if base not in target.parents and base != target:
        log("[SECURITY] Path Traversal Attempt blocked: " + req_path)
        return None
    return str(target)

# 防 SSRF（不允許連 localhost / link-local）
def validate_ip(ip_str):
    ip = ipaddress.ip_address(ip_str)
    return not (ip.is_loopback or ip.is_link_local)

# 密碼用 werkzeug scrypt hash 儲存（不存明文）
from werkzeug.security import generate_password_hash, check_password_hash

# CSRF 保護
csrf = CSRFProtect(app)
```

第一次啟動時若 `config.json` 還是明文密碼，會自動轉 hash 存回。
**這套防禦對於放校園網路內部用是足夠的**，但若要對外開放 port 還是建議套 nginx + Let's Encrypt。

---

## 客戶端：ESP32-CAM 怎麼接？

韌體在 [esp32-arduino-sketches](https://github.com/henrychao521/esp32-arduino-sketches) 的 `camera_hub_v16_release/firmware/` 下。
燒錄前修改：

```cpp
const char *ssid = "ESP32_CameraHub";   // Mac/Pi 開的 AP
const char *password = "<WIFI_PASSWORD>";
const char *server = "192.168.1.x";     // Mac 的 IP
const int CAM_ID = 1;                    // 每顆相機編號
```

開機後 ESP32-CAM 會自動連上 hub，提供 MJPEG 串流給 `local_cam_streamer.py` 抓。

---

## 部署流程（一鍵）

```bash
git clone https://github.com/henrychao521/camera-hub-mac.git
cd camera-hub-mac

# 環境
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 編輯 config.json — 填攝影機 IP / Telegram token
cp config.json config.json.local
# 用編輯器填入實際值

# 一鍵啟動（YOLO 模式）
chmod +x run_mac.sh
./run_mac.sh
```

或用 Docker：

```bash
docker-compose up -d
docker-compose logs -f camera-hub
```

開瀏覽器：[http://localhost:8000](http://localhost:8000)

---

## 一個多月的實際運作數字

| 指標 | 數值 |
|------|------|
| 同時處理攝影機 | 4 顆（XIAO ESP32S3 ×2 + ESP32-CAM ×2） |
| 全部相機加總 throughput | ~120 fps |
| AI 推論延遲（YOLO） | 18–25 ms/frame |
| AI 推論延遲（VLM） | 2.5–4.5 sec/frame |
| Telegram 告警次數/天 | 平均 8–15 次 |
| 誤報率（YOLO + tracker） | < 5%（晚上偶有月光樹影） |
| Mac Studio CPU 使用 | 平均 18%、瞬間 ~40% |

---

## 已知限制（誠實版）

1. **VLM 中文描述偶爾會出現幻覺**：例如把背景書架認成「圖書館」。需要 prompt 工程降溫
2. **晚上紅外線的場景 VLM 表現很差**：照片是黑白的，模型訓練時沒看過很多
3. **錄影檔吃儲存空間**：每天約 8 GB（4 顆相機 1080p H.264）。一個月 240 GB
4. **Mac 必須一直開**：Pi 上的 hub 還在收流但 AI 沒運作 → 要設 launchd 開機自動啟動

---

## 下一步想做的

- [ ] **VLM 多輪對話**：讓使用者用 Telegram 問「剛剛 3 點那次是什麼？」→ 系統翻錄影回答
- [ ] **語音告警**：偵測到緊急狀況 → Mac speaker 廣播
- [ ] **整合 [moltbot](https://github.com/henrychao521/moltbot) 跨機叢集**：Mac 主推論、Pi5 backup
- [ ] **抽出 [`edge-cam-client`](/projects.html?theme=camera) SDK**：把多版本韌體統一

---

## 開源 + 相關專案

- 主程式：[github.com/henrychao521/camera-hub-mac](https://github.com/henrychao521/camera-hub-mac)
- 客戶端韌體：[esp32-arduino-sketches](https://github.com/henrychao521/esp32-arduino-sketches)
- Pi 版（前一代）：[pi-camera-hub](https://github.com/henrychao521/pi-camera-hub)
- 第一代凍結版：[camera-system-archive](https://github.com/henrychao521/camera-system-archive)

---

> 這個架構花了 8 個月演進到現在的樣子（從單 Pi 開始）。
> 「**Pi 收流 + Mac 推論**」是我目前最滿意的折衷 —
> Pi 便宜（每顆相機節點 NT$ 1,500 內），Mac 強（一顆夠 4 顆相機跑 VLM）。
>
> 如果你也想做家用智慧監控、又不想交月費給雲端服務商，**這套是真的可以跑**。
