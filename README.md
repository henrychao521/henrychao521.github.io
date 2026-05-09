# henrychao521.github.io

🦦 **趙珩宇 Henry × LivingTech** 個人作品站

整合 24 個 GitHub 開源專案 + 600+ 篇 [livingtech.education](https://livingtech.education) 教學文章，
並提供 WordPress 級的 **Decap CMS 後台** 寫新文章。

🌐 **線上：** https://henrychao521.github.io

---

## 站內結構

| 頁面 | 內容 |
|------|------|
| `/` (`index.html`) | 首頁：精選專案 + 最新 6 篇文章 + 五大主軸 |
| `/projects.html` | 24 個 repo 展示（依主題篩選） |
| `/articles.html` | livingtech.education 文章鏡像（搜尋 + 分類） |
| `/maker.html` | Maker 教案 catalog（含難度、課時、硬體清單） |
| `/admin/` | Decap CMS 寫作後台（GitHub OAuth 登入） |

## 技術 stack

- 純靜態 HTML + Tailwind CSS（CDN）
- Vanilla JS（fetch WordPress.com REST API + GitHub API）
- Decap CMS v3（`/admin/`）
- GitHub Pages 部署（main branch 自動）

> 之後若內容變多可平滑升級到 Astro / Next.js。

## 本機開發

```bash
# 1. clone
git clone https://github.com/henrychao521/henrychao521.github.io.git
cd henrychao521.github.io

# 2. 任意 static server
python3 -m http.server 8080
# 或
npx serve .

# 3. 開瀏覽器：http://localhost:8080
```

## 啟用 Decap CMS 後台

詳見 [`admin/SETUP.md`](admin/SETUP.md)，摘要：

1. 註冊 GitHub OAuth App
2. 用社群 OAuth proxy（或自架）
3. 推到 GitHub Pages
4. 訪問 `/admin/` → GitHub 登入 → 開始寫文

## 寫新文章

### 方法 A — 用 `/admin/` 後台（**推薦**）

WordPress 級體驗，所見即所得，圖片拖曳上傳。

### 方法 B — 直接寫 markdown

```bash
# 在 posts/maker/ 或 posts/blog/ 下放新檔
# 檔名格式：YYYY-MM-DD-slug.md
```

YAML frontmatter 範例：

```yaml
---
title: "[實作筆記] XIAO ESP32S3 LED 矩陣中文跑馬燈"
date: 2026-05-10T14:00:00+08:00
author: "Henry Chao"
cover: "/assets/uploads/cover.jpg"
categories: [esp32, electronics]
tags: [WS2812B, Arduino, 中文字型]
repo: "xiao-esp32s3-led-matrix"
level: "⭐ 入門"
hours: "2–4 hrs"
excerpt: "從 4 塊 8×8 面板拼成 16×16，用 ESP32S3 跑中文跑馬燈。"
---

## 為什麼做這個？

...
```

## 與 livingtech.education 的關係

- WordPress 站（livingtech.education）：**保留**所有原文章，繼續寫一般教學
- 本站：
  - 顯示 GitHub 24 個專案
  - 透過 WP REST API **動態鏡像** WP 文章列表
  - 提供 `/admin/` 寫**技術深度文**（程式碼、git 整合）
- 兩站雙向交叉連結

## 部署

直接 push 到 `main` branch，GitHub Pages 會在 1–2 分鐘內重新 build 並上線。

```bash
git add .
git commit -m "..."
git push
```

## License

私人作品站，內容版權所有 © 2026 Henry Chao。
程式架構（HTML/CSS/JS）採 MIT License。
