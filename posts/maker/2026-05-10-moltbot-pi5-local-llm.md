---
title: "[實作筆記] Pi 5 上的本地 LLM 對話機器人 — Llama 3.1 TAIDE，離線可用、零雲端"
date: 2026-05-10T12:00:00+08:00
author: "Henry Chao"
cover: ""
categories: [llm, pi]
tags: [Raspberry Pi 5, Ollama, Llama, TAIDE, Telegram, Docker]
repo: "moltbot"
level: "⭐⭐ 中階"
hours: "3–4 hrs（不含模型下載）"
excerpt: "在 Raspberry Pi 5 8GB 上跑繁體中文 LLM，做出「跟你的小機器人對話」的離線實驗。約 2–4 tokens/sec，慢但很值得。"
draft: false
---

## 為什麼想在 Pi 上跑 LLM？

學生問我：「老師你 ChatGPT 是不是花很多錢？」
我心想：「**有沒有可能不用花錢、不用網路、自己家就有一台『AI』？**」

ChatGPT / Claude 雖好用，但對教學來說有幾個問題：
1. **網路不穩** — 學校網路偶爾抽風，全班一起連會卡
2. **隱私** — 學生資料不太想送雲端
3. **預算** — 公費請款 OpenAI API 不太好過
4. **教學目的** — 想讓學生看到「AI 不是魔法，是一台電腦在跑」

**「在 Pi 5 上跑 LLM」這個題目**剛好兼顧這幾件事。
所以做了 Moltbot（名字源自一隻被養死的水獺，紀念意味）。

---

## 硬體選擇（不騙你，這個重要）

| 項目 | 規格 | 原因 |
|------|------|------|
| 主機 | **Raspberry Pi 5 8GB** | 4GB 跑不動 8B 模型 |
| 儲存 | **NVMe SSD**（PCIe HAT） | microSD 太慢，模型載入慢得想哭 |
| 散熱 | **主動式散熱器** | LLM 推論發熱量超大，被動散熱會 throttle |
| 電源 | **官方 27W USB-C** | 跑滿時電流會跳很高，劣質電源直接 reset |

**省其中任一個都會踩雷**。我一開始用 microSD 跑，光 model 載入就 3 分鐘，每次還要等⋯⋯改 NVMe 後變 30 秒以內。

---

## 軟體選擇

### LM Studio vs Ollama？

兩個都試了。

| 特色 | LM Studio | Ollama |
|------|-----------|--------|
| GUI | ✅ 有 | ❌ 純 CLI |
| ARM Linux 支援 | ⚠️ 有但不完整 | ✅ 完整 |
| OpenAI 相容 API | ✅ | ✅ |
| Docker 友善 | 一般 | 非常好 |

**Pi 上選 Ollama**。Mac 上選 LM Studio（因為要 GUI 載 / 換模型）。

### 模型選擇：為什麼是 TAIDE？

