# 2026-10-22 全站分析與優化規劃

對 henrychao521.github.io（本 repo 全部程式、27 個頁面、26 篇文章、servo-arm 與 grip-coach 子站）做第二次完整檢視，接續 `docs/2026-09-07-site-audit-fixes.md`。這份是**規劃**，不是修正紀錄：每一項寫清楚問題、根因、建議改法與驗證方式，照優先序排，方便逐批動手。

**本次檢查方法**

- 讀完所有手寫程式：`index.html`、`articles.html`、`maker.html`、`post.html`、`assets/js/*.js`、`assets/css/site.css`、`scripts/*.py`、`.github/workflows/build-indexes.yml`、`admin/*`、`grip-coach/index.html`、`servo-arm/*.html`。
- 本機重跑 `scripts/build-indexes.py`，確認 index.json 與 26 個靜態殼與原始 .md 完全同步（git 無 diff）。
- 腳本掃站內連結、圖片、cover、CSS 類別使用情形、frontmatter 欄位。
- 把首頁「線上作品」文案裡有具體數字的 8 個公開姊妹 repo（ai-physics-demos、emt-course-site、taiwan-engineering-geo、xindian-flood-sim、laser-cut-course、livingtech-tools、living-portal、coding-dojo）淺層 clone 下來逐一核對數字。
- 用 GitHub API 查 Actions 執行紀錄、commit 歷史、Maker 教案 9 個私有 repo 的可見性。
- 26 篇文章與 servo-arm 10 頁交給三個子代理逐篇讀，再抽查其結論。

**本次無法驗證的項目**（這個執行環境的網路政策擋掉外部 HTTPS）：線上站台當下回應、WordPress.com REST API 的分類數與文章總數、henrylivingtech.com 是否存活、CDN 資源可達性。這些在下一節有列出要在本機確認的指令。

---

## 0. 總覽：健康度與結論

| 面向 | 狀態 | 一句話 |
|---|---|---|
| 建置流程 | 🟢 大致健康 | index.json／靜態殼與 .md 同步；Action 從未真正 commit 過（作者一向本機建好再推），但 workflow 有一個刪檔不會被 commit 的潛在 bug |
| 站內連結／圖片 | 🟢 | 頂層頁面與 26 篇文章的站內連結、33 處圖片全部存在 |
| 社群分享預覽 | 🟡 | 4 篇文章 `og:image` 指向 SVG（LINE／FB 不吃）；20 篇 blog 的 excerpt 全部超過 150 字被截成「…」；6 篇 maker 無 cover 全用同一張預設圖 |
| 資料正確性（首頁文案） | 🟡 | 17 張作品卡中 EMT（98 題→實為 210 題、9 張圖→實為 6 張）與物理平台（「七館」且重複計算）需改；其餘核對過的數字正確 |
| 資料正確性（文章內文） | 🟡 | 8/31 兩篇文章仍寫「35 層測試」「65 項失敗」（9/7 稽核只改了 servo-arm 子站沒改文章）；另有十餘處小矛盾 |
| CMS 後台 | 🔴 潛在破壞 | `admin/config.yml` blog collection 缺 5 個欄位，用後台存檔會把 `level/hours/author/repo/order` 清掉；settings collection 指向不存在的 `data/site.yml` |
| SEO／可發現性 | 🟡 | 無 sitemap.xml、無 RSS、無 404 頁、頂層三頁無 canonical；文章列表完全靠前端拉 WP API，爬蟲看不到 |
| 程式品質 | 🟢 小瑕疵 | 少量死碼（`SPANS`、`s-12`、`PROJECT_META` 三個 misc 項、4 個 CSS 類別）、未鎖版 CDN（decap-cms） |
| Maker 教案（maker.html CATALOG 與 6 篇文章） | 🟡 | 9 個 repo 全私有但文章結尾寫「歡迎 PR」；LED 跑馬燈成本 600 vs 文內 1,200、電源 3 A vs 10 A；Pi5 成本漏 NVMe／電源；多處硬體名稱與文章不符 |
| servo-arm 子站 | 🟢 9/7 修正全在 | 死錨點 0、資產 0 缺；入口頁沒有回主站連結；report.html 三處仍寫「四支」；10 頁無 description |
| grip-coach | 🟡 | 5 個會卡死或重複跑的路徑（初始化失敗不重置、rAF 不取消、metadata 等待無 timeout、iOS videoWidth=0、錯誤洗頻）；距離量測沒修正畫面比例 |

**建議動手順序**：第 1 節（會壞資料或讓分享沒圖的）→ 第 2 節（數字錯）→ 第 3 節（建置與 SEO 基礎設施）→ 第 4～6 節（內容與子站）→ 第 7 節（程式整理）。第 1、2 節加起來約半天可完成。

---

## 1. 優先修：會壞資料、或讀者看得到的功能問題

### 1.1 Decap CMS 存檔會清掉 blog 文章的 5 個欄位

