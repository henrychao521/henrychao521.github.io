---
title: "[完整教學] PC13110：把工程設計課本變成可以走進去闖關的像素實驗室"
date: 2026-06-21T20:30:00+08:00
author: "Henry Chao"
cover: "/assets/blog/pc13110-lobby.png"
category: "專案分享"
tags: [108課綱, 工程設計, 遊戲化學習, 互動教材, localStorage, Canvas]
repo: "pc13110-platform"
level: "⭐⭐ 中階"
hours: "閱讀約 9 分鐘"
excerpt: "把高中生活科技『工程設計』整章，重寫成一個純前端、零後端、可直接掛 GitHub Pages 的學習平台：先在像素大廳捏一個自己的工程師角色，走進 tile-based 的工程實驗室，用 WASD 移動、走到傳送門按 E 進入章節闖關，完成度與 8 項成就全部存在瀏覽器 localStorage。五大主題、27 個互動模組，對應工程設計流程七階段。這篇拆解大廳怎麼動、進度怎麼存、成就怎麼解。"
draft: false
---

把高中生活科技「工程設計」這一整章，做成一個學生**可以走進去玩**的平台——先捏一個自己的工程師角色，走進一間像素風的「工程實驗室」，沿路有實驗室主任、創客社同學跟你搭話，走到牆上的傳送門按一下 `E`，就進入該章節的互動關卡開始闖關。

![PC13110 像素大廳的「CREATE YOUR ENGINEER」角色創建器](/assets/blog/pc13110-lobby.png)

整個平台是**純前端、零後端**：沒有資料庫、沒有伺服器，所有角色外觀與學習進度都存在瀏覽器的 `localStorage` 裡，打包成靜態檔就能直接丟上 GitHub Pages。這篇把三件事拆給你看：像素大廳怎麼用 canvas 動起來、進度與角色怎麼持久化、8 項成就怎麼判定解鎖；最後談它在 108 課綱底下怎麼用。

## 為什麼想做這個

一般的數位教材，常常只是把課本掃描上網、加幾個選擇題。我想做的剛好相反：**每一章都讓學生真的把「工程設計流程」自己跑一次**——從界定問題、研究調查、構思方案，一路到建構原型、測試與評估。

但比起「內容做得多漂亮」，現場更難的其實是另一件事：**讓學生願意按下開始**。國高中的自學教材最大的敵人不是難度，是「打開首頁、看到一長串章節、然後關掉」。所以我把學習任務包成一個可以探索的世界——你不是在「讀第一章」，你是走進實驗室、找到第一章的傳送門、推開門進去。把「開始」這個門檻，藏進遊戲化的探索動線裡。

平台首頁本身就先把這一章的骨幹講清楚：工程設計流程的七個階段。

![PC13110 首頁：工程設計流程七階段](/assets/blog/pc13110-home.png)

## 學習動線一張圖看懂

![PC13110 學習動線示意圖](/assets/blog/diagram-pc13110.svg)

整條動線是一個會回到原點的迴圈：**捏角色 → 大廳探索 → 走到傳送門按 E → 進章節模組闖關 → 解鎖成就、存進度 → 回大廳找下一個傳送門**。五個章節的傳送門散在地圖上，學生可以自己決定先打哪一關。下面從技術面逐一拆解。

## 工程設計流程：把七階段變成主軸

平台的整體骨幹，是 108 課綱生活科技核心的**工程設計流程（Engineering Design Process）**。它不是線性走完一次就結束，而是一個會反覆迭代的循環，課程把它拆成七個階段：

| 階段 | 中文 | 在這一章做什麼 |
|------|------|----------------|
| 1 | 界定問題（Identify） | 釐清真正要解決的問題、限制與規格 |
| 2 | 研究與背景調查（Research） | 蒐集資料、查證來源、了解既有方案 |
| 3 | 構思解決方案（Brainstorm） | 發散思考、產生多個可能方案 |
| 4 | 選擇最佳方案（Select） | 用準則評估、收斂到最佳解 |
| 5 | 建構原型（Prototype） | 把方案做成可測試的模型 |
| 6 | 測試與評估（Test） | 驗證、找出問題 |
| 7 | 迭代 / 發表 | 依測試結果回去修，並對外發表 |

