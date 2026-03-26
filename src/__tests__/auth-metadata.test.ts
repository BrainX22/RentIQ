import { describe, it, expect } from "vitest";

// Metadata exports are plain objects — no mocks needed.
// These tests guarantee auth pages are never accidentally indexed.

describe("Auth page metadata — no-index enforcement", () => {
  describe("Login layout (/auth/login)", () => {
    it("exports a metadata object", async () => {
      const { metadata } = await import("@/app/auth/login/layout");
      expect(metadata).toBeDefined();
    });

    it("has title 'Log In'", async () => {
      const { metadata } = await import("@/app/auth/login/layout");
      expect(metadata.title).toBe("Log In");
    });

    it("sets robots.index to false", async () => {
      const { metadata } = await import("@/app/auth/login/layout");
      const robots = metadata.robots as { index: boolean; follow: boolean };
      expect(robots.index).toBe(false);
    });

    it("sets robots.follow to false", async () => {
      const { metadata } = await import("@/app/auth/login/layout");
      const robots = metadata.robots as { index: boolean; follow: boolean };
      expect(robots.follow).toBe(false);
    });
  });

  describe("Signup layout (/auth/signup)", () => {
    it("exports a metadata object", async () => {
      const { metadata } = await import("@/app/auth/signup/layout");
      expect(metadata).toBeDefined();
    });

    it("has title 'Sign Up'", async () => {
      const { metadata } = await import("@/app/auth/signup/layout");
      expect(metadata.title).toBe("Sign Up");
    });

    it("sets robots.index to false", async () => {
      const { metadata } = await import("@/app/auth/signup/layout");
      const robots = metadata.robots as { index: boolean; follow: boolean };
      expect(robots.index).toBe(false);
    });

    it("sets robots.follow to false", async () => {
      const { metadata } = await import("@/app/auth/signup/layout");
      const robots = metadata.robots as { index: boolean; follow: boolean };
      expect(robots.follow).toBe(false);
    });
  });
});
