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
        <a href="${post.link}" target="_blank" rel="noopener" class="article-card reveal bg-white border border-slate-200 rounded-xl p-5 block">
          ${img ? `<img src="${img}" alt="" loading="lazy" class="w-full h-32 object-cover rounded-lg mb-3 -mt-1">` : ''}
          <div class="text-xs text-slate-500 mb-1">${date}</div>
          <div class="font-semibold text-slate-900 leading-tight mb-1">${title}</div>
          <div class="text-sm text-slate-600 wp-excerpt">${excerpt}</div>
        </a>
      `;
    }).join('');
    observeReveals(container);
  } catch (e) {
    container.innerHTML = `<div class="col-span-full text-center py-8 text-rose-500">⚠️ 無法拉取文章：${e.message}</div>`;
  }
}

/** 精選專案：先用 META 立即渲染，GitHub API 回來後再補即時資訊 */
function renderFeaturedProjects() {
  const container = document.getElementById('featured-projects');
  container.innerHTML = FEATURED_ORDER.map(name => {
    const m = PROJECT_META[name];
    const themeName = THEME_NAMES[m.theme] || '';
    return `
      <article class="featured-card reveal group relative bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col" data-repo="${name}">
        <div class="relative overflow-hidden ${m.cover ? 'h-44' : 'bg-gradient-to-br ' + m.gradient + ' px-6 py-7'}">
          ${m.cover ? `
            <img src="${m.cover}" alt="" loading="lazy" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/15 to-transparent"></div>
            <div class="absolute inset-x-0 bottom-0 p-4 flex items-center justify-between">
              <span class="text-4xl drop-shadow-lg">${m.emoji}</span>
              <span class="text-[11px] font-semibold bg-white/25 text-white backdrop-blur px-2.5 py-1 rounded-full">${themeName}</span>
            </div>` : `
            <div class="cover-glow"></div>
            <div class="flex items-center justify-between relative">
              <span class="text-5xl drop-shadow-sm">${m.emoji}</span>
              <span class="text-[11px] font-semibold bg-white/25 text-white backdrop-blur px-2.5 py-1 rounded-full">${themeName}</span>
            </div>`}
        </div>
        <div class="p-6 flex-1 flex flex-col">
          <h3 class="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition">${m.title}</h3>
          <p class="text-sm text-slate-600 leading-relaxed mb-4 flex-1">${m.blurb}</p>
          <div class="flex flex-wrap gap-1.5 mb-5">
            ${(m.tags || []).map(t => `<span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${t}</span>`).join('')}
          </div>
          <div class="flex items-center gap-2">
            ${m.demo ? `<a href="${m.demo}" target="_blank" rel="noopener" class="flex-1 text-center text-sm font-semibold px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-indigo-600 transition">🚀 線上體驗</a>` : ''}
            <a href="https://github.com/${GH_USER}/${name}" target="_blank" rel="noopener" class="text-sm font-medium px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:border-slate-900 hover:text-slate-900 transition">GitHub</a>
          </div>
          <div class="repo-live mt-4 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-400">
            <span>⏳ 同步 GitHub 資訊中…</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
  observeReveals(container);
}

/** 用 GitHub API 補上精選卡片的即時資訊（語言／星數／更新日） */
async function hydrateFeaturedProjects() {
  const repos = await fetchGHReposSafe();
  const byName = Object.fromEntries(repos.map(r => [r.name, r]));
  document.querySelectorAll('#featured-projects [data-repo]').forEach(card => {
    const repo = byName[card.dataset.repo];
    const live = card.querySelector('.repo-live');
    if (!repo || !live) { if (live) live.remove(); return; }
    live.innerHTML = `
      <span class="inline-flex items-center gap-1"><span class="lang-dot lang-${(repo.language || 'Other').replace('+','p')}"></span>${repo.language || '—'}</span>
      <span>★ ${repo.stargazers_count}</span>
      <span>更新 ${formatDate(repo.pushed_at)}</span>
    `;
  });
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

/** 進場顯示動畫。動畫只是加分項——任何偵測不到的情況一律直接顯示，
 *  避免內容卡在 opacity:0（錨點跳轉、iframe 內 viewport 異常、舊瀏覽器）。 */
function observeReveals(scope) {
  const els = (scope || document).querySelectorAll('.reveal:not(.shown)');
  const vh = window.innerHeight || document.documentElement.clientHeight;
  if (!('IntersectionObserver' in window) || !vh) {
    els.forEach(el => el.classList.add('shown'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('shown'); io.unobserve(en.target); }
    });
  }, { threshold: 0.05 });
  els.forEach(el => {
    if (el.getBoundingClientRect().top < vh) {
      el.classList.add('shown');   // 已在視窗內或上方 → 直接顯示
    } else {
      io.observe(el);
    }
  });
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  renderFeaturedProjects();
  hydrateFeaturedProjects();
  loadLatestPosts();
  updatePostStat();
  observeReveals();
});
