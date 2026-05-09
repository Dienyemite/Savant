/**
 * src/lib/auth.ts — Server-side auth helpers (Sprint 6.5 RBAC Foundation)
 *
 * Provides role-checking utilities for API routes.
 * Roles are stored in public.users.role (set in migration 001).
 * The default role on sign-up is "student".
 * "teacher" and "admin" must be granted manually in the Supabase dashboard.
 *
 * Usage in an API route:
 *   const { data: { session } } = await supabase.auth.getSession();
 *   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   await requireRole(supabase, session, "teacher"); // throws NextResponse on failure
 */

import { NextResponse } from "next/server";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types";

/**
 * Asserts that the authenticated user has the required role.
 * Reads from public.users.role (set on sign-up, updatable by admin).
 *
 * @throws NextResponse with status 403 if the role check fails.
 */
export async function requireRole(
  supabase: SupabaseClient,
  session: Session,
  role: UserRole
): Promise<void> {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error || !data) {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (data.role !== role) {
    throw NextResponse.json(
      { error: `Role '${role}' required. Your role: '${data.role}'.` },
      { status: 403 }
    );
  }
}
