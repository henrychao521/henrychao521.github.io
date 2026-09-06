// home.js — 首頁邏輯（2026-09 工坊版）
// 原則：作品用真實操作畫面截圖，文章用一列一篇，沒有動畫、沒有統計方塊。

/** 線上作品：不等寬拼貼，每格是 assets/covers/<repo>.jpg 的實際操作畫面 */
function renderFeaturedProjects() {
  const container = document.getElementById('featured-projects');
  // 12 欄格線的欄寬序列（首項最大），循環使用
  const SPANS = [8, 4, 4, 4, 4, 6, 6, 3, 3, 3, 3, 6, 6];
  // 沒有可用截圖的作品（截不到有意義的畫面），改用文字格
  const NO_COVER = new Set(['grip-coach']);

  container.innerHTML = FEATURED_ORDER.map((name, i) => {
    const m = PROJECT_META[name];
    if (!m) return '';
    const url = m.demo || `https://github.com/${GH_USER}/${name}`;
    const kind = (THEME_NAMES[m.theme] || '').replace(/^[^一-鿿A-Za-z0-9]+/, '');
    const span = `s-${SPANS[i % SPANS.length]}`;
    const cover = NO_COVER.has(name) ? '' : (m.cover || `/assets/covers/${name}.jpg`);
    const blurb = m.blurb ? truncate(m.blurb, 46) : '';
    const visual = cover
      ? `<img src="${cover}" alt="${m.title} 的操作畫面" loading="lazy">`
      : `<div class="text-tile"><b>${m.title}</b><span>${blurb}</span></div>`;
    return `
      <a class="${span}" href="${url}" target="_blank" rel="noopener">
        ${visual}
        <span class="cap"><b>${m.title}</b>${cover ? blurb : ''}<br><span class="kind">${kind}</span></span>
      </a>`;
  }).join('');
}

/** 最新文章：一列一篇 */
async function loadLatestPosts() {
  const container = document.getElementById('latest-posts');
  try {
    const posts = await fetchWPPosts({ perPage: 6 });
    container.innerHTML = posts.map(post => {
      const title = decodeEntities(post.title.rendered);
      const excerpt = truncate(stripHTML(post.excerpt.rendered).trim(), 90);
      const date = formatDate(post.date);
      const img = post.jetpack_featured_media_url || '';
      return `
        <a class="w-row" href="${post.link}" target="_blank" rel="noopener">
          <span class="date">${date}</span>
          <span><span class="title">${title}</span><div class="excerpt wp-excerpt">${excerpt}</div></span>
          ${img ? `<img src="${img}" alt="" loading="lazy">` : '<span class="noimg" aria-hidden="true"></span>'}
        </a>`;
    }).join('');
  } catch (e) {
    container.innerHTML = `<div class="w-error">無法拉取文章：${e.message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderFeaturedProjects();
  loadLatestPosts();
});
