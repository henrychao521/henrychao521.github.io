---
title: "[實作筆記] 用 YOLOv8-pose 給體育課當第二位老師 — 即時運動姿態分類"
date: 2026-05-10T15:00:00+08:00
author: "Henry Chao"
cover: ""
categories: [vision, ai, teaching]
tags: [YOLOv8-pose, MediaPipe, 體育教學, 姿態估計, OpenCV]
repo: "sports-skeleton-analysis"
level: "⭐ 入門"
hours: "1–2 hrs"
excerpt: "用 YOLOv8-pose 偵測人體 17 點骨架，依關節角度自動分類「深蹲 / 伏地挺身 / 開合跳 / 站立」。給體育老師當數鏡子用。"
draft: false
---

## 起點：體育老師的痛點

某天體育老師借相機，說想拍學生做運動的姿勢給他們看。
我問「為什麼要拍？」他說：

> 「學生做深蹲時膝蓋會內扣，但他自己不知道。
> 我講一千次也沒用，**讓他看自己的影片**才會懂。」

那當下我就在想：**這事情可不可以即時幫他做？**
不是事後拍影片重看，是**做的當下就告訴他「你現在這個算不算深蹲」**。

於是有了 sports-skeleton-analysis。

---

## 為什麼選 YOLOv8-pose 而不是 MediaPipe Pose？

兩個都試了，最後選 YOLOv8-pose。比較表：

| 特性 | YOLOv8-pose | MediaPipe Pose |
|------|------------|---------------|
| 精度 | 較高（COCO 訓練） | 中等 |
| 速度 | Mac M1 ~30 FPS | Mac M1 ~60 FPS |
| 多人偵測 | ✅ 原生支援 | ❌ 需要自己拼 |
| 安裝 | `pip install ultralytics` | `pip install mediapipe` |
| 模型大小 | 6.5 MB (n) | 已內建 |
| 中文社群文件 | 多 | 少（官方好但都英文） |

**體育課現場可能多人同框**，所以 YOLOv8-pose 勝出。
速度雖然只有 MediaPipe 一半，但 30 FPS 對體育動作分析夠用。

---

## 17 點骨架 — 該記住這幾個

YOLOv8-pose 用 COCO 17 點：

```
 0:鼻子
 1:左眼  2:右眼
 3:左耳  4:右耳
 5:左肩  6:右肩    ←← 重要！
 7:左肘  8:右肘
 9:左腕 10:右腕   ←← 重要！
11:左髖 12:右髖   ←← 重要！
13:左膝 14:右膝   ←← 重要！
15:左踝 16:右踝   ←← 重要！
```

> 5/6/11/12/13/14/15/16 這 8 個點是**所有運動都用得到的關鍵骨架**。

---

## 規則式分類（簡單但有效）

我**故意不用 ML 分類器**，改寫 if/else 規則。理由：

1. 老師看得懂、可以自己改閾值
2. 不需要訓練資料
3. 不會有「奇怪輸入導致奇怪輸出」的 ML 黑盒問題
4. 教學上可以講「為什麼系統這樣判斷」

```python
def classify(keypoints):
    # 信心檢查：關鍵點 conf < 0.5 → 直接 Unknown
    if np.mean(keypoints[[5,6,11,12,13,14,15,16], 2]) < 0.5:
        return "Unknown"
    
    # 算膝蓋角度（髖-膝-踝三點）
    l_knee_angle = angle(l_hip, l_knee, l_ankle)
    r_knee_angle = angle(r_hip, r_knee, r_ankle)
    avg_knee = (l_knee_angle + r_knee_angle) / 2
    
    # 規則
    if avg_knee < 110 and hip_below_knee():
        return "Squat"
    elif body_horizontal():
        return "Pushup"
    elif arms_above_shoulder() and feet_apart():
        return "Jumping Jack"
    elif avg_knee > 160:
        return "Standing"
    else:
        return "Unknown"
```

每個運動的判斷條件：

| 運動 | 條件 |
|------|------|
| **Squat** 深蹲 | 雙膝 < 110° + 髖部低於膝蓋 |
| **Pushup** 伏地挺身 | 身體傾斜接近水平 |
| **Jumping Jack** 開合跳 | 雙手腕高過肩 + 雙腳踝距離 > 雙肩距離 |
| **Standing** 站立 | 雙膝 > 160° + 身體直立 |