- **問題**：26 篇文章 frontmatter 全部有 `author`、`level`、`hours`、`repo`（15 篇）、`order`（16 篇），但 `admin/config.yml` 的 blog collection 只宣告 title／date／cover／category／tags／excerpt／body／draft。Decap 存檔時依 config 重寫 frontmatter，未宣告的欄位會消失（待在本機 `./dev.sh` 開一篇舊文按 Save 實證一次）。
- **後果**：同日多篇的排序（`order`）失效；`post.html:125-142` 的難度／時數／repo 區塊消失。
- **改法**：`admin/config.yml` blog fields 補 `author`（default Henry Chao）、`level`（select，與 maker 相同三選一）、`hours`（string）、`repo`（string）、`repo_private`（boolean）、`order`（number, required: false）。maker collection 同樣補 `repo_private`、`order`（6 篇 maker 文章第 9 行全都有 `repo_private: true`，目前 CMS 一存就掉）。
- **一併處理**：settings collection 指向 `data/site.yml`，檔案不存在，開後台會報錯。二選一：建立 `data/site.yml`（title／description／featured_posts）並讓首頁讀它，或直接刪掉這個 collection（目前沒有任何程式讀它，建議刪）。
- **驗證**：`./dev.sh` → 開任一篇 blog 舊文 → Save → `git diff` 應只有你改的那一行。

### 1.2 四篇文章的分享預覽沒有圖（og:image 是 SVG）

- **檔案**：`posts/blog/2026-06-26-ai-auto-project-video.md:5`、`2026-07-08-lattice-hinge-designer.md:5`、`2026-07-14-pcb-grader-solder-ai.md:5`、`2026-07-23-meshtastic-family-mesh.md:5`，`cover` 都是 `/assets/blog/diagram-*.svg`，`scripts/build-indexes.py:write_shell` 原樣寫進 `og:image`。FB／LINE／X 的爬蟲不渲染 SVG。
- **改法**：這 4 篇 `cover` 改成點陣圖。lattice-hinge 與 project-lab-film 已有 `/assets/covers/*.jpg` 可直接用；pcb-grader、meshtastic 需各出一張 1200×675 jpg（可用 `scripts/make_blog_covers_2026_08.py` 的作法，但那支腳本寫死 `/Volumes/Work/...` 四個路徑，見 7.4）。文內的 diagram SVG 保留不動。
- **防呆**：`build-indexes.py` 在 `write_shell` 加一行：cover 副檔名是 `.svg` 時改用預設 jpg 並印警告，之後新文章不會再踩。
- **驗證**：重建後 `grep -l 'og:image" content="[^"]*\.svg' posts/*/*.html` 應為 0。

### 1.3 20 篇 blog 的 excerpt 全部超過 150 字

- **現況**：159～213 字，殼的 `description`／`og:description` 一律在第 150 字切斷加「…」，分享卡片是半句話。
- **改法**：逐篇把 excerpt 修到 ≤150 字且是完整句（列表頁 `articles.html` 用的也是同一欄位，縮短後列表更整齊）。或者在 `build-indexes.py` 改成「在 150 字內最後一個全形句號處截斷」，兩者並行最好。
- **順帶**：6 篇 maker 文章沒有 `cover`，殼全部用 `parts-spinner-960.jpg`，六篇分享出去是同一張指尖陀螺。各補一張截圖或照片。

### 1.4 GitHub Action 刪掉的過期殼不會被 commit

- **檔案**：`.github/workflows/build-indexes.yml`，`git add posts/maker/*.html posts/blog/*.html`。shell glob 只展開「現在存在」的檔案，`build-indexes.py` 刪掉的孤兒殼（文章改名或刪除時）不會被 stage，於是留在 repo、留在線上，變成沒人連的孤兒頁，搜尋引擎還會繼續收錄。
- **現況無害的原因**：Action 從未實際 commit 過（用 API 查過 bot 零 commit；作者每次都本機建完一起推）。但只要有一次從手機或 CMS 直接推 .md，這個 bug 就會顯現。
- **改法**：改成 `git add -A posts/maker posts/blog`，並拿掉 `2>/dev/null || true`（它會把真正的錯誤吞掉）。
- **另一個要確認的點**：bot commit 帶 `[skip ci]`，要確認 GitHub Pages 的「從 main 分支部署」是否也會被略過；若會，index.json 會在線上停在舊版直到下一次人工 push。確認方式：故意推一篇只改 .md 的 commit，看 bot commit 之後 Actions 頁有沒有對應的 `pages build and deployment`。若沒有，把 `[skip ci]` 拿掉，改用 `paths-ignore` 或檢查 `github.actor != 'github-actions[bot]'` 防迴圈。

### 1.5 post.html 把閱讀時間顯示成「課時」

- **現況**：20 篇 blog 的 `hours` 都是「閱讀約 N 分鐘」，`post.html:126` 一律印成「課時 閱讀約 9 分鐘」。
- **改法**：post.html 依 collection 決定標籤：maker 顯示「課時」，blog 不加前綴。一行判斷。

---

## 2. 資料正確性：數字與事實

### 2.1 首頁作品卡（`assets/js/shared.js` PROJECT_META）核對結果

