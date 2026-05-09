/**
 * chat-api.test.ts — Sprint 7.4.1
 *
 * Tests: 400 on missing messages, model unavailability response.
 * Does not test actual streaming (requires live API key).
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { POST } from "@/app/api/chat/route";

// Save and restore env vars
const originalAnthropic = process.env.ANTHROPIC_API_KEY;
const originalGoogle = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

describe("/api/chat POST", () => {
  beforeAll(() => {
    // Remove AI API keys so model is null (no live calls)
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  afterAll(() => {
    // Restore
    if (originalAnthropic) process.env.ANTHROPIC_API_KEY = originalAnthropic;
    if (originalGoogle) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalGoogle;
  });

  it("returns 400 when messages is missing", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Missing messages");
  });

  it("returns 503 when no AI provider is configured", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/no ai provider/i);
  });
});
