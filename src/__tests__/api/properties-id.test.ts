import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock setup ───────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockSupabase = {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  };
  return { mockGetUser, mockFrom, mockSupabase };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

import { GET, DELETE } from "@/app/api/properties/[id]/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const INVALID_ID = "not-a-uuid";

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function mockAuthUser(userId = "user-123") {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
}

function mockAnon() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

// ─── GET /api/properties/[id] ────────────────────────────────────────────────

describe("GET /api/properties/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid UUID", async () => {
    const response = await GET(
      new Request("http://localhost/api/properties/bad-id"),
      makeContext(INVALID_ID)
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid property ID.");
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAnon();
    const response = await GET(
      new Request(`http://localhost/api/properties/${VALID_UUID}`),
      makeContext(VALID_UUID)
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when property not found", async () => {
    mockAuthUser();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    const response = await GET(
      new Request(`http://localhost/api/properties/${VALID_UUID}`),
      makeContext(VALID_UUID)
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Not found");
  });

  it("returns property when found", async () => {
    mockAuthUser();
    const fakeProperty = { id: VALID_UUID, property_name: "My House" };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: fakeProperty, error: null }),
          }),
        }),
      }),
    });

    const response = await GET(
      new Request(`http://localhost/api/properties/${VALID_UUID}`),
      makeContext(VALID_UUID)
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.property.id).toBe(VALID_UUID);
    expect(body.property.property_name).toBe("My House");
  });
});

// ─── DELETE /api/properties/[id] ─────────────────────────────────────────────

describe("DELETE /api/properties/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid UUID", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/properties/bad-id"),
      makeContext(INVALID_ID)
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockAnon();
    const response = await DELETE(
      new Request(`http://localhost/api/properties/${VALID_UUID}`),
      makeContext(VALID_UUID)
    );
    expect(response.status).toBe(401);
  });

  it("deletes property and returns success", async () => {
    mockAuthUser();
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const response = await DELETE(
      new Request(`http://localhost/api/properties/${VALID_UUID}`),
      makeContext(VALID_UUID)
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 when delete fails", async () => {
    mockAuthUser();
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "RLS violation" } }),
        }),
      }),
    });

    const response = await DELETE(
      new Request(`http://localhost/api/properties/${VALID_UUID}`),
      makeContext(VALID_UUID)
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("RLS violation");
  });
});
