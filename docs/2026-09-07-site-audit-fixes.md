# 2026-09-07 全站稽核修正紀錄

對 henrychao521.github.io 主站（首頁、教學文、Maker、文章頁、servo-arm、grip-coach）做完整檢視後，照「先修真的壞掉的功能，再修過期文案」的順序全部修掉。每一項都寫：問題是什麼、根因在哪、改了哪裡、沒動什麼、怎麼驗證。

---

## 1. Maker 教案「找相關教學文」永遠 0 篇

**問題**：每個教案下方的「找相關教學文」點下去都是「沒有找到符合的文章」。

**根因**：`maker.html` 把整句教案標題（例如「16×16 LED 中文跑馬燈」）丟去 WordPress 全文搜尋。原站 219 篇文章沒有任何一篇同時含這幾個字。實測搜尋「16×16 LED 中文跑馬燈」得 0 篇，但搜「LED」得 30 篇。

**改哪裡**：`maker.html`
- 每個教案加一個 `search` 欄位，指定原站真的搜得到的關鍵字或分類 id（事先用 WP API 逐一查過命中數）：

```js
// 前
{ title: '16×16 LED 中文跑馬燈', repo: 'xiao-esp32s3-led-matrix', ... }
<a href="/articles.html?q=${encodeURIComponent(item.title)}">找相關教學文</a>

// 後
{ title: '16×16 LED 中文跑馬燈', search: { q: 'LED' }, repo: 'xiao-esp32s3-led-matrix', ... }
{ title: '全息投影 3D 模型互動',  search: { cat: 2131, label: '3D' }, ... }
const searchURL = sr => sr.cat ? `/articles.html?cat=${sr.cat}` : `/articles.html?q=${encodeURIComponent(sr.q)}`;
<a href="${searchURL(item.search)}">找相關教學文（${item.search.label || item.search.q}）</a>
```

- 連結文字加上括號標出關鍵字，讀者知道會搜到什麼。

**沒動什麼**：教案內容、難度篩選。

**驗證**：本機開站點每個連結，9 個教案各連到 LED(30)、遙控車(9)、3D 分類(34)、骨架(3)、AI 分類(6)、Raspberry(11)、監控(2)、學習歷程(1)。

---

## 2. /admin/ 後台在線上登不進，卻公開連出去

**問題**：Maker 頁兩處把訪客導向 `/admin/`。線上的 Decap CMS 顯示「Login with GitHub」，按下去必失敗。

**根因**：`admin/config.yml` 的 `backend: github` 沒設 `base_url`（OAuth proxy），Decap 只能在本機 `./dev.sh` 的 local backend 模式運作。線上根本沒有登入路徑。另外 `robots.txt` 擋的是早就刪掉的 `/projects.html`。

**改哪裡**：
- `maker.html`：拿掉兩處 `/admin/` 連結（章節副標與「還沒有文章」提示）。
- `robots.txt`：`Disallow: /projects.html` → `Disallow: /admin/`。
- `README.md`：明講後台只在本機模式可用。

**沒動什麼**：`admin/` 目錄本身保留，本機寫文流程不變。

---

## 3. 文章分享到 LINE／FB 只顯示「載入中」

**問題**：分享 `post.html?slug=…` 到社群，預覽標題是「載入中 — 趙珩宇」、沒有描述、沒有圖。

**根因**：`post.html` 是一頁式讀取器，`<title>` 靜態寫死「載入中」，og 標籤完全沒有；社群爬蟲不執行 JS，所以看不到 JS 之後填進去的標題。靜態站的查詢字串頁面本質上無解，必須每篇一個實體 HTML。

**改哪裡**：
- `scripts/build-indexes.py`：重建索引時，同時以 `post.html` 為模板為每篇產生靜態殼 `posts/<collection>/<slug>.html`，`<head>` 預填 title、description、canonical、og:title/description/url/image、twitter:card；殼的內文仍由前端讀同名 `.md` 渲染，所以改 `post.html` 就會反映到所有殼。過期的殼（文章改名）會自動刪。
- `post.html`：加 `<!--POST-META-->` 與 `<!--POST-SLUG-->` 兩個模板標記；`loadPost()` 優先讀殼提供的 `window.POST_SLUG / POST_COLLECTION`；舊式 `?slug=` 進來的讀完後 `history.replaceState` 換成殼的網址，之後從網址列複製分享就有預覽。
- 站內所有連結改指向殼：`index.html` 2 處、`articles.html`、`maker.html`、9 篇文章內文的互連（`/post.html?slug=X` → `/posts/blog/X.html`）。
- `.github/workflows/build-indexes.yml`：觸發條件加 `post.html`，commit 時一併加入殼檔。

**沒動什麼**：`post.html?slug=` 舊連結仍可用（相容）。

**驗證**：本機開 `/posts/blog/2026-08-31-monthly-report.html`，head 有 7 個 meta 且值正確；開 `/post.html?slug=2026-05-10-grip-system-evolution`，內容正常且網址自動換成 `/posts/maker/…html`。

