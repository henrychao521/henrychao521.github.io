---
title: "[實作筆記] 雙手在空中操作 3D 模型 — 純前端、零後端的全息互動實驗"
date: 2026-05-27T14:00:00+08:00
author: "Henry Chao"
cover: ""
categories: [vision, teaching]
tags: [MediaPipe, Three.js, 手勢辨識, Off-axis, 全息投影, 純前端]
repo: "off-axis-pi"
level: "⭐⭐ 中階"
hours: "3–5 hrs"
excerpt: "瀏覽器端零後端、雙手手勢控制 3D 模型旋轉縮放平移的實驗紀錄。從臉部追蹤 Off-axis 視差實作出發,最終演進為以雙手手勢為主軸的教學互動工具。"
draft: false
---

## 為什麼想做這個?

在科教館觀察到一件展品:**透明壓克力金字塔搭配手機螢幕的全像投影裝置**。
觀眾圍繞觀看 3D 角色從各角度浮現旋轉,互動效果良好。

評估後發現此技術背後的原理是 **Off-axis Projection** ——
螢幕顯示一個依「觀察者位置」即時變形的畫面,
經過斜面反射後,視覺上呈現 3D 物件懸浮的效果。

本專案最初版本即以此原理為起點:**以 Webcam 追蹤觀察者頭部位置**,動態調整視差。
技術上達到了預期效果,但在實際課堂應用上仍遇到一些挑戰。

---

## 第一個版本:臉部 Off-axis 視差

```javascript
// 透過 MediaPipe Face Mesh 取得臉部中心點
const facePos = getFaceCenter(landmarks);

// 計算相機應對位置
camera.position.x = facePos.x * SCALE;
camera.position.y = facePos.y * SCALE;
camera.position.z = facePos.z * SCALE;

// 視野中心固定對準螢幕中心
camera.lookAt(0, 0, 0);
```

**結果**:技術可行,視覺效果符合預期。
**實際應用上的限制**:

1. **單人操作**:Face Mesh 一次只能追蹤單一臉部
2. **距離限制**:臉部需位於 webcam 1 公尺內才能穩定追蹤
3. **體驗回饋**:部分觀看者反映「視覺暈眩感」
4. **教室環境不適用**:需要關燈與固定觀看姿勢,現場展示彈性不足

評估後判斷,Off-axis 視差雖屬可行的技術原型,
但在多人課堂教學情境下的**互動性**不足,難以作為主要教具使用。

---

## 設計轉向:改採手勢操作 3D

調整設計方向:**捨棄 Off-axis 視差,改採雙手手勢控制 3D 模型**。

本次採用手勢控制的考量是:
- 不需要使用者貼近螢幕
- 支援多人圍觀同一畫面
- 互動方式直觀,學生可輪流上台操作
- 可投影至大螢幕,適用於教室展示

---

## 手勢對照表(最終版本)

```javascript
// MediaPipe Hands → 兩隻手 21 個關鍵點
// 「捏合」= 食指與拇指距離 < threshold
// 「張開」= 距離 > threshold
```

| 左手 | 右手 | 動作 |
|------|------|------|
| 捏合 | 張開 | X 軸旋轉 |
| 張開 | 捏合 | Y 軸旋轉 |
| 雙手捏合 | — | 縮放(兩手距離差值) |
| 雙手張開 | — | 平移(雙手中心位移) |
| 單手捏合 | — | 平移 |
| 單手張開 | — | 旋轉 |
| 無手 | — | 緩慢歸零(旋轉 ×0.95) |

平移、縮放、旋轉均採**指數插值平滑**:

```javascript
const smoothing = 0.15;
target.x = target.x * (1 - smoothing) + current.x * smoothing;
```

未平滑時,手部微小抖動會直接傳遞到模型運動,造成畫面不穩定。

---

## 為什麼採用純前端架構?

本專案明確選擇「**零後端**」設計,主要考量如下:

- **MediaPipe Hands** 已提供 JavaScript 版本(以 WebAssembly 實作)
- **Three.js** 原生支援 GLB / GLTF / OBJ / STL 等格式載入
- **WebGL** 在大多數終端上可流暢渲染 10 萬三角面以下的模型
- 整體系統僅需靜態 HTTP server 即可部署

```bash
cd off-axis-pi
./start.sh           # 預設 port 8080
# 瀏覽器開啟:http://localhost:8080
```

採用此架構的優勢:
- 學生可直接 clone 至個人電腦執行(無需 Python 環境)
- 可直接部署至 GitHub Pages 供全班共用
- 所有運算於本機完成,**學生肖像資料不上雲端**

限制:
- 三角面數超過 50 萬的大型模型會出現效能瓶頸
- iOS Safari 需 HTTPS 環境才能授予 webcam 權限

---

## 內建模型

`models/` 目錄提供範例模型:

| 模型 | 來源 | 用途 |
|------|------|------|
| `face.glb` | MediaPipe demo face | 開發測試 |
| `shoe.glb` | sketchfab CC | 商品展示概念 |

支援 GLB / GLTF / OBJ / STL,
自訂模型只需將檔案放入 `models/` 目錄,UI 選單會自動列出。

---

## 教學應用

本系統在「**生活科技:3D 列印**」單元中的使用流程:

1. 學生於 Onshape / Tinkercad 完成 3D 模型設計
2. 匯出 `.stl` 檔
3. 載入 off-axis-pi 以手勢轉動觀察
4. **以接近實物的方式檢視自身設計** —— 提供 CAD 軟體所欠缺的沉浸式檢視體驗

本專案採用手勢互動而非滑鼠操作的考量是:
透過實體手勢操作,學生對自身設計的反饋更直接,
能更主動發現可改進之處並回到 CAD 軟體中修正。

---

## 頁面導覽

```
/index.html                       入口選擇頁
/unified-hand-control.html        主程式(手勢控制 3D)
/face.html                        臉部 Off-axis 視差版(保留)
/test-hand-only.html              手部追蹤 debug 工具
```

---

## 後續延伸方向

- [ ] **加入聲音回饋**:捏合時點擊音效,旋轉到極端角度時提示音
- [ ] **多人模式**:兩隻不同使用者的手對應兩個模型,支援互動或對比展示
- [ ] **AR 模式**:整合 Meta Quest / iPad ARKit
- [ ] **預設視角儲存**:學生展示時可快速切換至預設好的觀看角度

---

## 已知限制

- **強光環境誤判**:過曝環境下 MediaPipe Hands 骨架追蹤不穩定
- **僅支援 21 點骨架**:不提供手指彎曲度的細節追蹤(本應用情境下非必要)
- **手套干擾**:深色手套會降低手部辨識成功率

---

## 開源與相關專案

- 程式碼:[github.com/henrychao521/off-axis-pi](https://github.com/henrychao521/off-axis-pi)
- 同樣採用 MediaPipe Hand 的 [grip-system](https://github.com/henrychao521/grip-system)(握筆姿勢分析)
- 同樣以視覺為核心的 [sports-skeleton-analysis](https://github.com/henrychao521/sports-skeleton-analysis)(運動姿態分類)

---

> 本專案經歷了從「技術 demo」到「教學工具」的演進。
>
> 過程中的主要學習是:**技術新穎不等於教學適用**。
> Off-axis 視差具備視覺吸引力,但不適合多人課堂環境。
> 手勢控制在技術上較為直觀,但更貼近教學現場的實際需求。
>
> 在工具設計取捨上,「使用者實際需求」應優於「技術新穎度」。
