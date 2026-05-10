/**
 * auth-api.test.ts — Sprint 7.4.2
 *
 * Integration tests for /api/auth/* routes.
 * Supabase is mocked — no live network calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as signupPOST } from "@/app/api/auth/signup/route";
import { POST as signinPOST } from "@/app/api/auth/signin/route";
import { POST as signoutPOST } from "@/app/api/auth/signout/route";

// ── Hoist mock fns so vi.mock() factory can reference them ──

const mockSignUp = vi.hoisted(() => vi.fn());
const mockSignIn = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());
const mockUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabaseBrowser: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
    },
    from: () => ({ upsert: mockUpsert }),
  },
  createServerClient: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────

import { NextRequest } from "next/server";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Signup ────────────────────────────────────────────────

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("returns 400 when email is missing", async () => {
    const res = await signupPOST(makeRequest({ password: "secret123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await signupPOST(makeRequest({ email: "a@b.com", password: "short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/8 characters/i);
  });

  it("returns 400 with Supabase error message when sign-up fails", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });
    const res = await signupPOST(makeRequest({ email: "a@b.com", password: "password123" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("User already registered");
  });

  it("returns 200 with user and session on success", async () => {
    const fakeUser = { id: "u-1", email: "a@b.com" };
    const fakeSession = { access_token: "tok" };
    mockSignUp.mockResolvedValue({ data: { user: fakeUser, session: fakeSession }, error: null });

    const res = await signupPOST(makeRequest({ email: "a@b.com", password: "password123" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user).toEqual(fakeUser);
    expect(json.session).toEqual(fakeSession);
    expect(mockUpsert).toHaveBeenCalledOnce();
  });
});

// ── Signin ────────────────────────────────────────────────

describe("POST /api/auth/signin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when body is missing credentials", async () => {
    const res = await signinPOST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 401 when Supabase returns an error (wrong password)", async () => {
    mockSignIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });
    const res = await signinPOST(makeRequest({ email: "a@b.com", password: "wrongpass" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Invalid login credentials");
  });

  it("returns 200 with session on successful sign-in", async () => {
    const fakeSession = { access_token: "tok" };
    const fakeUser = { id: "u-1" };
    mockSignIn.mockResolvedValue({ data: { user: fakeUser, session: fakeSession }, error: null });

    const res = await signinPOST(makeRequest({ email: "a@b.com", password: "correct!" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session).toEqual(fakeSession);
  });
});

// ── Signout ───────────────────────────────────────────────

describe("POST /api/auth/signout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 on successful sign-out", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const res = await signoutPOST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 when Supabase returns an error", async () => {
    mockSignOut.mockResolvedValue({ error: { message: "Session expired" } });
    const res = await signoutPOST();
    expect(res.status).toBe(400);
  });
});