| 作品 | 首頁寫的 | 實際（來源） | 處置 |
|---|---|---|---|
| emt-course-site | 「98 題…隨機題庫」「9 張操作示意圖」 | 題庫 **210 題**（`assets/quiz-bank.json`，quiz.html 也寫 210）；第一線處置頁實際 **6 張**示意圖（`assets/img/*.webp`，docs/IMAGES.md 寫「六張」） | 改 210 題、6 張；tags 同步 |
| ai-physics-demos | 「七館共 56 個…另含繞射、摩爾紋、3D 光譜干涉、外科無影燈與 RC 氣墊船」 | 56 個 ✓，但 README 與 index.html 是**六館**＋「波動光學・幾何光學（既有作品）」＋「工程」；繞射等 5 個已含在 56 個裡 | 改「六館 56 個（含既有的繞射、摩爾紋…）」，拿掉「另含」 |
| taiwan-engineering-geo | 200 個地景 | 200 ✓（README）；另有「精選地景 10 個」與教師學習單 PDF 可補 | 不改，可加「附學習單 PDF」 |
| xindian-flood-sim | 7 個河段 | 7 ✓（overview/regions.json）；demo 連到 `/overview/` 正確 | 不改 |
| laser-cut-course（研習紀錄區） | 07-07＋07-09 二日、七章、8,709 句 | 全部 ✓（index.html、data/chapters.js 7 章、transcript.js 8,709 筆） | 不改。**注意該 repo 自己的 README 還寫「一日、五章、4,805 句」，是姊妹 repo 要改** |
| livingtech-tools | 二十多個互動教具 | 27 個子站目錄 ✓ | 不改 |
| coding-dojo | Pyodide＋CodeMirror 6 | ✓（Pyodide 0.29.4）；README 寫共 24 題 | 可補「3 單元 24 題」 |
| living-portal | 18 個即時面板 | **無法驗證**：公開 repo 只有 FastAPI 閘道，面板在私有的 taipei-dashboard／hydro-monitor／taiwan-rail-live | 請作者自行確認 18 這個數字 |
| 其餘 9 張（terrain-gp、x5、home-econ、pc13110、housing、lattice、shadowless、grip-coach、esp32-camera、project-lab-film） | 文案為質性描述，無具體數字 | — | 不需核對 |

### 2.2 文章內文的過期數字（9/7 稽核只改了 servo-arm 子站，沒改文章）

- `posts/blog/2026-08-31-servo-arm-five-actuators.md:110` 與 `2026-08-31-monthly-report.md:87`：「35 層測試」→ 12 層（servo-arm/index.html:524 與同篇 :116 都是 12）。
- `2026-08-31-servo-arm-five-actuators.md:10`（excerpt）、`:122`、`2026-08-31-monthly-report.md:65`：「65 項失敗」→ 66（同篇 :142 已引用 #66）。
- `2026-08-31-servo-arm-five-actuators.md:128`：「44.8%」「差了將近 7 個百分點」vs 同篇 :135-138 表格「44.7%」「低估 6.3 個百分點」。擇一統一（servo-arm/arm-sg90.html 用的是 44.8／6.8）。
- `2026-08-31-servo-arm-five-actuators.md:42`：「前三支有一個共同的致命傷：整個專案的每一層檢查，都只是拿一個模型去比另一個模型」句子接不上，致命傷應是「沒有回授」（monthly-report.md:59 寫法正確）。重寫這段。
- `2026-06-21-x5-roomtour-3d-classroom.md:121`、`:130`：8.82 × 10.48 = 92.4，不是「≈ 93 m²」。
- `2026-06-21-physics-interactive-sims.md:2`、`:11`、`:16`：標題與 excerpt 寫「三十幾個／30 多個」，現在是 56 個。標題別寫死數字，文首加一行後記。
- `2026-08-31-gamewatch-esp32-reverse.md:24`、`:108` 與 `monthly-report.md:166`、`:331`：「六項實測」vs 同篇 :65「從 6 項降到 5 項」。
- `2026-08-31-monthly-report.md:2`、`:10`、`:21`：標題「十件事」、excerpt「十條線」，內文八個編號章節＋「九、零散維運」3 項，數不出十。
- `2026-06-26-ai-auto-project-video.md:29`、`:60`「九個專案」vs `:89`「八專案快剪」。
- `2026-07-08-lattice-hinge-designer.md:77`「六個錯誤」vs `:101`「五個 bug」。

### 2.3 連錯或連不到的地方

- `2026-08-31-monthly-report.md:26`：「前一個月的月報」連到 Meshtastic 專案分享文，那篇不是月報。改文字。
- `2026-08-31-ambient-notes-part2.md:17`：「上一篇」連到 livingtech.education 首頁，不是該篇文章。補正確網址。
- `2026-08-31-gamewatch-esp32-reverse.md:23`「完整報告書（30 頁）在專案資料夾裡」、`2026-06-21-x5-roomtour-3d-classroom.md:144`「另見站內『技術文件』頁」：都沒連結，讀者到不了。補連結或刪句。
- `2026-08-31-livingtech-b-platform.md`：全篇沒有任何平台網址或 repo，是 20 篇裡唯一讀者無處體驗的專案文。補 demo 連結。
- 首頁便利貼 `index.html:47`「全部開源。」：Maker 教案 9 個 repo 全部私有（API 已確認：grip-system、moltbot、camera-hub-mac、off-axis-pi、sports-skeleton-analysis、student-portfolio-v3、xiao-esp32s3-led-matrix、esp32-arduino-sketches、taipei-dashboard 都是 private，其中 moltbot、camera-hub-mac 已 archived）。建議改「線上作品全部開源」。同理 `maker.html:37` lede「有公開 repo 的直接連到 GitHub」目前零命中，可改成「程式碼於課程中提供」。

