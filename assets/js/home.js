// home.js — homepage logic

async function loadLatestPosts() {
  const container = document.getElementById('latest-posts');
  try {
    const posts = await fetchWPPosts({ perPage: 6 });
    container.innerHTML = posts.map(post => {
      const title = decodeEntities(post.title.rendered);
      const excerpt = truncate(stripHTML(post.excerpt.rendered).trim(), 80);
      const date = formatDate(post.date);
      const img = post.jetpack_featured_media_url || '';
      return `
        <a href="${post.link}" target="_blank" rel="noopener" class="article-card bg-white border border-slate-200 rounded-xl p-5 block">
          ${img ? `<img src="${img}" alt="" loading="lazy" class="w-full h-32 object-cover rounded-lg mb-3 -mt-1">` : ''}
          <div class="text-xs text-slate-500 mb-1">${date}</div>
          <div class="font-semibold text-slate-900 leading-tight mb-1">${title}</div>
          <div class="text-sm text-slate-600 wp-excerpt">${excerpt}</div>
        </a>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<div class="col-span-full text-center py-8 text-rose-500">⚠️ 無法拉取文章：${e.message}</div>`;
  }
}

async function loadFeaturedProjects() {
  const container = document.getElementById('featured-projects');
  try {
    const repos = await fetchGHRepos();
    const featured = repos
      .filter(r => PROJECT_META[r.name]?.featured)
      .slice(0, 6);

    container.innerHTML = featured.map(repo => {
      const meta = PROJECT_META[repo.name] || {};
      const themeName = THEME_NAMES[meta.theme] || '';
      const lang = repo.language || 'Other';
      return `
        <a href="${repo.html_url}" target="_blank" rel="noopener"
           class="article-card bg-white border-2 ${THEME_COLORS[meta.theme] || 'border-slate-200'} rounded-xl p-5 block">
          <div class="flex items-start justify-between mb-2">
            <div class="text-3xl">${meta.emoji || '📦'}</div>
            <span class="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">${themeName}</span>
          </div>
          <div class="font-bold text-slate-900 mb-1">${repo.name}</div>
          <div class="text-sm text-slate-600 line-clamp-2 mb-3">${repo.description || '(no description)'}</div>
          <div class="flex items-center gap-3 text-xs text-slate-500">
            <span>${lang}</span>
            <span>★ ${repo.stargazers_count}</span>
            <span>↻ ${formatDate(repo.pushed_at)}</span>
          </div>
        </a>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<div class="col-span-full text-center py-8 text-rose-500">⚠️ 無法拉取 repo：${e.message}</div>`;
  }
}

/** Update post count stat */
async function updatePostStat() {
  try {
    const res = await fetch(`${WP_API}/posts?per_page=1`);
    const total = res.headers.get('X-WP-Total') || res.headers.get('x-wp-total');
    if (total) {
      const el = document.getElementById('stat-posts');
      if (el) el.textContent = `${total}+`;
    }
  } catch (e) { /* silent */ }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  loadLatestPosts();
  loadFeaturedProjects();
  updatePostStat();
});