平台把這七階段當成「可以動手操作一次」的對象——例如第 1 章就有一個「工程設計流程互動」模組，讓學生實際走一輪，而不是只在課本上看流程圖。整個平台五大章、共 **27 個學習模組**，主題對應課本：

| 章 | 主題 | 對應領域 |
|----|------|----------|
| 第 1 章 | 加速發展的科技與工程 | 科技趨勢、工程設計流程 |
| 第 2 章 | 製造與加工（fabrication） | 材料、成形與加工方法 |
| 第 3 章 | 機構（mechanism） | 連桿、齒輪、傳動 |
| 第 4 章 | 電（electricity） | 電路、電子元件 |
| 第 5 章 | 機電整合（mechatronics） | 感測、控制、自動化 |

## 技術一：像素大廳是一張 tile-based 的 2D canvas 地圖

大廳（`lobby.html`）是一個 RPG 風格的「工程實驗室」地圖，用一塊 2D `<canvas>` 畫出來。核心是經典的 **tile-based（格子地圖）** 作法：地圖是一個二維陣列，每一格存一個 tile 編號；角色的座標也是格子座標，移動時就是把座標 `±1`，再用 `requestAnimationFrame` 把整張地圖與角色重畫一次。

```javascript
// 概念示意，非實際原始碼
const TILE = 32;            // 一格 32px
const map = [...];          // 二維陣列：每格是地板/牆/傳送門編號

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // 以玩家為中心畫出可見範圍的格子
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      drawTile(map[y][x], x * TILE - camX, y * TILE - camY);
    }
  }
  drawPlayer(player);        // 再把像素工程師畫上去
  requestAnimationFrame(draw);
}
```

移動用 `WASD` 或方向鍵。按鍵不會「按一下走一格然後停」，而是記下哪些鍵正被按住，每一幀檢查一次——這樣長按就會連續走，手感才順：

```javascript
// 概念示意：記住正在按住的鍵，逐幀更新位置
const keys = {};
addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

function update() {
  let nx = player.x, ny = player.y;
  if (keys['w'] || keys['arrowup'])    ny -= player.speed;
  if (keys['s'] || keys['arrowdown'])  ny += player.speed;
  if (keys['a'] || keys['arrowleft'])  nx -= player.speed;
  if (keys['d'] || keys['arrowright']) nx += player.speed;

  // 簡單 AABB 碰撞：算出的新位置如果不是牆才走過去
  if (!isBlocked(nx, ny)) { player.x = nx; player.y = ny; }
}
```

地圖上散著 5 個章節傳送門、幾位 NPC（實驗室主任、工程師學長、創客社同學）、布告欄、遊樂場，還有一個聊天框可以對附近的同學說話。畫面右上角會標示這是**「單機模式（線上版）」**——也就是這個公開線上版本是單人遊玩，不連伺服器、不需要登入。

## 技術二：走到傳送門按 E —— 距離觸發

「走到傳送門前面按 E 進入該章」這個互動，本質上是一個**距離判斷**：每一幀算一次玩家跟每個傳送門的距離，只要進到觸發半徑內，就提示可以按 `E`；按下時，找出**最近的那一個**傳送門，跳轉到對應章節。

```javascript
// 概念示意：找最近且在範圍內的傳送門，按 E 進入
function nearestPortal(player, portals, radius = TILE * 1.2) {
  let best = null, bestDist = Infinity;
  for (const p of portals) {
    const d = Math.hypot(p.x - player.x, p.y - player.y);
    if (d < radius && d < bestDist) { best = p; bestDist = d; }
  }
  return best;            // 不在任何傳送門附近就回傳 null
}

addEventListener('keydown', e => {
  if (e.key.toLowerCase() !== 'e') return;
  const portal = nearestPortal(player, portals);
  if (portal) enterChapter(portal.chapterId);   // 進入該章關卡
});
```