### 2.4 Maker 教案（`maker.html` CATALOG）與 6 篇 maker 文章互相矛盾

| 位置 | 問題 | 改法 |
|---|---|---|
| `maker.html:91` cost `NT$ 600` vs `xiao-esp32s3-led-matrix.md:259/263`（XIAO 350＋面板 600＋電源）、`:387`「硬體大約 NT$600」 | 600 只算面板 | 改 NT$1,200 左右，或註明只算面板 |
| `xiao-esp32s3-led-matrix.md:279`、`:367`「256 顆全亮約 15 W = 3 A」vs `maker.html:90`「5V 10A 變壓器」 | WS2812B 全白每顆約 60 mA，256 顆理論約 15 A；15 W 是亮度 50/255 的值 | 寫「亮度 50 時約 3 A；全亮理論 15 A，故配 10 A 以上並限亮度」 |
| `maker.html:90`「Seeed XIAO ESP32S3」 | 文章 `:254-258`、`:324` 用到相機與板載 SD，需要 **Sense** 版 | 改 XIAO ESP32S3 Sense |
| `maker.html:93-94` 標題「ESP32-CAM 遙控車」 | 硬體是 XIAO ESP32S3 Sense，ESP32-CAM 是另一塊板 | 標題改「ESP32-S3 攝影遙控車」 |
| `maker.html:116`「NT$ 1,500（不含 Mac）」vs `camera-hub-mac-vlm.md:248`「每顆相機節點 NT$1,500 內」×4 | 整套約 6,000 | 改「NT$1,500／顆」 |
| `camera-hub-mac-vlm.md:26`、`:43`「Pi 收串流 → Mac 推論」vs `:165-171` ESP32 直連 Mac；`maker.html:114` 硬體有路由器沒 Pi | 拓撲兩說 | 擇一，硬體清單同步 |
| `camera-hub-mac-vlm.md:25`「算力比 Pi 強 50 倍以上」vs `:21` Pi4 2–5 FPS、`:113` Mac ~50 FPS | 只有 10～25 倍 | 改「10 倍以上」 |
| `maker.html:110`「用 LM Studio 或 Ollama」vs `moltbot-pi5-local-llm.md:304/308` LM Studio ARM 支援不完整、選 Ollama | | 改「Ollama」 |
| `maker.html:109/112` Pi5 硬體漏「官方 27W 電源」，成本「NT$ 4,000 以上」不含 NVMe HAT＋SSD＋散熱（文章 `:286-289` 全列必要） | | 補硬體、成本改 NT$6,000 以上 |
| `moltbot-pi5-local-llm.md:7` tags `Telegram`、`Docker`；`maker.html:111` skills 列 Docker | Telegram 是「下一步想做」（`:432`），Docker 只在比較表出現 | 移除或標「規劃中」 |
| `moltbot-pi5-local-llm.md:291`「30 秒以內」vs `:394`「TTFT ~10 秒」vs `:424`「第一次推論超慢」 | 首次載入時間三說 | 統一 |
| `xiao-esp32s3-led-matrix.md:2` 標題「V1 到 V5」、`:12`「6 個版本」，內文只有 V1、V1-SD、V2、V5 四階段 | | 補階段或對齊數字 |
| `xiao-esp32s3-led-matrix.md:7` tag `ST7735` | 內文只在 `:246` 以疑問句出現一次 | 刪 tag |
| `off-axis-pi-3d-gesture.md:322`「10 萬三角面以下流暢」vs `:337`「超過 50 萬才有瓶頸」 | | 取一 |
| `off-axis-pi-3d-gesture.md:290`「兩隻手 21 個關鍵點」 | 每手 21、共 42 | 改 |
| `sports-skeleton-pe-class.md:12`（index.json 同句）「給體育老師當數鏡子用」 | 疑為錯字 | 「當鏡子用」 |
| `sports-skeleton-pe-class.md:212`「3–6 節課」vs frontmatter `1–2 hrs`、`maker.html:98` | | 註明 1–2 hrs 是建置、3–6 節是授課 |
| `grip-system-evolution.md:201`「整合 `學生學習歷程平台`（私有）」 | 中文名被當程式碼標記 | 改 `student-portfolio-v3` |
| `maker.html:107` 硬體「自製筆」 | grip-system 文章全篇沒提，YOLO 偵測一般筆尖 | 刪或補說明 |
| `grip-system-evolution.md:206-217`、`xiao-esp32s3-led-matrix.md:381-392`、`camera-hub-mac-vlm.md:237`、`moltbot-pi5-local-llm.md:439`、`sports-skeleton-pe-class.md:194`、`off-axis-pi-3d-gesture.md:399` 結尾「歡迎提出 PR／Issue」「開源釋出」 | 六個 repo 全私有、frontmatter `repo_private: true` | 改「程式碼於課程中提供」，或真的公開 |
| `grip-system-evolution.md:3`、`off-axis-pi-3d-gesture.md:3` `date: 2026-05-27` 但檔名 `2026-05-10-…` | 與 CMS slug 規則不符 | 改檔名（連同殼與 index 重建）或改日期 |
| `maker.html:97` `'0（用現有設備）'` vs `:101`、`:120` `'0'` | 成本格式不一 | 統一「NT$ 0（用現有設備）」 |
| grip hours「6–10 hrs;最小可跑版 1 hr」在 `maker.html:187` 變成過長標籤 | | 縮成「6–10 hrs」，細節放內文 |

