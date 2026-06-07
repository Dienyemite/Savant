#!/usr/bin/env python3
"""
ingest_textbook.py — Savant textbook ingestion pipeline (OpenStax Content API)

Fetches an OpenStax textbook via the public content API (no PDF download
required), extracts structured text by chapter/section, embeds with OpenAI,
and inserts chunks into the Supabase textbook_chunks table for RAG-powered
lesson generation.

Usage:
    python ingest_textbook.py \
        --openstax-slug "university-physics-volume-1" \
        --subject "physics"

    # Filter to specific numbered chapters (1-indexed):
    python ingest_textbook.py \
        --openstax-slug "calculus-volume-1" \
        --subject "calculus" \
        --chapters 1-5

    # Override the book title stored in the DB:
    python ingest_textbook.py \
        --openstax-slug "biology-2e" \
        --subject "biology" \
        --book-title "OpenStax Biology 2e"

    # Resume after a crash (skip first N chunks):
    python ingest_textbook.py \
        --openstax-slug "university-physics-volume-1" \
        --subject "physics" \
        --start-chunk 400

Common OpenStax slugs → subject labels:
    university-physics-volume-1  →  physics
    university-physics-volume-2  →  physics
    university-physics-volume-3  →  physics
    calculus-volume-1            →  calculus
    calculus-volume-2            →  calculus
    algebra-and-trigonometry-2e  →  math
    biology-2e                   →  biology
    chemistry-2e                 →  chemistry
    us-history                   →  history
    psychology-2e                →  psychology
    principles-economics-3e      →  economics
"""

import argparse
import os
import sys
import time
from pathlib import Path
from typing import Generator

import requests
import tiktoken
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