---

## 角度計算（純 numpy）

```python
def calculate_angle(a, b, c):
    """算 ∠ABC，b 是頂點。"""
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    return min(angle, 360 - angle)   # 永遠回 0~180
```

這個 function 我教學生講過 N 次：**反正切函數 atan2 + 兩向量夾角**。
數學課教過但學生說「沒用過」 → 這就是用例。

---

## 跑起來只要 3 行

```bash
pip install ultralytics opencv-python numpy

# webcam（按 q 結束）
python main.py --source 0

# 影片檔
python main.py --source path/to/video.mp4
```

YOLOv8n-pose 模型會在第一次跑時自動下載（6.5 MB）。

---

## 體育課實際使用

我借體育老師試了一週，發現幾個有趣的觀察：

1. **學生會故意做極端動作測試系統**：「老師它認得我這樣嗎？」（笑）
2. **看到「Unknown」反而更專心**：因為要讓系統認得 → 主動做標準
3. **同學之間會互相糾正**：「你那樣系統不認啦」

> **這比老師單方面講「你姿勢不對」有效太多**。
> 系統是個冷靜、不帶感情的回饋者，學生不會覺得被罵。

---

## 客製化（給其他老師參考）

`sport_classifier.py` 內所有閾值都可以調：

```python
SQUAT_KNEE_ANGLE_MAX = 110      # 想嚴格一點 → 改 100
PUSHUP_BODY_ANGLE_MAX = 30
STANDING_KNEE_ANGLE_MIN = 160
KEYPOINT_CONFIDENCE_THRESHOLD = 0.5
```

不同年齡學生的關節活動度不同，閾值要調整。
我給國中生用 110°，給小學生會放寬到 120°。

---

## 已知限制

- **單視角**：側拍對 squat / pushup 比較準；正拍對 jumping jack 較好
- **背景干擾**：複雜背景下骨架會抖
- **遠距離小目標**：關節點信心會掉到 < 0.5 → 顯示 Unknown
- **多人遮擋**：互相重疊時 keypoint 會錯亂
- **沒有「動作完整度評分」**：只判斷類別，不評估「做得好不好」

---

## 後續想做的

- [ ] **動作計數**：squat 上下完成一次 → 累計次數
- [ ] **形變嚴重度評分**：squat 膝蓋是否內扣、背是否拱起
- [ ] **改用 ML 分類器** + 收集自家學生資料訓練
- [ ] **REST API**：FastAPI 接收 base64 frame 回傳分類結果（給 [grip-system](https://github.com/henrychao521/grip-system) 之類的前端用）
- [ ] **整合 [henry-vision-core](/projects.html?theme=education) SDK**（規劃中）：把 stabilizer、keypoint 處理共用

---

## 開源 + 相關專案

- 程式碼：[github.com/henrychao521/sports-skeleton-analysis](https://github.com/henrychao521/sports-skeleton-analysis)
- 同樣用 vision 的 [grip-system](https://github.com/henrychao521/grip-system)（握筆姿勢）
- 同樣 maker 風的 [off-axis-pi](https://github.com/henrychao521/off-axis-pi)（手勢操作 3D）

---

## 教學重點（給其他老師參考）

如果你也想用這個帶課，可以講：

1. **電腦視覺基礎** — YOLO 是什麼？keypoint 是什麼？
2. **OpenCV + numpy** — 即時影像處理的標準工具
3. **規則式 vs 機器學習** — 兩種「智慧」方法的優劣
4. **角度計算** — 國中數學的應用（反正切、向量夾角）
5. **使用者體驗設計** — 為什麼系統不該太嚴格？閾值要怎麼設？

整門課可以拉成 **3–6 節課的專題**，看深度。

---

> 這個小專案最讓我意外的是：**學生愛跟系統「鬥」**。
> 一旦變成「我能不能讓系統認得我這個動作」，他們就主動把姿勢做標準。
>
> 寫程式有時候不是要解決「人」的問題，而是給人一個「可以挑戰的對象」。
> AI 在教學裡，**好用的時候不是當老師，是當『陪練』**。