另外 `repo_private` 這個旗標目前只有 `post.html:137` 認得：`scripts/build-indexes.py:29-33` 的 `OPTIONAL_FIELDS` 沒有它，所以 `maker.html:187` 的 3.2 列表只能印出 repo 名、沒法顯示「程式碼於課程中提供」；`admin/config.yml` maker collection 也沒有這個欄位（與 1.1 同一類問題）。三處一起補。

### 2.5 時效性敘述（不算錯，但建議加後記）

8/31 發文至今無更新：`monthly-report.md:331`「下個月預計…」、`gamewatch:24`「目前還在紙上作業階段」、`meshtastic-hardware-rebuild:134`「目前都還停在設計階段」、`pi5-pocket-workstation:115` 待辦、`livingtech-b-platform:160`「待辦：開學後…」。狀態若已變，各加一行「後記（2026-10）」。

---

## 3. 系統優化：建置流程、SEO、韌性

### 3.1 sitemap.xml、RSS、404 頁（建置腳本一次做完）

- 現在沒有 `sitemap.xml`、`feed.xml`、`404.html`，`robots.txt` 也沒有 Sitemap 行。
- **改法**：`scripts/build-indexes.py` 既然已掃過全部文章，順手產：
  - `sitemap.xml`：4 個頂層頁＋26 個殼＋servo-arm 10 頁＋grip-coach，`lastmod` 用文章 date。
  - `feed.xml`（Atom）：blog＋maker 合併，最新 20 篇，內文用 excerpt。首頁與 articles.html `<head>` 加 `<link rel="alternate" type="application/atom+xml">`。
  - `robots.txt` 加 `Sitemap: https://henrychao521.github.io/sitemap.xml`。
  - `404.html`：教科書皮膚，給「回首頁／教學文／Maker」三個連結；GitHub Pages 會自動用根目錄的 404.html。
- workflow 的 `git add` 與 `paths` 觸發條件一併加上這三個檔。

### 3.2 頂層三頁補 canonical 與 twitter:card

`index.html`、`articles.html`、`maker.html` 有 og 但沒 `<link rel="canonical">`、沒 `twitter:card`；articles／maker 連 `og:image` 都沒有。各補四行。`post.html` 本身（不是殼）加 `<meta name="robots" content="noindex">` 放在 `<!--POST-META-->` 標記裡被殼取代，避免 `post.html?slug=` 舊網址與殼重複收錄。

### 3.3 WordPress 文章列表改「建置時快照＋前端更新」

- **現況**：首頁「最新教學文章」與 articles.html 的 200 多篇目次完全靠瀏覽器打 `public-api.wordpress.com`。API 慢、被擋、CORS 改政策，整段就是「無法拉取文章：HTTP …」；搜尋引擎也看不到任何一篇原站文章的標題。
- **改法**：加一個每日排程的 Action（`schedule: cron`）抓最新 N 頁與分類表存成 `data/wp-posts.json`、`data/wp-categories.json` 並 commit。前端先讀本地快照立即渲染，再背景打 API 更新（有新的才重畫）。articles.html 的分頁與分類篩選可直接在快照上做，搜尋仍走 API。
- **順帶修**：`fetchWPCategories` 只拿 `per_page=50`，WP 分類若超過 50 個，`FEATURED_CATEGORIES` 裡排後面的會被漏掉（這點要在本機開 API 確認分類總數）。改 `per_page=100`。
- **順帶修**：`articles.html` 的 `getQuery('page')` 沒驗證，`?page=abc` 會變 NaN 一路打到 API 回 400 才被接住。`parseInt` 後加 `|| 1`。

### 3.4 共用導覽與頁尾抽成模板

- 現況：導覽列與頁尾在 index／articles／maker／post 四處手抄，已經不一致（首頁站台地圖 7 項、其他頁 3 項；post.html 導覽少「原站」與 GitHub；grip-coach 另一套）。
- **改法**（不引入框架、不改前端渲染）：建 `templates/nav.html`、`templates/footer.html`，`build-indexes.py` 加一步把所有頂層頁的 `<!--NAV-->…<!--/NAV-->` 區段替換掉。頁面仍是純靜態，只是來源單一。
- 替代方案：接受手抄，但先把四頁頁尾站台地圖統一成首頁那 7 項。

### 3.5 CDN 鎖版與 SRI

- `admin/index.html` 用 `decap-cms@^3.0.0`（浮動範圍），改鎖到當下版本。
- `post.html` 的 marked、js-yaml 已鎖版；可再加 `integrity` 屬性（SRI）。grip-coach 的 MediaPipe 兩個 script 同理。