# ─── Load environment from project root .env.local ─────────────────────────
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
load_dotenv(PROJECT_ROOT / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# ─── Constants ───────────────────────────────────────────────────────────────
EMBED_MODEL = "text-embedding-3-large"  # must match textbook-retrieval.ts
EMBED_DIMS = 768                        # via dimensions param (MRL)
TARGET_CHUNK_TOKENS = 400               # target size per chunk
MAX_CHUNK_TOKENS = 500                  # hard cap before forced split
CHUNK_OVERLAP_TOKENS = 50              # overlap between adjacent chunks
EMBED_BATCH_SIZE = 100                 # items per OpenAI embeddings call
SUPABASE_BATCH_SIZE = 50              # rows per Supabase insert

# OpenStax public API endpoints
OPENSTAX_CMS_BASE = "https://openstax.org/api/v2/books/"
OPENSTAX_ARCHIVE_BASE = "https://openstax.org/apps/archive/latest/contents"
REQUEST_DELAY = 0.2  # seconds between page fetches — respectful crawling

TOKENIZER = tiktoken.get_encoding("cl100k_base")

# Dedicated session for all OpenStax requests (connection reuse + polite UA)
OS_SESSION = requests.Session()
OS_SESSION.headers.update({
    "User-Agent": "Savant-Educational-Ingestion/1.0 (github.com/Dienyemite/Savant)",
    "Accept": "application/json",
})


# ─── Helpers ─────────────────────────────────────────────────────────────────

def count_tokens(text: str) -> int:
    return len(TOKENIZER.encode(text))


def split_at_paragraphs(text: str, max_tokens: int, overlap_tokens: int) -> list[str]:
    """
    Splits text at double-newline paragraph boundaries.
    If a single paragraph exceeds max_tokens, splits it at sentence boundaries.
    Applies a rolling overlap window so context is not lost at chunk edges.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current_parts: list[str] = []
    current_tokens = 0

    for para in paragraphs:
        para_tokens = count_tokens(para)

        # Single paragraph too large — split at ". " sentence boundaries
        if para_tokens > max_tokens:
            sentences = para.replace(". ", ".\n").split("\n")
            for sentence in sentences:
                s_tokens = count_tokens(sentence)
                if current_tokens + s_tokens > max_tokens and current_parts:
                    chunks.append("\n\n".join(current_parts))
                    # Overlap: carry over last ~overlap_tokens worth of content
                    overlap_parts: list[str] = []
                    overlap_total = 0
                    for part in reversed(current_parts):
                        t = count_tokens(part)
                        if overlap_total + t > overlap_tokens:
                            break
                        overlap_parts.insert(0, part)
                        overlap_total += t
                    current_parts = overlap_parts
                    current_tokens = overlap_total
                current_parts.append(sentence)
                current_tokens += s_tokens
        else:
            if current_tokens + para_tokens > max_tokens and current_parts:
                chunks.append("\n\n".join(current_parts))
                overlap_parts = []
                overlap_total = 0
                for part in reversed(current_parts):
                    t = count_tokens(part)
                    if overlap_total + t > overlap_tokens:
                        break
                    overlap_parts.insert(0, part)
                    overlap_total += t
                current_parts = overlap_parts
                current_tokens = overlap_total
            current_parts.append(para)
            current_tokens += para_tokens

    if current_parts:
        chunks.append("\n\n".join(current_parts))

    return [c for c in chunks if c.strip()]


# ─── OpenStax API Fetching ────────────────────────────────────────────────────

def fetch_book_metadata(slug: str) -> dict:
    """
    Fetches book metadata from the OpenStax CMS API.

    Returns a dict guaranteed to have 'cnx_id' and 'title'.
    Exits with a descriptive error if the slug is not found or the response
    doesn't contain a recognized CNX ID field.
    """
    url = f"{OPENSTAX_CMS_BASE}?slug={slug}"
    resp = OS_SESSION.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    items = data.get("items", [])
    if not items:
        sys.exit(
            f"Error: No OpenStax book found with slug '{slug}'.\n"
            f"Browse all slugs at: https://openstax.org/subjects\n"
            f"(Use the URL path segment after /books/ as the slug)"
        )

    book = items[0]

    # The CMS may expose the CNX UUID under different field names depending on
    # the version. Try the known variants.
    cnx_id = (
        book.get("cnx_id")
        or book.get("cnx_book_id")
        or book.get("content_cnx_id")
    )
    if not cnx_id:
        sys.exit(
            f"Error: Book '{slug}' found but no CNX ID field in CMS response.\n"
            f"Available fields: {list(book.keys())}\n"
            f"Update the cnx_id lookup in fetch_book_metadata() with the correct field name."
        )

    return {**book, "cnx_id": cnx_id, "title": book.get("title", slug)}


def fetch_book_tree(cnx_id: str) -> dict:
    """
    Fetches the full book tree (chapter/section hierarchy) from the OpenStax
    archive server.

    Returns the JSON response, which has a top-level 'tree' key containing
    the hierarchical 'contents' array (or the tree directly if unwrapped).
    """
    url = f"{OPENSTAX_ARCHIVE_BASE}/{cnx_id}"
    resp = OS_SESSION.get(url, timeout=30, allow_redirects=True)
    if not resp.ok:
        sys.exit(
            f"Error: Could not fetch book tree for CNX ID '{cnx_id}'.\n"
            f"URL tried: {url}\n"
            f"Status: {resp.status_code}\n"
            f"The archive URL format may have changed. Check the current URL by\n"
            f"opening https://openstax.org/books/{cnx_id}/pages/preface in a browser\n"
            f"and inspecting the network requests to find the archive base URL."
        )
    return resp.json()


def html_to_text(html: str) -> str:
    """
    Converts OpenStax page HTML to clean plain text suitable for embedding.

    Removes: math elements (garbled in plain text), figure media, navigation,
    answer/solution boxes, teacher notes, footnotes, and script/style tags.
    Keeps: paragraph text, headings, list items, table content, captions.
    """
    soup = BeautifulSoup(html, "lxml")

    # Remove non-content structural elements
    for tag in soup.find_all(["nav", "script", "style", "noscript"]):
        tag.decompose()

    # Remove OpenStax-specific noise sections
    # These are class names used by OpenStax for teacher/solution content
    noise_classes = [
        "os-teacher",          # teacher-only annotations
        "os-solution",         # worked solutions
        "os-answer",           # answer keys
        "footnote",            # footnotes
        "check-understanding", # comprehension checks (usually short)
    ]
    for cls in noise_classes:
        for el in soup.find_all(attrs={"class": lambda c, _cls=cls: c and _cls in c}):
            el.decompose()

    # Replace MathML / math elements with a neutral placeholder.
    # Raw MathML text is unreadable and confuses embeddings.
    for math_el in soup.find_all(["math"]):
        math_el.replace_with(" [math] ")

    # Remove figure media (images/videos) but keep captions
    for fig in soup.find_all("figure"):
        # Keep any text inside the figure (captions), remove media tags
        for media in fig.find_all(["img", "video", "audio", "iframe"]):
            media.decompose()

    # Extract text with paragraph separator
    raw = soup.get_text(separator="\n", strip=True)

    # Normalise blank lines: collapse 3+ consecutive newlines to 2
    import re
    text = re.sub(r"\n{3,}", "\n\n", raw)

    # Drop lines that are too short to carry meaning (page numbers, lone labels)
    lines = text.splitlines()
    kept = [ln for ln in lines if len(ln.strip()) > 3 or ln.strip() == ""]
    return "\n".join(kept).strip()


def fetch_page_content(page_id: str) -> str:
    """
    Fetches an individual page's HTML content from the archive and returns
    clean plain text.

    page_id is the versioned ID from the book tree, e.g. 'uuid@version'.
    """
    url = f"{OPENSTAX_ARCHIVE_BASE}/{page_id}"
    resp = OS_SESSION.get(url, timeout=30, allow_redirects=True)
    if not resp.ok:
        return ""  # non-fatal; build_savant_chunks skips empty pages

    data = resp.json()
    html_content = data.get("content", "")
    if not html_content:
        return ""

    return html_to_text(html_content)


def walk_book_tree(
    tree_node: dict,
    chapter_filter: set[int] | None = None,
) -> list[dict]:
    """
    Recursively walks the book tree returned by the archive and returns a flat
    list of page descriptors, each with:
        {
            "_chapter": str | None,   # "1 Units and Measurement"
            "_section": str | None,   # "1.1 The Scope and Scale of Physics"
            "page_id":  str,          # "uuid@version" — used to fetch content
            "title":    str,          # display title
        }

    Tree structure (3 levels):
        book root
          └── chapter (has 'contents')
                └── section/page (leaf: no 'contents', or has sub-pages)

    Pages at the book root (Preface, Appendix, Index) are included without a
    chapter label. If chapter_filter is given, only numbered chapters in that
    set are fetched; unnumbered top-level items are always included.
    """
    pages: list[dict] = []
    chapter_num = 0  # counts only numbered (digit-prefixed) chapters

    for node in tree_node.get("contents", []):
        title = (node.get("title") or "").strip()
        sub_contents = node.get("contents")  # None for leaf pages

        if sub_contents is None:
            # Top-level leaf page (Preface, standalone appendix, etc.)
            pages.append({
                "_chapter": None,
                "_section": title or None,
                "page_id": node["id"],
                "title": title,
            })
        else:
            # Container node (chapter or appendix group)
            is_numbered_chapter = bool(title) and title[0].isdigit()
            if is_numbered_chapter:
                chapter_num += 1
                if chapter_filter and chapter_num not in chapter_filter:
                    continue  # skip filtered-out chapters

            for child in sub_contents:
                child_title = (child.get("title") or "").strip()
                child_sub = child.get("contents")

                if child_sub is None:
                    # Direct child page of the chapter
                    pages.append({
                        "_chapter": title,
                        "_section": child_title if child_title != title else None,
                        "page_id": child["id"],
                        "title": child_title,
                    })
                else:
                    # Nested section with its own sub-pages
                    for grandchild in child_sub:
                        gc_title = (grandchild.get("title") or "").strip()
                        pages.append({
                            "_chapter": title,
                            "_section": child_title,
                            "page_id": grandchild["id"],
                            "title": gc_title,
                        })

    return pages


def fetch_all_pages(page_descriptors: list[dict]) -> list[dict]:
    """
    Fetches HTML content for every page descriptor and returns page dicts
    with a 'text' key added — the same format that build_savant_chunks()
    consumes.

    Shows a running progress indicator. Failed fetches are logged and skipped
    (build_savant_chunks will drop empty-text entries automatically).
    """
    total = len(page_descriptors)
    result: list[dict] = []

    for i, page in enumerate(page_descriptors, 1):
        label = page["title"][:55] + ("…" if len(page["title"]) > 55 else "")
        print(f"  [{i:4d}/{total}] {label}")

        try:
            text = fetch_page_content(page["page_id"])
        except Exception as exc:
            print(f"    ⚠ fetch failed for {page['page_id']}: {exc}")
            text = ""

        if text:
            result.append({
                "_chapter": page["_chapter"],
                "_section": page["_section"],
                "text": text,
            })

        if i < total:
            time.sleep(REQUEST_DELAY)

    return result


def extract_openstax_pages(
    slug: str,
    chapter_filter: set[int] | None = None,
) -> tuple[list[dict], str]:
    """
    Full OpenStax extraction pipeline:
      1. Fetch book metadata from the CMS  → get cnx_id and title
      2. Fetch book tree from the archive   → get chapter/section structure
      3. Fetch every page's text content    → plain text, deduplicated structure

    Returns (page_dicts, book_title).
    page_dicts each have _chapter, _section, text — the exact format that
    build_savant_chunks() expects.
    """
    print("  Fetching book metadata from OpenStax CMS...")
    metadata = fetch_book_metadata(slug)
    book_title: str = metadata["title"]
    cnx_id: str = metadata["cnx_id"]
    print(f"  Title:  {book_title}")
    print(f"  CNX ID: {cnx_id}")

    print("  Fetching book tree from archive...")
    book_data = fetch_book_tree(cnx_id)
    # The archive returns either {"tree": {...}} or the tree directly
    tree = book_data.get("tree") or book_data
    version = book_data.get("version", "")
    if version:
        print(f"  Version: {version}")

    page_descriptors = walk_book_tree(tree, chapter_filter)
    chapter_count = len({p["_chapter"] for p in page_descriptors if p["_chapter"]})
    print(f"  Found {len(page_descriptors)} pages across {chapter_count} chapters")

    if chapter_filter:
        print(f"  Chapter filter active: chapters {sorted(chapter_filter)}")

    print(f"\n  Fetching page content (≈{len(page_descriptors) * REQUEST_DELAY:.0f}s at {REQUEST_DELAY}s/page)...")
    pages = fetch_all_pages(page_descriptors)
    print(f"  Fetched {len(pages)} pages with content ({len(page_descriptors) - len(pages)} skipped/empty)")

    return pages, book_title


# ─── Chunking ────────────────────────────────────────────────────────────────

def build_savant_chunks(
    page_chunks: list[dict],
    subject: str,
    book_title: str,
) -> list[dict]:
    """
    Groups consecutive pages that share the same section label, then
    splits the combined text into ~400 token chunks.

    Returns a list of dicts ready for embedding and DB insert:
    {
        "subject": str,
        "book_title": str,
        "chapter": str | None,
        "section": str | None,
        "content": str,
    }
    """
    # Group pages by (chapter, section)
    groups: list[dict] = []
    current_group: dict | None = None

    for page in page_chunks:
        chapter = page.get("_chapter")
        section = page.get("_section")
        text = page.get("text", "").strip()
        if not text:
            continue

        if (
            current_group is None
            or current_group["chapter"] != chapter
            or current_group["section"] != section
        ):
            if current_group:
                groups.append(current_group)
            current_group = {
                "chapter": chapter,
                "section": section,
                "text": text,
            }
        else:
            current_group["text"] += "\n\n" + text

    if current_group:
        groups.append(current_group)

    # Split each group into token-bounded chunks
    savant_chunks: list[dict] = []
    for group in groups:
        sub_chunks = split_at_paragraphs(
            group["text"],
            max_tokens=MAX_CHUNK_TOKENS,
            overlap_tokens=CHUNK_OVERLAP_TOKENS,
        )
        for sub in sub_chunks:
            if count_tokens(sub) < 30:
                continue  # skip fragments (page numbers, headers, etc.)
            savant_chunks.append({
                "subject": subject.lower().strip(),
                "book_title": book_title.strip(),
                "chapter": group["chapter"],
                "section": group["section"],
                "content": sub,
            })

    return savant_chunks


# ─── Embedding ───────────────────────────────────────────────────────────────

def embed_chunks_batched(
    chunks: list[dict],
) -> Generator[dict, None, None]:
    """
    Sends chunks to OpenAI text-embedding-3-large in batches of EMBED_BATCH_SIZE.
    Yields each chunk dict with an "embedding" key added.
    No inter-batch sleep needed — OpenAI allows 1M TPM / 3000 RPM.
    """
    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    total = len(chunks)
    for batch_start in range(0, total, EMBED_BATCH_SIZE):
        batch = chunks[batch_start : batch_start + EMBED_BATCH_SIZE]

        body = {
            "model": EMBED_MODEL,
            "input": [c["content"] for c in batch],
            "dimensions": EMBED_DIMS,
        }

        retries = 0
        while True:
            try:
                resp = requests.post(url, headers=headers, json=body, timeout=120)
                if resp.status_code == 429:
                    header_wait = resp.headers.get("Retry-After")
                    fallback = min(30 * (2 ** retries), 120)
                    retry_after = int(header_wait) if header_wait else fallback
                    retries += 1
                    if retries > 4:
                        raise RuntimeError(
                            "OpenAI embedding rate limit persists after 4 retries — "
                            "resume with --start-chunk."
                        )
                    print(f"  Rate limit — waiting {retry_after}s (retry {retries}/4)")
                    time.sleep(retry_after)
                    continue
                resp.raise_for_status()
                data = resp.json()
                break
            except requests.exceptions.HTTPError as e:
                retries += 1
                if retries > 4:
                    raise RuntimeError(f"OpenAI embedding failed after 4 retries: {e}") from e
                wait = 2 ** retries
                print(f"  Error — retrying in {wait}s ({e})")
                time.sleep(wait)

        # OpenAI returns results ordered by index; sort defensively
        embeddings = sorted(data["data"], key=lambda x: x["index"])
        for i, emb in enumerate(embeddings):
            yield {**batch[i], "embedding": emb["embedding"]}

        done = min(batch_start + EMBED_BATCH_SIZE, total)
        print(f"  Embedded {done}/{total} chunks")

# ─── Supabase insert ─────────────────────────────────────────────────────────

def insert_chunks(
    embedded_chunks: list[dict],
    supabase: Client,
) -> None:
    """
    Inserts embedded chunks into the textbook_chunks table in batches.
    Uses upsert-style insert; duplicate content is allowed (different
    book editions may overlap slightly).
    """
    total = len(embedded_chunks)
    for batch_start in range(0, total, SUPABASE_BATCH_SIZE):
        batch = embedded_chunks[batch_start : batch_start + SUPABASE_BATCH_SIZE]

        # Supabase Python client expects embedding as a plain Python list
        rows = [
            {
                "subject": c["subject"],
                "book_title": c["book_title"],
                "chapter": c["chapter"],
                "section": c["section"],
                "content": c["content"],
                "embedding": c["embedding"],   # list[float], 768 elements (vector(768))
            }
            for c in batch
        ]

        result = supabase.table("textbook_chunks").insert(rows).execute()

        if hasattr(result, "error") and result.error:
            raise RuntimeError(f"Supabase insert error: {result.error}")

        done = min(batch_start + SUPABASE_BATCH_SIZE, total)
        print(f"  Inserted {done}/{total} rows into textbook_chunks")


# ─── CLI entry point ─────────────────────────────────────────────────────────

def parse_chapter_range(s: str) -> set[int]:
    """Parses '1-5' or '1,3,5' into a set of chapter numbers (1-indexed)."""
    if "-" in s:
        start, end = s.split("-", 1)
        return set(range(int(start), int(end) + 1))
    return {int(x) for x in s.split(",")}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest an OpenStax textbook into Savant's textbook_chunks table.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  python ingest_textbook.py --openstax-slug university-physics-volume-1 --subject physics
  python ingest_textbook.py --openstax-slug calculus-volume-1 --subject calculus --chapters 1-8
  python ingest_textbook.py --openstax-slug biology-2e --subject biology --start-chunk 200
        """,
    )
    parser.add_argument(
        "--openstax-slug",
        required=True,
        help='OpenStax book slug, e.g. "university-physics-volume-1"',
    )
    parser.add_argument(
        "--subject",
        required=True,
        help='Normalized subject label matching notebook subjects, e.g. "physics"',
    )
    parser.add_argument(
        "--book-title",
        default=None,
        help="Override the book title stored in the DB (default: fetched from OpenStax API)",
    )
    parser.add_argument(
        "--chapters",
        default=None,
        help='Numbered chapters to ingest, e.g. "1-10" or "1,3,5" (default: all)',
    )
    parser.add_argument(
        "--start-chunk",
        type=int,
        default=0,
        help="Skip the first N chunks (use to resume after a rate-limit crash)",
    )
    args = parser.parse_args()

    chapter_filter = parse_chapter_range(args.chapters) if args.chapters else None

    print(f"\n{'='*60}")
    print(f"  Savant Textbook Ingestion — OpenStax Content API")
    print(f"{'='*60}")
    print(f"  Slug:    {args.openstax_slug}")
    print(f"  Subject: {args.subject}")
    if args.chapters:
        print(f"  Chapters: {args.chapters}")
    if args.start_chunk:
        print(f"  Resume:  skipping first {args.start_chunk} chunks")
    print(f"{'='*60}\n")

    # ── Init Supabase ─────────────────────────────────────────────────────────
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # ── Step 1: Fetch from OpenStax ───────────────────────────────────────────
    print("Step 1/3 — Fetching content from OpenStax...")
    labeled_pages, api_title = extract_openstax_pages(args.openstax_slug, chapter_filter)
    book_title = args.book_title or api_title
    print(f"  Book title: {book_title}")

    chapters_found = {p["_chapter"] for p in labeled_pages if p["_chapter"]}
    sections_found = {p["_section"] for p in labeled_pages if p["_section"]}
    print(f"  Resolved {len(chapters_found)} chapters, {len(sections_found)} sections")

    # ── Step 2: Chunk ─────────────────────────────────────────────────────────
    print("\nStep 2/3 — Chunking content into ~400 token segments...")
    savant_chunks = build_savant_chunks(labeled_pages, args.subject, book_title)
    total_tokens = sum(count_tokens(c["content"]) for c in savant_chunks)
    print(f"  Created {len(savant_chunks)} chunks ({total_tokens:,} total tokens)")

    # ── Step 3: Embed + Insert ────────────────────────────────────────────────
    print("\nStep 3/3 — Embedding and inserting into Supabase...")
    chunks_to_process = savant_chunks[args.start_chunk:]
    if args.start_chunk:
        print(f"  Resuming from chunk {args.start_chunk}/{len(savant_chunks)}")

    inserted_total = 0
    buffer: list[dict] = []
    for chunk_with_embedding in embed_chunks_batched(chunks_to_process):
        buffer.append(chunk_with_embedding)
        if len(buffer) >= SUPABASE_BATCH_SIZE:
            insert_chunks(buffer, supabase)
            inserted_total += len(buffer)
            buffer = []
    if buffer:
        insert_chunks(buffer, supabase)
        inserted_total += len(buffer)

    print(f"\n✓ Done — {inserted_total} chunks ingested for subject '{args.subject}'")
    print(f"  The lesson generator will now use these chunks automatically.\n")


if __name__ == "__main__":
    main()
