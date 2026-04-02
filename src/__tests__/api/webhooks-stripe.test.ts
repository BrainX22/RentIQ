import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";

describe("POST /api/webhooks/stripe (deprecated)", () => {
  it("returns 410 Gone", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
  });
});