### 3.6 可及性（a11y）小修

- `.filter-tag` 按鈕加 `aria-pressed`；分頁目前頁加 `aria-current="page"`。
- `articles.html`／`maker.html` 的「載入中」容器加 `aria-live="polite"`，螢幕閱讀器才知道內容換了。
- `index.html` 導覽的目前頁沒有 `aria-current`（其他頁有）。

---

## 4. 內容優化：文章與列表

### 4.1 分類形同虛設

20 篇 blog 的 `category` 全是「專案分享」，而標題已自帶 `[除錯紀錄]`、`[資料處理]`、`[月報]` 等前綴。二選一：把標題前綴正式化成 category（除錯紀錄／資料處理／月報／專案分享／教學反思），articles.html 2.1 節加分類篩選；或拿掉 category 欄位不再假裝有分類。

### 4.2 給文章頁加標題錨點與目次

`post.html` 用 marked 渲染，標題沒有 id，長文（monthly-report 331 行、pc13110 230 行）沒法分享到某一節。用 marked 的 `renderer.heading` 加 slug id，h2 超過 4 個時在文首自動生一個目次。文內圖片加 `loading="lazy"`。

### 4.3 文章頁加上一篇／下一篇

index.json 已經有排序，殼在建置時就知道前後篇是誰。`write_shell` 把前後篇的 slug／title 寫進 `window.POST_PREV/NEXT`，post.html 在 `.b-article-foot` 渲染。零額外請求。

### 4.4 標點與排版一致性

- `2026-06-21-shadowless-lamp-sim.md:16-187` 整篇半形標點，其餘 19 篇全形。
- `2026-06-21-livingtech-tools-digital-jigs.md:144` 夾一個全形空白（U+3000）。
- `2026-06-21-living-tech-portal.md:18`、`:124` 同一張圖、同一句 alt 用兩次。
- 9 篇 08-31 文章與 07-14、07-23 沒有 `repo` 欄位（私有可理解），但 post.html 支援 `repo_private: true` 顯示「程式碼於課程中提供」，補上後讀者至少知道有這個 repo。
- `2026-05-10-grip-system-evolution.md` 與 `2026-05-10-off-axis-pi-3d-gesture.md` 全篇半形標點，其他四篇 maker 文全形（與 shadowless-lamp-sim 同一類）。
- 6 篇 maker 文 `cover: ""`（空字串而非省略），建置時退回預設圖；CMS image widget 存空字串，建議刪該行或補封面（同 1.3）。

---

## 5. grip-coach（AI 握筆姿勢教練）

CDN 鎖版一致（hands 與 `locateFile` 同版本），首頁文案與頁面功能相符。以下是程式邏輯問題，都在 `grip-coach/index.html`：

### 5.1 會卡死或重複執行的路徑

- `:175-183` `loadModel()`：`hands.initialize()` 失敗時 `hands` 已是非 null 的半成品，下次按「開啟相機」直接跳過初始化，之後每幀 `hands.send` 都失敗。改成 `try { … } catch (e) { hands = null; throw e; }`。
- `:200-208` 推論迴圈只靠 `running` 旗標退出、不取消 rAF。`stop()` → `start()` 快速切換（visibilitychange 自動重啟 `:232-235` 就會觸發）時，舊迴圈 `await hands.send()` 回來後仍會排下一幀，若 `running` 已被新 `start()` 設回 true，兩個迴圈同時對同一個 Hands 實例 `send`。改用世代計數 `const gen = ++runId; … if (!running || gen !== runId) return;`。
- `:192` `await new Promise(r => video.onloadedmetadata = r)` 沒有 timeout、沒有 reject；metadata 不觸發或期間被 `stop()` 清掉 `srcObject`，按鈕永遠 disabled、狀態停在「開啟相機中…」。`Promise.race` 加 5 秒 timeout 走既有 catch。
- `:194` `fitCanvas()` 只在 loadedmetadata 後叫一次；iOS Safari 此時常回報 `videoWidth = 0`，canvas 停在 300×150，就是 9/7 要修的「骨架變橢圓」。加 `video.addEventListener('resize', fitCanvas)`，pump 內偵測尺寸不符時重算。（需真機實測）
- `:203-204` 推論持續失敗時每幀寫一次錯誤到 `aria-live` 的 #status，螢幕閱讀器被洗頻。連續失敗 3 次就 `stop()` 並給一次性訊息。
- `:232-235` `start()` 進行中切到背景不會暫停（`running` 仍 false），相機在背景取得、回前景不重接。加 `starting` 旗標納入判斷。`stop()` 也沒 `hands.close()`，可在 `pagehide` 釋放。

### 5.2 判定邏輯

- `:88-93` 距離用 MediaPipe 正規化座標（x 以寬、y 以高正規化），4:3／16:9 畫面下 x 被壓縮 25～44%，比值隨手的旋轉改變。`dx *= videoWidth / videoHeight` 後再算，或改用 `multiHandWorldLandmarks`。
- `:97` `isOver` 只看螢幕 y 方向，忽略 `multiHandedness` 與手掌朝向，左手或手背朝鏡頭可能判反。（需真機實測）
- `:7`、`:49`、`:66` 文字寫「三個判斷」，程式有 4 種（over／under／low／loose，`:96-107`）。改「四種提示」。
- 門檻與文章不一致：`posts/maker/2026-05-10-grip-system-evolution.md:21` 標準握法「筆尖距指尖約 1.5–2 cm」，同篇 `:156` 卻「< 2.0 cm 即錯誤」（標準範圍會被判錯），grip-coach `:103` 寫「約 1.5 公分以上」。三處對齊 1.5。

