# 寫作 QUICKSTART

> 本機模式（不需要 OAuth proxy，最簡單路徑）

## 第一次跑（裝套件）

```bash
cd /Volumes/128G/henrychao521.github.io

# 確認有 Node 18+（你已有 v24，OK）
node --version

# 啟動寫作環境
./dev.sh
```

第一次會 `npx -y decap-server` 下載 Decap server（約 10MB，一次性）。

---

## 開始寫文

啟動後打開瀏覽器：

| 用途 | 網址 |
|------|------|
| 看站長什麼樣 | http://localhost:8080/ |
| **寫文後台** | **http://localhost:8080/admin/** |

進到後台會看到兩個 collection：

- **🛠 Maker 教學文** — 對應 `posts/maker/`
- **📝 教學心得** — 對應 `posts/blog/`

點 **「New Maker 文章」** → 填 metadata + 寫內文 → **「Save」**。

> **本機模式不會問你登入** — 直接寫直接存到本機檔案。

---

## 文章寫完後上線（3 步驟）

```bash
# 1. 看寫了什麼
git status

# 2. commit
git add posts/ assets/uploads/
git commit -m "新增文章：標題"

# 3. push 上線
git push
```

GitHub Pages 會在 1–2 分鐘內把新文章 deploy 到 https://henrychao521.github.io

---

## 停止本機 server

```bash
./dev.sh stop
```

或直接關終端機視窗 + `lsof -ti:8080 | xargs kill`（雙保險）。

---

## 直接用編輯器寫（不開後台也行）

如果你習慣 VS Code / Sublime，也可以**直接寫 markdown**：

```bash
# 在 posts/maker/ 下放新檔
# 命名：YYYY-MM-DD-slug.md
```

YAML frontmatter 範本（複製貼上即可）：

```yaml
---
title: "[實作筆記] 你的文章標題"
date: 2026-05-10T14:00:00+08:00
author: "Henry Chao"
cover: "/assets/uploads/your-cover.jpg"
categories: [esp32, electronics]
tags: [tag1, tag2]
repo: "your-repo-name"
level: "⭐ 入門"
hours: "2–4 hrs"
excerpt: "一句話描述，會顯示在文章列表。"
draft: false
---

## 為什麼想做這個？

正文⋯
```

寫完一樣 `git push` 上線。

---

## 文章索引 — 已自動化 ✅

`posts/maker/index.json` 與 `posts/blog/index.json` 由 GitHub Action 自動產生，
**你不用管它**。流程：

```
你 push 一篇新 .md
      ↓
GitHub Action 觸發（.github/workflows/build-indexes.yml）
      ↓
跑 scripts/build-indexes.py
      ↓
掃描 posts/maker/*.md + posts/blog/*.md
      ↓
產生新 index.json，commit 回 main（commit 訊息含 [skip ci]）
      ↓
GitHub Pages 重新 build → 站上看得到新文章
```

整個過程約 1–2 分鐘，全自動。

### 要本機跑也行：

```bash
python3 scripts/build-indexes.py
```

> ⚠️ 你**只需要寫 .md**。index.json 不要手動編。

---

## 未來想要從手機 / 學校電腦寫？

走 **路徑 A（Cloudflare Worker）** 或 **路徑 B（搬 Netlify）** 設定 OAuth。
本機模式沒辦法遠端登入。

---

## 常見問題

**Q: `./dev.sh` 卡住沒反應？**
A: 第一次跑會下載 decap-server（約 10 MB），等一下。

**Q: 8080/8081 port 被佔用？**
A: `./dev.sh stop` 強制清掉。或改 `dev.sh` 內的 port 號碼。

**Q: 寫完忘記 push？**
A: 文章只在本機，`git status` 會看到 untracked。記得 `git add . && git commit -m "..." && git push`。

**Q: 圖片要怎麼加？**
A: 後台拖曳上傳會存到 `assets/uploads/`，commit 進 repo。圖很多時建議用 imgur 外連。

**Q: 想刪文章？**
A: 後台沒有刪除按鈕（保險設計）。直接刪 `posts/maker/xxx.md` 後 push。
