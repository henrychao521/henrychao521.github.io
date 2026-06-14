// shared.js — common utilities across pages

const WP_API = 'https://public-api.wordpress.com/wp/v2/sites/livingtech.education';
const GH_USER = 'henrychao521';
const GH_API = 'https://api.github.com';

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

// ─────────────── GitHub API helpers ───────────────

/** Fetch all repos for the user */
async function fetchGHRepos() {
  return fetchJSON(`${GH_API}/users/${GH_USER}/repos?per_page=100&sort=updated`, 'gh:repos', 60*60*1000);
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
    blurb: '線鋸機 🪚・電烙鐵 🔥・麵包板 🔌・3D 印表機 🖨️ — 4 個工具 × 五段闖關（認識→安全→步驟→模擬→應用），20 個學習模組＋教師後台班級進度匯整，對應 108 課綱國中生活科技。',
    tags: ['20 學習模組', 'Canvas 模擬器', '教師後台', '108 課綱'],
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
    title: '物理模擬：繞射・摩爾紋・光譜・無影燈',
    blurb: '與 AI 協作的物理／光學互動：3D 光譜干涉、繞射成像（可拖曳擋板）、摩爾紋（雙色／彩虹拍頻）、「干涉×摩爾＝同一種疊加」整合教學、外科無影燈光學，以及 RC 氣墊船工程模擬。純前端、可離線課堂演示，手機可用。',
    tags: ['繞射・摩爾紋・光譜', '外科無影燈', 'RC 氣墊船工程', '純前端 / Canvas'],
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
  'henrychao521.github.io': {
    theme: 'misc', featured: false, emoji: '🦦',
    title: '本站原始碼',
    blurb: '這個作品站本身——純靜態 + Tailwind，即時拉取 GitHub / WordPress API。',
  },
  'henrychao521':     { theme: 'misc', featured: false, emoji: '👤', title: 'GitHub 個人簡介' },
  'gpt-ai-assistant': { theme: 'misc', featured: false, emoji: '💬', title: 'GPT AI Assistant（fork）' },
};

/** 精選專案在首頁/專案頁的固定排序 */
const FEATURED_ORDER = [
  'x5-roomtour-viewer',
  'pc13110-platform',
  'livingtech-tools',
  'ai-physics-demos',
  'ai-physics-data',
  'grip-coach',
  'taiwan-engineering-geo',
  'living-portal',
];

const THEME_NAMES = {
  twin:     '🧊 3D 數位孿生',
  teaching: '🎓 互動教學平台',
  aiworks:  '✦ AI 協作互動作品集',
  sim:      '🔬 模擬器',
  platform: '🌐 即時資訊平台',
  misc:     '📦 其他',
};

const THEME_COLORS = {
  twin:     'border-cyan-200 hover:border-cyan-400',
  teaching: 'border-emerald-200 hover:border-emerald-400',
  sim:      'border-sky-200 hover:border-sky-400',
  aiworks:  'border-fuchsia-200 hover:border-fuchsia-400',
  platform: 'border-violet-200 hover:border-violet-400',
  misc:     'border-slate-200 hover:border-slate-300',
};

/** GitHub API 失敗（rate limit 等）時的離線備援資料 */
const REPO_FALLBACK = [
  { name: 'x5-roomtour-viewer',     language: 'JavaScript', pushed_at: '2026-06-14', stargazers_count: 0, html_url: 'https://github.com/henrychao521/x5-roomtour-viewer', description: 'X5 RoomTour — Insta360 X5 → 3D 高斯潑濺真實空間數位孿生（可走動 / 量測 / 即時人流）' },
  { name: 'pc13110-platform',       language: 'HTML',       pushed_at: '2026-06-11', stargazers_count: 0, html_url: 'https://github.com/henrychao521/pc13110-platform',       description: 'PC13110 工程設計學習平台 — 對應普通型高中生活科技教科書的互動學習平台' },
  { name: 'shadowless-lamp-sim',    language: 'HTML',       pushed_at: '2026-06-01', stargazers_count: 0, html_url: 'https://github.com/henrychao521/shadowless-lamp-sim',    description: '外科手術無影燈光學模擬器 — Three.js + IESSpotLight 真實光錐疊加' },
  { name: 'ai-physics-demos',       language: 'HTML',       pushed_at: '2026-06-14', stargazers_count: 0, html_url: 'https://github.com/henrychao521/ai-physics-demos',       description: 'AI 協作互動作品集 — 繞射/摩爾紋/光譜干涉/無影燈/氣墊船/房市，純前端互動' },
  { name: 'living-portal',          language: 'Python',     pushed_at: '2026-05-29', stargazers_count: 0, html_url: 'https://github.com/henrychao521/living-portal',          description: 'Henry Living Tech Portal — 整合台鐵即時地圖、北台灣水文監測、台北即時看板的統一入口' },
  { name: 'taiwan-engineering-geo', language: 'JavaScript', pushed_at: '2026-05-20', stargazers_count: 0, html_url: 'https://github.com/henrychao521/taiwan-engineering-geo', description: '200 個台灣工程地景的互動學習活動：看實景或衛星空照圖、在地圖上點出位置' },
  { name: 'livingtech-tools',       language: 'JavaScript', pushed_at: '2026-05-16', stargazers_count: 0, html_url: 'https://github.com/henrychao521/livingtech-tools',       description: '數位線鋸機互動教學平台｜對應 108 課綱國中生活科技' },
  { name: 'henrychao521.github.io', language: 'HTML',       pushed_at: '2026-06-12', stargazers_count: 0, html_url: 'https://github.com/henrychao521/henrychao521.github.io', description: '🦦 趙珩宇 Henry × LivingTech — 個人作品站' },
];

/** Fetch repos with graceful fallback（rate-limit 時仍可渲染） */
async function fetchGHReposSafe() {
  try {
    return await fetchGHRepos();
  } catch (e) {
    console.warn('GitHub API 失敗，使用備援資料：', e.message);
    return REPO_FALLBACK;
  }
}
