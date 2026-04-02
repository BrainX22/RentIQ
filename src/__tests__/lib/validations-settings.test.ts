import { describe, it, expect } from "vitest";
import { displayNameSchema, deleteAccountSchema, feedbackSchema } from "@/lib/validations";

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

describe("feedbackSchema", () => {
  it("accepts valid submission with message only", () => {
    expect(feedbackSchema.safeParse({ message: "Great tool!" }).success).toBe(true);
  });

  it("accepts submission with optional name and email", () => {
    const result = feedbackSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      message: "Loving it",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty message", () => {
    expect(feedbackSchema.safeParse({ message: "" }).success).toBe(false);
  });

  it("rejects message over 2000 chars", () => {
    expect(feedbackSchema.safeParse({ message: "a".repeat(2001) }).success).toBe(false);
  });

  it("rejects invalid email format", () => {
    expect(feedbackSchema.safeParse({ email: "notanemail", message: "Hi" }).success).toBe(false);
  });

  it("accepts missing name and email (both optional)", () => {
    expect(feedbackSchema.safeParse({ message: "Good stuff" }).success).toBe(true);
  });
});

describe("deleteAccountSchema", () => {
  it("accepts exact 'DELETE' string with currentPassword", () => {
    const result = deleteAccountSchema.safeParse({ confirmation: "DELETE", currentPassword: "mypassword" });
    expect(result.success).toBe(true);
  });

  it("rejects 'DELETE' without currentPassword", () => {
    const result = deleteAccountSchema.safeParse({ confirmation: "DELETE" });
    expect(result.success).toBe(false);
  });

  it("rejects 'DELETE' with empty currentPassword", () => {
    const result = deleteAccountSchema.safeParse({ confirmation: "DELETE", currentPassword: "" });
    expect(result.success).toBe(false);
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