NPC 對話用的是同一招：算距離、在範圍內就允許互動，只是觸發的不是跳轉，而是跳出對話框。這種「靠近才能互動」的設計，剛好也是後面成就系統判定「有沒有跟 NPC 講過話」「有沒有走訪過全部傳送門」的依據。

## 技術三：用 localStorage 把一切存下來

因為**沒有後端**，所有需要「下次打開還在」的狀態，都集中存在一個 `state` 物件裡，序列化成 JSON 寫進 `localStorage`：角色外觀、每個模組的完成度、成就解鎖狀態，全部都在這裡。

```javascript
// 概念示意：集中管理的存檔物件
const KEY = 'pc13110_save';

const state = {
  player:   { skin: 0, hair: 0, hairStyle: '短髮', shirt: 0, accessory: '無配件',
              nickname: '', seat: '', classCode: '' },
  progress: {},          // 例如 { 'ch1-m1': true, 'ch1-m2': false, ... }
  achievements: {},      // 例如 { 'newbie': true, 'explorer': false, ... }
  npcsTalked: [],        // 跟哪些 NPC 講過話
  portalsVisited: [],    // 走訪過哪些傳送門
};

function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function load() {
  const raw = localStorage.getItem(KEY);
  if (raw) Object.assign(state, JSON.parse(raw));
}
```

角色創建器（上面那張「CREATE YOUR ENGINEER」截圖）做的事，就是把選到的膚色、髮色、髮型（短髮 / 包頭 / 刺蝟 / 長髮）、上衣顏色、配件（無配件 / 鴨舌帽 / 眼鏡 / 工程安全帽）、暱稱、座號、班級代碼通通寫進 `state.player`，然後 `save()`。下次再進來時 `load()` 把它讀回來，像素工程師就還是原來那個樣子。

完成一個學習模組時，只要把對應的 key 設成 `true` 再存檔，「總進度 X%」就會自動更新——因為進度只是「已完成模組數 ÷ 27」。這種**單一存檔物件 + 每次變動就序列化**的作法，雖然樸素，但在純前端、沒有帳號系統的情境下最可靠：不依賴網路、重新整理不會掉、學生換頁也不會遺失進度。

> 小提醒：`localStorage` 是綁定「同一個瀏覽器、同一個裝置」的。換電腦或清快取，進度就不見了。這也是為什麼右上角誠實標示「單機模式」——這個公開版本本來就定位成自學 / 體驗用，正式班級的跨裝置進度會走另外的教師後台路線。

## 技術四：成就系統——條件達成就解鎖、跳通知

平台有 **8 項成就**，右上角隨時顯示 `X/8`。成就的本質是一個「檢查條件 → 若達成且尚未解鎖 → 寫入存檔 → 跳通知」的小函式，在每次關鍵事件（完成模組、跟 NPC 對話、走到傳送門）後呼叫一次：

```javascript
// 概念示意：解鎖單一成就
function unlock(id) {
  if (state.achievements[id]) return;        // 已解鎖就不重複觸發
  state.achievements[id] = true;
  save();
  toast(`🏆 成就解鎖：${ACHIEVEMENTS[id].name}`); // 右上跳通知
  refreshBadge();                             // 更新 X/8
}

// 概念示意：在事件後檢查各成就條件
function checkAchievements() {
  const done = Object.values(state.progress).filter(Boolean).length;

  if (state.player.nickname)            unlock('newbie');      // 新生報到
  if (done >= 1)                        unlock('first-step');  // 初次出發
  if (state.npcsTalked.length >= 1)     unlock('curious');     // 不恥下問
  if (state.portalsVisited.length >= 5) unlock('explorer');    // 實驗室探險家
  if (state.npcsTalked.length >= 3)     unlock('popular');     // 萬人迷
  if (done / 27 >= 0.5)                 unlock('halfway');     // 勢如破竹
  if (done >= 27)                       unlock('master');      // 工程大師
  // 「章節達人」另外檢查某一章是否整章完成
}
```

