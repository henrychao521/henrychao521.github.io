#!/usr/bin/env python3
"""掃描 posts/maker/ 與 posts/blog/ 的所有 .md，產生 index.json。

執行時機：
- GitHub Action 在 posts/**/*.md 變動時自動跑
- 本機可直接 `python3 scripts/build-indexes.py`

行為：
- 解析每個 .md 的 YAML frontmatter
- draft: true 的會跳過
- 依 date 倒序排
- 寫到 posts/<collection>/index.json
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("需要 PyYAML：pip install pyyaml", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
COLLECTIONS = ["maker", "blog"]

# 哪些 frontmatter 欄位要寫進 index（其他忽略）
ALWAYS_FIELDS = ["title", "date", "excerpt"]
OPTIONAL_FIELDS = [
    "author", "cover", "categories", "tags",
    "repo", "level", "hours", "category", "subtitle",
    "order",  # 同一天多篇時的排序（小的在前），articles.html 讀這個
]
SITE = "https://henrychao521.github.io"
TEMPLATE = ROOT / "post.html"


def _esc(s: str) -> str:
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def write_shell(name: str, entry: dict) -> None:
    """為每篇文章產一個靜態 HTML 殼：/posts/<name>/<slug>.html

    內文仍由 post.html 的前端程式渲染，但 <head> 的 title / description / og:*
    在建置時就填好——社群平台（LINE、FB）的爬蟲不跑 JS，分享 post.html?slug=
    只會看到「載入中」。殼以 post.html 為模板，改 post.html 就會反映到所有殼。
    """
    tpl = TEMPLATE.read_text(encoding="utf-8")
    slug, title = entry["slug"], entry.get("title") or slug
    desc = (entry.get("excerpt") or "").replace("\n", " ").strip()
    if len(desc) > 150:
        desc = desc[:150] + "…"
    url = f"{SITE}/posts/{name}/{slug}.html"
    cover = entry.get("cover") or "/assets/photos/parts-spinner-960.jpg"
    if cover.startswith("/"):
        cover = SITE + cover
    meta = "\n".join([
        f'<meta name="description" content="{_esc(desc)}">',
        f'<link rel="canonical" href="{url}">',
        f'<meta property="og:type" content="article">',
        f'<meta property="og:title" content="{_esc(title)}">',
        f'<meta property="og:description" content="{_esc(desc)}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{_esc(cover)}">',
        f'<meta name="twitter:card" content="summary_large_image">',
    ])
    html = tpl.replace(
        "<title id=\"page-title\">文章 — 趙珩宇｜生活科技教室</title>",
        f"<title id=\"page-title\">{_esc(title)} — 趙珩宇｜生活科技教室</title>", 1)
    assert "<!--POST-META-->" in html and "<!--POST-SLUG-->" in html, "post.html 模板缺標記"
    html = html.replace("<!--POST-META-->", meta, 1)
    html = html.replace(
        "<!--POST-SLUG-->",
        f'<script>window.POST_SLUG = "{slug}"; window.POST_COLLECTION = "{name}";</script>', 1)
    (ROOT / "posts" / name / f"{slug}.html").write_text(html, encoding="utf-8")

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)


def parse_frontmatter(text: str):
    m = FM_RE.match(text)
    if not m:
        return None, text
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        print(f"  ⚠️  YAML 解析錯誤：{e}", file=sys.stderr)
        return None, text
    return fm, m.group(2)


def normalize_date(d) -> str | None:
    if d is None:
        return None
    s = str(d)
    # 處理 ISO datetime 或 date
    if "T" in s:
        return s.split("T")[0]
    return s[:10]


def build_collection(name: str) -> int:
    posts_dir = ROOT / "posts" / name
    if not posts_dir.exists():
        print(f"  (skip) posts/{name}/ 不存在")
        return 0

    entries: list[dict] = []
    for md_file in sorted(posts_dir.glob("*.md")):
        # 跳過 macOS resource fork 檔案 (._XXX.md)
        if md_file.name.startswith("._"):
            continue
        slug = md_file.stem
        try:
            text = md_file.read_text(encoding="utf-8")
        except Exception as e:
            print(f"  ⚠️  讀不到 {md_file.name}: {e}", file=sys.stderr)
            continue

        fm, _body = parse_frontmatter(text)
        if not fm:
            print(f"  ⚠️  {md_file.name}: 沒有 frontmatter，跳過", file=sys.stderr)
            continue

        if fm.get("draft") is True:
            print(f"  📝 {md_file.name}: 草稿，跳過")
            continue

        entry: dict = {"slug": slug}

        # 必填欄位（找不到給空字串避免 None）
        for f in ALWAYS_FIELDS:
            v = fm.get(f)
            if f == "date":
                entry[f] = normalize_date(v) or ""
            else:
                entry[f] = v if v is not None else ""

        # 選填欄位（有才放）
        for f in OPTIONAL_FIELDS:
            if f in fm and fm[f] not in (None, "", []):
                entry[f] = fm[f]

        entries.append(entry)
        write_shell(name, entry)

    # 舊殼（文章改名或刪除）清掉，免得留下沒人連的孤兒頁
    keep = {e["slug"] for e in entries}
    for html_file in posts_dir.glob("*.html"):
        if html_file.stem not in keep:
            html_file.unlink()
            print(f"  🗑  移除過期殼 {html_file.name}")

    # 按 date 倒序
    entries.sort(key=lambda e: (e.get("date") or "", -int(e.get("order") or 999)),
                 reverse=True)

    out = posts_dir / "index.json"
    out.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"  ✓ posts/{name}/: {len(entries)} 篇 → {out.relative_to(ROOT)}")
    return len(entries)


def main() -> int:
    print(f"📂 從 {ROOT} 掃描 posts/")
    total = 0
    for c in COLLECTIONS:
        total += build_collection(c)
    print(f"\n🎉 共 {total} 篇文章寫入 index.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
