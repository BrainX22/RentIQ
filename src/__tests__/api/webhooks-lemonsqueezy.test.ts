import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

const { mockAdminFrom, mockUpsert, mockMaybeSingle } = vi.hoisted(() => {
  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockMaybeSingle = vi.fn();
  const mockAdminFrom = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
    }),
    upsert: mockUpsert,
  }));
  return { mockAdminFrom, mockUpsert, mockMaybeSingle };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({ from: mockAdminFrom }),
}));

import { POST } from "@/app/api/webhooks/lemonsqueezy/route";

const WEBHOOK_SECRET = "test-ls-webhook-secret-32chars!!";

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function makeRequest(payload: object, secret = WEBHOOK_SECRET) {
  const body = JSON.stringify(payload);
  const sig = sign(body, secret);
  return new Request("http://localhost/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "x-signature": sig, "content-type": "application/json" },
    body,
  });
}

const BASE_PAYLOAD = {
  meta: {
    test_mode: true,
    event_name: "subscription_created",
    webhook_id: "wh-123",
    custom_data: { user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab" },
  },
  data: {
    type: "subscriptions",
    id: "2022684",
    attributes: {
      store_id: 321542,
      customer_id: 8214213,
      order_id: 7951415,
      variant_id: 1477889,
      status: "active",
      cancelled: false,
      renews_at: "2026-05-02T08:37:48.000000Z",
      ends_at: null,
      user_email: "user@test.com",
      urls: {
        customer_portal: "https://rentalpropertycalculator.lemonsqueezy.com/billing?sig=abc",
      },
    },
  },
};

describe("POST /api/webhooks/lemonsqueezy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.LEMONSQUEEZY_PRO_VARIANT_ID = "1477889";
    process.env.LEMONSQUEEZY_MAX_VARIANT_ID = "1477891";
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("returns 500 when LEMONSQUEEZY_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const response = await POST(makeRequest(BASE_PAYLOAD));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Webhook handler unavailable.");
    expect(body.error).not.toContain("LEMONSQUEEZY_WEBHOOK_SECRET");
  });

  it("returns 401 when x-signature header is missing", async () => {
    const req = new Request("http://localhost/api/webhooks/lemonsqueezy", {
      method: "POST",
      body: JSON.stringify(BASE_PAYLOAD),
    });
    const response = await POST(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid signature.");
  });

  it("returns 401 when signature is wrong", async () => {
    const response = await POST(makeRequest(BASE_PAYLOAD, "wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("returns 200 for unknown event types (no-op)", async () => {
    const payload = { ...BASE_PAYLOAD, meta: { ...BASE_PAYLOAD.meta, event_name: "order_created" } };
    const response = await POST(makeRequest(payload));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.received).toBe(true);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  describe("subscription_created", () => {
    it("upserts Pro subscription when variant matches Pro ID", async () => {
      const response = await POST(makeRequest(BASE_PAYLOAD));
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab",
          plan_type: "pro",
          status: "active",
          ls_subscription_id: "2022684",
          ls_customer_id: "8214213",
          ls_order_id: "7951415",
          cancel_at_period_end: false,
        }),
        { onConflict: "user_id" }
      );
    });

    it("upserts Max subscription when variant matches Max ID", async () => {
      const payload = {
        ...BASE_PAYLOAD,
        data: {
          ...BASE_PAYLOAD.data,
          attributes: { ...BASE_PAYLOAD.data.attributes, variant_id: 1477891 },
        },
      };
      const response = await POST(makeRequest(payload));
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ plan_type: "max" }),
        { onConflict: "user_id" }
      );
    });

    it("skips upsert and logs warning when custom_data user_id is not a valid UUID", async () => {
      const payload = {
        ...BASE_PAYLOAD,
        meta: { ...BASE_PAYLOAD.meta, custom_data: { user_id: "not-a-uuid" } },
      };
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      const response = await POST(makeRequest(payload));
      expect(response.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("skips upsert when user_id is absent from custom_data and DB lookup returns null", async () => {
      const payload = {
        ...BASE_PAYLOAD,
        meta: { ...BASE_PAYLOAD.meta, custom_data: {} },
      };
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      const response = await POST(makeRequest(payload));
      expect(response.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("falls back to DB lookup by ls_subscription_id when custom_data is absent", async () => {
      const payload = {
        ...BASE_PAYLOAD,
        meta: { ...BASE_PAYLOAD.meta, custom_data: {} },
      };
      mockMaybeSingle.mockResolvedValue({ data: { user_id: "user-from-db" }, error: null });
      const response = await POST(makeRequest(payload));
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "user-from-db" }),
        { onConflict: "user_id" }
      );
    });

    it("stores renews_at as current_period_end", async () => {
      const response = await POST(makeRequest(BASE_PAYLOAD));
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ current_period_end: "2026-05-02T08:37:48.000000Z" }),
        expect.anything()
      );
    });
  });

  describe("subscription_cancelled", () => {
    it("sets cancel_at_period_end=true but keeps plan_type and status=active", async () => {
      const payload = {
        ...BASE_PAYLOAD,
        meta: { ...BASE_PAYLOAD.meta, event_name: "subscription_cancelled" },
        data: {
          ...BASE_PAYLOAD.data,
          attributes: {
            ...BASE_PAYLOAD.data.attributes,
            status: "cancelled",
            cancelled: true,
            ends_at: "2026-05-02T08:37:48.000000Z",
          },
        },
      };
      mockMaybeSingle.mockResolvedValue({ data: { user_id: "user-abc" }, error: null });
      const response = await POST(makeRequest(payload));
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "active",
          plan_type: "pro",
          cancel_at_period_end: true,
          cancel_at: "2026-05-02T08:37:48.000000Z",
        }),
        { onConflict: "user_id" }
      );
    });
  });

  describe("subscription_expired", () => {
    it("downgrades to free and sets status=canceled", async () => {
      const payload = {
        ...BASE_PAYLOAD,
        meta: { ...BASE_PAYLOAD.meta, event_name: "subscription_expired" },
        data: {
          ...BASE_PAYLOAD.data,
          attributes: {
            ...BASE_PAYLOAD.data.attributes,
            status: "expired",
            cancelled: true,
            ends_at: "2026-05-02T08:37:48.000000Z",
          },
        },
      };
      mockMaybeSingle.mockResolvedValue({ data: { user_id: "user-abc" }, error: null });
      const response = await POST(makeRequest(payload));
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ plan_type: "free", status: "canceled" }),
        { onConflict: "user_id" }
      );
    });
  });

  describe("subscription_payment_failed", () => {
    it("sets status=past_due", async () => {
      const payload = {
        ...BASE_PAYLOAD,
        meta: { ...BASE_PAYLOAD.meta, event_name: "subscription_payment_failed" },
        data: {
          ...BASE_PAYLOAD.data,
          attributes: { ...BASE_PAYLOAD.data.attributes, status: "past_due" },
        },
      };
      const response = await POST(makeRequest(payload));
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ status: "past_due" }),
        { onConflict: "user_id" }
      );
    });
  });

  describe("subscription_updated", () => {
    it("updates plan_type and status", async () => {
      const payload = {
        ...BASE_PAYLOAD,
        meta: { ...BASE_PAYLOAD.meta, event_name: "subscription_updated" },
        data: {
          ...BASE_PAYLOAD.data,
          attributes: {
            ...BASE_PAYLOAD.data.attributes,
            variant_id: 1477891,
            status: "active",
          },
        },
      };
      const response = await POST(makeRequest(payload));
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ plan_type: "max", status: "active" }),
        { onConflict: "user_id" }
      );
    });

    it("downgrades plan_type to free when status maps to canceled (expired mid-updated)", async () => {
      const payload = {
        ...BASE_PAYLOAD,
        meta: { ...BASE_PAYLOAD.meta, event_name: "subscription_updated" },
        data: {
          ...BASE_PAYLOAD.data,
          attributes: {
            ...BASE_PAYLOAD.data.attributes,
            variant_id: 1477891,
            status: "expired",
          },
        },
      };
      const response = await POST(makeRequest(payload));
      expect(response.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ plan_type: "free", status: "canceled" }),
        { onConflict: "user_id" }
      );
    });
  });

  it("returns 500 when DB upsert fails (generic message, no leak)", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "pg: constraint violation" } });
    const response = await POST(makeRequest(BASE_PAYLOAD));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Webhook processing failed.");
    expect(body.error).not.toContain("pg:");
  });
});
