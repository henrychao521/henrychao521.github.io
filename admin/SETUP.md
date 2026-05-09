# /admin/ 後台啟用步驟

Decap CMS 給你 **WordPress 級的所見即所得編輯體驗**，
所有內容存在 GitHub repo（純 markdown），完全免費、可版本控制。

---

## 🚀 目前採用：本機模式（Local Backend）

**不需要 OAuth proxy，最簡單路徑。**
詳見 repo 根目錄的 [`QUICKSTART.md`](../QUICKSTART.md)。

```bash
cd henrychao521.github.io
./dev.sh
# 開瀏覽器：http://localhost:8080/admin/
# 直接寫文，不用登入
```

寫完 `git push` 上線。

---

## 🌐 未來：走線上 OAuth（手機 / 平板 / 學校電腦也能寫）

如果之後想任何裝置都能登入寫文，需要架 OAuth proxy。
有兩條路：

### 路徑 A：Cloudflare Workers（推薦）

永久免費（每天 10 萬次請求）、不用搬站。

1. 註冊 Cloudflare 帳號（用 GitHub 登入即可）
2. 部署一個 OAuth proxy worker（程式碼約 50 行）
3. 編輯本檔同層的 `config.yml`：
   ```yaml
   backend:
     name: github
     repo: henrychao521/henrychao521.github.io
     branch: main
     base_url: https://your-worker.workers.dev
     auth_endpoint: /auth
   ```
4. 把 GitHub OAuth App 的 `Authorization callback URL` 改成 `https://your-worker.workers.dev/callback`

需要時告訴我，我幫你寫 Worker 程式碼。

### 路徑 B：搬站到 Netlify

**最簡單**，但網址會從 `henrychao521.github.io` 變 `henrychao521.netlify.app`（可後續加自訂網域）。

1. 註冊 Netlify
2. Import GitHub repo
3. Site settings → 啟用 Identity + Git Gateway
4. 編輯 `config.yml`：
   ```yaml
   backend:
     name: git-gateway
     branch: main
   ```

---

## 你目前 GitHub OAuth App 狀態

- **Client ID**：`Ov23liMb94TWFOOaYsU0`（你已建立）
- **Callback URL**：原本指 `https://decap-proxy.fly.dev/callback`（已失效）
- **Client Secret**：未來啟用線上模式時才需要

> **目前本機模式不需要用到上面這些。**保留 OAuth App 不用刪，未來改走 Cloudflare/Netlify 時可繼續用，只要更新 Callback URL。

---

## 常見問題

**Q: 我為什麼不直接用 WordPress？**
A: 你已經有 livingtech.education 在用 WP（保留中）。這個 /admin/ 是給「**程式碼多 / Markdown / GitHub 整合**」的技術文用，補 WP 的不足。

**Q: 寫的文章可以同步到 WP 嗎？**
A: 可以，未來可以加 GitHub Action 把 `posts/maker/*.md` 透過 WP REST API 同步發過去。先試用看看再決定。

**Q: 草稿審核流程？**
A: `config.yml` 已啟用 `editorial_workflow`，後台可以分 Draft / In Review / Ready 三階段，每階段對應 git PR。