八項成就與解鎖條件整理如下：

| 成就 | 解鎖條件 |
|------|----------|
| 新生報到 | 建立角色並進入實驗室 |
| 初次出發 | 完成任一學習模組 |
| 不恥下問 | 和 NPC 對話 |
| 實驗室探險家 | 走訪全部 5 個傳送門 |
| 章節達人 | 完成一整章模組 |
| 萬人迷 | 和全部 3 位 NPC 對話 |
| 勢如破竹 | 總進度達 50% |
| 工程大師 | 完成全部 27 個模組 |

成就的設計刻意分成兩種誘因：一種獎勵「探索」（探險家、不恥下問、萬人迷），讓學生有理由把整張地圖走完、跟每個 NPC 聊過；一種獎勵「完成度」（初次出發、勢如破竹、工程大師），把學習進度本身變成可見的目標。對老師來說，這也是一組現成的形成性評量訊號：誰只到處逛沒做模組、誰悶頭做沒探索，從成就分布就看得出來。

## 學習模組長什麼樣：以第 1 章為例

章節模組多半是**互動元件**——可調參數的圖表、分頁切換、點擊揭曉，而不是純文字。以第 1 章的「科技趨勢儀表板」為例：它用互動圖表帶學生探索 AI、量子半導體、生醫科技、再生能源四大趨勢，可以切換分頁分別看。

![第 1 章「科技趨勢儀表板」互動模組](/assets/blog/pc13110-module.png)

特別值得一提的是，這個模組刻意示範了**「多方查證」**：對於「全球研發支出持續高速成長、並高度集中於新興科技」這類趨勢，它同時引用**世界經濟論壇（WEF）、聯合國教科文組織（UNESCO）、OECD** 等多個獨立來源交叉印證，而不是只丟一個數字。這本身就是工程設計流程第 2 階段「研究與背景調查」的身教——查資料要看來源、要交叉比對。

其他幾個跨章好用的模組還包括：

- **工程設計流程互動**：把七階段做成可實際走一輪的流程。
- **創意思考工具箱**：整合六頂思考帽、SCAMPER、曼陀羅九宮格三套發想法，對應流程第 3 階段「構思方案」。
- **專題規劃器**：整合開源的 **jsMind**（心智圖）與 **Frappe Gantt**（甘特圖），讓學生把專題的想法結構化、再排成時程——直接把抽象的「專案規劃」變成可操作的工具。

## 課堂怎麼用（對應 108 課綱）

- **工程設計流程（生活科技核心）**：平台主軸就是這條流程。可以當**翻轉教材**——課前讓學生先在平台把流程跑一遍，課堂時間留給實作。
- **設計與製作**：第 2～5 章（製造加工、機構、電、機電整合）對應動手單元，模組先把概念與原理玩過一次，再進實作課就更有底。
- **運算思維 / 數位工具輔助學習**：「專題規劃器」整合心智圖與甘特圖，讓學生用數位工具把專題拆解、排程，是運算思維落到專題上的具體練習。
- **自學與補課**：缺席的學生可以自己補進度，成就與模組完成度都看得到；老師也能透過教師後台（`teacher.html`）掌握班級狀況，當形成性評量的輔助。

## 線上體驗

整個平台是純前端的開源專案，打開就能玩——建議用電腦，鍵盤 `WASD` / 方向鍵移動，走到章節傳送門前按 `E` 進入。先捏一個你的工程師角色，再去把五個傳送門和 8 項成就都解開吧。

> 🚀 **線上體驗**：<https://henrychao521.github.io/pc13110-platform/>
> 🎮 操作：WASD / 方向鍵移動，靠近傳送門或 NPC 按 `E` 互動；右上角可看成就 `X/8` 與總進度。