[TAIDE](https://taide.tw/) 是國科會主導的繁體中文 LLM。
我想要：
- ✅ 繁體中文流暢（不是簡轉繁）
- ✅ 能跑在 8GB RAM
- ✅ 開源 weight 可下載

挑了 **`Llama-3.1-TAIDE-LX-8B-Chat-Q4_K_M.gguf`**：
- Llama 3.1 base + TAIDE 微調
- 8B 參數，Q4 量化後約 4.5 GB（剛好放得下 Pi 5 8GB）
- 效果接近 GPT-3.5，繁中比 ChatGPT free 還順

---

## 部署步驟（記錄一下，不然下次又忘）

### 1. 燒系統 + 基本套件

```bash
# Raspberry Pi Imager 燒 Pi OS 64-bit
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git python3-pip python3-venv curl
```

### 2. 裝 Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable --now ollama
```

### 3. 把模型搬上 Pi

模型大小 4.5 GB，用 SCP 比較穩：

```bash
scp Llama-3.1-TAIDE-LX-8B-Chat-Q4_K_M.gguf pi@<Pi_IP>:~/Moltbot/
```

### 4. 匯入 Ollama

```bash
cd ~/Moltbot
echo "FROM ./Llama-3.1-TAIDE-LX-8B-Chat-Q4_K_M.gguf" > Modelfile
ollama create taide3 -f Modelfile
ollama run taide3 "你好，請自我介紹"
# 第一次會慢，等模型載入到記憶體
```

### 5. 跑 Moltbot

Moltbot 是個薄薄的 Python 包裝，把 Ollama 的 OpenAI 相容介面接成 CLI 對話：

```python
client = OpenAI(base_url="http://localhost:11434/v1", api_key="not-needed")
response = client.chat.completions.create(
    model="taide3",
    messages=[{"role": "user", "content": prompt}],
    stream=True
)
```

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 moltbot.py
```

### 6. 設成開機服務

```bash
sudo cp moltbot.service /etc/systemd/system/
sudo systemctl enable --now moltbot
journalctl -u moltbot -f         # 看 log
```

---

## 結果（誠實版）

| 指標 | 結果 |
|------|------|
| **Tokens/sec** | 2–4（慢，但能用） |
| **Time-to-first-token** | 1–3 秒（第一次更慢，~10 秒） |
| **記憶體使用** | 6.2 GB / 8 GB（吃緊） |
| **CPU 溫度** | 75–82°C（**有開散熱器**） |
| **回答品質（繁中）** | 接近 GPT-3.5 |

**慢嗎？** 慢。Pi 跑 8B 模型本來就不是給用爽的，是給用做教學示範。

**值得嗎？** 值。學生看到「這個小盒子真的在思考」，眼睛會亮。

---

## 學生實際反應

我在課堂上演示時，會故意問一些怪問題：

- 「你是誰？」
- 「現在幾點？」
- 「2+2 等於多少？」（看它會不會錯，**有時候真的會**）
- 「請用台語回答 ⋯⋯」（試極端 case）

學生會驚呼：「老師它真的會講台語！」
也會發現：「老師它有時候講錯⋯⋯為什麼？」

**這正是想要的教學效果** — AI 不是萬能、會出錯、需要驗證。

---

## 踩過的坑

1. **SD 卡跑會崩**：寫太多次後 SD 卡掛掉，模型 corrupt → **一定要 NVMe**
2. **第一次推論超慢**：因為要把整個 model 載入 RAM，之後就快
3. **記憶體吃緊**：跑 LLM 時不要再開 Chromium 看影片，會 OOM
4. **散熱器要主動式**：被動 heatsink 撐不住長時間推論

---

## 下一步想做的

- [ ] **接 Telegram Bot** — 學生用 LINE/Telegram 提問，Pi 在背景默默回答
- [ ] **接向量資料庫** — 把所有教材 embed 進去，做 RAG（學生問題→找相關教材→LLM 整合回答）
- [ ] **多人 session** — 目前單對話，要做多使用者隔離
- [ ] **跟 [mac-llm-bot](https://github.com/henrychao521/mac-llm-bot) 共用核心邏輯** — 抽出 `local-llm-bot-core`

---

## 開源

- 完整程式碼：[github.com/henrychao521/moltbot](https://github.com/henrychao521/moltbot)
- 詳細部署步驟：repo 內 `README_RPi_Setup.md`
- Mac 版本（有 macOS 系統技能）：[mac-llm-bot](https://github.com/henrychao521/mac-llm-bot)

如果你也想在家跑 AI，**Pi 5 8GB 是甜蜜點**（NT$ 4,000+）。
小型模型（3B）在 Pi 4 也能跑，但 8B 才有 GPT-3.5 的水準。

試試看吧 🦦

---

> 這個專案是「**AI 不應該只屬於有訂閱的人**」的小小實驗。
> 跑得慢但跑得起來，就值得。
