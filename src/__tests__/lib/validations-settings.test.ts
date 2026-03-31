import { describe, it, expect } from "vitest";
import { displayNameSchema, deleteAccountSchema } from "@/lib/validations";

describe("displayNameSchema", () => {
  it("accepts a valid display name", () => {
    const result = displayNameSchema.safeParse({ display_name: "Alex" });
    expect(result.success).toBe(true);
  });

  it("trims whitespace", () => {
    const result = displayNameSchema.safeParse({ display_name: "  Alex  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.display_name).toBe("Alex");
    }
  });

  it("rejects empty string", () => {
    const result = displayNameSchema.safeParse({ display_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    const result = displayNameSchema.safeParse({ display_name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects string longer than 50 chars", () => {
    const result = displayNameSchema.safeParse({ display_name: "A".repeat(51) });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 50 chars", () => {
    const result = displayNameSchema.safeParse({ display_name: "A".repeat(50) });
    expect(result.success).toBe(true);
  });

  it("rejects display name with angle brackets", () => {
    const result = displayNameSchema.safeParse({ display_name: "<script>" });
    expect(result.success).toBe(false);
  });

  it("rejects display name with double quotes", () => {
    const result = displayNameSchema.safeParse({ display_name: 'Alex "The Dev"' });
    expect(result.success).toBe(false);
  });

  it("rejects display name with single quote", () => {
    const result = displayNameSchema.safeParse({ display_name: "O'Brien" });
    expect(result.success).toBe(false);
  });

  it("rejects display name with backtick", () => {
    const result = displayNameSchema.safeParse({ display_name: "Alex`s" });
    expect(result.success).toBe(false);
  });

  it("rejects display name with semicolon", () => {
    const result = displayNameSchema.safeParse({ display_name: "Alex; DROP TABLE" });
    expect(result.success).toBe(false);
  });

  it("rejects display name with ampersand", () => {
    const result = displayNameSchema.safeParse({ display_name: "A&B" });
    expect(result.success).toBe(false);
  });

  it("rejects display name with pipe", () => {
    const result = displayNameSchema.safeParse({ display_name: "A|B" });
    expect(result.success).toBe(false);
  });

  it("rejects display name with backslash", () => {
    const result = displayNameSchema.safeParse({ display_name: "A\\B" });
    expect(result.success).toBe(false);
  });

  it("accepts display name with spaces, hyphens, and dots", () => {
    const result = displayNameSchema.safeParse({ display_name: "Alex J. Smith-Doe" });
    expect(result.success).toBe(true);
  });
});

describe("deleteAccountSchema", () => {
  it("accepts exact 'DELETE' string", () => {
    const result = deleteAccountSchema.safeParse({ confirmation: "DELETE" });
    expect(result.success).toBe(true);
  });

  it("rejects lowercase 'delete'", () => {
    const result = deleteAccountSchema.safeParse({ confirmation: "delete" });
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = deleteAccountSchema.safeParse({ confirmation: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing field", () => {
    const result = deleteAccountSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
