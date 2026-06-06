#!/usr/bin/env python3
"""
ingest_textbook.py — Savant textbook ingestion pipeline

Converts a PDF textbook into embedded chunks and inserts them into
the Supabase textbook_chunks table for RAG-powered lesson generation.

Usage:
    python ingest_textbook.py \
        --pdf "path/to/textbook.pdf" \
        --subject "physics" \
        --book-title "University Physics Vol 1"

    # Optional: limit to specific pages (0-indexed)
    python ingest_textbook.py \
        --pdf "textbook.pdf" \
        --subject "calculus" \
        --book-title "Calculus: Early Transcendentals" \
        --pages 0-120
"""

import argparse
import os
import sys
import time
from pathlib import Path
from typing import Generator
import requests
import tiktoken
import pymupdf4llm
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
EMBED_DIMS = 768                              # via dimensions param (MRL)
TARGET_CHUNK_TOKENS = 400                # target size per chunk
MAX_CHUNK_TOKENS = 500                   # hard cap before forced split
CHUNK_OVERLAP_TOKENS = 50               # overlap between adjacent chunks
EMBED_BATCH_SIZE = 100                  # items per OpenAI embeddings call
SUPABASE_BATCH_SIZE = 50               # rows per Supabase insert

TOKENIZER = tiktoken.get_encoding("cl100k_base")  # approximation for chunking


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


# ─── Extraction ──────────────────────────────────────────────────────────────

def extract_page_chunks(pdf_path: str, pages: list[int] | None) -> list[dict]:
    """
    Calls pymupdf4llm.to_markdown with page_chunks=True.

    Returns a list of page dicts, each containing:
      - text: str          — clean Markdown for that page
      - toc_items: list    — [[level, title, page_num], ...]
      - metadata: dict     — page number, file path, title, author, etc.
      - tables: list       — detected tables (already in Markdown inside text)
    """
    kwargs: dict = {"page_chunks": True}
    if pages:
        kwargs["pages"] = pages

    return pymupdf4llm.to_markdown(pdf_path, **kwargs)


def resolve_section_labels(page_chunks: list[dict]) -> list[dict]:
    """
    Walks all page chunks and carries the most recent TOC entry forward
    so every page knows which chapter and section it belongs to.

    toc_items format: [[level, title, page_num], ...]
      level 1 = chapter heading
      level 2 = section heading
      level 3+ = subsection (we treat as section)
    """
    current_chapter: str | None = None
    current_section: str | None = None

    for chunk in page_chunks:
        for item in chunk.get("toc_items", []):
            level, title, _ = item
            if level == 1:
                current_chapter = title.strip()
                current_section = None   # reset section on new chapter
            elif level >= 2:
                current_section = title.strip()

        chunk["_chapter"] = current_chapter
        chunk["_section"] = current_section

    return page_chunks


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

def parse_page_range(s: str) -> list[int]:
    """Parses '0-120' or '5,10,15' into a list of ints."""
    if "-" in s:
        start, end = s.split("-")
        return list(range(int(start), int(end) + 1))
    return [int(x) for x in s.split(",")]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest a textbook PDF into Savant's textbook_chunks table."
    )
    parser.add_argument("--pdf", required=True, help="Path to the textbook PDF")
    parser.add_argument(
        "--subject",
        required=True,
        help='Normalized subject label, e.g. "physics", "calculus"',
    )
    parser.add_argument(
        "--book-title",
        required=True,
        help='Full book title, e.g. "University Physics Vol 1"',
    )
    parser.add_argument(
        "--pages",
        default=None,
        help='Page range to process, e.g. "0-120" or "5,10,15" (0-indexed)',
    )
    parser.add_argument(
        "--start-chunk",
        type=int,
        default=0,
        help="Skip the first N chunks (use to resume after a rate-limit crash)",
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf).resolve()
    if not pdf_path.exists():
        sys.exit(f"Error: PDF not found at {pdf_path}")

    pages = parse_page_range(args.pages) if args.pages else None

    print(f"\n{'='*60}")
    print(f"  Savant Textbook Ingestion Pipeline")
    print(f"{'='*60}")
    print(f"  PDF:     {pdf_path.name}")
    print(f"  Subject: {args.subject}")
    print(f"  Title:   {args.book_title}")
    if pages:
        print(f"  Pages:   {pages[0]}–{pages[-1]} ({len(pages)} pages)")
    if args.start_chunk:
        print(f"  Resume:  skipping first {args.start_chunk} chunks")
    print(f"{'='*60}\n")

    # ── Init clients ──────────────────────────────────────────────────────────
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # ── Step 1: Extract ───────────────────────────────────────────────────────
    print("Step 1/4 — Extracting PDF with pymupdf4llm...")
    raw_pages = extract_page_chunks(str(pdf_path), pages)
    print(f"  Extracted {len(raw_pages)} pages")

    # ── Step 2: Resolve section labels ───────────────────────────────────────
    print("Step 2/4 — Resolving chapter/section labels from TOC...")
    labeled_pages = resolve_section_labels(raw_pages)
    chapters = {p["_chapter"] for p in labeled_pages if p["_chapter"]}
    sections = {p["_section"] for p in labeled_pages if p["_section"]}
    print(f"  Found {len(chapters)} chapters, {len(sections)} sections")

    # ── Step 3: Chunk ─────────────────────────────────────────────────────────
    print("Step 3/4 — Chunking content into ~400 token segments...")
    savant_chunks = build_savant_chunks(labeled_pages, args.subject, args.book_title)
    total_tokens = sum(count_tokens(c["content"]) for c in savant_chunks)
    print(f"  Created {len(savant_chunks)} chunks ({total_tokens:,} total tokens)")

    # ── Step 4: Embed + Insert ────────────────────────────────────────────────
    print("Step 4/4 — Embedding and inserting into Supabase...")
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

    print(f"\n\u2713 Done \u2014 {inserted_total} chunks ingested for subject '{args.subject}'")
    print(f"  The lesson generator will now use these chunks automatically.\n")


if __name__ == "__main__":
    main()
