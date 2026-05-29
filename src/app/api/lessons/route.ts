/**
 * /api/lessons — Lessons for one or more concept IDs
 *
 * GET ?conceptIds=<comma-separated> — Returns lessons for the specified concepts.
 *
 * Lessons are heavy (full slide JSON). Only fetch for concepts the student
 * currently has unlocked or mastered. Never fetch all lessons at once
 * (per spec-api-routes §7).
 *
 * Auth: public — RLS on lessons table controls visibility when authenticated.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const conceptIdsParam = req.nextUrl.searchParams.get("conceptIds");

    if (!conceptIdsParam || conceptIdsParam.trim() === "") {
      return NextResponse.json(
        { error: "conceptIds query parameter is required" },
        { status: 400 }
      );
    }

    const conceptIds = conceptIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (conceptIds.length === 0) {
      return NextResponse.json({ lessons: [] });
    }

    // Safety limit: cap the number of concept IDs per request
    if (conceptIds.length > 50) {
      return NextResponse.json(
        { error: "Too many conceptIds — maximum 50 per request" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data, error } = await supabase
      .from("lessons")
      .select("id, concept_id, title, description, content_schema, order, created_at")
      .in("concept_id", conceptIds)
      .order("order", { ascending: true });

    if (error) {
      console.error("[GET /api/lessons] error:", error.message);
      return NextResponse.json({ error: "Failed to load lessons" }, { status: 500 });
    }

    return NextResponse.json({ lessons: data ?? [] });
  } catch (err) {
    console.error("[GET /api/lessons] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
