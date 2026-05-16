# Phase 12 — Textbook Ingestion Pipeline

## Status: NOT STARTED

## Overview

The RAG (Retrieval-Augmented Generation) infrastructure is fully built but the
`textbook_chunks` table in Supabase is empty. This phase implements a standalone
Python ingestion script that:

1. Accepts a textbook PDF as input
2. Extracts structured content using **pymupdf4llm**
3. Chunks the content by section (~400 tokens per chunk)
4. Embeds each chunk using **OpenAI text-embedding-3-small** (1536 dims)
5. Inserts the embedded chunks into the `textbook_chunks` Supabase table

Once this pipeline runs for each subject textbook, the lesson generator at
`POST /api/pages/[id]/generate-lesson` will automatically retrieve relevant
passages and the LLM output quality will improve significantly.

---

## System context

### Downstream consumer: `src/lib/textbook-retrieval.ts`

This file is the bridge between the ingestion pipeline and the Next.js app.
It must never be changed as part of this phase — it is already correct.

```typescript
// What the retrieval function expects in textbook_chunks:
{
  id: UUID,
  subject: string,        // normalized lowercase: "physics", "calculus"
  book_title: string,     // "University Physics Vol 1"
  chapter: string | null, // "Chapter 4: Motion in Two and Three Dimensions"
  section: string | null, // "4.3 Projectile Motion"
  content: string,        // raw text, ~400 tokens
  embedding: vector(1536) // from text-embedding-3-small
}
```

### The match RPC: `match_textbook_chunks`

Defined in `supabase/migrations/004_textbook_rag.sql`. Takes:
- `query_embedding vector(1536)` — the embedded topic query
- `subject_filter TEXT` — must match the `subject` field exactly (lowercase)
- `match_count INT` — number of top results to return

The `subject` field in ingested chunks must match what the lesson generator
passes. In `generate-lesson/route.ts` the subject comes from
`notebook.subject.toLowerCase()`. So if a user creates a notebook with subject
"Physics", the chunks must have `subject = "physics"`.

---

## Files to create

```
scripts/
  ingest_textbook.py      ← main ingestion script
  requirements.txt        ← Python dependencies
  .env.example            ← environment variable template (no secrets)
```

The `scripts/` folder lives at the project root, alongside `src/`, `supabase/`, etc.
It is a pure Python utility — it has no connection to Next.js or TypeScript.

---

## Step 1 — Install dependencies

### `scripts/requirements.txt`

```
pymupdf4llm>=0.3.4
openai>=1.30.0
supabase>=2.4.0
python-dotenv>=1.0.0
tiktoken>=0.7.0
```

**Why each dependency:**
- `pymupdf4llm` — PDF → Markdown + structured chunks. Installs PyMuPDF automatically.
- `openai` — text-embedding-3-small embeddings (1536 dims, same model as retrieval.ts).
- `supabase` — Python client for inserting into Supabase.
- `python-dotenv` — reads `.env.local` from the project root.
- `tiktoken` — accurate token counting (same tokenizer as OpenAI) for chunk sizing.

### Install command

```bash
cd scripts
pip install -r requirements.txt
```

If `pip install pymupdf4llm` fails (as seen in terminal history), try:

```bash
pip install --upgrade pip
pip install pymupdf4llm --no-cache-dir
```

On Windows, if there are C++ build errors, install the prebuilt wheel:
```bash
pip install pymupdf4llm --prefer-binary
```

---

## Step 2 — Environment variables

The script reads from the project's existing `.env.local` file (project root).
No new secrets are needed — all three vars are already set for the Next.js app.

```
# From .env.local (already exists in project root)
NEXT_PUBLIC_SUPABASE_URL=https://yvfnvjjhmtqjwniffpkr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
OPENAI_API_KEY=<your openai key>
```

The service role key is required (not the anon key) because the ingestion script
writes to `textbook_chunks` which bypasses RLS.

### `scripts/.env.example`

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=sk-...
```

---

## Step 3 — Full script implementation

### `scripts/ingest_textbook.py`

```python
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
import json
import os
import sys
import time
from pathlib import Path
from typing import Generator

import tiktoken
import pymupdf4llm
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client

# ─── Load environment from project root .env.local ─────────────────────────
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
load_dotenv(PROJECT_ROOT / ".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# ─── Constants ───────────────────────────────────────────────────────────────
EMBED_MODEL = "text-embedding-3-small"   # must match textbook-retrieval.ts
EMBED_DIMS = 1536                        # must match vector(1536) in schema
TARGET_CHUNK_TOKENS = 400                # target size per chunk
MAX_CHUNK_TOKENS = 500                   # hard cap before forced split
CHUNK_OVERLAP_TOKENS = 50               # overlap between adjacent chunks
EMBED_BATCH_SIZE = 100                  # OpenAI embeddings per API call
SUPABASE_BATCH_SIZE = 50               # rows per Supabase insert

TOKENIZER = tiktoken.encoding_for_model("text-embedding-3-small")


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
    openai_client: OpenAI,
) -> Generator[dict, None, None]:
    """
    Sends chunks to OpenAI in batches of EMBED_BATCH_SIZE.
    Yields each chunk dict with an "embedding" key added.
    Includes exponential backoff on rate limit errors.
    """
    total = len(chunks)
    for batch_start in range(0, total, EMBED_BATCH_SIZE):
        batch = chunks[batch_start : batch_start + EMBED_BATCH_SIZE]
        texts = [c["content"] for c in batch]

        retries = 0
        while True:
            try:
                response = openai_client.embeddings.create(
                    model=EMBED_MODEL,
                    input=texts,
                )
                break
            except Exception as e:
                retries += 1
                if retries > 5:
                    raise RuntimeError(f"OpenAI embedding failed after 5 retries: {e}") from e
                wait = 2 ** retries
                print(f"  Rate limit / error — retrying in {wait}s ({e})")
                time.sleep(wait)

        for i, embedding_obj in enumerate(response.data):
            assert len(embedding_obj.embedding) == EMBED_DIMS, (
                f"Expected {EMBED_DIMS} dims, got {len(embedding_obj.embedding)}"
            )
            yield {**batch[i], "embedding": embedding_obj.embedding}

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
                "embedding": c["embedding"],   # list[float], 1536 elements
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
    print(f"{'='*60}\n")

    # ── Init clients ──────────────────────────────────────────────────────────
    openai_client = OpenAI(api_key=OPENAI_API_KEY)
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
    embedded: list[dict] = []
    for chunk_with_embedding in embed_chunks_batched(savant_chunks, openai_client):
        embedded.append(chunk_with_embedding)

    insert_chunks(embedded, supabase)

    print(f"\n✓ Done — {len(embedded)} chunks ingested for subject '{args.subject}'")
    print(f"  The lesson generator will now use these chunks automatically.\n")


