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

const PROJECT_META = {
  // theme: education / camera / llm / hardware / platform / archive
  // featured: boolean
  // emoji: visual icon
  'shadowless-lamp-sim':      { theme: 'education', featured: true,  emoji: '🔦' },
  'grip-system':              { theme: 'education', featured: true,  emoji: '✏️' },
  'grip-system-prototype':    { theme: 'education', featured: false, emoji: '🧪' },
  'handpose-legacy':          { theme: 'education', featured: false, emoji: '🤚' },
  'sports-skeleton-analysis': { theme: 'education', featured: true,  emoji: '🏃' },
  'student-portfolio-v3':     { theme: 'education', featured: false, emoji: '📊' },
  'cgu-report-system':        { theme: 'education', featured: false, emoji: '📝' },
  'stock-class':              { theme: 'education', featured: false, emoji: '📈' },
  'off-axis-pi':              { theme: 'education', featured: true,  emoji: '🎮' },

  'pi-camera-hub':            { theme: 'camera', featured: true,  emoji: '📷' },
  'camera-hub-mac':           { theme: 'camera', featured: true,  emoji: '🖥️' },
  'camera-system-archive':    { theme: 'camera', featured: false, emoji: '📦' },
  'esp32-xiao-ai':            { theme: 'camera', featured: false, emoji: '🤖' },

  'moltbot':                  { theme: 'llm', featured: true,  emoji: '🦔' },
  'mac-llm-bot':              { theme: 'llm', featured: false, emoji: '💻' },
  'openclaw-multi-agent-kit': { theme: 'llm', featured: false, emoji: '👥' },

  'xiao-esp32s3-led-matrix':  { theme: 'hardware', featured: true,  emoji: '💡' },
  'esp32-arduino-sketches':   { theme: 'hardware', featured: false, emoji: '⚡' },
  'esp32-web-flasher':        { theme: 'hardware', featured: false, emoji: '🔌' },
  'pi-projects':              { theme: 'hardware', featured: false, emoji: '🥧' },
  'pi-monitor':               { theme: 'hardware', featured: false, emoji: '📊' },

  'taipei-dashboard':         { theme: 'platform', featured: true,  emoji: '🌆' },
  'android-myapplication':    { theme: 'platform', featured: false, emoji: '📱' },

  'gpt-ai-assistant':         { theme: 'archive',  featured: false, emoji: '💬' },
  'xmas':                     { theme: 'archive',  featured: false, emoji: '🎄' },
  'henrychao521':             { theme: 'archive',  featured: false, emoji: '👤' },
};

const THEME_NAMES = {
  education: '🎓 教育',
  camera:    '📷 邊緣 AI',
  llm:       '🤖 本地 LLM',
  hardware:  '🔌 硬體 / IoT',
  platform:  '🏠 平台 / 看板',
  archive:   '📦 早期 / 個人',
};

const THEME_COLORS = {
  education: 'border-indigo-300 bg-indigo-50',
  camera:    'border-orange-300 bg-orange-50',
  llm:       'border-purple-300 bg-purple-50',
  hardware:  'border-emerald-300 bg-emerald-50',
  platform:  'border-blue-300 bg-blue-50',
  archive:   'border-slate-300 bg-slate-50',
};
