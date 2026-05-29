/**
 * /api/concepts — Knowledge graph concepts and prerequisites
 *
 * GET — Returns all concepts and their prerequisite edges from Supabase.
 *       Used by KnowledgeGraph to bootstrap the constellation from the DB
 *       instead of from the static seed file (Phase 4 migration).
 *
 * No query parameters — always returns the full set (hundreds of rows max,
 * no pagination needed per spec-api-routes §6).
 *
 * Auth: public — falls back gracefully; authenticated users get RLS-filtered data.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const [conceptsResult, prereqsResult] = await Promise.all([
      supabase
        .from("concepts")
        .select("id, title, description, domain, icon, difficulty, position_x, position_y, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("concept_prerequisites")
        .select("concept_id, prerequisite_id"),
    ]);

    if (conceptsResult.error) {
      console.error("[GET /api/concepts] concepts error:", conceptsResult.error.message);
      return NextResponse.json({ error: "Failed to load concepts" }, { status: 500 });
    }

    if (prereqsResult.error) {
      console.error("[GET /api/concepts] prerequisites error:", prereqsResult.error.message);
      return NextResponse.json({ error: "Failed to load prerequisites" }, { status: 500 });
    }

    return NextResponse.json({
      concepts: conceptsResult.data ?? [],
      prerequisites: prereqsResult.data ?? [],
    });
  } catch (err) {
    console.error("[GET /api/concepts] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
