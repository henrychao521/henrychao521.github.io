# /admin/ 後台啟用步驟

Decap CMS（前 Netlify CMS）給你 **WordPress 級的所見即所得編輯體驗**，
但所有內容存在 GitHub repo（純 markdown），完全免費、可版本控制。

## 啟用流程（一次性，約 10 分鐘）

### Step 1 — 註冊 GitHub OAuth App

1. 前往 https://github.com/settings/developers
2. 點 **「OAuth Apps」** → **「New OAuth App」**
3. 填入：
   - **Application name**: `Henry × LivingTech CMS`
   - **Homepage URL**: `https://henrychao521.github.io`
   - **Authorization callback URL**: `https://decap-proxy.fly.dev/callback`
4. 註冊後會拿到：
   - **Client ID**（公開可貼）
   - **Client Secret**（私密，等等需要）

### Step 2 — 設定 OAuth Proxy

GitHub OAuth 需要伺服器端代為處理 token 交換（不能純前端）。
社群有現成的免費 proxy 可用。

#### 選項 A：社群免費 proxy（**推薦初學**）

預設設定已經指向：

```yaml
base_url: https://decap-proxy.fly.dev
auth_endpoint: /api/auth
```

去這個 proxy 註冊：https://decap-proxy.fly.dev/

#### 選項 B：自架（穩定，建議長期用）

```bash
# 用 Cloudflare Workers 或 fly.io 部署
npx create decap-cms-oauth-server
# 參考 https://decapcms.org/docs/external-oauth-clients/
```

把自己的 base_url 寫到 `admin/config.yml`。

### Step 3 — 本機測試（不用 OAuth）

```bash
cd /Volumes/128G/henrychao521.github.io
npx decap-server &              # 啟用本機 proxy
python3 -m http.server 8080     # 任意 static server
# 開瀏覽器：http://localhost:8080/admin/
# 不會問你登入，直接寫文章存到本機 git
```

### Step 4 — 部署到 GitHub Pages

```bash
git push                                  # 推主 branch
# GitHub Pages 自動部署到 https://henrychao521.github.io
# 開：https://henrychao521.github.io/admin/
# 點 "Login with GitHub" → 授權 → 開始寫文
```

## 使用流程（每次寫文）

1. 打開 https://henrychao521.github.io/admin/
2. 用 GitHub 登入（一次後會記住）
3. 左側點 **「🛠 Maker 教學文」** 或 **「📝 教學心得」**
4. **「New Maker 文章」** → 填標題、選分類、寫內文（Markdown，支援拖曳上傳圖片）
5. **「Save」** → 存草稿（`draft: true`）
6. **「Publish」** → 自動 commit 到 repo + GitHub Pages 重新 build
7. 1–2 分鐘後文章就上線

## 草稿審核流程（已啟用 editorial_workflow）

```
Draft (草稿)
   ↓
In Review (待審)
   ↓
Ready (準備發佈)
   ↓
Published (上線)
```

每階段都會在 repo 開 PR，可以看 diff、加註解，再合併。

## 常見問題

**Q: 我為什麼不直接用 WordPress？**
A: 你已經有 livingtech.education 在用 WP。這個 /admin/ 是給「**程式碼多 / Markdown / GitHub 整合**」的技術文用，補 WP 的不足（WP 對 code block 不友善，不能跟 git 整合）。

**Q: 寫的文章可以同步到 WP 嗎？**
A: 可以！未來如果要做反向同步，可以加一個 GitHub Action 把 `/posts/maker/*.md` 轉發到 WP API。先試用看看再決定。

**Q: 我可以從手機寫文嗎？**
A: 可以。Decap CMS 響應式介面，手機平板都能用。

**Q: 圖片會放哪？**
A: `assets/uploads/`，會 commit 到 repo。圖檔大時建議外連 imgur 或 Cloudflare Images。
