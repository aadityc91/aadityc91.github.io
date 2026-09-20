#!/usr/bin/env python3
"""Pre-render the .md sections into index.html, and generate sitemap.xml + feed.xml.

The site loads its .md files client-side (script.js MarkdownLoader), which means
crawlers that don't run JavaScript -- LinkedIn, X, Slack, Bing, most academic
indexers -- see only the loading placeholders. This script bakes the rendered
HTML straight into index.html so the content is in the served markup, while the
runtime loader stays in place as a self-healing fallback.

Run it after editing any .md file, then commit the result:

    python3 build.py
"""

import html
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent
BASE_URL = "https://aadityc91.github.io"
AUTHOR = "Aaditya Chauhan"

SECTIONS = ["about", "papers", "talks", "writing", "resume"]


def parse_markdown(markdown: str) -> str:
    """Port of MarkdownLoader.parseMarkdown in script.js.

    Kept deliberately in lockstep with that function: if the two ever diverge,
    the pre-rendered markup and the runtime-loaded markup would disagree.
    """
    out = markdown

    out = re.sub(r"^### (.*$)", r"<h3>\1</h3>", out, flags=re.M)
    out = re.sub(r"^## (.*$)", r'<h2 class="title">\1</h2>', out, flags=re.M)
    out = re.sub(r"^# (.*$)", r'<h1 class="title">\1</h1>', out, flags=re.M)

    out = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"\*(.*?)\*", r"<em>\1</em>", out)
    out = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2" class="cactus-link">\1</a>', out)

    out = re.sub(r"^\s*- (.+)$", r"<li>\1</li>", out, flags=re.M)
    out = re.sub(r"(<li>.*</li>)", r"<ul>\1</ul>", out, count=1, flags=re.S)

    paragraphs = []
    for para in re.split(r"\n\s*\n", out):
        para = para.strip()
        if not para:
            continue
        if para.startswith("<") and para.endswith(">"):
            paragraphs.append(para)
        elif any(tag in para for tag in ("<li>", "<h", "<ul>", "<div")):
            paragraphs.append(para)
        else:
            paragraphs.append(f"<p>{para}</p>")
    out = "\n\n".join(paragraphs)

    out = re.sub(r"<ul>\s*(<li>.*?</li>)\s*</ul>", r"<ul>\1</ul>", out, flags=re.S)
    out = out.replace("<li></li>", "")
    out = re.sub(r"^---$", "<hr>", out, flags=re.M)

    return out


def render_index() -> None:
    index_path = ROOT / "index.html"
    index = index_path.read_text()

    for section in SECTIONS:
        source = ROOT / f"{section}.md"
        if not source.exists():
            raise SystemExit(f"missing {source.name} -- referenced by index.html")

        rendered = parse_markdown(source.read_text()).strip()
        body = "\n".join(f"                {line}" if line.strip() else "" for line in rendered.splitlines())
        block = (
            f"<!-- build:{section} -->\n{body}\n"
            f"                <!-- /build:{section} -->"
        )

        pattern = re.compile(
            rf"<!-- build:{section} -->.*?<!-- /build:{section} -->",
            re.S,
        )
        if not pattern.search(index):
            raise SystemExit(f"no <!-- build:{section} --> markers in index.html")
        index = pattern.sub(lambda _: block, index, count=1)

    index_path.write_text(index)
    print(f"index.html <- {', '.join(s + '.md' for s in SECTIONS)}")


def write_sitemap() -> None:
    # Single-page site: the #section links are fragments of this one URL, not
    # separate pages, so listing them here would just be noise to a crawler.
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    (ROOT / "sitemap.xml").write_text(
        f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{BASE_URL}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
"""
    )
    print("sitemap.xml")


MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

ENTRY_RE = re.compile(
    r'<h3[^>]*>\s*<a href="(?P<url>[^"]+)"[^>]*>(?P<title>.*?)</a>\s*</h3>.*?'
    r'<span[^>]*>(?P<date>[A-Z][a-z]{2} \d{4})</span>.*?'
    r"<p[^>]*>(?P<desc>.*?)</p>",
    re.S,
)


def write_feed() -> None:
    source = (ROOT / "writing.md").read_text()

    items = []
    for match in ENTRY_RE.finditer(source):
        month_name, year = match.group("date").split()
        published = datetime(int(year), MONTHS[month_name], 1, tzinfo=timezone.utc)
        title = html.escape(re.sub(r"<[^>]+>", "", match.group("title")).strip())
        desc = html.escape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", match.group("desc"))).strip())
        url = html.escape(match.group("url"), quote=False)
        items.append(
            (
                published,
                f"""    <item>
      <title>{title}</title>
      <link>{url}</link>
      <guid isPermaLink="true">{url}</guid>
      <pubDate>{published.strftime('%a, %d %b %Y %H:%M:%S +0000')}</pubDate>
      <description>{desc}</description>
    </item>""",
            )
        )

    if not items:
        raise SystemExit("no entries parsed out of writing.md -- check ENTRY_RE")

    items.sort(key=lambda pair: pair[0], reverse=True)
    body = "\n".join(entry for _, entry in items)
    built = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

    (ROOT / "feed.xml").write_text(
        f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{AUTHOR} — Writing</title>
    <link>{BASE_URL}/#writing</link>
    <atom:link href="{BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Articles on search, information retrieval, and RAG systems by {AUTHOR}.</description>
    <language>en-us</language>
    <lastBuildDate>{built}</lastBuildDate>
{body}
  </channel>
</rss>
"""
    )
    print(f"feed.xml ({len(items)} items)")


if __name__ == "__main__":
    render_index()
    write_sitemap()
    write_feed()
