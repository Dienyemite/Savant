/**
 * src/lib/textbook-retrieval.ts
 *
 * Retrieves the most relevant OpenStax textbook chunks for a given topic
 * by performing a vector similarity search via Supabase pgvector.
 *
 * Called by /api/pages/[id]/generate-lesson before invoking Teacher AI.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TextbookChunk } from "@/types";

/**
 * Embeds `topic` using OpenAI text-embedding-3-large, then queries
 * match_textbook_chunks RPC for the top-k most relevant passages.
 *
 * `client` is optional — callers may inject an already-constructed
 * SupabaseClient (e.g. a service-role admin client or a test stub).
 * When omitted, a service-role client is created lazily from env vars.
 */
export async function retrieveChunks(
  topic: string,
  subject: string,
  matchCount = 10,
  client?: SupabaseClient
): Promise<TextbookChunk[]> {
  const supabase =
    client ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn("[textbook-retrieval] OPENAI_API_KEY not set — skipping RAG");
    return [];
  }

  // Embed the topic query
  const embeddingRes = await fetch(
    "https://api.openai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-large",
        input: `${subject}: ${topic}`,
        dimensions: 768,
      }),
    }
  );

  if (!embeddingRes.ok) {
    console.error("[textbook-retrieval] OpenAI embedding failed:", await embeddingRes.text());
    return [];
  }

  const embeddingJson = (await embeddingRes.json()) as {
    data: { embedding: number[] }[];
  };
  const embedding = embeddingJson.data?.[0]?.embedding;
  if (!embedding) return [];

  // Vector similarity search via Supabase RPC
  const { data, error } = await supabase.rpc("match_textbook_chunks", {
    query_embedding: embedding,
    subject_filter: subject.toLowerCase(),
    match_count: matchCount,
  });

  if (error) {
    console.error("[textbook-retrieval] RPC error:", error.message);
    return [];
  }

  return (data ?? []) as TextbookChunk[];
}

/**
 * Formats retrieved chunks into a single context string for injection
 * into the Teacher AI system prompt.
 */
export function formatChunksAsContext(chunks: TextbookChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}${c.section ? ` — ${c.section}` : ""}]\n${c.content}`
    )
    .join("\n\n---\n\n");
}