---

## 4. 每篇 blog 文章都先吃一個 404

**根因**：`post.html` 先試 `posts/maker/` 再試 `posts/blog/`，21 篇 blog 文每次都在 console 留一個 404。

**改哪裡**：殼直接告知 collection，不用猜；舊式進入時改成先試 blog（文章多）。

---

## 5. 文章排序與封面圖靠兩份手工清單

**問題**：`articles.html` 裡寫死 `FEATURED_ORDER`（21 個 slug 的順序）與 `DIAGRAM`（slug→圖），每寫一篇新文要回來改兩處，漏改就排到最後、沒圖。

**改哪裡**：
- 排序與圖搬進各篇 frontmatter：同一天多篇的加 `order: N`，12 篇舊文補 `cover:`。
- `scripts/build-indexes.py` 的 `OPTIONAL_FIELDS` 加 `order`，index.json 排序改成日期新→舊、同日依 order。
- `articles.html` 刪掉兩份清單，只剩一行排序與 `p.cover`。

**驗證**：本機 articles 頁 21 篇順序與改前完全相同，每篇都有圖。

---

## 6. 小修（同一批）

- `assets/js/shared.js` `formatDate`：`new Date('2026-08-31')` 以 UTC 解析，UTC 以西時區會顯示前一天。純日期字串改用正則直接切。
- `articles.html` 搜尋框 `keypress` → `keydown`（keypress 已棄用）。
- `post.html` 的 marked 從無版本改鎖 `marked@15.0.12`。
- `index.html` 頁尾站台地圖補上 servo-arm 與 grip-coach（原本沒有任何導覽連到 servo-arm）。

---

## 7. 過期文案與死碼

- `assets/js/shared.js`：ai-physics-demos 的介紹仍寫「繞射・摩爾紋・光譜・無影燈」四個 demo，實際已是 57 個物理模擬的平台，改寫；livingtech-tools「19 個教具」改「二十多個」；本站介紹的「Tailwind」拿掉。刪除已無頁面使用的 `fetchGHRepos / fetchGHReposSafe / REPO_FALLBACK / THEME_COLORS / GH_API`（projects.html 刪除後留下的）。
- `README.md`：站內結構表重寫（projects.html、Tailwind、600+ 篇都是舊資訊），加靜態殼與 servo-arm、grip-coach 說明。
- `QUICKSTART.md`：`/Volumes/Work/…` 路徑改 `~/3d/henrychao521.github.io`。

---

## 8. servo-arm：拆頁後 20 個站內錨點全死

**問題**：五支手臂頁與總覽頁裡，像 `#torque`、`#failures`、`#vv` 這種連結點了完全沒反應。

**根因**：這些頁面不是手寫的，是私人 repo `servo-arm` 的 `tools/split_pages.py` 把一份 300 kB 的紀錄頁 `index.html` 依章節切成六頁。切的時候只重建導覽，內文裡的 `href="#id"` 沒改；id 現在在別的檔案上，瀏覽器找不到就什麼都不做。這種錯不會報 console，只有點了才知道。

**改哪裡**（都在 servo-arm repo，再重建複製過來）：
- `tools/split_pages.py` 新增 `_relink_anchors()`：切完後掃每頁所有 `id`，凡 `href="#x"` 的 x 不在本頁、但恰好在另一頁，就改成 `href="<那頁>#x"`；哪裡都沒有的保留原樣，讓打錯字仍會顯露成死連結而不是被掩蓋。
- `verify()` 原本逐章節逐位元組比對「拆後＝原始」，會被改寫的 href 打破；比對前先把 `<page>#x` 還原成 `#x`，內文守衛不變。
- 導覽「頁面」群組加「← 入口頁」與「站首頁」（絕對網址；用 `../` 會被 `build_static.py` 的靜態路徑檢查擋下）。
- 紀錄頁的捲動高亮處理器把每個 nav href 丟進 `querySelector`，遇到 `https://…` 會拋例外（T11 測試立刻抓到），改成只處理 `#` 開頭的連結。
- `sim/compare_template.html`、`sim/playground_template.html` 與其產物：對照頁「← 回 Arduino 沙盒」其實連到入口頁，改文字；沙盒頁原本零對外連結，加「← 入口頁」。

**驗證**：重建後掃六頁 `href="#…"` 對不到本頁 id 的數量 0（改前 16 個 id、20 處）；servo-arm 自己的 T9（Playwright 實跑）26/26、T11（靜態發布）32/32 通過；本機開 `arm-sg90.html#torque` 確實捲到目標。

---

## 9. servo-arm：數字與內容互相矛盾

