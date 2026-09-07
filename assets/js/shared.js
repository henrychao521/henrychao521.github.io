// shared.js — common utilities across pages

const WP_API = 'https://public-api.wordpress.com/wp/v2/sites/livingtech.education';
const GH_USER = 'henrychao521';

/** Fetch JSON with simple cache (sessionStorage 30 min) */
async function fetchJSON(url, cacheKey, ttlMs = 30 * 60 * 1000) {
  const key = cacheKey || `cache:${url}`;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      const { ts, data } = JSON.parse(cached);
      if (Date.now() - ts < ttlMs) return data;
    }
  } catch (_) {}

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = await res.json();

  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {}
  return data;
}

/** Format ISO date to "2026年5月10日" */
function formatDate(iso) {
  // 純日期字串（2026-08-31）直接切，不經 Date：new Date('2026-08-31') 會當 UTC 解析，
  // 在 UTC 以西的時區會顯示成前一天。
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (m && !/T\d/.test(iso)) return `${m[1]}/${m[2]}/${m[3]}`;
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

/** Strip HTML tags from a string (for excerpts) */
function stripHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/** Decode HTML entities */
function decodeEntities(s) {
  const tmp = document.createElement('textarea');
  tmp.innerHTML = s;
  return tmp.value;
}

/** Get URL query parameter */
function getQuery(name) {
  return new URLSearchParams(location.search).get(name);
}

/** Truncate by char (CJK-aware fallback to char count) */
function truncate(str, n = 100) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// ─────────────── WP API helpers ───────────────

/** Fetch latest posts from WP */
async function fetchWPPosts({ perPage = 12, page = 1, categories = null, search = null } = {}) {
  let url = `${WP_API}/posts?per_page=${perPage}&page=${page}&_fields=id,date,title,excerpt,link,categories,featured_media,jetpack_featured_media_url`;
  if (categories) url += `&categories=${categories}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  return fetchJSON(url);
}

/** Fetch all categories (cached) */
async function fetchWPCategories() {
  return fetchJSON(`${WP_API}/categories?per_page=50&_fields=id,name,count,slug`, 'wp:categories', 24*60*60*1000);
}

// ─────────────── Project metadata (manual annotations) ───────────────
// 只標注「目前公開」的 repo；私有 repo 不會出現在 /users/:user/repos 回應裡。
// demo: 線上體驗網址；title/blurb: 中文展示文案（比 repo description 完整）

const PROJECT_META = {
  'x5-roomtour-viewer': {
    theme: 'twin', featured: true, emoji: '🧊',
    title: 'X5 RoomTour — 真實空間 3D 數位孿生',
    blurb: '一支 Insta360 X5 360° 影片 →（COLMAP + Brush）3D 高斯潑濺，重建出照片級、可在瀏覽器走動的空間。第一人稱行走（物理碰撞 + WebXR）、從點雲自動產生建築平面圖與尺寸量測、攝影機即時人流追蹤、校園多樓層擴展。全程 Apple Silicon 本機、無需 NVIDIA / CUDA。',
    tags: ['3D 高斯潑濺', 'COLMAP / Brush', 'PlayCanvas / WebXR', '即時數位孿生'],
    demo: 'https://henrychao521.github.io/x5-roomtour-viewer/',
    cover: '/assets/covers/x5-roomtour.jpg',
    gradient: 'from-cyan-500 via-blue-600 to-indigo-700',
  },
  'pc13110-platform': {
    theme: 'teaching', featured: true, emoji: '📐',
    title: '高中生活科技工程設計學習平台',
    blurb: '對應普通型高中生活科技教科書（趙珩宇 編）的互動學習平台——科技趨勢儀表板、創意思考工具箱、心智圖＋甘特圖專題規劃、電路模擬與虛擬電表，把課本變成瀏覽器裡的工程實驗室。',
    tags: ['工程設計流程', '互動模擬', '高中生活科技', 'Vanilla JS'],
    demo: 'https://henrychao521.github.io/pc13110-platform/',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
  },
  'livingtech-tools': {
    theme: 'teaching', featured: true, emoji: '🛠️',
    title: '國中生活科技互動教具系列',
    blurb: '線鋸機・電烙鐵・麵包板・3D 印表機・手工具・機構・能源・液壓手臂⋯ 二十多個互動教具（認識→安全→步驟→模擬→應用）＋教師後台班級進度匯整，依翰林版六冊國中生活科技課本擴充，對應 108 課綱。',
    tags: ['20+ 個互動教具', 'Canvas 模擬器', '教師後台', '108 課綱'],
    demo: 'https://henrychao521.github.io/livingtech-tools/',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
  },
  'taiwan-engineering-geo': {
    theme: 'teaching', featured: true, emoji: '🗺️',
    title: '[教學遊戲] 台灣工程地景 200 選',
    blurb: '200 個台灣工程地景的互動學習活動：看實景照片或衛星空照圖、在地圖上點出位置，揭曉時了解每個工程的設計重點。附教師版學習單與成績驗證碼。',
    tags: ['地圖互動', '200 個地景', '教師學習單'],
    demo: 'https://henrychao521.github.io/taiwan-engineering-geo/',
    gradient: 'from-lime-500 via-green-500 to-emerald-600',
  },
  'coding-dojo': {
    theme: 'teaching', featured: true, emoji: '🥋',
    title: '程式練功房 — 瀏覽器內寫 Python',
    blurb: '瀏覽器內寫程式、自動評測的生活科技 Python 練習平台。Pyodide + CodeMirror 6 純前端，不用安裝環境、不用註冊，開頁即練；題組對應生活科技課程情境。',
    tags: ['Pyodide', 'CodeMirror 6', '自動評測', '純前端'],
    demo: 'https://henrychao521.github.io/coding-dojo/',
    gradient: 'from-slate-600 via-slate-700 to-zinc-800',
  },
  'lattice-hinge-designer': {
    theme: 'sim', featured: true, emoji: '🪵',
    title: '雷切彎木格狀鉸鏈設計計算器',
    blurb: '輸入板厚、彎曲半徑與角度，用 Fenner 扭轉連桿模型即時算出格狀鉸鏈的切割參數，並直接產生可下載的雷切用 SVG 切割線。搭配雷射切割機課程使用。',
    tags: ['Fenner 扭轉模型', 'SVG 匯出', '雷射切割', '參數化設計'],
    demo: 'https://henrychao521.github.io/lattice-hinge-designer/',
    gradient: 'from-orange-600 via-amber-600 to-yellow-600',
  },
  'shadowless-lamp-sim': {
    theme: 'sim', featured: true, emoji: '🔦',
    title: '外科手術無影燈光學模擬器',
    blurb: '互動式光學教具：拖曳燈具與遮擋物，即時看見多顆 LED 如何「稀釋」陰影、達成無影。2D 幾何剖面 + 3D 物理熱圖雙視圖，對照 IEC 60601-2-41 醫療標準；內建光路逆行演示與課堂快速場景。手機可用、可離線安裝。',
    tags: ['2D／3D 雙視圖', 'IEC 60601 標準', '光路逆行演示', '手機 / PWA 離線'],
    demo: 'https://henrychao521.github.io/shadowless-lamp-sim/',
    gradient: 'from-sky-600 via-blue-700 to-indigo-700',
  },
  'ai-physics-demos': {
    theme: 'aiworks', featured: true, emoji: '🔬',
    title: '國高中物理互動模擬平台',
    blurb: '力學、熱學、波動、光學、電磁、近代物理七館共 57 個自建互動模擬，每頁附「即時代入計算公式」面板，數值都經程式驗證（守恆律、克卜勒、Snell、法拉第、氫光譜）；另含繞射、摩爾紋、3D 光譜干涉、外科無影燈與 RC 氣墊船。純前端、可離線課堂演示，手機可用。',
    tags: ['57 個物理模擬', '七館分類', '即時公式面板', '純前端 / Canvas'],
    demo: 'https://henrychao521.github.io/ai-physics-demos/',
    gradient: 'from-fuchsia-500 via-rose-500 to-orange-500',
  },
  'ai-physics-data': {
    theme: 'aiworks', featured: true, emoji: '📊',
    title: '資料蒐集：全台房市數據系統',
    blurb: '與 AI 協作的資料視覺化：34 個縣市／行政區、44 季價量連續軌跡與跨週期對比的互動儀表板（Chart.js）。可切換觀測區域、任選兩個時點比較買氣與當季政策背景。',
    tags: ['34 區 × 44 季', 'Chart.js 互動圖表', '跨週期對比', '資料視覺化'],
    demo: 'https://henrychao521.github.io/ai-physics-demos/housing/',
    gradient: 'from-sky-500 via-blue-600 to-indigo-700',
  },
  'grip-coach': {
    theme: 'aiworks', featured: true, emoji: '🖐️',
    title: '人因工程：AI 握筆姿勢教練',
    blurb: '用 webcam + MediaPipe Hands 在瀏覽器即時辨識握筆姿勢，標出手部關鍵點與骨架、即時提示握姿，並可一鍵拍照下載截圖。純前端、開啟相機即用，不需安裝、影像不外傳。',
    tags: ['MediaPipe Hands', 'webcam 即時辨識', '手部關鍵點骨架', '純前端 / 開相機即用'],
    demo: 'https://henrychao521.github.io/grip-coach/',
    gradient: 'from-rose-500 via-pink-600 to-purple-600',
  },
  'living-portal': {
    theme: 'platform', featured: true, emoji: '🌐',
    title: 'Henry Living Tech Portal',
    blurb: '台鐵即時地圖 × 北台灣水文監測 × 台北即時看板的統一入口。18 個即時面板：高鐵、航機追蹤、YouBike、國道路況、地震、空品、海象、太空站・極光、火箭發射⋯',
    tags: ['18 個即時面板', 'FastAPI', 'TDX / CWA API', 'Cloudflare Tunnel'],
    demo: 'https://henrylivingtech.com',
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
  },
  'project-lab-film': {
    theme: 'film', featured: true, emoji: '🎬',
    title: 'AI 自動生成專案分享影片',
    blurb: '一個大膽的實驗：讓 AI 自己盤點專案、寫腳本、用無頭瀏覽器把每個網站「真的跑起來」錄製、配音、剪輯與配樂，全自動產出一支專案成果介紹影片——連這頁製作歷程都是 AI 做的。公開完整製作流程、腳本發展、版本紀錄與踩雷全紀錄，並嵌入 YouTube 成片。',
    tags: ['AI 全自動企劃/剪輯', 'CDP 無頭錄製', 'edge-tts 配音', 'YouTube 嵌入'],
    demo: 'https://henrychao521.github.io/project-lab-film/',
    gradient: 'from-amber-500 via-pink-500 to-violet-600',
  },
  'esp32-camera-display': {
    theme: 'maker', featured: true, emoji: '📷',
    title: 'XIAO ESP32-S3 手作迷你相機',
    blurb: '用 Seeed XIAO ESP32-S3 Sense（內建 OV2640 鏡頭）+ 2.4" ILI9341 顯示器手工接線做成的一台迷你相機：即時取景、拍照、多種濾鏡、相簿瀏覽、MJPEG 錄影，全程用一支類比搖桿操作。附完整開發歷程與互動接線圖，程式碼全開源。',
    tags: ['XIAO ESP32-S3 Sense', 'OV2640 + ILI9341', 'MJPEG 錄影', '搖桿操作'],
    demo: 'https://henrychao521.github.io/esp32-camera-display/',
    gradient: 'from-cyan-600 via-teal-600 to-emerald-700',
  },
  'henrychao521.github.io': {
    theme: 'misc', featured: false, emoji: '🦦',
    title: '本站原始碼',
    blurb: '這個作品站本身——純靜態 HTML/CSS/JS，文章存 Markdown，即時拉取 livingtech.education 文章。',
  },
  'henrychao521':     { theme: 'misc', featured: false, emoji: '👤', title: 'GitHub 個人簡介' },
  'gpt-ai-assistant': { theme: 'misc', featured: false, emoji: '💬', title: 'GPT AI Assistant（fork）' },
};

/** 精選專案在首頁/專案頁的固定排序 */
const FEATURED_ORDER = [
  'x5-roomtour-viewer',
  'pc13110-platform',
  'livingtech-tools',
  'coding-dojo',
  'ai-physics-demos',
  'ai-physics-data',
  'grip-coach',
  'esp32-camera-display',
  'shadowless-lamp-sim',
  'lattice-hinge-designer',
  'taiwan-engineering-geo',
  'living-portal',
  'project-lab-film',
];

const THEME_NAMES = {
  twin:     '🧊 3D 數位孿生',
  teaching: '🎓 互動教學平台',
  aiworks:  '✦ AI 協作互動作品集',
  sim:      '🔬 模擬器',
  platform: '🌐 即時資訊平台',
  film:     '🎬 AI 自動影像製作',
  maker:    '🔧 手作硬體專案',
  misc:     '📦 其他',
};
