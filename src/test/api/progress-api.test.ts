/**
 * progress-api.test.ts — Sprint 7.4.3
 *
 * Integration tests for GET and PATCH /api/progress.
 * Supabase and next/headers are mocked — no live network calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/progress/route";

// ── Hoist mock fns ────────────────────────────────────────

const mockGetSession = vi.hoisted(() => vi.fn());
const mockEq = vi.hoisted(() => vi.fn());
const mockSelect = vi.hoisted(() => vi.fn(() => ({ eq: mockEq })));
const mockUpsert = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/supabase", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getSession: mockGetSession },
    from: vi.fn(() => ({
      select: mockSelect,
      upsert: mockUpsert,
    })),
  })),
  supabaseBrowser: {},
}));

// ── Helpers ───────────────────────────────────────────────

const AUTHED_SESSION = { user: { id: "u-1" } };

import { NextRequest } from "next/server";

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/progress", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GET /api/progress ─────────────────────────────────────

describe("GET /api/progress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns progress array for authenticated user", async () => {
    mockGetSession.mockResolvedValue({ data: { session: AUTHED_SESSION } });
    mockEq.mockResolvedValue({
      data: [
        { concept_id: "c-addition", status: "mastered" },
        { concept_id: "c-multiplication", status: "unlocked" },
      ],
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([
      { conceptId: "c-addition", status: "mastered" },
      { conceptId: "c-multiplication", status: "unlocked" },
    ]);
  });

  it("returns empty array when user has no progress rows", async () => {
    mockGetSession.mockResolvedValue({ data: { session: AUTHED_SESSION } });
    mockEq.mockResolvedValue({ data: [], error: null });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([]);
  });
});

// ── PATCH /api/progress ───────────────────────────────────

describe("PATCH /api/progress", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const res = await PATCH(makePatchRequest({ conceptId: "c-addition", status: "mastered" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when conceptId is missing", async () => {
    mockGetSession.mockResolvedValue({ data: { session: AUTHED_SESSION } });
    const res = await PATCH(makePatchRequest({ status: "mastered" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when status is invalid", async () => {
    mockGetSession.mockResolvedValue({ data: { session: AUTHED_SESSION } });
    const res = await PATCH(makePatchRequest({ conceptId: "c-addition", status: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("upserts progress and returns success for authenticated user", async () => {
    mockGetSession.mockResolvedValue({ data: { session: AUTHED_SESSION } });
    mockUpsert.mockResolvedValue({ error: null });

    const res = await PATCH(
      makePatchRequest({ conceptId: "c-addition", status: "mastered" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledOnce();
  });
});