| 位置 | 改前 | 改後 | 依據 |
|---|---|---|---|
| 入口頁 `index.html` | 35 層測試 | 12 層 | 括號裡自己列的就是 12 層，report 也寫 T0–T11 |
| 入口頁 ×2 | 65 項失敗紀錄 | 66 | 紀錄頁最大編號是 #66 |
| 總覽 KPI | 204/205、34 個錯誤 | 567/567（4 跳過）、66 | `tests/results.json` |
| 總覽對照表 | 四支手臂、缺 DM-J4310 | 五支、加一列＋階梯表加一欄 | `tools/make_comparison.py` 從 `cad/actuators.py` 讀出，非手打 |
| 對照表儲存格 | 「Feetech FT5425BL（標準尺寸無」（半截） | 「Feetech FT5425BL」 | `label[:22]` 硬切字串改成在全形括號前切 |
| 失敗編號 | #28 出現兩次、#53 沒人用 | v2 那個「普查法」改 #53 | 失敗紀錄章節的 #28 在 #21→#28→#29 的連號裡，是原始的；v2 章節是後補的 |
| STS3215 尺寸表 | 本體 45.2×37.4×24.7 | 40.6×20.0×30.9（包絡 62.6×34.9×20.0） | 那組數字是 STS3250 的，FT5425BL 的正確值在 #46 |
| 入口頁 STS3215 | 「四支裡唯一報得出真實位置的」 | 「五支裡第一支報得出真實位置的」 | DM-J4310 也有回授 |
| 入口頁 DM-J4310 | 「CAD 另需一套結構」（像未做） | C1–C5 皆完成 | arm-dm4310 頁的進度表 |
| 入口頁手機說明 | 「3D 視圖在上、編輯器在下」 | 「編輯器在上、3D 視圖在下」 | DOM 順序如此，沒有 CSS order |
| feasibility.html | 「要你決定要不要換 STS3215」仍是開放問題 | 加 2026-09 後記，決定已做 | 保留當時判斷不回改 |
| 4 張失敗卡片 | `class="fail"` 顯示成裸文字 | `class="card fail"` | CSS 只定義 `.card.fail` |
| arm-ft5425bl | 原始 markdown `**設定點的迴轉速率**` | `<strong>` | |

**刻意沒改**：總覽 V&V 章節內文的「125 項檢查」「205 項」等是當時階段的敘述，屬歷史紀錄，不回頭改成現在的 567。

**servo-arm repo 的 `sim/hub.html` 有一個不是我改的未提交修改，維持原狀未納入 commit。**

---

## 10. grip-coach 整頁重寫

原檔是從 CodePen 貼過來的，問題一串：沒有 viewport meta（手機以 980px 版面縮放）、覆蓋層 canvas 沒設 `width/height`（預設 300×150 被拉成 640×480，骨架線變橢圓且糊）、影像區硬寫 640px 在手機溢出、模型或相機載入失敗只會永遠轉圈不報錯、閾值用絕對值（手離鏡頭遠近會改變判斷）、每幀判斷閃爍、標題留「CodePen 版」、CDN 未鎖版本且載了兩個沒用到的套件、頁面沒有任何回站的連結。

**改法**（同一檔 `grip-coach/index.html`）：
- 加 viewport、description、站內樣式與「← 回首頁」。
- 影像區改 `width:100%; max-width:640px`，長寬比在 `loadedmetadata` 時依實際串流設定；canvas 實際像素 = 串流尺寸 × DPR（上限 2）。
- 改成明確的「開啟相機／關閉相機」按鈕；`hands.initialize()` 先等模型載好；相機錯誤依 `err.name` 翻成人話（權限被拒、找不到、被佔用、需 https）；只有 `OverconstrainedError / NotFoundError` 才放寬條件重試，權限被拒不重問。
- 三個判斷距離全部除以手掌長度（手腕→中指尖）正規化；最近 10 幀多數決，不閃爍。
- 頁面切到背景時釋放相機，回來自動接上（iOS Safari 會把畫面凍住）。
- 截圖改鏡像後所見即所得，並用 blob 而非 data: URL（iOS 才會真的下載），檔名帶當下判斷。
- CDN 鎖版 `@mediapipe/hands@0.4.1675469240`、`drawing_utils@0.3.1675466124`，`locateFile` 用同一版本；移除沒用到的 camera_utils、control_utils。

**驗證**：本機 390px 寬頁面寬 390、無溢出、兩個 CDN 全域物件都載入、零 console 錯誤。相機實際辨識需要真人手在鏡頭前，這部分請你上線後用手機實測一次。

---

## 驗證總表

| 項目 | 方式 | 結果 |
|---|---|---|
| 首頁／教學文／Maker／文章殼／舊式文章連結 | 本機 http.server + 瀏覽器實跑，讀 console 與 DOM | 13 作品格、6 篇文章、21 篇手記順序不變且有圖、WP 12 篇/頁、零錯誤 |
| 靜態殼 meta | 讀 head | title/description/canonical/og ×4/twitter 齊全 |
| servo-arm 死錨點 | 腳本掃六頁 | 20 → 0 |
| servo-arm 測試 | T9 Playwright 26/26、T11 靜態發布 32/32 | 全過 |
| grip-coach 手機 | 390px 量 scrollWidth | 390，無溢出 |
| 索引重建 | `python3 scripts/build-indexes.py` | 27 篇、27 個殼 |