### 5.3 一致性

- 沒引用 `/assets/css/site.css`、沒載 Google Fonts（`font-family: "Noto Sans TC"` 在多數裝置退回系統字）、導覽只有兩個連結，與主站 nav／footer 不一致；9/7 稽核寫的「加站內樣式」實際沒做。配合 3.4 一起套共用片段。
- `:54`、`:57`、`:63` 三個 `aria-live` 區塊會同時朗讀；只留 #advice。判定文字以 ❌／⚠️／✅ 開頭，螢幕閱讀器會念「cross mark」，emoji 包 `aria-hidden`。
- `:17` `.top` 沒 `flex-wrap`，320px 可能溢出。
- 缺 `og:*`、canonical；外掛 script 有 `crossorigin` 無 `integrity`。
- `maker.html:105-109`「握筆姿勢即時分析」條目與 grip-system 文章都沒連到站內已公開可玩的 `/grip-coach/`，兩處補「線上體驗」。

---

## 6. servo-arm 子站

**9/7 的修正全部仍在**：死錨點 0（69 處站內錨點）、12 層、66 項、567/567（4 跳過）、五支對照表、STS3215 尺寸、`class="card fail"`、捲動高亮只處理 `#` 開頭。資產：18 個 `renders/*` 引用全部存在；57 個真實外部連結無可疑者；10 頁無重複 id、無 inline handler、img 全有 alt、零 CDN。

以下要回上游 `servo-arm` repo 的 `tools/build_static.py`／`split_pages.py`／模板改，再重建複製過來：

### 6.1 功能

- `servo-arm/index.html`（入口頁）**沒有任何回主站的連結**；`compare.html:89`、`playground.html:88`、`feasibility.html:277-278` 也只回入口頁。只有五支手臂頁與 report.html 有「站首頁」。入口頁模板 header 或 footer 加 `https://henrychao521.github.io/`。
- `index.html:512`、`:517-519` M1／M2 說「一鍵送去 MuJoCo 跑真實物理」，靜態版兩個按鈕都走 `__staticRun` stub 回 501 顯示「需要本機伺服器」（有優雅降級，不算壞）。表格文字加「（MuJoCo 需本機）」。

### 6.2 數字與敘述（限 KPI／摘要／表格／標題／入口頁）

- `report.html:122`（nav）、`:1136`（h2）、`:1137`（lead）「四支手臂的致動器資料」→ 五支（nav 由 h2 產生，改 h2 即可）。
- `arm-dm4310.html:113` lead「四顆致動器裡唯一會回報力矩的」→ 五顆。
- `report.html:957` 缺口矩陣「33 項失敗紀錄每一條都寫了根因」→ 66。
- `arm-sg90.html:488-489` 現況卡「那 205 項驗證套件全部仍跑在 v1 上」→ 567 或刪數字；v2 是否仍未接入需確認。
- STS3215 殼體尺寸兩頁打字不一致：`arm-sts3215.html:127` 45.2×**37.8**×24.7 vs `feasibility.html:217` 45.2×**37.4**×24.7。上游以 STEP 量測值統一。
- `index.html:530-531` M4 與 `feasibility.html` `<title>` 仍寫「待確認決策」，決定已做（後記、STS3215 頁）。改「決策紀錄（已決定，見後記）」。
- `report.html:1402-1466`「檔案與重現方式」只列 SG90 單臂檔案，沒有 `tests/run_all.py`、`cad/actuators.py`、`cad/arm_ft5425bl.py`、`tools/make_comparison.py`、`tools/split_pages.py`、`tools/build_static.py` 等已在 `:598`、`:1137`、`:1335` 被引用的檔。這是重現說明不是歷史敘述，應更新。
- 階段快照表讀起來像現況：`arm-ft5425bl.html:215`、`arm-sts3215.html:192`「T0 8/8（2 項跳過：尚未產出網格）」、`arm-sts3215.html:197`「全套 445/445」。表頭加「（B2 當時）」「（B'4 當時）」。
- 低優先、屬當時敘述（依 9/7 原則不強制）：`arm-ft5425bl.html:135`、`arm-sts3215.html:198`「四支手臂的對照報告」；`arm-ft5425bl.html:359`「四支裡只有 DM-J4310 報得出真實位置」；`report.html:598/991/1121` 125／205 項。
- 五支的伸距／酬載／質量／扭矩在入口頁表、各頁 title、report.html 三處全部一致，不需動。

### 6.3 品質

- 10 頁都沒有 `<meta name="description">` 與 `og:*`。模板加 description（可用各頁 `.sub` 文字）。
- `renders/playground_run.mp4` 沒有任何頁引用（`index.html:582` 用的是 `mujoco_run.mp4`）。playground 示範區引用它，或不複製過來。
- 未做：瀏覽器實跑（console、IntersectionObserver 高亮、手機寬度）、57 個外部連結的 HTTP 檢查。

