import { supabaseBrowser } from "@/lib/supabase";

// ============================================
// Health check endpoint — Sprint 10.5
// Used by uptime monitors (UptimeRobot, etc.)
// Returns 200 when all systems are operational,
// 503 if Supabase is unreachable.
// Does NOT check AI API (would incur cost).
// ============================================

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseOk = await supabaseBrowser
    .from("concepts")
    .select("id")
    .limit(1)
    .then(() => true)
    .catch(() => false);

  const status = supabaseOk ? "ok" : "degraded";
  return Response.json(
    { status, supabase: supabaseOk, ts: new Date().toISOString() },
    { status: supabaseOk ? 200 : 503 }
  );
}
