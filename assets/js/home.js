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

/** 精選專案 — 雜誌式佈局：首張為主打大區塊，其餘為編號卡片 */
function renderFeaturedProjects() {
  const container = document.getElementById('featured-projects');
  const card = (name, idx, big) => {
    const m = PROJECT_META[name];
    const themeName = THEME_NAMES[m.theme] || '';
    const url = m.demo || `https://github.com/${GH_USER}/${name}`;
    const num = String(idx + 1).padStart(2, '0');
    const bg = m.cover ? `<img src="${m.cover}" alt="" loading="lazy" class="w-full h-full object-cover">` : '';
    const phClass = m.cover ? '' : `bg-gradient-to-br ${m.gradient}`;
    const h = big ? 'h-[300px] md:h-[420px]' : 'h-[230px]';
    const titleSize = big ? 'text-3xl md:text-4xl' : 'text-xl';
    const blurb = big ? `<p class="text-slate-200 max-w-2xl text-sm md:text-base mt-2">${truncate(m.blurb, 60)}</p>` : '';
    return `
      <a class="mag-card reveal ${h} ${big ? 'mb-6' : ''}" href="${url}" target="_blank" rel="noopener">
        <div class="mag-ph ${phClass}">${bg}</div>
        <div class="mag-ov"></div>
        <div class="mag-body p-5 ${big ? 'md:p-8' : ''} text-white">
          <div class="flex items-baseline gap-2">
            <span class="mag-num ${big ? 'text-5xl' : 'text-3xl'}">${num}</span>
            <span class="mag-kicker text-indigo-100 mt-1">${themeName}</span>
          </div>
          <div>
            <h3 class="mag-title serif ${titleSize} font-black">${m.title}</h3>
            ${blurb}
          </div>
        </div>
      </a>`;
  };
  const [first, ...rest] = FEATURED_ORDER;
  container.innerHTML =
    card(first, 0, true) +
    `<div class="grid md:grid-cols-3 gap-6">${rest.map((n, i) => card(n, i + 1, false)).join('')}</div>`;
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
  loadLatestPosts();
  updatePostStat();
  observeReveals();
});