if __name__ == "__main__":
    main()
```

---

## Step 4 — Running the script

### Basic usage

```bash
cd c:\Users\Mazsa\OneDrive\Desktop\Savant\Savant

python scripts/ingest_textbook.py \
  --pdf "path/to/university-physics-vol1.pdf" \
  --subject "physics" \
  --book-title "University Physics Vol 1"
```

### Subject labels must match notebook subjects exactly

The `subject` argument must match what users type when creating a notebook,
after `.toLowerCase()`. Examples:

| Notebook subject (user types) | `--subject` argument |
|-------------------------------|----------------------|
| Physics | `physics` |
| Calculus | `calculus` |
| AP Biology | `ap biology` |
| Computer Science | `computer science` |

### Processing a subset of pages

Useful for large textbooks when you only need specific chapters:

```bash
# Pages 0–150 only (0-indexed)
python scripts/ingest_textbook.py \
  --pdf "textbook.pdf" \
  --subject "calculus" \
  --book-title "Calculus: Early Transcendentals" \
  --pages 0-150
```

### Running multiple textbooks

Run the script once per textbook. Each run appends to the same
`textbook_chunks` table — subjects are filtered at query time.

```bash
python scripts/ingest_textbook.py --pdf physics.pdf   --subject physics   --book-title "University Physics Vol 1"
python scripts/ingest_textbook.py --pdf calculus.pdf  --subject calculus  --book-title "Calculus: Early Transcendentals"
python scripts/ingest_textbook.py --pdf biology.pdf   --subject biology   --book-title "Biology 2e"
```

---

## Step 5 — Verify ingestion

After running, confirm in Supabase SQL editor:

```sql
-- Count chunks per subject
SELECT subject, COUNT(*) AS chunks, AVG(LENGTH(content)) AS avg_chars
FROM textbook_chunks
GROUP BY subject
ORDER BY chunks DESC;

-- Spot-check a physics chunk
SELECT chapter, section, LEFT(content, 200)
FROM textbook_chunks
WHERE subject = 'physics'
LIMIT 5;

-- Verify embedding dimensions
SELECT id, vector_dims(embedding) AS dims
FROM textbook_chunks
LIMIT 3;
-- Should return 1536 for all rows
```

---

## Expected costs

| Textbook size | Chunks | Embedding cost |
|---------------|--------|----------------|
| 300 pages | ~900 chunks | ~$0.04 |
| 600 pages | ~1,800 chunks | ~$0.08 |
| 1,200 pages | ~3,600 chunks | ~$0.16 |

Based on OpenAI text-embedding-3-small pricing at $0.02 per million tokens.
A 400-token chunk costs ~$0.000008. Entire physics textbook ≈ $0.04.

---

## Troubleshooting

### `pip install pymupdf4llm` fails on Windows

```bash
pip install --upgrade pip setuptools wheel
pip install pymupdf4llm --prefer-binary
```

If it still fails, install PyMuPDF separately first:
```bash
pip install PyMuPDF --prefer-binary
pip install pymupdf4llm
```

### `toc_items` is empty (no TOC in PDF)

Some textbooks (especially scanned ones) have no embedded TOC. In this case
`_chapter` and `_section` will be `None` for all chunks. The data still
ingests correctly — the `match_textbook_chunks` RPC searches by `content`
similarity regardless of chapter/section labels. The labels are only used for
display in the lesson generator's context string.

If this happens, consider manually specifying `chapter` overrides or using
the `--pages` flag to ingest chapter by chapter with descriptive names.

### Supabase `vector` type errors

If you see `column "embedding" is of type vector but expression is of type text`,
ensure the `004_textbook_rag.sql` migration has been run and `pgvector` is enabled.

Run in Supabase SQL editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT * FROM textbook_chunks LIMIT 1;
```

### Rate limit errors from OpenAI

The script has built-in exponential backoff (up to 5 retries). If you hit
persistent rate limits, reduce `EMBED_BATCH_SIZE` from 100 to 20 at the top
of the script.

---

## What does NOT need to change in the Next.js app

| File | Status |
|------|--------|
| `src/lib/textbook-retrieval.ts` | ✅ Complete — do not touch |
| `src/app/api/pages/[id]/generate-lesson/route.ts` | ✅ Complete — do not touch |
| `supabase/migrations/004_textbook_rag.sql` | ✅ Complete — run once if not already |
| `src/types/index.ts` (TextbookChunk type) | ✅ Complete — do not touch |

The only action required is running the ingestion script. The moment
`textbook_chunks` has rows for a given subject, the lesson generator
automatically improves for notebooks with that subject.