---

## 7. 程式整理（低風險，可隨手做）

### 7.1 死碼

- `assets/js/home.js:8` `SPANS` 陣列與 `s-${n}` 類別：CSS `.w-shots > * { grid-column: span 1 }` 已把它全部蓋掉，`index.html:88` 的 `s-12` 類別也不存在。刪掉 SPANS 與 span 邏輯。
- `assets/js/shared.js:239-241` PROJECT_META 的 `henrychao521.github.io`、`henrychao521`、`gpt-ai-assistant` 三個 `featured: false` 項目與 `THEME_NAMES.misc`：9/7 刪掉 `fetchGHRepos` 後已沒有任何程式讀 featured=false 的項目。刪。
- `assets/css/site.css`：`.b-figure`（含 figcaption 規則）、`.toc-row .leader`、`.toc-row .line`、`.tag` 系列，全站 html/js 零使用。刪或留一行註解說明保留原因。
- `assets/covers/x5-roomtour-viewer.{jpg,webp}`：PROJECT_META 用的是 `x5-roomtour.jpg`，這兩個檔沒人引用（內容也不同）。確認後刪一組。

### 7.2 build-indexes.py 小改

- `write_shell` 每篇都重讀 `post.html`，搬到模組層讀一次。
- `normalize_date` 若 YAML 把 `date` 解析成 datetime 物件會走 `str()[:10]`，可行但脆弱；明確處理 `datetime`／`date` 型別。
- 加 `--check` 模式：只比對不寫檔，有差異回傳非 0。CI 可用它擋「忘了本機重建就 push」。

### 7.3 home.js／articles.html 的字串插值沒有逸出

`home.js` 把 `m.title`、`blurb`、`kind` 直接拼進 innerHTML，`articles.html` 的 `post.link` 也是。資料來源是自己的常數與 WP API，風險低，但順手用已有的 `esc()` 包一下，兩處各一行。

### 7.4 一次性腳本

`scripts/make_blog_covers_2026_08.py:20-24` 寫死四個 `/Volumes/Work/...` 路徑，別人跑不起來。要留就改成 CLI 參數並在 README 註明是一次性工具；不留就搬到 `docs/` 當紀錄。

### 7.5 文件

- `README.md`、`QUICKSTART.md` 都說「兩百多篇」，與 WP 實際總數需在本機確認（9/7 稽核時 219 篇）。
- `admin/SETUP.md:58` 公開了 OAuth App 的 Client ID（設計上是公開值，無安全問題），但旁邊寫的 callback 已失效，整段可標「歷史紀錄」。
- README 站內結構表補 `docs/`、`scripts/make_blog_covers_2026_08.py`、本文件。

---

## 8. 本機要補跑的驗證（這個環境連不到外網）

```bash
# 線上與 repo 是否同步
curl -s https://henrychao521.github.io/posts/blog/index.json | md5sum; md5sum posts/blog/index.json

# WP API：文章總數、分類總數（是否超過 50）
curl -sI "https://public-api.wordpress.com/wp/v2/sites/livingtech.education/posts?per_page=1" | grep -i x-wp-total
curl -s "https://public-api.wordpress.com/wp/v2/sites/livingtech.education/categories?per_page=100&_fields=id" | python3 -c "import json,sys;print(len(json.load(sys.stdin)))"

# 姊妹站與外部連結是否存活
for p in laser-cut-course livingtech-films servo-arm grip-coach; do curl -so /dev/null -w "$p %{http_code}\n" https://henrychao521.github.io/$p/; done
curl -so /dev/null -w "henrylivingtech %{http_code}\n" https://henrylivingtech.com

# Decap 是否真的會清掉未宣告欄位（1.1）
./dev.sh   # 開 /admin/ 存一篇 blog 舊文，看 git diff
```

---

## 9. 執行批次建議

| 批次 | 內容 | 預估 | 風險 |
|---|---|---|---|
| A | 1.1 CMS 欄位＋刪 settings、1.2 四張 cover、1.4 workflow git add、1.5 課時標籤 | 2 小時 | 低 |
| B | 2.1 EMT／物理文案、2.2～2.3 文章數字與連結、1.3 excerpt 縮短 | 3 小時 | 低（純文字） |
| C | 3.1 sitemap／feed／404、3.2 canonical、`--check` 模式 | 3 小時 | 低 |
| D | 3.3 WP 快照 Action | 半天 | 中（新 Action、新資料檔） |
| E | 3.4 導覽模板、4.2～4.3 錨點／目次／前後篇 | 半天 | 中（改 post.html 影響 26 殼，重建即可） |
| F1 | 5.1 grip-coach 五個邏輯修正＋5.3 套站內樣式；需 iOS Safari 真機實測 | 3 小時 | 中 |
| F2 | 第 6 節 servo-arm：上游模板加回主站連結與 description、改三處「四支」、report 檔案清單、M4 文字；重建後複製 | 2 小時 | 低 |
| H | 2.4 Maker 教案表格 23 項（純文字） | 2 小時 | 低 |
| G | 第 7 節程式整理 | 1 小時 | 低 |
