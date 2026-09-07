# henrychao521.github.io

🦦 **趙珩宇 Henry × LivingTech** 個人作品站

整合 13 個可線上體驗的公開專案 + 兩百多篇 [livingtech.education](https://livingtech.education) 教學文章，
並提供 WordPress 級的 **Decap CMS 後台** 寫新文章。

🌐 **線上：** https://henrychao521.github.io

---

## 站內結構

| 頁面 | 內容 |
|------|------|
| `/` (`index.html`) | 首頁：教室實拍拼貼、13 個線上作品（`assets/js/shared.js` 的 `PROJECT_META`）、最新 6 篇 livingtech.education 文章、研習紀錄 |
| `/articles.html` | 站內專案手記（`posts/blog/`）＋ livingtech.education 文章鏡像（搜尋＋分類） |
| `/maker.html` | Maker 教案目次（難度、課時、硬體清單）＋ 站內 Maker 教學文（`posts/maker/`） |
| `/posts/<collection>/<slug>.html` | 每篇文章的靜態殼：由 `scripts/build-indexes.py` 以 `post.html` 為模板產生，`<head>` 預填 og/description，社群分享才有預覽；內文由前端讀同名 `.md` 渲染 |
| `/post.html?slug=…` | 舊連結相容，讀到內容後自動換成上面的靜態殼網址 |
| `/servo-arm/` | 機械手臂五種致動器紀錄站（頁面由私人 repo `servo-arm` 的 `tools/build_static.py` + `tools/split_pages.py` 產生後複製過來） |
| `/grip-coach/` | AI 握筆姿勢教練（MediaPipe Hands，純前端） |
| `/admin/` | Decap CMS 寫作後台。**只在本機 `./dev.sh` 模式可用**；線上沒有 OAuth proxy，故不對外連結、robots 也擋掉 |

## 技術 stack

- 純靜態 HTML + 自寫 CSS（`assets/css/site.css`，首頁「工坊」與內頁「教科書」兩套皮膚）
- Vanilla JS（fetch WordPress.com REST API）
- 文章：Markdown + YAML frontmatter；`posts/*/index.json` 與靜態殼由 GitHub Action 自動重建
- Decap CMS v3（`/admin/`，本機模式）
- GitHub Pages 部署（main branch 自動）

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
  - 顯示 GitHub 公開專案
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
