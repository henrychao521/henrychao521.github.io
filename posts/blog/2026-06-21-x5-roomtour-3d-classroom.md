---
title: "[完整教學] X5 RoomTour：從一支 360° 影片到可走進的 3D 數位孿生"
date: 2026-06-21T21:00:00+08:00
author: "Henry Chao"
cover: "/assets/covers/x5-roomtour.jpg"
category: "專案分享"
tags: [3D高斯潑濺, COLMAP, Brush, PlayCanvas, WebXR, 數位孿生]
repo: "x5-roomtour-viewer"
level: "⭐⭐⭐ 進階"
hours: "閱讀約 10 分鐘"
excerpt: "拿一支 Insta360 X5 在教室繞一圈，就能重建成可在瀏覽器第一人稱走動的照片級 3D 空間。這篇完整拆解整條 pipeline：360° 影片 → COLMAP 求相機位姿 → Brush 3D 高斯潑濺 → PlayCanvas + WebXR 即時渲染，全程 Apple Silicon 本機、無需 NVIDIA／CUDA。"
draft: false
---

把真實的家政生科教室，變成可以在瀏覽器裡「走進去」的 3D 空間——桌椅、櫃子、牆上的時鐘都在原來的位置，用滑鼠加鍵盤就能像玩第一人稱遊戲一樣走來走去。

![X5 RoomTour 重建出的教室內景（3D 高斯潑濺渲染）](/assets/covers/x5-roomtour.jpg)

這篇把整條 pipeline 從頭到尾拆給你看：用到哪些工具、每一步在算什麼、為什麼一台 Mac 就能跑完，以及它在生活科技課堂上能怎麼用。

## 為什麼想做這個

生活科技課很多單元都跟「空間」有關：教室配置、動線設計、消防逃生、工程製圖。傳統作法是看平面圖或照片，但學生很難把「平面圖上的線」對應到「真實空間的尺度」。

如果能讓學生**在瀏覽器裡走進真實教室、量出兩張桌子的間距、看到消防動線**，這層抽象就被打通了。這就是「數位孿生（Digital Twin）」的核心價值——把實體空間 1:1 搬進數位世界。

## 整體流程一張圖看懂

![X5 RoomTour 重建 pipeline](/assets/blog/diagram-x5-pipeline.svg)

整條鏈路只有一個輸入（一支 360° 影片）和一個輸出（一個 GitHub Pages 上的網頁），中間四個處理階段都是開源工具。下面逐一拆解。

## Step 1 — 用 360° 影片取得「密集視角」

3D 重建的本質，是從**很多張不同角度的照片**反推空間結構。角度越密、覆蓋越完整，重建品質越好。

傳統作法要拿單眼相機繞著空間拍幾百張，又慢又容易漏角度。改用 **Insta360 X5 錄一段 360° 影片**，手持繞教室走一圈，就能一次涵蓋上下左右所有方向，再用 `ffmpeg` 等距抽幀：

```bash
# 示意：從 360° 影片每隔固定間隔抽一張
ffmpeg -i x5_room.mp4 -vf "fps=2" frames/%04d.png
```

實際這個場景抽出約 **350 張**有效視角。抽幀時要避開「走動造成的動態模糊」——模糊幀會讓後面的特徵配對失敗。

## Step 2 — COLMAP：先解出「相機在哪」

有了一堆照片，電腦還不知道每張是「站在哪、朝哪拍」。**COLMAP** 用 Structure-from-Motion（SfM）把這件事算出來：

1. **特徵抽取**：每張圖找出 SIFT 特徵點
2. **特徵配對**：跨圖比對同一個實體點（例如牆角、椅腳）
3. **增量式 Bundle Adjustment**：同時最佳化「相機位姿」與「3D 點座標」，讓所有觀測誤差最小

```bash
# 示意：COLMAP 自動重建相機位姿 + 稀疏點雲
colmap feature_extractor  --database_path db.db --image_path frames/
colmap exhaustive_matcher --database_path db.db
colmap mapper --database_path db.db --image_path frames/ --output_path sparse/
```

產物是**每張影格的相機位姿**＋一團**稀疏點雲**。這團點雲同時是下一步高斯潑濺的初始化種子。

> 小提醒：360° 影片要先依鏡頭模型展開／切成透視視角，COLMAP 對等距長方投影（equirectangular）的支援要特別設定。

## Step 3 — 3D Gaussian Splatting：用 135 萬顆高斯點「畫」出空間

這是整條 pipeline 的核心。**3D Gaussian Splatting（3DGS）** 不像傳統 3D 用三角網格，而是把整個空間表示成**幾百萬顆半透明的 3D 高斯橢球**，每一顆帶有：

| 參數 | 意義 |
|------|------|
| 位置 μ (x,y,z) | 這顆高斯在空間中的中心 |
| 共變異數 Σ | 橢球的形狀與朝向（縮放 + 旋轉） |
| 不透明度 α | 這顆有多「實」 |
| 球諧函數 SH | 從不同角度看過去的顏色（含反光變化） |

訓練方式是**可微分渲染（differentiable rasterization）**：把目前這堆高斯投影成 2D 畫面，跟 COLMAP 算出的「真實那張照片」比對，用梯度下降一點點修正每顆高斯的位置、形狀、顏色，直到渲染結果跟真實照片幾乎一樣。

