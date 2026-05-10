---
title: "[實作筆記] 雙手在空中操作 3D 模型 — 純前端、零後端的全息互動實驗"
date: 2026-05-10T14:00:00+08:00
author: "Henry Chao"
cover: ""
categories: [vision, teaching]
tags: [MediaPipe, Three.js, 手勢辨識, Off-axis, 全息投影, 純前端]
repo: "off-axis-pi"
level: "⭐⭐ 中階"
hours: "3–5 hrs"
excerpt: "瀏覽器端純前端、雙手手勢控制 3D 模型旋轉縮放平移。原本是「臉部追蹤 Off-axis 全像投影」實驗，後來才發現「雙手手勢」更實用。"
draft: false
---

## 為什麼想做這個？

科教館看到一個展品：**透明壓克力金字塔 + 手機螢幕的全像投影**。
小朋友圍著看 3D 角色從各角度旋轉，超有趣。
我想：「這個原理是什麼？能不能在課堂用？」

回家研究才知道是 **Off-axis Projection** —
螢幕顯示一個依「觀察者位置」即時變形的畫面，加上斜面反射，看起來就像 3D 物件浮在空中。

於是有了 off-axis-pi 的最初版本：**用 Webcam 追蹤觀察者頭部位置**，動態調整視差。
看起來像是真的 3D 漂浮，但⋯⋯

---

## 第一個版本：臉部 Off-axis 視差

```javascript
// 用 MediaPipe Face Mesh 抓臉中心
const facePos = getFaceCenter(landmarks);

// 算「相機應該在哪裡」
camera.position.x = facePos.x * SCALE;
camera.position.y = facePos.y * SCALE;
camera.position.z = facePos.z * SCALE;

// 視野中心永遠對準螢幕中心
camera.lookAt(0, 0, 0);
```

**結果**：技術上跑得起來，視覺效果也對。
**問題**：

1. **單人操作**：一次只能一個人看（face mesh 只追一張臉）
2. **要靠很近**：臉要在 webcam 1 公尺內才有效
3. **學生反應普通**：「老師有點頭暈」（XD）
4. **教室不適用**：要關燈、要直視螢幕，現場展示不方便

> 寫到一半覺得「這個 Off-axis 是個酷技術，但**互動性不夠**」。

---

## 轉念：改成手勢操作 3D

換個思路：**不要 Off-axis，改成雙手手勢控制 3D 模型**。

理由：
- 不需要靠近螢幕
- 多人可圍觀
- 互動性直接（學生可上來操作）
- 可投影到大螢幕當教學教具

---

## 手勢對照表（最後決定的版本）

```javascript
// MediaPipe Hands → 兩隻手 21 個關鍵點
// 「捏合」= 食指 + 拇指距離 < threshold
// 「張開」= 距離 > threshold
```

| 左手 | 右手 | 動作 |
|------|------|------|
| 捏合 | 張開 | X 軸旋轉 |
| 張開 | 捏合 | Y 軸旋轉 |
| 雙手捏合 | — | 縮放（兩手距離差值） |
| 雙手張開 | — | 平移（雙手中心位移） |
| 單手捏合 | — | 平移 |
| 單手張開 | — | 旋轉 |
| 無手 | — | 緩慢歸零（旋轉 ×0.95） |

平移、縮放、旋轉**全用指數插值平滑**：

```javascript
const smoothing = 0.15;
target.x = target.x * (1 - smoothing) + current.x * smoothing;
```

不平滑的話手稍微抖一下模型就跳，看起來像電影特效失敗。

---

## 為什麼是純前端？

這次刻意選「**零後端**」：

- **MediaPipe Hands** 已經有 JavaScript 版（用 WebAssembly）
- **Three.js** 載入 GLB / GLTF / OBJ / STL 都直接支援
- **WebGL** 跑得動 100k 三角面以下的模型
- 完全不用伺服器，**只要一個靜態 HTTP server 就行**

```bash
cd off-axis-pi
./start.sh           # 預設 port 8080
# 開瀏覽器：http://localhost:8080
```

優點：
- 學生可以**直接 clone 到自己電腦跑**（不用會 Python）
- **可以放 GitHub Pages 給全班用**
- 處理在本機，**沒有任何資料上雲端**（學生肖像也不會傳）

缺點：
- 大模型（>500k 三角面）會卡
- iOS Safari 需要授予 webcam 權限（要 HTTPS）

---

## 內建模型

`models/` 目錄放了兩個範例模型：

| 模型 | 來源 | 用途 |
|------|------|------|
| `face.glb` | MediaPipe demo face | 練手用 |
| `shoe.glb` | sketchfab CC | 商品展示概念 |

支援 GLB / GLTF / OBJ / STL（Three.js loader 都有），自己換模型只要丟檔案進 `models/` 然後 UI 選單會自動列出。

---

## 教學用法

我在「**生活科技：3D 列印**」這個單元用：

1. 學生畫好 3D 模型（Onshape / Tinkercad）
2. Export `.stl`
3. 丟進 off-axis-pi 用手勢轉著看
4. **直接看到自己的設計** — 比在 CAD 軟體裡轉刺激多了

**學生反應**：「老師我可以摸自己的模型！」（誤）
**結果**：學生改設計的意願大大提高，因為不滿意可以直接看出來。

---

## 頁面導覽

```
/index.html                       入口選擇頁
/unified-hand-control.html        ⭐ 主程式（手勢控制 3D）
/face.html                        臉部 Off-axis 視差版（保留）
/test-hand-only.html              手部追蹤 debug 工具
```

---

## 後續想做的

- [ ] **加聲音回饋**：捏合時 click 聲，旋轉到極端時提示音
- [ ] **多人模式**：兩隻不同人的手 → 兩個模型 PK / 互動
- [ ] **AR 模式**：Meta Quest / iPad ARKit 整合
- [ ] **儲存「最佳視角」**：學生展示時可以快速跳到事先擺好的角度

---

## 已知限制

- **強光下會誤判**：MediaPipe Hands 在過曝環境下骨架會抖
- **只支援 21 點骨架**：沒有手指彎曲度詳細追蹤（用不到）
- **手套不行**：如果學生戴黑色手套，模型很難辨識

---

## 開源 + 相關專案

- 程式碼：[github.com/henrychao521/off-axis-pi](https://github.com/henrychao521/off-axis-pi)
- 同樣用 MediaPipe Hand 的 [grip-system](https://github.com/henrychao521/grip-system)（握筆姿勢）
- 同樣用 vision 視覺的 [sports-skeleton-analysis](https://github.com/henrychao521/sports-skeleton-analysis)（運動分類）

---

> 這個專案從「炫技 demo」一路演化成「實用教具」。
>
> 過程中最大的學習：**酷的技術不一定有用**。
> Off-axis 視差很酷，但不適合教室。手勢控制比較土，但學生愛玩、老師愛用。
>
> 「對使用者真的好」永遠勝過「技術很潮」。
