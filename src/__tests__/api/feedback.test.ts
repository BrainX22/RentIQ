import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/feedback/route";
import { NextRequest } from "next/server";

// Hoisted so they're accessible inside vi.mock factory (which is hoisted)
const mockSend = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { id: "email-123" }, error: null })
);
const mockLimit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ success: true })
);

// Vitest v4: constructor mocks require mockImplementation with class/function, not mockReturnValue
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(class {
    emails = { send: mockSend };
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  feedbackSubmit: vi.fn().mockReturnValue({
    limit: mockLimit,
  }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

function makeRequest(body: unknown, ip = "127.0.0.1") {
  return new NextRequest("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FEEDBACK_RECIPIENT_EMAIL = "test@example.com";
    // Restore default send behaviour after clearAllMocks clears call history
    mockSend.mockResolvedValue({ data: { id: "email-123" }, error: null });
    mockLimit.mockResolvedValue({ success: true });
  });

  it("returns 200 on valid message", async () => {
    const res = await POST(makeRequest({ message: "Great product!" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 when message is empty", async () => {
    const res = await POST(makeRequest({ message: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds 2000 chars", async () => {
    const res = await POST(makeRequest({ message: "x".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockLimit.mockResolvedValueOnce({ success: false });
    const res = await POST(makeRequest({ message: "Spam" }));
    expect(res.status).toBe(429);
  });

  it("returns 500 when Resend errors", async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: "API error" } });
    const res = await POST(makeRequest({ message: "Hello" }));
    expect(res.status).toBe(500);
  });

  it("accepts optional name and email in the body", async () => {
    const res = await POST(makeRequest({
      name: "Bob",
      email: "bob@example.com",
      message: "Feedback here",
    }));
    expect(res.status).toBe(200);
  });
});