這個場景最後收斂到約 **135 萬顆高斯點**。它的魅力在於：**玻璃、反光、植物這些網格很難表現的東西，高斯潑濺能自然呈現**——代價是沒有明確的「面」，靠近看會有一點半透明的霧感（你在上面那張內景圖就能看到）。

## Step 4 — Brush：為什麼一台 Mac 就能訓練

3DGS 的原始實作幾乎都綁 **NVIDIA CUDA**，沒有獨顯就跑不動。這個專案改用 **[Brush](https://github.com/ArthurBrussee/brush)**——一個用 Rust + `wgpu` 寫的 3DGS 訓練器，透過跨平台 GPU 抽象層運算，**在 Apple Silicon（M 系列晶片）本機就能訓練，完全不需要 NVIDIA／CUDA**。

這對教學現場很關鍵：老師手上的 MacBook 就是訓練機，不必租雲端 GPU、不必準備 Linux 工作站。訓練完用 **SOG（Self-Organizing Gaussians）** 之類的方法把高斯資料壓縮、量化，讓檔案小到適合走網路傳輸。

| 階段 | 工具 | 輸入 → 產物 | 跑在哪 |
|------|------|------------|--------|
| 抽幀 | ffmpeg | 360° 影片 → ~350 張影格 | 本機 CPU |
| 求位姿 | COLMAP | 影格 → 相機位姿 + 稀疏點雲 | 本機 CPU |
| 訓練 | Brush (Rust/wgpu) | 點雲 + 影像 → ~135 萬高斯點 | Apple Silicon GPU |
| 壓縮 | SOG | 高斯 → 量化後的網頁素材 | 本機 |
| 渲染 | PlayCanvas + WebXR | 素材 → 可走動網頁 | 使用者瀏覽器 |

## Step 5 — 在瀏覽器裡走進去：PlayCanvas + WebXR + 碰撞

最後把壓縮好的高斯素材丟進 **PlayCanvas**（WebGL 引擎，內建 Gaussian Splat 渲染），就能在任何現代瀏覽器即時渲染，不必安裝任何東西。

要能「走動」而不是只能轉視角，得自己加上**第一人稱控制 + 碰撞**：

```javascript
// 示意：第一人稱移動 + 膠囊碰撞（概念示意，非實際原始碼）
const speed = shiftHeld ? 3.2 : 1.6;          // Shift 快走
const move = new pc.Vec3(input.x, 0, input.z).normalize().scale(speed * dt);

// 雙層碰撞：腰部以下擋桌椅、頭部高度可穿過開口
if (!sweepCapsule(player.pos, move, colliderMesh)) {
  player.pos.add(move);
}
camera.setEulerAngles(pitch, yaw, 0);          // 滑鼠控制視角
```

「雙層碰撞」是這個場景特別處理的細節：**桌子高度會擋住身體、但門框／高處開口可以穿過**，走起來才像真的在教室裡，而不是被一個方形隱形牆罩住。

![X5 RoomTour 著陸頁：重建數據、建築平面圖與人流軌跡](/assets/blog/x5-landing.png)

## 不只是好看：平面圖自動生成 + 人流追蹤

重建完的點雲還能再榨出兩個對教學很有用的東西：

- **建築平面圖自動生成**：把 3D 點雲往地面投影、用密度找出牆面，就能生出帶尺寸標註的平面圖（這個場景算出室內淨約 `8.82 × 10.48 m ≈ 93 m²`）。學生可以直接拿平面圖跟 3D 空間對照，工程製圖不再是紙上談兵。
- **即時人流軌跡追蹤**：用攝影機影像追蹤人在空間中的移動，畫成上視圖熱區，可以用來討論動線設計、消防逃生。

| 這個場景的數據 | 數值 |
|----------------|------|
| 重建面積 | 163 m²（兩間教室合計） |
| 高斯點數 | 約 135 萬顆 |
| COLMAP 視角 | 350 個 |
| 偵測燈具 | 12 具 |
| 室內淨尺寸 | 8.82 × 10.48 m ≈ 93 m² |
| 部署方式 | 純靜態檔，GitHub Pages |

## 課堂怎麼用（對應 108 課綱）

- **科技的本質**：示範「實體空間如何被數位化」，從感測（360° 影像）到重建（演算法）到呈現（瀏覽器）的完整轉換。
- **設計與製作 / 工程製圖**：用自動生成的平面圖，讓學生在真實尺度上練習量測、標註、動線規劃。
- **跨域整合**：一條 pipeline 串起攝影、幾何、最佳化、Web 前端，是談「工程設計流程」很好的真實案例。

## 自己動手 / 線上體驗

整套用的都是開源工具（COLMAP、Brush、PlayCanvas），手上有一台 Apple Silicon 的 Mac 就能重建自己的教室。想先看成果，可以直接點開線上版，用 WASD + 滑鼠走進教室；按右上角還能切換不同畫質與採光版本。

> 🚀 **線上體驗**：<https://henrychao521.github.io/x5-roomtour-viewer/>
> 📐 技術細節另見站內「技術文件」頁。
